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

// Helper interface for user info embedded in other objects
export interface UserSimple {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  isVerifiedAuthor?: boolean;
  university?: string; // Sometimes needed
  major?: string;
}

// Document related types
export interface Document {
  id: string;
  title: string;
  description: string;
  fileName?: string; // NEW: Added fileName
  fileUrl?: string; // Optional if not returned in list view
  fileSize?: number; // NEW
  fileType?: string; // NEW
  thumbnailUrl?: string;
  category?: string; // Made optional as it might be replaced by subject in some contexts
  subject: string;
  university?: string; // NEW: Added university to root
  creditCost: number;
  downloadCount: number;
  viewCount?: number; // NEW
  status: 'pending' | 'approved' | 'rejected';
  avgRating?: string;
  ratingCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  author: UserSimple; // Use consistent user type
  userInteraction?: {
    isBookmarked: boolean;
    userRating?: {
      rating: number;
      comment?: string; // Optional
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
  comment?: string; // Optional field for UI, even if not in DB
  createdAt: string;
  updatedAt?: string;
  user: UserSimple;
  isLiked?: boolean;
  likeCount?: number;
}

export interface RatingStatistics {
  totalRatings: number;
  avgRating?: string;
  distribution: {
    [key: string]: number; // "1", "2", "3", "4", "5"
  };
}

// NEW: Response structures for Rating Service
export interface DocumentRatingsResponse {
  ratings: Rating[];
  statistics: RatingStatistics;
  pagination: Pagination;
}

export interface SingleRatingResponse {
  rating: Rating;
}

// Comment related types
export interface Comment {
  id: string;
  content: string;
  parentId?: string; // Matches frontend usage
  createdAt: string;
  updatedAt: string;
  likeCount: number;
  replyCount: number;
  isLiked: boolean;
  user: UserSimple;
  replies?: Comment[];
}

// NEW: Q&A related types (Question & Answer)
export interface Question {
  id: string;
  title: string;
  content: string;
  isAnswered: boolean;
  acceptedAnswerId?: string | null;
  voteCount: number;
  viewCount: number;
  answerCount: number;
  documentId?: string; // Optional depending on context
  documentTitle?: string;
  author: UserSimple;
  createdAt: string;
  updatedAt?: string;
}

export interface Answer {
  id: string;
  content: string;
  isAccepted: boolean;
  voteCount: number;
  questionId?: string;
  author: UserSimple;
  createdAt: string;
  updatedAt?: string;
}

export interface QuestionDetailResponse {
  question: Question;
  answers: Answer[];
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
  id?: string; // Added ID
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
  relatedUser?: UserSimple;
}

// Pagination types
export interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage?: boolean; // Optional, computed often
  hasPrevPage?: boolean;
  hasNext?: boolean; // Redux slice used this name
  hasPrev?: boolean;
}

// Document upload response types
export interface DocumentUploadResponse {
  document: Document; // Reusing Document interface
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

// Generic Paginated Response
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
  popularDocuments: Document[]; // NEW
  recentDocuments: Document[];  // NEW
  searchResults: Document[];    // NEW
  pagination: Pagination;       // NEW: made non-nullable for easier usage
  searchParams: DocumentSearchParams | null; // NEW
  isLoading: boolean;
  isUploading: boolean;         // NEW
  uploadProgress: number;       // NEW
  error: string | null;
  categories: string[];
  subjects: string[];
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