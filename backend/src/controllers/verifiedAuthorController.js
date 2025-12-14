/**
 * Verified Author Controller
 * Handles verified author badge requests and management
 */

const { validationResult } = require('express-validator');
const verifiedAuthorService = require('../services/verifiedAuthorService');

// Submit verified author request
const submitRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    const { reason } = req.body;
    const userId = req.user.user_id;

    const result = await verifiedAuthorService.submitRequest(userId, reason);

    res.status(201).json({
      success: true,
      message: 'Yêu cầu đã được gửi thành công',
      data: result
    });
  } catch (error) {
    if (error.message.includes('đã có yêu cầu') || error.message.includes('đã là tác giả')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

// Get user's requests
const getUserRequests = async (req, res, next) => {
  try {
    const userId = req.user.user_id;

    const requests = await verifiedAuthorService.getUserRequests(userId);

    res.json({
      success: true,
      data: {
        requests,
        count: requests.length
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get verified authors list
const getVerifiedAuthors = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await verifiedAuthorService.getVerifiedAuthors(page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Get pending requests
const getPendingRequests = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập'
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;

    const result = await verifiedAuthorService.getPendingRequests(page, limit);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

// [ADMIN] Review request
const reviewRequest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập'
      });
    }

    const { requestId } = req.params;
    const { action, adminNote } = req.body;
    const adminId = req.user.user_id;

    await verifiedAuthorService.reviewRequest(requestId, adminId, action, adminNote);

    res.json({
      success: true,
      message: action === 'approved' ? 'Yêu cầu đã được chấp nhận' : 'Yêu cầu đã bị từ chối'
    });
  } catch (error) {
    if (error.message.includes('Không tìm thấy') || error.message.includes('đã được xử lý')) {
      return res.status(400).json({
        success: false,
        error: error.message
      });
    }
    next(error);
  }
};

// Check verification status
const checkStatus = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user.user_id;

    const isVerified = await verifiedAuthorService.isVerified(userId);

    res.json({
      success: true,
      data: { isVerified }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitRequest,
  getUserRequests,
  getVerifiedAuthors,
  getPendingRequests,
  reviewRequest,
  checkStatus
};
