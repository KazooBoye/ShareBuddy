/**
 * Question routes - Q&A system
 */

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const questionController = require('../controllers/questionController');
const { protect } = require('../middleware/auth');

// Get questions for a document (public)
router.get('/document/:documentId', questionController.getQuestions);

// Get single question with answers (public)
router.get('/:questionId', questionController.getQuestion);

// Create question (protected)
router.post('/',
  protect,
  [
    body('documentId').isUUID().withMessage('Document ID không hợp lệ'),
    body('title').trim().isLength({ min: 10, max: 500 }).withMessage('Tiêu đề phải từ 10-500 ký tự'),
    body('content').trim().isLength({ min: 20 }).withMessage('Nội dung phải ít nhất 20 ký tự')
  ],
  questionController.createQuestion
);

// Create answer (protected)
router.post('/answer',
  protect,
  [
    body('questionId').isUUID().withMessage('Question ID không hợp lệ'),
    body('content').trim().isLength({ min: 20 }).withMessage('Câu trả lời phải ít nhất 20 ký tự')
  ],
  questionController.createAnswer
);

// Accept answer (protected)
router.post('/answer/:answerId/accept', protect, questionController.acceptAnswer);

// Vote on question (protected)
router.post('/:questionId/vote',
  protect,
  body('voteType').isInt({ min: -1, max: 1 }).withMessage('Vote type không hợp lệ'),
  questionController.voteQuestion
);

// Vote on answer (protected)
router.post('/answer/:answerId/vote',
  protect,
  body('voteType').isInt({ min: -1, max: 1 }).withMessage('Vote type không hợp lệ'),
  questionController.voteAnswer
);

// Delete question (protected)
router.delete('/:questionId', protect, questionController.deleteQuestion);

// Delete answer (protected)
router.delete('/answer/:answerId', protect, questionController.deleteAnswer);

module.exports = router;
