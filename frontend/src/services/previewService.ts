import { apiRequest } from './api';

export const previewService = {
  // Get preview info (images, pages, etc.)
  getPreviewInfo: async (documentId: string) => {
    // This matches the 404 route in your console
    return apiRequest('GET', `/preview/${documentId}/info`);
  },

  // (Admin/Owner) Generate preview manually if missing
  generatePreview: async (documentId: string) => {
    return apiRequest('POST', `/preview/${documentId}/generate`);
  }
};