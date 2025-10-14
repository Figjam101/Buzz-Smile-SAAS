/**
 * Accessibility utilities for WCAG compliance
 */

/**
 * Check if user prefers reduced motion
 * @returns {boolean} True if user prefers reduced motion
 */
export const prefersReducedMotion = () => {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Check if user prefers high contrast
 * @returns {boolean} True if user prefers high contrast
 */
export const prefersHighContrast = () => {
  return window.matchMedia('(prefers-contrast: high)').matches;
};

/**
 * Announce text to screen readers
 * @param {string} message - Message to announce
 * @param {string} priority - Priority level ('polite' or 'assertive')
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;
  
  document.body.appendChild(announcement);
  
  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Trap focus within a container
 * @param {HTMLElement} container - Container element
 * @returns {Function} Cleanup function
 */
export const trapFocus = (container) => {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  };
  
  container.addEventListener('keydown', handleTabKey);
  
  // Focus first element
  if (firstElement) firstElement.focus();
  
  // Return cleanup function
  return () => {
    container.removeEventListener('keydown', handleTabKey);
  };
};

/**
 * Check color contrast ratio
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @returns {number} Contrast ratio
 */
export const getContrastRatio = (foreground, background) => {
  const getLuminance = (color) => {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

/**
 * Check if contrast ratio meets WCAG standards
 * @param {number} ratio - Contrast ratio
 * @param {string} level - WCAG level ('AA' or 'AAA')
 * @param {boolean} isLargeText - Whether text is large (18pt+ or 14pt+ bold)
 * @returns {boolean} True if meets standards
 */
export const meetsWCAGContrast = (ratio, level = 'AA', isLargeText = false) => {
  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
};

/**
 * Add skip link for keyboard navigation
 * @param {string} targetId - ID of main content
 */
export const addSkipLink = (targetId = 'main-content') => {
  const skipLink = document.createElement('a');
  skipLink.href = `#${targetId}`;
  skipLink.textContent = 'Skip to main content';
  skipLink.className = 'sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 bg-blue-600 text-white p-2 z-50';
  
  document.body.insertBefore(skipLink, document.body.firstChild);
};

/**
 * Manage focus for single page applications
 * @param {string} pageTitle - New page title
 * @param {HTMLElement} focusTarget - Element to focus (optional)
 */
export const manageFocusForSPA = (pageTitle, focusTarget = null) => {
  // Update page title
  document.title = pageTitle;
  
  // Announce page change to screen readers
  announceToScreenReader(`Navigated to ${pageTitle}`, 'assertive');
  
  // Focus management
  if (focusTarget) {
    focusTarget.focus();
  } else {
    // Focus main heading or main content
    const mainHeading = document.querySelector('h1');
    const mainContent = document.querySelector('main');
    
    if (mainHeading) {
      mainHeading.setAttribute('tabindex', '-1');
      mainHeading.focus();
    } else if (mainContent) {
      mainContent.setAttribute('tabindex', '-1');
      mainContent.focus();
    }
  }
};