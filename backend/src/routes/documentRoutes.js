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

// Upload validation is handled manually in the controller
// to ensure proper error handling after multer processes the file

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
router.post('/upload', protect, uploadDocument, handleUploadError, documentController.uploadDocument);
router.put('/:id', protect, documentIdValidation, documentController.updateDocument);
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