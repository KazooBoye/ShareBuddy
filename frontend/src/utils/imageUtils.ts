/**
 * Image URL utilities
 */

/**
 * Resolves relative image paths to full URLs
 * Handles both absolute URLs and relative paths from the backend
 */
export const getImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  if (url.startsWith('http')) return url;

  // Get Base URL
  let baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';
  
  // Remove '/api' suffix if present
  baseUrl = baseUrl.replace(/\/api\/?$/, '');
  baseUrl = baseUrl.replace(/\/$/, '');

  // Clean Image Path (Handle Windows backslashes)
  let imagePath = url.replace(/\\/g, '/');
  
  // Ensure leading slash
  if (!imagePath.startsWith('/')) {
    imagePath = `/${imagePath}`;
  }

  const finalUrl = `${baseUrl}${imagePath}`;
  return finalUrl;
};