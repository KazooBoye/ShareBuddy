/**
 * Comment API services for ShareBuddy
 */

import { apiRequest } from './api';
import { ApiResponse, Comment, PaginatedResponse } from '../types';

export const commentService = {
  // Get comments for a document
  getDocumentComments: async (
    documentId: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `comments/document/${documentId}?${query}` : `comments/document/${documentId}`;
    
    return apiRequest('GET', url);
  },

  // Get replies for a comment
  getCommentReplies: async (
    commentId: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `comments/${commentId}/replies?${query}` : `comments/${commentId}/replies`;
    
    return apiRequest('GET', url);
  },

  // Add comment to document
  addComment: async (documentId: string, content: string): Promise<ApiResponse<Comment>> => {
    return apiRequest('POST', 'comments', {
      documentId,
      content
    });
  },

  // Reply to a comment
  replyToComment: async (parentCommentId: string, content: string): Promise<ApiResponse<Comment>> => {
    return apiRequest('POST', `comments/${parentCommentId}/reply`, {
      content
    });
  },

  // Update comment
  updateComment: async (commentId: string, content: string): Promise<ApiResponse<Comment>> => {
    return apiRequest('PUT', `comments/${commentId}`, {
      content
    });
  },

  // Delete comment
  deleteComment: async (commentId: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `comments/${commentId}`);
  },

  // Like/unlike a comment
  toggleCommentLike: async (commentId: string): Promise<ApiResponse<{ isLiked: boolean; likeCount: number }>> => {
    return apiRequest('POST', `comments/${commentId}/like`);
  },

  // Get user's comments
  getUserComments: async (
    userId?: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `comments/user?${query}` : 'comments/user';
    
    return apiRequest('GET', url);
  },

  // Report comment
  reportComment: async (commentId: string, reason: string, description?: string): Promise<ApiResponse> => {
    return apiRequest('POST', `comments/${commentId}/report`, {
      reason,
      description
    });
  },

  // Get comment by ID
  getCommentById: async (commentId: string): Promise<ApiResponse<Comment>> => {
    return apiRequest('GET', `comments/${commentId}`);
  },

  // Search comments
  searchComments: async (
    query: string, 
    documentId?: string,
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
    const params = new URLSearchParams();
    params.append('search', query);
    if (documentId) params.append('documentId', documentId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const queryString = params.toString();
    return apiRequest('GET', `comments/search?${queryString}`);
  }
};