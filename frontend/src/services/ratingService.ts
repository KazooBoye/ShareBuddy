/**
 * Rating API services for ShareBuddy
 */

import { apiRequest } from './api';
import { ApiResponse, Rating, PaginatedResponse } from '../types';

export const ratingService = {
  // Get ratings for a document
  getDocumentRatings: async (
    documentId: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Rating>>> => {
    const params = new URLSearchParams();
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `ratings/document/${documentId}?${query}` : `ratings/document/${documentId}`;
    
    return apiRequest('GET', url);
  },

  // Add rating for a document
  addRating: async (documentId: string, rating: number, comment?: string): Promise<ApiResponse<Rating>> => {
    return apiRequest('POST', 'ratings', {
      documentId,
      rating,
      comment
    });
  },

  // Update existing rating
  updateRating: async (ratingId: string, rating: number, comment?: string): Promise<ApiResponse<Rating>> => {
    return apiRequest('PUT', `ratings/${ratingId}`, {
      rating,
      comment
    });
  },

  // Delete rating
  deleteRating: async (ratingId: string): Promise<ApiResponse> => {
    return apiRequest('DELETE', `ratings/${ratingId}`);
  },

  // Like/unlike a rating
  toggleRatingLike: async (ratingId: string): Promise<ApiResponse<{ isLiked: boolean; likeCount: number }>> => {
    return apiRequest('POST', `ratings/${ratingId}/like`);
  },

  // Get user's rating for a document
  getUserRating: async (documentId: string): Promise<ApiResponse<Rating | null>> => {
    return apiRequest('GET', `ratings/document/${documentId}/user-rating`);
  },

  // Get user's all ratings
  getUserRatings: async (
    userId?: string, 
    page?: number, 
    limit?: number
  ): Promise<ApiResponse<PaginatedResponse<Rating>>> => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (page) params.append('page', page.toString());
    if (limit) params.append('limit', limit.toString());
    
    const query = params.toString();
    const url = query ? `ratings/user?${query}` : 'ratings/user';
    
    return apiRequest('GET', url);
  },

  // Get rating statistics for a document
  getRatingStats: async (documentId: string): Promise<ApiResponse<{
    averageRating: number;
    totalRatings: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }>> => {
    return apiRequest('GET', `ratings/document/${documentId}/stats`);
  }
};