/**
 * Document API services for ShareBuddy
 */

import { apiRequest, uploadFile } from './api';
import { 
  ApiResponse, 
  Document, 
  DocumentUploadForm, 
  DocumentSearchParams,
  PaginatedResponse 
} from '../types';

export const documentService = {
  // Get all documents with pagination and filters
  getDocuments: async (params?: DocumentSearchParams): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const query = queryParams.toString();
    const url = query ? `/documents?${query}` : '/documents';
    
    return apiRequest('GET', url);
  },

  // Get document by ID
  getDocumentById: async (id: string): Promise<ApiResponse<Document>> => {
    return apiRequest('GET', `/documents/${id}`);
  },

  // Upload new document
  uploadDocument: async (
    data: DocumentUploadForm, 
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<Document>> => {
    return uploadFile('/documents/upload', file, data, onProgress);
  },

  // Update document
  updateDocument: async (id: string, data: Partial<DocumentUploadForm>): Promise<ApiResponse<Document>> => {
    return apiRequest('PUT', `/documents/${id}`, data);
  },

  // Delete document
  deleteDocument: async (id: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `/documents/${id}`);
  },

  // Download document
  downloadDocument: async (id: string): Promise<Blob> => {
    const response = await apiRequest('GET', `/documents/${id}/download`, null, {
      responseType: 'blob'
    });
    return response.data || response;
  },

  // Get document preview
  previewDocument: async (id: string): Promise<ApiResponse<{ previewUrl: string }>> => {
    return apiRequest('GET', `/documents/${id}/preview`);
  },

  // Bookmark document
  bookmarkDocument: async (id: string): Promise<ApiResponse> => {
    return apiRequest('POST', `/documents/${id}/bookmark`);
  },

  // Remove bookmark
  removeBookmark: async (id: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `/documents/${id}/bookmark`);
  },

  // Get user's bookmarked documents
  getBookmarkedDocuments: async (): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    return apiRequest('GET', '/documents/bookmarks');
  },

  // Get user's uploaded documents
  getMyDocuments: async (): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    return apiRequest('GET', '/documents/my-documents');
  },

  // Get user's downloaded documents
  getDownloadedDocuments: async (): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    return apiRequest('GET', '/documents/downloads');
  },

  // Search documents
  searchDocuments: async (
    query: string, 
    filters?: Partial<DocumentSearchParams>
  ): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const params = {
      search: query,
      ...filters
    };
    
    return documentService.getDocuments(params);
  },

  // Get popular documents
  getPopularDocuments: async (limit?: number): Promise<ApiResponse<Document[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest('GET', `/documents/popular${params}`);
  },

  // Get recent documents
  getRecentDocuments: async (limit?: number): Promise<ApiResponse<Document[]>> => {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest('GET', `/documents/recent${params}`);
  },

  // Get documents by category
  getDocumentsByCategory: async (
    category: string, 
    params?: DocumentSearchParams
  ): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const searchParams = { ...params, category };
    return documentService.getDocuments(searchParams);
  },

  // Get documents by subject
  getDocumentsBySubject: async (
    subject: string, 
    params?: DocumentSearchParams
  ): Promise<ApiResponse<PaginatedResponse<Document>>> => {
    const searchParams = { ...params, subject };
    return documentService.getDocuments(searchParams);
  },

  // Get document statistics
  getDocumentStats: async (id: string): Promise<ApiResponse<{
    downloadCount: number;
    viewCount: number;
    bookmarkCount: number;
    ratingCount: number;
    averageRating: number;
  }>> => {
    return apiRequest('GET', `/documents/${id}/stats`);
  },

  // Report document
  reportDocument: async (id: string, reason: string, description?: string): Promise<ApiResponse> => {
    return apiRequest('POST', `/documents/${id}/report`, {
      reason,
      description
    });
  },

  // Get document categories
  getCategories: async (): Promise<ApiResponse<string[]>> => {
    return apiRequest('GET', '/documents/categories');
  },

  // Get subjects by category
  getSubjectsByCategory: async (category: string): Promise<ApiResponse<string[]>> => {
    return apiRequest('GET', `/documents/categories/${category}/subjects`);
  }
};