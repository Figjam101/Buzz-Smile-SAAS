const mongoose = require('mongoose');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const User = require('../models/User');
const { uploadFile } = require('./googleDriveService');

const execAsync = promisify(exec);

class BackupService {
  constructor() {
    // Prefer unified backup target dir, fall back to legacy and default
    this.backupDir = process.env.BACKUP_TARGET_DIR || process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS) || 30; // Keep 30 days of backups
    this.compressionEnabled = true; // Re-enable compression with fixed method
  }

  /**
   * Create a full database backup
   */
  async createBackup() {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `backup-${timestamp}`;
      const backupPath = path.join(this.backupDir, backupName);

      // Ensure backup directory exists
      await fs.mkdir(this.backupDir, { recursive: true });

      console.log(`🔄 Starting full website backup: ${backupName}`);

      // Get database connection info
      const dbUri = process.env.MONGODB_URI;
      const dbName = this.extractDatabaseName(dbUri);

      // Always use local backup method for now
      await this.createLocalBackup(dbName, backupPath);

      // Compress backup if enabled and capture final artifact path
      let finalPath = backupPath;
      if (this.compressionEnabled) {
        finalPath = (await this.compressBackup(backupPath)) || backupPath;
      }

      // Clean up old backups
      await this.cleanupOldBackups();

      // Optionally upload to Google Drive (auto mode)
      const driveUpload = await this.maybeUploadToDrive(finalPath);

      console.log(`✅ Full website backup completed successfully: ${backupName}`);
      return { success: true, backupName, path: finalPath, driveUpload };

    } catch (error) {
      console.error('❌ Backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create comprehensive website backup including database and files
   */
  async createFullWebsiteBackup(dbName, backupPath) {
    try {
      console.log('📦 Creating comprehensive website backup...');
      
      // Create backup directory structure
      await fs.mkdir(backupPath, { recursive: true });
      
      // 1. Backup Database (JSON export)
      console.log('📄 Backing up database...');
      await this.createDatabaseBackup(dbName, path.join(backupPath, 'database'));
      
      // 2. Create backup manifest
      console.log('📋 Creating backup manifest...');
      await this.createBackupManifest(backupPath);
      
      console.log('✅ Full website backup created successfully');
      return backupPath;
      
    } catch (error) {
      console.error('❌ Full website backup failed:', error);
      throw error;
    }
  }

  /**
   * Create database backup (existing functionality)
   */
  async createDatabaseBackup(dbName, backupPath) {
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {};
    
    // Export each collection
    for (const collection of collections) {
      const collectionName = collection.name;
      console.log(`📄 Exporting collection: ${collectionName}`);
      
      const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
      backupData[collectionName] = data;
    }
    
    // Create backup directory
    await fs.mkdir(backupPath, { recursive: true });
    
    // Write backup data to JSON file
    const backupFile = path.join(backupPath, `${dbName}-backup.json`);
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    
    return backupFile;
  }

  /**
   * Backup server files (excluding node_modules, logs, uploads)
   */
  async createServerBackup(backupPath) {
    const serverPath = path.join(__dirname, '..');
    const serverBackupPath = path.join(backupPath, 'server');
    
    await fs.mkdir(serverBackupPath, { recursive: true });
    
    // Manually copy important directories and files
    const itemsToCopy = [
      { src: 'routes', dest: 'routes', isDir: true },
      { src: 'models', dest: 'models', isDir: true },
      { src: 'middleware', dest: 'middleware', isDir: true },
      { src: 'services', dest: 'services', isDir: true },
      { src: 'config', dest: 'config', isDir: true },
      { src: 'utils', dest: 'utils', isDir: true },
      { src: 'index.js', dest: 'index.js', isDir: false },
      { src: 'package.json', dest: 'package.json', isDir: false },
      { src: 'package-lock.json', dest: 'package-lock.json', isDir: false },
      { src: '.env.example', dest: '.env.example', isDir: false }
    ];
    
    for (const item of itemsToCopy) {
      const sourcePath = path.join(serverPath, item.src);
      const destPath = path.join(serverBackupPath, item.dest);
      
      try {
        await fs.access(sourcePath);
        if (item.isDir) {
          await this.copyDirectory(sourcePath, destPath);
        } else {
          await fs.copyFile(sourcePath, destPath);
        }
        console.log(`📄 Backed up: ${item.src}`);
      } catch (error) {
        console.log(`⚠️ Skipped: ${item.src} (${error.message})`);
      }
    }
  }

  /**
   * Backup client files (excluding node_modules, build)
   */
  async createClientBackup(backupPath) {
    const clientPath = path.join(__dirname, '../../client');
    const clientBackupPath = path.join(backupPath, 'client');
    
    await fs.mkdir(clientBackupPath, { recursive: true });
    
    // Manually copy important directories and files
    const itemsToCopy = [
      { src: 'src', dest: 'src', isDir: true },
      { src: 'public', dest: 'public', isDir: true },
      { src: 'package.json', dest: 'package.json', isDir: false },
      { src: 'package-lock.json', dest: 'package-lock.json', isDir: false },
      { src: 'tailwind.config.js', dest: 'tailwind.config.js', isDir: false },
      { src: 'postcss.config.js', dest: 'postcss.config.js', isDir: false },
      { src: '.env.example', dest: '.env.example', isDir: false }
    ];
    
    for (const item of itemsToCopy) {
      const sourcePath = path.join(clientPath, item.src);
      const destPath = path.join(clientBackupPath, item.dest);
      
      try {
        await fs.access(sourcePath);
        if (item.isDir) {
          await this.copyDirectory(sourcePath, destPath);
        } else {
          await fs.copyFile(sourcePath, destPath);
        }
        console.log(`📄 Backed up: ${item.src}`);
      } catch (error) {
        console.log(`⚠️ Skipped: ${item.src} (${error.message})`);
      }
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other large directories
        if (entry.name === 'node_modules' || entry.name === 'build' || entry.name === '.git') {
          continue;
        }
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  /**
   * Backup configuration files
   */
  async createConfigBackup(backupPath) {
    const rootPath = path.join(__dirname, '../..');
    const configBackupPath = path.join(backupPath, 'config');
    
    await fs.mkdir(configBackupPath, { recursive: true });
    
    // Configuration files to backup
    const configFiles = [
      'package.json',
      'package-lock.json',
      'railway.json',
      'vercel.json',
      'nixpacks.toml',
      'DEPLOYMENT-CHECKLIST.md',
      'ENTERPRISE-FEATURES.md'
    ];
    
    for (const file of configFiles) {
      const sourcePath = path.join(rootPath, file);
      const destPath = path.join(configBackupPath, file);
      
      try {
        await fs.access(sourcePath);
        await fs.copyFile(sourcePath, destPath);
        console.log(`📄 Backed up: ${file}`);
      } catch (error) {
        // File doesn't exist, skip it
        console.log(`⚠️ Skipped: ${file} (not found)`);
      }
    }
  }

  /**
   * Create backup manifest with metadata
   */
  async createBackupManifest(backupPath) {
    const manifest = {
      version: '1.0.0',
      type: 'full-website-backup',
      created: new Date().toISOString(),
      includes: {
        database: true,
        serverFiles: true,
        clientFiles: true,
        configFiles: true
      },
      structure: {
        'database/': 'MongoDB collections exported as JSON',
        'server/': 'Server-side code and configuration',
        'client/': 'Client-side React application',
        'config/': 'Deployment and configuration files'
      },
      instructions: {
        restore: 'Use the restore API endpoint or manual restoration process',
        requirements: 'Node.js, MongoDB, and npm/yarn for full restoration'
      }
    };
    
    const manifestPath = path.join(backupPath, 'backup-manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Copy files based on patterns
   */
  async copyFiles(sourcePath, destPath, patterns) {
    const glob = require('glob');
    
    for (const pattern of patterns) {
      try {
        const files = glob.sync(pattern, { cwd: sourcePath });
        
        for (const file of files) {
          const sourceFile = path.join(sourcePath, file);
          const destFile = path.join(destPath, file);
          
          // Create directory if it doesn't exist
          await fs.mkdir(path.dirname(destFile), { recursive: true });
          
          // Copy file
          const stats = await fs.stat(sourceFile);
          if (stats.isFile()) {
            await fs.copyFile(sourceFile, destFile);
          }
        }
      } catch (error) {
        console.log(`⚠️ Pattern ${pattern} failed: ${error.message}`);
      }
    }
  }

  /**
   * Create backup for Railway production environment
   */
  async createRailwayBackup(dbUri, backupPath, dbName) {
    const command = `mongodump --uri="${dbUri}" --out="${backupPath}" --gzip`;
    await execAsync(command);
  }

  /**
   * Create backup for local development
   */
  async createLocalBackup(dbName, backupPath) {
    try {
      console.log('📦 Creating database backup...');
      
      // Create backup directory structure
      await fs.mkdir(backupPath, { recursive: true });
      
      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      const backupData = {};
      
      // Export each collection
      for (const collection of collections) {
        const collectionName = collection.name;
        console.log(`📄 Exporting collection: ${collectionName}`);
        
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = data;
      }
      
      // Write database backup
      const dbBackupFile = path.join(backupPath, 'database-backup.json');
      await fs.writeFile(dbBackupFile, JSON.stringify(backupData, null, 2));
      
      // Create backup manifest
      const manifest = {
        version: '1.0.0',
        type: 'database-backup',
        created: new Date().toISOString(),
        collections: Object.keys(backupData),
        totalRecords: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0)
      };
      
      const manifestFile = path.join(backupPath, 'backup-manifest.json');
      await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));
      
      console.log(`✅ Database backup created successfully`);
      return backupPath;
      
    } catch (error) {
      console.error('❌ Database backup failed:', error);
      throw error;
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupName) {
    try {
      const backupPath = path.join(this.backupDir, backupName);
      
      // Check if backup exists
      try {
        await fs.access(backupPath);
      } catch {
        throw new Error(`Backup ${backupName} not found`);
      }

      console.log(`🔄 Starting database restore from: ${backupName}`);

      const dbUri = process.env.MONGODB_URI;
      const dbName = this.extractDatabaseName(dbUri);

      if (process.env.NODE_ENV === 'production' && process.env.RAILWAY_ENVIRONMENT) {
        await this.restoreRailwayBackup(dbUri, backupPath, dbName);
      } else {
        await this.restoreLocalBackup(dbName, backupPath);
      }

      console.log(`✅ Database restored successfully from: ${backupName}`);
      return { success: true, backupName };

    } catch (error) {
      console.error('❌ Restore failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Restore backup in Railway production
   */
  async restoreRailwayBackup(dbUri, backupPath, dbName) {
    const command = `mongorestore --uri="${dbUri}" --gzip --drop "${path.join(backupPath, dbName)}"`;
    await execAsync(command);
  }

  /**
   * Restore backup locally
   */
  async restoreLocalBackup(dbName, backupPath) {
    const command = `mongorestore --db="${dbName}" --gzip --drop "${path.join(backupPath, dbName)}"`;
    await execAsync(command);
  }

  /**
   * List available backups
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(this.backupDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory() && file.startsWith('backup-')) {
          backups.push({
            name: file,
            created: stats.birthtime,
            size: await this.getDirectorySize(filePath)
          });
        }
      }

      return backups.sort((a, b) => b.created - a.created);
    } catch (error) {
      console.error('❌ Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Schedule automatic backups
   */
  scheduleBackups() {
    const backupInterval = process.env.BACKUP_INTERVAL || '24'; // hours
    const intervalMs = parseInt(backupInterval) * 60 * 60 * 1000;

    console.log(`📅 Scheduling automatic backups every ${backupInterval} hours`);

    // Create initial backup
    setTimeout(() => this.createBackup(), 5000); // 5 seconds after startup

    // Schedule recurring backups
    setInterval(() => {
      this.createBackup();
    }, intervalMs);
  }

  /**
   * Compress backup directory
   */
  async compressBackup(backupPath) {
    try {
      const compressedPath = `${backupPath}.tar.gz`;
      const command = `tar -czf "${compressedPath}" -C "${path.dirname(backupPath)}" "${path.basename(backupPath)}"`;
      
      await execAsync(command);
      
      // Remove uncompressed directory using rm -rf instead of fs.rmdir
      const rmCommand = `rm -rf "${backupPath}"`;
      await execAsync(rmCommand);
      
      console.log(`✅ Backup compressed: ${compressedPath}`);
      return compressedPath;
    } catch (error) {
      console.error('❌ Compression failed:', error);
      // Don't throw error, just log it so backup still succeeds
      return null;
    }
  }

  /**
   * Optionally upload a backup archive to Google Drive using an admin's OAuth tokens.
   * Controlled by env AUTO_UPLOAD_BACKUPS_TO_GOOGLE_DRIVE and optional GOOGLE_DRIVE_ADMIN_EMAIL.
   */
  async maybeUploadToDrive(artifactPath) {
    try {
      const flag = String(process.env.AUTO_UPLOAD_BACKUPS_TO_GOOGLE_DRIVE || '').toLowerCase();
      const auto = ['1', 'true', 'yes', 'y'].includes(flag);
      if (!auto) return { attempted: false };

      // Resolve admin user for credentials
      const preferredEmail = process.env.GOOGLE_DRIVE_ADMIN_EMAIL;
      let user = null;
      if (preferredEmail) {
        user = await User.findOne({ email: preferredEmail });
      }
      if (!user) {
        user = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 });
      }
      if (!user) {
        console.error('❌ Drive upload skipped: No admin user found');
        return { attempted: true, uploaded: false, error: 'No admin user found for Drive credentials' };
      }

      const result = await uploadFile(
        user,
        artifactPath,
        path.basename(artifactPath),
        artifactPath.endsWith('.zip') ? 'application/zip' : 'application/gzip'
      );

      console.log(`☁️ Uploaded backup to Google Drive: ${result?.id || '(no id)'}`);
      return {
        attempted: true,
        uploaded: true,
        fileId: result?.id,
        name: result?.name || path.basename(artifactPath)
      };
    } catch (err) {
      console.error('❌ Google Drive upload failed:', err?.message || err);
      return { attempted: true, uploaded: false, error: err?.message || String(err) };
    }
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backupFiles = files
        .filter(file => file.startsWith('backup-') && (file.endsWith('.tar.gz') || !file.includes('.')))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          created: fs.stat(path.join(this.backupDir, file)).then(stats => stats.birthtime)
        }));

      // Wait for all stat operations to complete
      for (let backup of backupFiles) {
        backup.created = await backup.created;
      }

      // Sort by creation date (oldest first)
      backupFiles.sort((a, b) => a.created - b.created);

      // Remove old backups if we exceed maxBackups
      if (backupFiles.length > this.maxBackups) {
        const toDelete = backupFiles.slice(0, backupFiles.length - this.maxBackups);
        
        for (const backup of toDelete) {
          try {
            const stats = await fs.stat(backup.path);
            if (stats.isDirectory()) {
              const rmCommand = `rm -rf "${backup.path}"`;
              await execAsync(rmCommand);
            } else {
              await fs.unlink(backup.path);
            }
            console.log(`🗑️ Deleted old backup: ${backup.name}`);
          } catch (error) {
            console.error(`❌ Failed to delete backup ${backup.name}:`, error.message);
          }
        }
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Extract database name from MongoDB URI
   */
  extractDatabaseName(uri) {
    const match = uri.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : 'buzz-smile-saas';
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath) {
    let totalSize = 0;
    
    try {
      const files = await fs.readdir(dirPath);
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isDirectory()) {
          totalSize += await this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.error(`Error calculating size for ${dirPath}:`, error);
    }
    
    return totalSize;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Video backup methods
  
  /**
   * Ensure video backup directory exists
   */
  async ensureVideoBackupDirectory() {
    const videoBackupDir = path.join(this.backupDir, 'user-videos');
    await fs.mkdir(videoBackupDir, { recursive: true });
    return videoBackupDir;
  }

  /**
   * Create user-specific backup folder
   */
  async createUserVideoBackupFolder(userId) {
    const videoBackupDir = await this.ensureVideoBackupDirectory();
    const userBackupDir = path.join(videoBackupDir, userId.toString());
    await fs.mkdir(userBackupDir, { recursive: true });
    return userBackupDir;
  }

  /**
   * Backup a single video file
   */
  async backupVideo(videoFilePath, userId, videoId, originalName) {
    try {
      // Ensure user backup folder exists
      const userBackupDir = await this.createUserVideoBackupFolder(userId);
      
      // Create backup filename with timestamp and video ID
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = path.extname(originalName);
      const backupFileName = `${videoId}_${timestamp}_${originalName}`;
      const backupFilePath = path.join(userBackupDir, backupFileName);
      
      // Copy the file to backup location
      await fs.copyFile(videoFilePath, backupFilePath);
      
      console.log(`✅ Video backed up: ${backupFileName}`);
      return {
        success: true,
        backupPath: backupFilePath,
        backupFileName: backupFileName
      };
    } catch (error) {
      console.error('❌ Video backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Backup processed video
   */
  async backupProcessedVideo(processedFilePath, userId, videoId, originalName) {
    try {
      const userBackupDir = await this.createUserVideoBackupFolder(userId);
      
      // Create processed backup folder
      const processedBackupDir = path.join(userBackupDir, 'processed');
      await fs.mkdir(processedBackupDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileExtension = path.extname(originalName);
      const backupFileName = `PROCESSED_${videoId}_${timestamp}_${originalName}`;
      const backupFilePath = path.join(processedBackupDir, backupFileName);
      
      await fs.copyFile(processedFilePath, backupFilePath);
      
      console.log(`✅ Processed video backed up: ${backupFileName}`);
      return {
        success: true,
        backupPath: backupFilePath,
        backupFileName: backupFileName
      };
    } catch (error) {
      console.error('❌ Processed video backup failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get user's backup files (admin only)
   */
  async getUserVideoBackups(userId) {
    try {
      const videoBackupDir = await this.ensureVideoBackupDirectory();
      const userBackupDir = path.join(videoBackupDir, userId.toString());
      
      try {
        await fs.access(userBackupDir);
      } catch {
        return { success: true, backups: [] };
      }

      const files = await fs.readdir(userBackupDir, { withFileTypes: true });
      const backups = [];

      for (const file of files) {
        if (file.isFile()) {
          const filePath = path.join(userBackupDir, file.name);
          const stats = await fs.stat(filePath);
          
          backups.push({
            fileName: file.name,
            filePath: filePath,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            type: 'original'
          });
        } else if (file.isDirectory() && file.name === 'processed') {
          // Get processed videos
          const processedDir = path.join(userBackupDir, 'processed');
          const processedFiles = await fs.readdir(processedDir);
          
          for (const processedFile of processedFiles) {
            const processedFilePath = path.join(processedDir, processedFile);
            const stats = await fs.stat(processedFilePath);
            
            backups.push({
              fileName: processedFile,
              filePath: processedFilePath,
              size: stats.size,
              createdAt: stats.birthtime,
              modifiedAt: stats.mtime,
              type: 'processed'
            });
          }
        }
      }

      return { success: true, backups: backups.sort((a, b) => b.createdAt - a.createdAt) };
    } catch (error) {
      console.error('❌ Failed to get user video backups:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all video backups (admin only)
   */
  async getAllVideoBackups() {
    try {
      const videoBackupDir = await this.ensureVideoBackupDirectory();
      
      try {
        await fs.access(videoBackupDir);
      } catch {
        return { success: true, backups: {} };
      }

      const userDirs = await fs.readdir(videoBackupDir, { withFileTypes: true });
      const allBackups = {};

      for (const userDir of userDirs) {
        if (userDir.isDirectory()) {
          const userId = userDir.name;
          const userBackups = await this.getUserVideoBackups(userId);
          if (userBackups.success) {
            allBackups[userId] = userBackups.backups;
          }
        }
      }

      return { success: true, backups: allBackups };
    } catch (error) {
      console.error('❌ Failed to get all video backups:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete video backup file (admin only)
   */
  async deleteVideoBackup(userId, fileName) {
    try {
      const videoBackupDir = await this.ensureVideoBackupDirectory();
      const userBackupDir = path.join(videoBackupDir, userId.toString());
      let filePath = path.join(userBackupDir, fileName);
      
      // Check if it's in processed folder
      try {
        await fs.access(filePath);
      } catch {
        filePath = path.join(userBackupDir, 'processed', fileName);
      }
      
      try {
        await fs.unlink(filePath);
        console.log(`✅ Video backup deleted: ${fileName}`);
        return { success: true };
      } catch {
        return { success: false, error: 'Backup file not found' };
      }
    } catch (error) {
      console.error('❌ Failed to delete video backup:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get video backup storage statistics (admin only)
   */
  async getVideoBackupStats() {
    try {
      const videoBackupDir = await this.ensureVideoBackupDirectory();
      
      try {
        await fs.access(videoBackupDir);
      } catch {
        return { 
          success: true, 
          stats: { totalUsers: 0, totalFiles: 0, totalSize: 0 } 
        };
      }

      const userDirs = await fs.readdir(videoBackupDir, { withFileTypes: true });
      let totalFiles = 0;
      let totalSize = 0;

      for (const userDir of userDirs) {
        if (userDir.isDirectory()) {
          const userBackups = await this.getUserVideoBackups(userDir.name);
          if (userBackups.success) {
            totalFiles += userBackups.backups.length;
            totalSize += userBackups.backups.reduce((sum, backup) => sum + backup.size, 0);
          }
        }
      }

      return {
        success: true,
        stats: {
          totalUsers: userDirs.length,
          totalFiles: totalFiles,
          totalSize: totalSize,
          totalSizeFormatted: this.formatBytes(totalSize)
        }
      };
    } catch (error) {
      console.error('❌ Failed to get video backup stats:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new BackupService();