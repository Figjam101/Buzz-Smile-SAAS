// Performance optimization utilities

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func(...args);
  };
};

/**
 * Throttle function to limit function execution rate
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Memoize function results for performance
 * @param {Function} fn - Function to memoize
 * @param {Function} getKey - Function to generate cache key
 * @returns {Function} Memoized function
 */
export const memoize = (fn, getKey = (...args) => JSON.stringify(args)) => {
  const cache = new Map();
  return (...args) => {
    const key = getKey(...args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
};

/**
 * Clean up memory by removing unused event listeners and observers
 * @param {Array} cleanupFunctions - Array of cleanup functions
 */
export const cleanupMemory = (cleanupFunctions) => {
  cleanupFunctions.forEach(cleanup => {
    if (typeof cleanup === 'function') {
      cleanup();
    }
  });
};

/**
 * Batch DOM updates for better performance
 * @param {Function} updateFunction - Function containing DOM updates
 */
export const batchDOMUpdates = (updateFunction) => {
  requestAnimationFrame(() => {
    updateFunction();
  });
};

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get optimal chunk size for large data processing
 * @param {number} totalItems - Total number of items
 * @param {number} maxChunkSize - Maximum chunk size
 * @returns {number} Optimal chunk size
 */
export const getOptimalChunkSize = (totalItems, maxChunkSize = 100) => {
  if (totalItems <= maxChunkSize) return totalItems;
  return Math.min(maxChunkSize, Math.ceil(totalItems / Math.ceil(totalItems / maxChunkSize)));
};

/**
 * Process large arrays in chunks to avoid blocking the main thread
 * @param {Array} array - Array to process
 * @param {Function} processor - Function to process each chunk
 * @param {number} chunkSize - Size of each chunk
 * @returns {Promise} Promise that resolves when processing is complete
 */
export const processInChunks = async (array, processor, chunkSize = 100) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    await new Promise(resolve => {
      setTimeout(() => {
        processor(chunk);
        resolve();
      }, 0);
    });
  }
};