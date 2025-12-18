/**
 * TypeScript types and interfaces for ShareBuddy application
 */

// User related types
export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  bio?: string;
  university?: string;
  major?: string;
  role: 'user' | 'moderator' | 'admin';
  credits: number;
  isVerifiedAuthor: boolean;
  avatarUrl?: string;
  createdAt: string;
  updatedAt?: string;
  stats?: {
    documentCount: number;
    followingCount: number;
    followerCount: number;
    avgRating?: string;
  };
  isFollowing?: boolean;
}

// Document related types
export interface Document {
  id: string;
  title: string;
  description: string;
  fileUrl: string;
  thumbnailUrl?: string;
  category: string;
  subject: string;
  creditCost: number;
  downloadCount: number;
  status: 'pending' | 'approved' | 'rejected';
  avgRating?: string;
  ratingCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  author: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
    isVerifiedAuthor: boolean;
    university?: string;
    major?: string;
  };
  userInteraction?: {
    isBookmarked: boolean;
    userRating?: {
      rating: number;
      comment: string;
    };
    canDownload: boolean;
  };
  moderation?: {
    jobId: string;
    status: string;
    score?: number;
    flags?: string[];
  };
}

// Rating related types
export interface Rating {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
    isVerifiedAuthor: boolean;
  };
  likeCount?: number;
  isLiked?: boolean;
}

export interface RatingStatistics {
  totalRatings: number;
  avgRating?: string;
  distribution: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
}

// Comment related types
export interface Comment {
  id: string;
  content: string;
  parentId?: string;
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
    isVerifiedAuthor: boolean;
  };
  replies?: Comment[];
}

// Credit related types
export interface CreditTransaction {
  id: string;
  amount: number;
  type: 'earn' | 'download' | 'purchase' | 'bonus' | 'penalty' | 'transfer';
  description: string;
  createdAt: string;
  document?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
}

export interface CreditPackage {
  credits: number;
  price: number;
  currency: string;
  popular: boolean;
  bonus?: number;
  discountPercent?: number;
}

// Social related types
export interface Notification {
  id: string;
  type: 'new_document' | 'new_follower' | 'new_comment' | 'new_rating' | 'document_approved' | 'document_moderation';
  title: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  relatedDocument?: {
    id: string;
    title: string;
    thumbnailUrl?: string;
  };
  relatedUser?: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
  };
}

export interface Activity {
  type: 'document' | 'rating';
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string;
  category: string;
  subject: string;
  creditCost: number;
  downloadCount: number;
  avgRating?: string;
  ratingCount: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    fullName: string;
    avatarUrl?: string;
    isVerifiedAuthor: boolean;
  };
}

// Pagination types
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Document upload response types
export interface DocumentUploadResponse {
  document: {
    id: string;
    title: string;
    description: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    subject: string;
    university?: string;
    creditCost: number;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
  };
  moderation?: {
    jobId: string;
    status: string;
  } | null;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  details?: any[];
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  totalPages: number;
  totalItems: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Form types
export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  username: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  university?: string;
  major?: string;
}

export interface UpdatePasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface DocumentUploadForm {
  title: string;
  description: string;
  subject: string;
  university?: string;
  creditCost: number;
  isPublic?: boolean;
  isPremium?: boolean;
  tags?: string | string[];
}

export interface DocumentSearchParams {
  search?: string;
  category?: string;
  subject?: string;
  minRating?: number;
  maxCreditCost?: number;
  verifiedAuthor?: boolean;
  year?: number;
  sortBy?: 'newest' | 'oldest' | 'popular' | 'rating' | 'downloads';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
  tags?: string[];
}

export interface ProfileUpdateForm {
  fullName: string;
  bio?: string;
  university?: string;
  major?: string;
}

// Search and Filter types
export interface DocumentFilters {
  search?: string;
  category?: string;
  subject?: string;
  university?: string;
  major?: string;
  minRating?: number;
  maxCost?: number;
  sortBy?: 'created_at' | 'title' | 'download_count' | 'avg_rating' | 'credit_cost';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
}

// Redux State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

export interface DocumentState {
  documents: Document[];
  currentDocument: Document | null;
  filters: DocumentFilters;
  isLoading: boolean;
  error: string | null;
  pagination: Pagination | null;
}

export interface UIState {
  theme: 'light' | 'dark';
  sidebarOpen: boolean;
  notifications: Notification[];
  unreadCount: number;
}

export interface RootState {
  auth: AuthState;
  documents: DocumentState;
  ui: UIState;
}

// Component Props types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
}