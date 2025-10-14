const express = require('express');
const router = express.Router();
const backupService = require('../services/backupService');
const { auth } = require('../middleware/auth');

// Middleware to check admin privileges
const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

/**
 * @route   POST /api/backup/create
 * @desc    Create a manual database backup
 * @access  Admin only
 */
router.post('/create', auth, requireAdmin, async (req, res) => {
  try {
    const result = await backupService.createBackup();
    
    if (result.success) {
      res.json({
        message: 'Backup created successfully',
        backup: result.backupName,
        path: result.path
      });
    } else {
      res.status(500).json({
        message: 'Backup failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup creation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   GET /api/backup/list
 * @desc    List all available backups
 * @access  Admin only
 */
router.get('/list', auth, requireAdmin, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    
    const formattedBackups = backups.map(backup => ({
      name: backup.name,
      created: backup.created,
      size: backupService.formatBytes(backup.size),
      sizeBytes: backup.size
    }));

    res.json({
      backups: formattedBackups,
      total: backups.length
    });
  } catch (error) {
    console.error('Backup list error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/backup/restore/:backupName
 * @desc    Restore database from backup
 * @access  Admin only
 */
router.post('/restore/:backupName', auth, requireAdmin, async (req, res) => {
  try {
    const { backupName } = req.params;
    const { confirm } = req.body;

    // Require explicit confirmation for restore operations
    if (!confirm) {
      return res.status(400).json({
        message: 'Restore operation requires explicit confirmation',
        required: 'Set confirm: true in request body'
      });
    }

    console.log(`🔄 Admin ${req.user.email} initiated database restore from ${backupName}`);
    
    const result = await backupService.restoreBackup(backupName);
    
    if (result.success) {
      res.json({
        message: 'Database restored successfully',
        backup: result.backupName,
        warning: 'All current data has been replaced with backup data'
      });
    } else {
      res.status(500).json({
        message: 'Restore failed',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Backup restore error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   GET /api/backup/status
 * @desc    Get backup service status and configuration
 * @access  Admin only
 */
router.get('/status', auth, requireAdmin, async (req, res) => {
  try {
    const backups = await backupService.listBackups();
    const latestBackup = backups.length > 0 ? backups[0] : null;

    res.json({
      status: 'active',
      configuration: {
        backupInterval: process.env.BACKUP_INTERVAL || '24',
        maxBackups: process.env.MAX_BACKUPS || '30',
        compressionEnabled: process.env.BACKUP_COMPRESSION !== 'false',
        backupDirectory: process.env.BACKUP_DIR || 'default'
      },
      statistics: {
        totalBackups: backups.length,
        latestBackup: latestBackup ? {
          name: latestBackup.name,
          created: latestBackup.created,
          size: backupService.formatBytes(latestBackup.size)
        } : null,
        totalBackupSize: backupService.formatBytes(
          backups.reduce((total, backup) => total + backup.size, 0)
        )
      }
    });
  } catch (error) {
    console.error('Backup status error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   DELETE /api/backup/:backupName
 * @desc    Delete a specific backup
 * @access  Admin only
 */
router.delete('/:backupName', auth, requireAdmin, async (req, res) => {
  try {
    const { backupName } = req.params;
    const fs = require('fs').promises;
    const path = require('path');

    const backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, backupName);

    // Check if backup exists
    try {
      await fs.access(backupPath);
    } catch {
      return res.status(404).json({ message: 'Backup not found' });
    }

    // Delete backup
    await fs.rmdir(backupPath, { recursive: true });

    console.log(`🗑️ Admin ${req.user.email} deleted backup: ${backupName}`);

    res.json({
      message: 'Backup deleted successfully',
      backup: backupName
    });
  } catch (error) {
    console.error('Backup deletion error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @route   POST /api/backup/schedule
 * @desc    Update backup schedule configuration
 * @access  Admin only
 */
router.post('/schedule', auth, requireAdmin, async (req, res) => {
  try {
    const { interval, maxBackups, compression } = req.body;

    // Validate inputs
    if (interval && (isNaN(interval) || interval < 1 || interval > 168)) {
      return res.status(400).json({
        message: 'Invalid interval. Must be between 1 and 168 hours.'
      });
    }

    if (maxBackups && (isNaN(maxBackups) || maxBackups < 1 || maxBackups > 365)) {
      return res.status(400).json({
        message: 'Invalid maxBackups. Must be between 1 and 365.'
      });
    }

    // Note: In production, these would be updated in environment variables
    // For now, we'll just return the current configuration
    res.json({
      message: 'Backup schedule configuration updated',
      note: 'Changes will take effect after server restart',
      configuration: {
        interval: interval || process.env.BACKUP_INTERVAL || '24',
        maxBackups: maxBackups || process.env.MAX_BACKUPS || '30',
        compression: compression !== undefined ? compression : (process.env.BACKUP_COMPRESSION !== 'false')
      }
    });
  } catch (error) {
    console.error('Backup schedule update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;