/**
 * Document routes
 * Handles document upload, search, download, and interactions
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const documentController = require('../controllers/documentController');
const { protect, optionalAuth } = require('../middleware/auth');
const { uploadDocument, handleUploadError } = require('../middleware/upload');

const router = express.Router();

// Validation rules
const documentIdValidation = [
  param('id')
    .isUUID()
    .withMessage('Document ID không hợp lệ')
];

const uploadValidation = [
  body('title')
    .isLength({ min: 3, max: 500 })
    .withMessage('Tiêu đề phải có từ 3-500 ký tự')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Mô tả không được vượt quá 2000 ký tự')
    .trim(),
  body('university')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Tên trường không được vượt quá 255 ký tự')
    .trim(),
  body('subject')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Môn học không được vượt quá 255 ký tự')
    .trim(),
  body('tags')
    .optional()
    .custom((value) => {
      if (typeof value === 'string') {
        const tags = value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
        if (tags.length > 10) {
          throw new Error('Không được có quá 10 tags');
        }
        return true;
      }
      if (Array.isArray(value) && value.length > 10) {
        throw new Error('Không được có quá 10 tags');
      }
      return true;
    }),
  body('creditCost')
    .optional()
    .isInt({ min: 0, max: 100 })
    .withMessage('Chi phí credit phải từ 0-100')
];

const ratingValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Đánh giá phải từ 1-5 sao'),
  body('comment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Bình luận không được vượt quá 1000 ký tự')
    .trim()
];

const commentValidation = [
  body('content')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Nội dung bình luận phải có từ 1-1000 ký tự')
    .trim(),
  body('parentCommentId')
    .optional()
    .isUUID()
    .withMessage('Parent comment ID không hợp lệ'),
  body('isQuestion')
    .optional()
    .isBoolean()
    .withMessage('isQuestion phải là boolean')
];

// Public routes
router.get('/', optionalAuth, documentController.getDocuments);
router.get('/search', optionalAuth, documentController.searchDocuments);
router.get('/featured', optionalAuth, documentController.getFeaturedDocuments);
router.get('/recent', optionalAuth, documentController.getRecentDocuments);
router.get('/popular', optionalAuth, documentController.getPopularDocuments);
router.get('/tags', documentController.getPopularTags);
router.get('/:id', optionalAuth, documentIdValidation, documentController.getDocumentById);
router.get('/:id/preview', optionalAuth, documentIdValidation, documentController.previewDocument);

// Protected routes - require authentication
router.post('/upload', protect, uploadDocument, handleUploadError, uploadValidation, documentController.uploadDocument);
router.put('/:id', protect, documentIdValidation, uploadValidation, documentController.updateDocument);
router.delete('/:id', protect, documentIdValidation, documentController.deleteDocument);

// Document interactions
router.post('/:id/download', protect, documentIdValidation, documentController.downloadDocument);
router.post('/:id/view', optionalAuth, documentIdValidation, documentController.incrementView);
router.post('/:id/bookmark', protect, documentIdValidation, documentController.bookmarkDocument);
router.delete('/:id/bookmark', protect, documentIdValidation, documentController.removeBookmark);

// Ratings and reviews
router.post('/:id/ratings', protect, documentIdValidation, ratingValidation, documentController.rateDocument);
router.get('/:id/ratings', optionalAuth, documentIdValidation, documentController.getDocumentRatings);
router.put('/ratings/:ratingId', protect, ratingValidation, documentController.updateRating);
router.delete('/ratings/:ratingId', protect, documentController.deleteRating);

// Comments and Q&A
router.post('/:id/comments', protect, documentIdValidation, commentValidation, documentController.addComment);
router.get('/:id/comments', optionalAuth, documentIdValidation, documentController.getDocumentComments);
router.put('/comments/:commentId', protect, commentValidation, documentController.updateComment);
router.delete('/comments/:commentId', protect, documentController.deleteComment);
router.post('/comments/:commentId/like', protect, documentController.likeComment);
router.delete('/comments/:commentId/like', protect, documentController.unlikeComment);

// Reporting
router.post('/:id/report', protect, documentIdValidation, documentController.reportDocument);

// Analytics (for document owner)
router.get('/:id/analytics', protect, documentIdValidation, documentController.getDocumentAnalytics);

module.exports = router;