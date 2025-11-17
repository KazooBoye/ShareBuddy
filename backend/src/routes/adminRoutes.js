/**
 * Admin routes
 * Handles admin and moderator functions
 */

const express = require('express');
const { body, param, query } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin or moderator role
router.use(protect);

// User management (Admin only)
router.get('/users', 
  authorize('admin'), 
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
    query('status').optional().isIn(['active', 'inactive']).withMessage('Status không hợp lệ'),
    query('role').optional().isIn(['user', 'moderator', 'admin']).withMessage('Role không hợp lệ'),
    query('search').optional().isLength({ min: 1 }).withMessage('Search không được để trống')
  ],
  adminController.getUsers
);

router.put('/users/:userId', 
  authorize('admin'),
  [
    param('userId').isUUID().withMessage('User ID phải là UUID hợp lệ'),
    body('isActive').optional().isBoolean().withMessage('isActive phải là boolean'),
    body('role').optional().isIn(['user', 'moderator', 'admin']).withMessage('Role không hợp lệ'),
    body('isVerifiedAuthor').optional().isBoolean().withMessage('isVerifiedAuthor phải là boolean'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason không được quá 500 ký tự')
  ],
  adminController.updateUser
);

// Document management (Admin and Moderator)
router.get('/documents/pending', 
  authorize('admin', 'moderator'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('Status không hợp lệ')
  ],
  adminController.getPendingDocuments
);

router.put('/documents/:documentId/moderate', 
  authorize('admin', 'moderator'),
  [
    param('documentId').isUUID().withMessage('Document ID phải là UUID hợp lệ'),
    body('action').isIn(['approve', 'reject']).withMessage('Action phải là approve hoặc reject'),
    body('reason').optional().isLength({ max: 500 }).withMessage('Reason không được quá 500 ký tự')
  ],
  adminController.moderateDocument
);

// Report management (Admin and Moderator)
router.get('/reports', 
  authorize('admin', 'moderator'),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page phải là số nguyên dương'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit phải từ 1 đến 100'),
    query('status').optional().isIn(['pending', 'resolved', 'dismissed']).withMessage('Status không hợp lệ'),
    query('type').optional().isIn(['document', 'rating', 'comment']).withMessage('Type không hợp lệ')
  ],
  adminController.getReports
);
router.put('/reports/:reportId/resolve', 
  authorize('admin', 'moderator'),
  [
    param('reportId').isUUID().withMessage('Report ID phải là UUID hợp lệ'),
    body('action').isIn(['dismiss', 'take_action']).withMessage('Action phải là dismiss hoặc take_action'),
    body('adminNote').optional().isLength({ max: 1000 }).withMessage('Admin note không được quá 1000 ký tự')
  ],
  adminController.resolveReport
);

// System statistics (Admin only)
router.get('/statistics', 
  authorize('admin'),
  [
    query('period').optional().isInt({ min: 1, max: 365 }).withMessage('Period phải từ 1 đến 365 ngày')
  ],
  adminController.getSystemStatistics
);

module.exports = router;
router.put('/reports/:id/dismiss', authorize('admin', 'moderator'), adminController.dismissReport);

// System statistics (Admin only)
router.get('/stats', authorize('admin'), adminController.getSystemStats);
router.get('/stats/users', authorize('admin'), adminController.getUserStats);
router.get('/stats/documents', authorize('admin'), adminController.getDocumentStats);
router.get('/stats/analytics', authorize('admin'), adminController.getAnalytics);

// Content management (Admin only)
router.get('/featured-documents', authorize('admin'), adminController.getFeaturedDocuments);
router.put('/documents/:id/feature', authorize('admin'), adminController.featureDocument);
router.delete('/documents/:id/feature', authorize('admin'), adminController.unfeatureDocument);

// Verified author management (Admin only)
router.get('/verified-authors', authorize('admin'), adminController.getVerifiedAuthors);
router.put('/users/:id/verify-author', authorize('admin'), adminController.verifyAuthor);
router.delete('/users/:id/verify-author', authorize('admin'), adminController.unverifyAuthor);

// System configuration (Admin only)
router.get('/config', authorize('admin'), adminController.getSystemConfig);
router.put('/config', authorize('admin'), adminController.updateSystemConfig);

// Credit management (Admin only)
router.post('/users/:id/credits', authorize('admin'), adminController.adjustUserCredits);
router.get('/credit-transactions', authorize('admin'), adminController.getCreditTransactions);

// Backup and maintenance (Admin only)
router.post('/backup', authorize('admin'), adminController.createBackup);
router.get('/logs', authorize('admin'), adminController.getSystemLogs);

module.exports = router;