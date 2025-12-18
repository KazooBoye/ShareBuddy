/**
 * Preview routes - Document preview and thumbnail generation
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const previewController = require('../controllers/previewController');
const { protect, authorize } = require('../middleware/auth');

// Get preview info (public)
router.get('/info/:documentId', previewController.getPreviewInfo);

// Generate preview (admin only)
router.post('/generate/:documentId',
  protect,
  authorize('admin'),
  previewController.generatePreview
);

// Serve preview file (public)
router.get('/:documentId', previewController.servePreview);

// Generate thumbnail (admin only)
router.post('/thumbnail/:documentId',
  protect,
  authorize('admin'),
  previewController.generateThumbnail
);

// Serve thumbnail (public)
router.get('/thumbnail/:documentId', previewController.serveThumbnail);

// Batch generate previews (admin only)
router.post('/batch/generate',
  protect,
  authorize('admin'),
  body('documentIds').isArray().withMessage('Document IDs phải là mảng'),
  previewController.batchGeneratePreviews
);

module.exports = router;
