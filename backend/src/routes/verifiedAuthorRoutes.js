/**
 * Verified Author Routes
 * Routes for verified author badge management
 */

const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const verifiedAuthorController = require('../controllers/verifiedAuthorController');
const { authenticate, authorize } = require('../middleware/auth');

// Submit verified author request (authenticated users)
router.post(
  '/request',
  authenticate,
  [
    body('reason')
      .notEmpty().withMessage('Lý do không được để trống')
      .isLength({ min: 50, max: 1000 }).withMessage('Lý do phải từ 50-1000 ký tự')
  ],
  verifiedAuthorController.submitRequest
);

// Get user's requests (authenticated users)
router.get('/my-requests', authenticate, verifiedAuthorController.getUserRequests);

// Get verified authors list (public)
router.get('/authors', verifiedAuthorController.getVerifiedAuthors);

// Check verification status (public or self)
router.get('/status/:userId?', verifiedAuthorController.checkStatus);

// [ADMIN] Get pending requests
router.get('/admin/pending', authenticate, authorize('admin'), verifiedAuthorController.getPendingRequests);

// [ADMIN] Review request
router.post(
  '/admin/review/:requestId',
  authenticate,
  authorize('admin'),
  [
    param('requestId').isUUID().withMessage('Request ID không hợp lệ'),
    body('action')
      .isIn(['approved', 'rejected']).withMessage('Action phải là approved hoặc rejected'),
    body('adminNote')
      .optional()
      .isLength({ max: 500 }).withMessage('Admin note không được quá 500 ký tự')
  ],
  verifiedAuthorController.reviewRequest
);

module.exports = router;
