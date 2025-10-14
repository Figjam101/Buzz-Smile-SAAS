class UploadDebugger {
  constructor() {
    this.logs = [];
    this.currentUpload = null;
    this.startTime = null;
  }

  startUpload(file) {
    this.currentUpload = {
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      startTime: Date.now(),
      logs: []
    };
    this.startTime = Date.now();
    this.log('info', 'Upload started', { fileName: file.name, fileSize: file.size });
  }

  checkPrerequisites() {
    const token = localStorage.getItem('token');
    const result = {
      token: !!token,
      network: navigator.onLine
    };
    
    this.log('info', 'Prerequisites check', result);
    return result;
  }

  validateFile(file) {
    const maxSize = 500 * 1024 * 1024; // 500MB
    const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    
    const validation = {
      isValid: true,
      errors: [],
      warnings: []
    };

    if (file.size > maxSize) {
      validation.isValid = false;
      validation.errors.push('File size exceeds 500MB limit');
    }

    if (!allowedTypes.includes(file.type)) {
      validation.warnings.push(`File type ${file.type} may not be supported`);
    }

    this.log('info', 'File validation', validation);
    return validation;
  }

  logProgress(loaded, total) {
    const progress = Math.round((loaded / total) * 100);
    this.log('progress', 'Upload progress', { loaded, total, progress });
  }

  logNetworkRequest(method, url, headers, body) {
    this.log('network', 'Request sent', {
      method,
      url,
      headers: Object.keys(headers || {}),
      bodyType: body instanceof FormData ? 'FormData' : typeof body
    });
  }

  logNetworkResponse(status, statusText, responseText, responseTime) {
    this.log('network', 'Response received', {
      status,
      statusText,
      responseLength: responseText ? responseText.length : 0,
      responseTime
    });
  }

  logError(error, category = 'general') {
    this.log('error', `Error in ${category}`, {
      message: error.message,
      stack: error.stack
    });
  }

  log(level, message, data = {}) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data
    };

    this.logs.push(logEntry);
    
    if (this.currentUpload) {
      this.currentUpload.logs.push(logEntry);
    }

    // Console output for debugging
    const consoleMethod = level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'log';
    console[consoleMethod](`[UploadDebugger] ${message}`, data);
  }

  generateReport() {
    if (!this.currentUpload) return null;

    const endTime = Date.now();
    const duration = endTime - this.currentUpload.startTime;

    const report = {
      upload: this.currentUpload,
      duration,
      summary: {
        totalLogs: this.currentUpload.logs.length,
        errors: this.currentUpload.logs.filter(log => log.level === 'error').length,
        warnings: this.currentUpload.logs.filter(log => log.level === 'warning').length
      }
    };

    this.log('info', 'Upload session completed', report.summary);
    return report;
  }
}

// Create singleton instance
const uploadDebugger = new UploadDebugger();

export default uploadDebugger;