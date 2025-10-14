// Image optimization utilities for better performance

/**
 * Preload critical images
 * @param {string[]} imageUrls - Array of image URLs to preload
 */
export const preloadImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

/**
 * Create responsive image srcSet
 * @param {string} baseUrl - Base image URL
 * @param {number[]} sizes - Array of sizes for responsive images
 * @returns {string} srcSet string
 */
export const createResponsiveSrcSet = (baseUrl, sizes = [320, 640, 1024, 1280]) => {
  return sizes.map(size => `${baseUrl}?w=${size} ${size}w`).join(', ');
};

/**
 * Lazy load image with intersection observer
 * @param {HTMLImageElement} img - Image element
 * @param {string} src - Image source URL
 * @param {Object} options - Intersection observer options
 */
export const lazyLoadImage = (img, src, options = { threshold: 0.1 }) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const image = entry.target;
        image.src = src;
        image.classList.remove('lazy');
        observer.unobserve(image);
      }
    });
  }, options);

  observer.observe(img);
};

/**
 * Optimize image quality based on connection speed
 * @param {string} baseUrl - Base image URL
 * @returns {string} Optimized image URL
 */
export const getOptimizedImageUrl = (baseUrl) => {
  // Check for slow connection
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
  
  if (isSlowConnection) {
    return `${baseUrl}?quality=60&format=webp`;
  }
  
  return `${baseUrl}?quality=80&format=webp`;
};

/**
 * Create WebP fallback for older browsers
 * @param {string} webpUrl - WebP image URL
 * @param {string} fallbackUrl - Fallback image URL (JPEG/PNG)
 * @returns {Object} Picture element props
 */
export const createWebPFallback = (webpUrl, fallbackUrl) => {
  return {
    sources: [
      { srcSet: webpUrl, type: 'image/webp' },
      { srcSet: fallbackUrl, type: 'image/jpeg' }
    ]
  };
};