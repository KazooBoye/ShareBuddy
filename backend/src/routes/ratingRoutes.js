/**
 * Rating routes
 * Handles document rating and rating-related operations
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const ratingController = require('../controllers/ratingController');

const router = express.Router();

// Rate document
router.post('/documents/:id/rate',
  protect,
  [
    param('id').isUUID().withMessage('Document ID phải là UUID hợp lệ'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating phải từ 1 đến 5'),
    body('comment').optional().isLength({ max: 1000 }).withMessage('Comment không được quá 1000 ký tự')
  ],
  ratingController.rateDocument
);

// Get document ratings
router.get('/documents/:id/ratings',
  [
    param('id').isUUID().withMessage('Document ID phải là UUID hợp lệ'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50'),
    query('sortBy').optional().isIn(['created_at', 'rating', 'updated_at']).withMessage('SortBy không hợp lệ'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('SortOrder phải là asc hoặc desc')
  ],
  ratingController.getDocumentRatings
);

// Get user's rating for document
router.get('/documents/:id/my-rating',
  protect,
  [
    param('id').isUUID().withMessage('Document ID phải là UUID hợp lệ')
  ],
  ratingController.getUserRating
);

// Delete user's rating
router.delete('/documents/:id/rate',
  protect,
  [
    param('id').isUUID().withMessage('Document ID phải là UUID hợp lệ')
  ],
  ratingController.deleteRating
);

// Like/unlike a rating
router.post('/ratings/:ratingId/like',
  protect,
  [
    param('ratingId').isUUID().withMessage('Rating ID phải là UUID hợp lệ')
  ],
  ratingController.toggleRatingLike
);

// Report a rating
router.post('/ratings/:ratingId/report',
  protect,
  [
    param('ratingId').isUUID().withMessage('Rating ID phải là UUID hợp lệ'),
    body('reason').notEmpty().withMessage('Lý do báo cáo không được để trống'),
    body('description').optional().isLength({ max: 500 }).withMessage('Mô tả không được quá 500 ký tự')
  ],
  ratingController.reportRating
);

// Get top rated documents
router.get('/top-rated',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50'),
    query('minRatings').optional().isInt({ min: 1 }).withMessage('MinRatings phải là số nguyên dương'),
    query('category').optional().isLength({ min: 1 }).withMessage('Category không được để trống')
  ],
  ratingController.getTopRatedDocuments
);

module.exports = router;