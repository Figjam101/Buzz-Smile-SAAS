const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class GoogleDriveService {
  constructor() {
    this.drive = null;
    this.auth = null;
  }

  // Initialize Google Drive API with service account credentials
  async initialize() {
    try {
      // Load service account credentials from environment or file
      const credentials = process.env.GOOGLE_DRIVE_CREDENTIALS 
        ? JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS)
        : require('../google-drive-credentials.json');

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('Google Drive API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Drive API:', error);
      throw error;
    }
  }

  // Create a folder in Google Drive
  async createFolder(folderName, parentFolderId = null) {
    try {
      const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : undefined
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: 'id'
      });

      return response.data.id;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  }

  // Upload a file to Google Drive
  async uploadFile(filePath, fileName, folderId = null, mimeType = 'video/mp4') {
    try {
      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined
      };

      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath)
      };

      const response = await this.drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink'
      });

      return {
        fileId: response.data.id,
        fileName: response.data.name,
        webViewLink: response.data.webViewLink
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  // Create user-specific folder structure
  async createUserFolder(userId, userName) {
    try {
      // Create main user folder
      const userFolderName = `User_${userId}_${userName}`;
      const userFolderId = await this.createFolder(userFolderName);

      // Create subfolders for raw and processed videos
      const rawFolderId = await this.createFolder('Raw_Videos', userFolderId);
      const processedFolderId = await this.createFolder('Processed_Videos', userFolderId);

      return {
        userFolderId,
        rawFolderId,
        processedFolderId
      };
    } catch (error) {
      console.error('Error creating user folder structure:', error);
      throw error;
    }
  }

  // Upload raw video backup
  async uploadRawVideo(filePath, userId, originalFileName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `RAW_${timestamp}_${originalFileName}`;
      
      // Get or create user folder structure
      const userFolders = await this.getUserFolders(userId);
      
      return await this.uploadFile(filePath, fileName, userFolders.rawFolderId);
    } catch (error) {
      console.error('Error uploading raw video:', error);
      throw error;
    }
  }

  // Upload processed video
  async uploadProcessedVideo(filePath, userId, originalFileName) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `PROCESSED_${timestamp}_${originalFileName}`;
      
      // Get or create user folder structure
      const userFolders = await this.getUserFolders(userId);
      
      return await this.uploadFile(filePath, fileName, userFolders.processedFolderId);
    } catch (error) {
      console.error('Error uploading processed video:', error);
      throw error;
    }
  }

  // Get user folder structure (create if doesn't exist)
  async getUserFolders(userId) {
    try {
      // In a real implementation, you'd store folder IDs in your database
      // For now, we'll create new folders each time
      // You should modify this to check your database first
      
      const user = await this.getUserFromDatabase(userId);
      if (user && user.googleDriveFolders) {
        return user.googleDriveFolders;
      }

      // Create new folder structure
      const folders = await this.createUserFolder(userId, user?.name || 'Unknown');
      
      // Save folder IDs to database
      await this.saveUserFoldersToDatabase(userId, folders);
      
      return folders;
    } catch (error) {
      console.error('Error getting user folders:', error);
      throw error;
    }
  }

  // Placeholder methods - you'll need to implement these based on your database
  async getUserFromDatabase(userId) {
    // Import User model
    const User = require('../models/User');
    try {
      const user = await User.findById(userId);
      return user;
    } catch (error) {
      console.error('Error fetching user from database:', error);
      return null;
    }
  }

  async saveUserFoldersToDatabase(userId, folders) {
    // Import User model
    const User = require('../models/User');
    try {
      await User.findByIdAndUpdate(userId, {
        googleDriveFolders: folders
      });
      console.log(`Saved Google Drive folders for user ${userId}`);
    } catch (error) {
      console.error('Error saving user folders to database:', error);
      throw error;
    }
  }

  // Download file from Google Drive
  async downloadFile(fileId) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      }, {
        responseType: 'stream'
      });
      
      return response.data;
    } catch (error) {
      console.error('Error downloading file from Google Drive:', error);
      throw error;
    }
  }

  // Get Google Drive storage information
  async getDriveInfo() {
    try {
      const response = await this.drive.about.get({
        fields: 'storageQuota'
      });
      
      return {
        totalSpace: response.data.storageQuota.limit,
        usedSpace: response.data.storageQuota.usage,
        availableSpace: response.data.storageQuota.limit - response.data.storageQuota.usage
      };
    } catch (error) {
      console.error('Error getting drive info:', error);
      return {
        totalSpace: 'Unknown',
        usedSpace: 'Unknown', 
        availableSpace: 'Unknown'
      };
    }
  }

  // List files in a folder (for admin interface)
  async listFilesInFolder(folderId) {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents`,
        fields: 'files(id, name, createdTime, size, webViewLink)'
      });

      return response.data.files;
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  // Download file from Google Drive
  async downloadFile(fileId, destinationPath) {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        alt: 'media'
      });

      const writer = fs.createWriteStream(destinationPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();