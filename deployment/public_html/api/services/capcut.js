const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

class CapCutService {
  constructor() {
    this.apiUrl = process.env.CAPCUT_API_URL || 'https://api.capcut.com/v1';
    this.apiKey = process.env.CAPCUT_API_KEY;
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Upload video to CapCut for processing
   * @param {string} videoPath - Path to the video file
   * @param {Object} editingOptions - Editing options to apply
   * @returns {Promise<Object>} - CapCut task response
   */
  async uploadVideo(videoPath, editingOptions = {}) {
    try {
      // Use simulation in development or when API key is not configured
      if (process.env.NODE_ENV === 'development' || !this.apiKey || this.apiKey === 'your_capcut_api_key_here') {
        console.log('Using CapCut simulation mode for development');
        return await this.simulateProcessing(videoPath, editingOptions);
      }

      const formData = new FormData();
      formData.append('video', fs.createReadStream(videoPath));
      formData.append('options', JSON.stringify(editingOptions));

      const response = await axios.post(`${this.apiUrl}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000, // 60 seconds timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      return {
        success: true,
        taskId: response.data.task_id,
        status: response.data.status,
        message: response.data.message
      };
    } catch (error) {
      console.error('CapCut upload error:', error.response?.data || error.message);
      
      // Fallback to simulation if API fails
      console.log('CapCut API failed, falling back to simulation mode');
      return await this.simulateProcessing(videoPath, editingOptions);
    }
  }

  async applyEffects(videoPath, effects) {
    // Use simulation in development or when API key is not configured
    if (process.env.NODE_ENV === 'development' || !this.apiKey || this.apiKey === 'your_capcut_api_key_here') {
      console.log('Using CapCut simulation mode for effects processing');
      return await this.simulateProcessing(videoPath, effects);
    }
    
    try {
      return await this.uploadVideo(videoPath, this.buildEditingOptions(effects));
    } catch (error) {
      console.error('CapCut effects processing error:', error);
      // Fallback to simulation
      return await this.simulateProcessing(videoPath, effects);
    }
  }

  /**
   * Check the status of a CapCut processing task
   * @param {string} taskId - CapCut task ID
   * @returns {Promise<Object>} - Task status response
   */
  async getTaskStatus(taskId) {
    try {
      const response = await axios.get(`${this.apiUrl}/task/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 10000
      });

      return {
        success: true,
        status: response.data.status,
        progress: response.data.progress || 0,
        downloadUrl: response.data.download_url,
        expiresAt: response.data.expires_at,
        error: response.data.error
      };
    } catch (error) {
      console.error('CapCut status check error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Download processed video from CapCut
   * @param {string} downloadUrl - CapCut download URL
   * @param {string} outputPath - Local path to save the video
   * @returns {Promise<Object>} - Download result
   */
  async downloadVideo(downloadUrl, outputPath) {
    try {
      const response = await axios({
        method: 'GET',
        url: downloadUrl,
        responseType: 'stream',
        timeout: 300000, // 5 minutes timeout for download
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          resolve({
            success: true,
            filePath: outputPath,
            fileSize: fs.statSync(outputPath).size
          });
        });

        writer.on('error', (error) => {
          reject({
            success: false,
            error: error.message
          });
        });
      });
    } catch (error) {
      console.error('CapCut download error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Apply editing effects to a video
   * @param {string} videoPath - Path to the video file
   * @param {Object} effects - Effects to apply
   * @returns {Promise<Object>} - Processing result
   */
  async applyEffects(videoPath, effects) {
    const editingOptions = this.buildEditingOptions(effects);
    return await this.uploadVideo(videoPath, editingOptions);
  }

  /**
   * Build editing options object for CapCut API
   * @param {Object} effects - Effects configuration
   * @returns {Object} - CapCut-compatible options
   */
  buildEditingOptions(effects) {
    const options = {};

    // Auto enhancement
    if (effects.autoEnhance) {
      options.auto_enhance = {
        enabled: true,
        brightness: effects.brightness || 0,
        contrast: effects.contrast || 0,
        saturation: effects.saturation || 0
      };
    }

    // Background removal
    if (effects.removeBackground) {
      options.background_removal = {
        enabled: true,
        replacement_type: effects.backgroundType || 'blur',
        replacement_color: effects.backgroundColor || '#00FF00'
      };
    }

    // Subtitles
    if (effects.addSubtitles) {
      options.subtitles = {
        enabled: true,
        language: effects.subtitleLanguage || 'auto',
        style: effects.subtitleStyle || 'default',
        position: effects.subtitlePosition || 'bottom'
      };
    }

    // Video stabilization
    if (effects.stabilization) {
      options.stabilization = {
        enabled: true,
        strength: effects.stabilizationStrength || 'medium'
      };
    }

    // Output settings
    options.output = {
      format: effects.outputFormat || 'mp4',
      quality: effects.outputQuality || '1080p',
      fps: effects.outputFps || 30
    };

    return options;
  }

  /**
   * Retry mechanism for failed requests
   * @param {Function} operation - Operation to retry
   * @param {number} retries - Number of retries remaining
   * @returns {Promise<Object>} - Operation result
   */
  async retryOperation(operation, retries = this.maxRetries) {
    try {
      return await operation();
    } catch (error) {
      if (retries > 0) {
        console.log(`Operation failed, retrying in ${this.retryDelay}ms... (${retries} retries left)`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        return this.retryOperation(operation, retries - 1);
      }
      throw error;
    }
  }

  /**
   * Get supported video formats
   * @returns {Array} - Supported formats
   */
  getSupportedFormats() {
    return ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv'];
  }

  /**
   * Validate video file
   * @param {string} filePath - Path to video file
   * @returns {Object} - Validation result
   */
  validateVideo(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        return { valid: false, error: 'File does not exist' };
      }

      const stats = fs.statSync(filePath);
      const fileSize = stats.size;
      const maxSize = 1024 * 1024 * 1024; // 1GB limit

      if (fileSize > maxSize) {
        return { 
          valid: false, 
          error: `File size (${Math.round(fileSize / 1024 / 1024)}MB) exceeds limit (1GB)` 
        };
      }

      const ext = path.extname(filePath).toLowerCase().slice(1);
      if (!this.getSupportedFormats().includes(ext)) {
        return { 
          valid: false, 
          error: `Unsupported format: ${ext}. Supported: ${this.getSupportedFormats().join(', ')}` 
        };
      }

      return { 
        valid: true, 
        fileSize,
        format: ext 
      };
    } catch (error) {
      return { 
        valid: false, 
        error: error.message 
      };
    }
  }

  /**
   * Simulate CapCut processing for development/testing
   * @param {string} videoPath - Path to video file
   * @param {Object} editingOptions - Editing options
   * @returns {Promise<Object>} - Simulated response
   */
  async simulateProcessing(videoPath, editingOptions = {}) {
    // Simulate processing time
    const processingTime = Math.random() * 30000 + 10000; // 10-40 seconds
    
    return new Promise((resolve) => {
      setTimeout(() => {
        const taskId = `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        resolve({
          success: true,
          taskId,
          status: 'processing',
          message: 'Video processing started (simulated)'
        });
      }, 1000);
    });
  }

  /**
   * Simulate task status check for development/testing
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} - Simulated status
   */
  async simulateTaskStatus(taskId) {
    // Simulate different processing stages
    const random = Math.random();
    
    if (random < 0.3) {
      return {
        success: true,
        status: 'processing',
        progress: Math.floor(Math.random() * 80) + 10
      };
    } else if (random < 0.9) {
      return {
        success: true,
        status: 'completed',
        progress: 100,
        downloadUrl: `https://simulated-download.com/video/${taskId}.mp4`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      };
    } else {
      return {
        success: true,
        status: 'failed',
        progress: 0,
        error: 'Simulated processing error'
      };
    }
  }
}

module.exports = new CapCutService();