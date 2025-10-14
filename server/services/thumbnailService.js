const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');

class ThumbnailService {
  constructor() {
    this.thumbnailsDir = path.join(__dirname, '../uploads/thumbnails');
    this.ensureThumbnailsDirectory();
    this.configureFfmpeg();
  }

  configureFfmpeg() {
    try {
      // Check if we're in production environment
      if (process.env.NODE_ENV === 'production') {
        // Use system FFmpeg in production (Railway/Heroku)
        ffmpeg.setFfmpegPath('/usr/bin/ffmpeg');
        ffmpeg.setFfprobePath('/usr/bin/ffprobe');
        console.log('ThumbnailService: Using system FFmpeg for production');
      } else {
        // Use @ffmpeg-installer for development
        const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
        ffmpeg.setFfmpegPath(ffmpegInstaller.path);
        
        // Try to set ffprobe path - it should be in the same directory as ffmpeg
        const ffprobePath = ffmpegInstaller.path.replace('ffmpeg', 'ffprobe');
        
        // Check if ffprobe exists, if not, disable ffprobe-dependent features
        const fs = require('fs');
        if (fs.existsSync(ffprobePath)) {
          ffmpeg.setFfprobePath(ffprobePath);
          console.log('ThumbnailService: FFprobe path set to:', ffprobePath);
        } else {
          console.warn('ThumbnailService: FFprobe not found, some features may be limited');
        }
        
        console.log('ThumbnailService: FFmpeg path set to:', ffmpegInstaller.path);
      }
    } catch (error) {
      console.warn('ThumbnailService: FFmpeg installer not found, using system paths');
      // Fallback to system FFmpeg
      ffmpeg.setFfmpegPath('ffmpeg');
      ffmpeg.setFfprobePath('ffprobe');
    }
  }

  ensureThumbnailsDirectory() {
    if (!fs.existsSync(this.thumbnailsDir)) {
      fs.mkdirSync(this.thumbnailsDir, { recursive: true });
    }
  }

  /**
   * Generate thumbnail from video file
   * @param {string} videoPath - Path to the video file
   * @param {string} videoId - Video ID for naming the thumbnail
   * @param {Object} options - Thumbnail generation options
   * @returns {Promise<string>} - Path to generated thumbnail
   */
  async generateThumbnail(videoPath, videoId, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // Check if video file exists
        if (!fs.existsSync(videoPath)) {
          throw new Error(`Video file not found: ${videoPath}`);
        }

        const {
          timeOffset = '00:00:00.5', // Extract frame at 0.5 seconds
          width = 320,
          height = 180,
          quality = 2 // 1-31, lower is better quality
        } = options;

        const thumbnailFilename = `thumb_${videoId}.jpg`;
        const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);

        // Remove existing thumbnail if it exists
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }

        ffmpeg(videoPath)
          .seekInput(timeOffset)
          .frames(1)
          .size(`${width}x${height}`)
          .outputOptions([
            '-q:v', quality.toString(),
            '-f', 'image2'
          ])
          .output(thumbnailPath)
          .on('start', (commandLine) => {
            console.log('FFmpeg command:', commandLine);
          })
          .on('end', () => {
            // Add a small delay to ensure file is written
            setTimeout(() => {
              console.log(`Thumbnail generated successfully: ${thumbnailPath}`);
              console.log('File exists after generation:', fs.existsSync(thumbnailPath));
              resolve(thumbnailPath);
            }, 100);
          })
          .on('error', (err) => {
            console.error('Error generating thumbnail:', err);
            reject(new Error(`Failed to generate thumbnail: ${err.message}`));
          })
          .run();
      } catch (error) {
        console.error('Thumbnail generation error:', error);
        reject(error);
      }
    });
  }

  /**
   * Generate multiple thumbnails at different time points
   * @param {string} videoPath - Path to the video file
   * @param {string} videoId - Video ID for naming thumbnails
   * @param {Array} timePoints - Array of time points (e.g., ['00:00:01', '00:00:05', '00:00:10'])
   * @returns {Promise<Array>} - Array of thumbnail paths
   */
  async generateMultipleThumbnails(videoPath, videoId, timePoints = ['00:00:01', '00:00:05', '00:00:10']) {
    const thumbnailPromises = timePoints.map((timePoint, index) => {
      const thumbnailFilename = `thumb_${videoId}_${index + 1}.jpg`;
      const thumbnailPath = path.join(this.thumbnailsDir, thumbnailFilename);
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timePoint)
          .frames(1)
          .size('320x180')
          .outputOptions(['-q:v', '2', '-f', 'image2'])
          .output(thumbnailPath)
          .on('end', () => resolve(thumbnailPath))
          .on('error', reject)
          .run();
      });
    });

    try {
      const thumbnailPaths = await Promise.all(thumbnailPromises);
      console.log(`Generated ${thumbnailPaths.length} thumbnails for video ${videoId}`);
      return thumbnailPaths;
    } catch (error) {
      console.error('Error generating multiple thumbnails:', error);
      throw error;
    }
  }

  /**
   * Get video duration to help determine optimal thumbnail extraction time
   * @param {string} videoPath - Path to the video file
   * @returns {Promise<number>} - Video duration in seconds
   */
  async getVideoDuration(videoPath) {
    return new Promise((resolve, reject) => {
      // Create a new ffmpeg command to get video info
      const command = ffmpeg(videoPath);
      
      // Use ffmpeg to get duration instead of ffprobe
      command
        .on('error', (err) => {
          console.warn('Could not get video duration, using default:', err.message);
          // Return a default duration of 10 seconds if we can't get the actual duration
          resolve(10);
        })
        .on('codecData', (data) => {
          if (data.duration) {
            const duration = this.parseDuration(data.duration);
            resolve(duration);
          } else {
            resolve(10); // Default fallback
          }
        })
        .format('null')
        .output('/dev/null')
        .run();
    });
  }

  /**
   * Parse duration string to seconds
   * @param {string} durationStr - Duration in format "HH:MM:SS.ms"
   * @returns {number} - Duration in seconds
   */
  parseDuration(durationStr) {
    if (!durationStr) return 10;
    
    const parts = durationStr.split(':');
    if (parts.length === 3) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      const seconds = parseFloat(parts[2]) || 0;
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    return 10; // Default fallback
  }

  /**
   * Generate thumbnail at optimal time (10% into the video or 1 second, whichever is greater)
   * @param {string} videoPath - Path to the video file
   * @param {string} videoId - Video ID for naming the thumbnail
   * @returns {Promise<string>} - Path to generated thumbnail
   */
  async generateOptimalThumbnail(videoPath, videoId) {
    try {
      const duration = await this.getVideoDuration(videoPath);
      
      // Try multiple time offsets to handle corrupted frames
      const timeOffsets = [
        Math.max(0.5, duration * 0.1),  // 10% of duration, minimum 0.5s
        0.5,                            // Fallback to 0.5s
        duration * 0.2,                 // 20% of duration
        duration * 0.5,                 // 50% of duration
        2.0                             // Fixed 2 seconds
      ];
      
      for (const timeOffset of timeOffsets) {
        try {
          const timeString = this.secondsToTimeString(timeOffset);
          console.log(`Attempting thumbnail generation at ${timeString}`);
          
          const thumbnailPath = await this.generateThumbnail(videoPath, videoId, { 
            timeOffset: timeString 
          });
          
          // Verify the file was actually created
          if (fs.existsSync(thumbnailPath)) {
            console.log(`Successfully generated thumbnail at ${timeString}`);
            return thumbnailPath;
          } else {
            console.log(`Thumbnail generation reported success but file not found at ${timeString}`);
          }
        } catch (error) {
          console.log(`Failed to generate thumbnail at ${timeOffset}s: ${error.message}`);
          continue;
        }
      }
      
      throw new Error('Failed to generate thumbnail at any time offset');
    } catch (error) {
      console.error('Error generating optimal thumbnail:', error);
      // Final fallback to 0.5 seconds
      return await this.generateThumbnail(videoPath, videoId, { timeOffset: '00:00:00.5' });
    }
  }

  /**
   * Convert seconds to ffmpeg time string format
   * @param {number} seconds - Time in seconds
   * @returns {string} - Time string in HH:MM:SS format
   */
  secondsToTimeString(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    // Handle fractional seconds
    const wholeSeconds = Math.floor(secs);
    const fractionalPart = secs - wholeSeconds;
    
    if (fractionalPart > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}.${Math.round(fractionalPart * 10)}`;
    } else {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${wholeSeconds.toString().padStart(2, '0')}`;
    }
  }

  /**
   * Delete thumbnail file
   * @param {string} thumbnailPath - Path to thumbnail file
   */
  deleteThumbnail(thumbnailPath) {
    try {
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
        console.log(`Thumbnail deleted: ${thumbnailPath}`);
      }
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
    }
  }

  /**
   * Get thumbnail URL for serving via API
   * @param {string} videoId - Video ID
   * @returns {string} - Thumbnail filename
   */
  getThumbnailFilename(videoId) {
    return `thumb_${videoId}.jpg`;
  }

  /**
   * Check if thumbnail exists for a video
   * @param {string} videoId - Video ID
   * @returns {boolean} - Whether thumbnail exists
   */
  thumbnailExists(videoId) {
    const thumbnailPath = path.join(this.thumbnailsDir, this.getThumbnailFilename(videoId));
    return fs.existsSync(thumbnailPath);
  }
}

module.exports = new ThumbnailService();