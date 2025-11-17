/**
 * Comment routes
 * Handles document comments and comment interactions
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const commentController = require('../controllers/commentController');

const router = express.Router();

// Create comment on document
router.post('/documents/:id/comments',
  protect,
  [
    param('id').isUUID().withMessage('Document ID phải là UUID hợp lệ'),
    body('content').notEmpty().isLength({ max: 2000 }).withMessage('Nội dung comment không được để trống và không quá 2000 ký tự'),
    body('parentId').optional().isUUID().withMessage('Parent ID phải là UUID hợp lệ')
  ],
  commentController.createComment
);

// Get document comments
router.get('/documents/:id/comments',
  [
    param('id').isUUID().withMessage('Document ID phải là UUID hợp lệ'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50'),
    query('sortBy').optional().isIn(['created_at', 'updated_at']).withMessage('SortBy không hợp lệ'),
    query('sortOrder').optional().isIn(['asc', 'desc']).withMessage('SortOrder phải là asc hoặc desc')
  ],
  commentController.getDocumentComments
);

// Get replies for a comment
router.get('/comments/:commentId/replies',
  [
    param('commentId').isUUID().withMessage('Comment ID phải là UUID hợp lệ'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit phải từ 1 đến 50')
  ],
  commentController.getCommentReplies
);

// Update comment
router.put('/comments/:commentId',
  protect,
  [
    param('commentId').isUUID().withMessage('Comment ID phải là UUID hợp lệ'),
    body('content').notEmpty().isLength({ max: 2000 }).withMessage('Nội dung comment không được để trống và không quá 2000 ký tự')
  ],
  commentController.updateComment
);

// Delete comment
router.delete('/comments/:commentId',
  protect,
  [
    param('commentId').isUUID().withMessage('Comment ID phải là UUID hợp lệ')
  ],
  commentController.deleteComment
);

// Like/unlike comment
router.post('/comments/:commentId/like',
  protect,
  [
    param('commentId').isUUID().withMessage('Comment ID phải là UUID hợp lệ')
  ],
  commentController.toggleCommentLike
);

// Report comment
router.post('/comments/:commentId/report',
  protect,
  [
    param('commentId').isUUID().withMessage('Comment ID phải là UUID hợp lệ'),
    body('reason').notEmpty().withMessage('Lý do báo cáo không được để trống'),
    body('description').optional().isLength({ max: 500 }).withMessage('Mô tả không được quá 500 ký tự')
  ],
  commentController.reportComment
);

module.exports = router;