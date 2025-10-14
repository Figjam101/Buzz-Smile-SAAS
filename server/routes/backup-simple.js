const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs').promises;
const fsRaw = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const { auth } = require('../middleware/auth');

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * Calculate directory size recursively
 */
async function getDirectorySize(dirPath) {
  let total = 0;
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      // Skip large/unnecessary directories
      if ([
        'node_modules',
        '.git',
        'logs',
        'mongodb-data',
        'backups',
        'build',
        '.cache',
        // Added heavy media and tooling directories
        'uploads',
        'downloads',
        'ffmpeg-bin',
        'mongodb-portable',
        'mongodb-macos-aarch64-7.0.4'
      ].includes(entry.name)) {
        continue;
      }
      total += await getDirectorySize(fullPath);
    } else {
      try {
        const stat = await fs.stat(fullPath);
        total += stat.size;
      } catch {}
    }
  }
  return total;
}

/**
 * Copy directory recursively
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      // Skip node_modules, .git, logs, and other large/unnecessary directories
      if ([
        'node_modules',
        '.git',
        'logs',
        'mongodb-data',
        'backups',
        'build',
        '.cache',
        // Added heavy media and tooling directories
        'uploads',
        'downloads',
        'ffmpeg-bin',
        'mongodb-portable',
        'mongodb-macos-aarch64-7.0.4'
      ].includes(entry.name)) {
        continue;
      }
      await copyDirectory(srcPath, destPath);
    } else {
      // Skip large files and sensitive files
      if (
        entry.name.endsWith('.log') ||
        entry.name === '.env' ||
        entry.name.endsWith('.tar.gz') ||
        // Skip common media/video artifacts at file level
        entry.name.endsWith('.mp4') ||
        entry.name.endsWith('.mov') ||
        entry.name.endsWith('.mkv') ||
        entry.name.endsWith('.avi') ||
        entry.name.endsWith('.webm')
      ) {
        continue;
      }
      try {
        await fs.copyFile(srcPath, destPath);
      } catch (error) {
        console.log(`⚠️ Skipped file ${entry.name}: ${error.message}`);
      }
    }
  }
}

/**
 * @route   POST /api/backup-simple/create
 * @desc    Create a comprehensive website backup
 * @access  Admin only
 */
router.post('/create', auth, requireAdmin, async (req, res) => {
  try {
    // Direct backups to a target directory (allows avoiding Cloud Drive path)
    let backupTargetDir = process.env.BACKUP_TARGET_DIR || process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    try {
      await fs.mkdir(backupTargetDir, { recursive: true });
    } catch (dirErr) {
      const tmpFallback = path.join('/tmp', 'backups');
      console.warn(`⚠️ Backup target dir not writable (${backupTargetDir}). Falling back to ${tmpFallback}.`, dirErr?.message || dirErr);
      backupTargetDir = tmpFallback;
      await fs.mkdir(backupTargetDir, { recursive: true });
    }

    // Create timestamp and names
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `backup-${timestamp}`;
    const tmpDir = path.join(require('os').tmpdir(), 'buzzsmile-backups');
    const workingDir = path.join(tmpDir, backupName);
    await fs.mkdir(workingDir, { recursive: true });

    console.log(`📦 Creating compressed website backup: ${backupName}`);

    // 1) Export Database to working directory (resilient)
    console.log('📄 Exporting database (JSON)...');
    let backupData = {};
    let dbExportError = null;
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      for (const collection of collections) {
        const collectionName = collection.name;
        const data = await mongoose.connection.db.collection(collectionName).find({}).toArray();
        backupData[collectionName] = data;
      }
    } catch (dbErr) {
      dbExportError = dbErr;
      console.error('❌ Database export failed:', dbErr?.message || dbErr);
    }
    const databaseDir = path.join(workingDir, 'database');
    await fs.mkdir(databaseDir, { recursive: true });
    const dbBackupFile = path.join(databaseDir, 'database-backup.json');
    if (dbExportError) {
      await fs.writeFile(dbBackupFile, JSON.stringify({ error: dbExportError?.message || String(dbExportError) }, null, 2));
    } else {
      await fs.writeFile(dbBackupFile, JSON.stringify(backupData, null, 2));
    }

    // 2) Create manifest in working directory
    const manifest = {
      version: '2.0.0',
      type: 'full-website-backup',
      created: new Date().toISOString(),
      database: {
        collections: Object.keys(backupData),
        totalRecords: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0),
        error: dbExportError ? (dbExportError?.message || String(dbExportError)) : undefined
      }
    };
    const manifestFile = path.join(workingDir, 'backup-manifest.json');
    await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2));

    // 3) Build tar.gz directly from source directories with robust excludes
    // Robustly resolve project root relative to this file location (safer than process.cwd())
    const serverDir = path.resolve(__dirname, '..'); // buzz-smile-saas/server
    const projectDir = path.resolve(serverDir, '..'); // buzz-smile-saas
    console.log(`🔧 Resolved dirs for backup: serverDir=${serverDir}, projectDir=${projectDir}`);
    const archivePath = path.join(backupTargetDir, `${backupName}.tar.gz`);
    const excludes = [
      "--exclude='**/node_modules'",
      "--exclude='**/.git'",
      "--exclude='**/logs'",
      "--exclude='**/mongodb-data'",
      "--exclude='**/backups'",
      "--exclude='**/build'",
      "--exclude='**/.cache'",
      "--exclude='**/.env'",
      "--exclude='**/*.log'",
      "--exclude='**/*.mp4'",
      "--exclude='**/*.mov'",
      "--exclude='**/*.mkv'",
      "--exclude='**/*.avi'",
      "--exclude='**/*.webm'",
      "--exclude='**/uploads'",
      "--exclude='**/downloads'",
      "--exclude='**/ffmpeg-bin'",
      "--exclude='**/mongodb-portable'",
      "--exclude='**/mongodb-macos-aarch64-7.0.4'"
    ].join(' ');

    // Include workingDir (database + manifest), server, client, and root configs
    // Config files may live in project root (buzz-smile-saas) or workspace root (SAAS WEBSITE)
    const projectConfigFiles = [
      'package.json',
      'DEPLOYMENT-CHECKLIST.md',
      'ENTERPRISE-FEATURES.md'
    ];
    const workspaceConfigFiles = [
      'railway.json',
      'vercel.json',
      'nixpacks.toml'
    ];

    // Resolve existing files in each location to avoid tar errors
    const projectExisting = [];
    for (const f of projectConfigFiles) {
      try { await fs.access(path.join(projectDir, f)); projectExisting.push(`'${f}'`); } catch {}
    }
    const workspaceRoot = path.resolve(projectDir, '..');
    const workspaceExisting = [];
    for (const f of workspaceConfigFiles) {
      try { await fs.access(path.join(workspaceRoot, f)); workspaceExisting.push(`'${f}'`); } catch {}
    }

    // Only include directories that actually exist to avoid tar errors
    const includeDirs = [];
    try { await fs.access(path.join(projectDir, 'server')); includeDirs.push('server'); } catch {}
    try { await fs.access(path.join(projectDir, 'client')); includeDirs.push('client'); } catch {}

    const parts = [
      `tar -czf "${archivePath}" ${excludes}`,
      `-C "${workingDir}" database backup-manifest.json`,
      ...(includeDirs.length || projectExisting.length ? [`-C "${projectDir}" ${includeDirs.join(' ')} ${projectExisting.join(' ')}`] : [])
    ];
    if (workspaceExisting.length) {
      parts.push(`-C "${workspaceRoot}" ${workspaceExisting.join(' ')}`);
    }
    const command = parts.join(' ');

    console.log('🗜️ Creating archive with tar...');
    try {
      await execAsync(command);

      // Clean up working directory
      try {
        await execAsync(`rm -rf "${workingDir}"`);
      } catch {}

      console.log(`✅ Compressed backup created: ${archivePath}`);

      return res.json({
        message: 'Full website backup created successfully',
        backup: backupName,
        path: archivePath,
        compressed: true,
        type: 'full-website-backup',
        database: {
          collections: manifest.database.collections.length,
          records: manifest.database.totalRecords
        }
      });
    } catch (tarError) {
      console.error('❌ Tar archiving failed, falling back to directory copy:', tarError?.message || tarError);
      // Fallback: create an uncompressed directory backup that download endpoint can zip-stream
      const dirBackupPath = path.join(backupTargetDir, backupName);
      await fs.mkdir(dirBackupPath, { recursive: true });

      // Copy working directory contents (database export + manifest)
      try {
        await copyDirectory(workingDir, dirBackupPath);
      } catch (copyErr) {
        console.error('❌ Failed to copy working directory:', copyErr?.message || copyErr);
        throw copyErr;
      }

      // Copy server and client (respecting copyDirectory excludes)
      const projectServerPath = path.join(projectDir, 'server');
      const projectClientPath = path.join(projectDir, 'client');
      try {
        await fs.access(projectServerPath);
        await copyDirectory(projectServerPath, path.join(dirBackupPath, 'server'));
      } catch {}
      try {
        await fs.access(projectClientPath);
        await copyDirectory(projectClientPath, path.join(dirBackupPath, 'client'));
      } catch {}

      // Copy project config files if they exist
      for (const f of projectConfigFiles) {
        try {
          const src = path.join(projectDir, f);
          await fs.access(src);
          const dest = path.join(dirBackupPath, 'config', f);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.copyFile(src, dest);
        } catch {}
      }
      // Copy workspace config files
      try {
        const workspaceRootDir = path.join(projectDir, '..');
        for (const f of workspaceConfigFiles) {
          try {
            const src = path.join(workspaceRootDir, f);
            await fs.access(src);
            const dest = path.join(dirBackupPath, 'config', f);
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.copyFile(src, dest);
          } catch {}
        }
      } catch {}

      // Clean up working directory
      try {
        await execAsync(`rm -rf "${workingDir}"`);
      } catch {}

      console.log(`✅ Directory backup created at: ${dirBackupPath}`);
      return res.json({
        message: 'Full website backup created successfully (fallback directory mode)',
        backup: backupName,
        path: dirBackupPath,
        compressed: false,
        type: 'full-website-backup',
        database: {
          collections: manifest.database.collections.length,
          records: manifest.database.totalRecords
        },
        note: 'Tar not available on host; used portable directory copy fallback'
      });
    }

  } catch (error) {
    console.error('❌ Backup creation failed:', error);
    res.status(500).json({
      message: 'Backup failed',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/backup-simple/list
 * @desc    List available full website backups (directories and compressed files)
 * @access  Admin only
 */
router.get('/list', auth, requireAdmin, async (req, res) => {
  try {
    const backupDir = process.env.BACKUP_TARGET_DIR || process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    await fs.mkdir(backupDir, { recursive: true });

    const files = await fs.readdir(backupDir);
    const backups = [];

    for (const file of files) {
      const filePath = path.join(backupDir, file);
      const stat = await fs.stat(filePath);

      // Uncompressed directory backups
      if (stat.isDirectory() && file.startsWith('backup-')) {
        backups.push({
          name: file,
          created: stat.birthtime,
          size: await getDirectorySize(filePath),
          compressed: false
        });
      }

      // Compressed backups created by legacy service
      if (!stat.isDirectory() && file.startsWith('backup-') && file.endsWith('.tar.gz')) {
        backups.push({
          name: file.replace(/\.tar\.gz$/, ''),
          created: stat.birthtime,
          size: stat.size,
          compressed: true
        });
      }
    }

    // Sort by created desc
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({ backups, total: backups.length });
  } catch (error) {
    console.error('❌ Backup list failed:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   GET /api/backup-simple/download/:backupName
 * @desc    Download a backup file
 * @access  Admin only
 */
router.get('/download/:backupName', auth, requireAdmin, async (req, res) => {
  try {
    const { backupName } = req.params;
    const backupDir = process.env.BACKUP_TARGET_DIR || process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, backupName);
    const tarGzPath = path.join(backupDir, `${backupName}.tar.gz`);

    // Prefer directory backup; if missing, fall back to tar.gz
    let mode = null;
    try {
      const stat = await fs.stat(backupPath);
      if (stat.isDirectory()) mode = 'directory';
    } catch {}

    if (!mode) {
      try {
        const statFile = await fs.stat(tarGzPath);
        if (statFile.isFile()) mode = 'tar';
      } catch {}
    }

    if (!mode) {
      return res.status(404).json({ message: 'Backup not found' });
    }

    if (mode === 'directory') {
      // Stream a zip of the backup directory
      const archiver = require('archiver');
      const archive = archiver('zip', { zlib: { level: 9 } });

      // Set response headers
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${backupName}.zip"`);

      archive.on('error', (err) => {
        console.error('Archiver error:', err);
        if (!res.headersSent) {
          res.status(500).end('Archive error');
        } else {
          try { res.end(); } catch {}
        }
      });

      // Abort archiver if client disconnects
      req.on('close', () => {
        try { archive.abort(); } catch {}
      });

      // Pipe archive to response
      archive.pipe(res);
      archive.directory(backupPath, backupName);
      archive.finalize();
      console.log(`📥 Backup downloaded (zip stream): ${backupName}`);
      return;
    }

    // Fall back: stream existing tar.gz file
    res.setHeader('Content-Type', 'application/gzip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupName}.tar.gz"`);
    const readStream = fsRaw.createReadStream(tarGzPath);
    readStream.on('error', (err) => {
      console.error('Download stream error:', err);
      if (!res.headersSent) {
        res.status(500).end('Stream error');
      } else {
        try { res.end(); } catch {}
      }
    });
    readStream.pipe(res);
    console.log(`📥 Backup downloaded (tar.gz): ${backupName}`);

  } catch (error) {
    console.error('❌ Backup download failed:', error);
    res.status(500).json({
      message: 'Download failed',
      error: error.message
    });
  }
});

module.exports = router;