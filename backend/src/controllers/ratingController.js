/**
 * Rating controller
 * Handles document ratings and comments functionality
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');

// Create or update rating for a document
const rateDocument = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    const { id: documentId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.user_id;

    // Check if document exists and is approved
    const docResult = await query(
      'SELECT user_id, title FROM documents WHERE document_id = $1 AND status = $2',
      [documentId, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại hoặc chưa được duyệt'
      });
    }

    const document = docResult.rows[0];

    // Users cannot rate their own documents
    if (document.user_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể đánh giá tài liệu của chính mình'
      });
    }

    // Check if user already rated this document
    const existingRating = await query(
      'SELECT rating_id FROM ratings WHERE user_id = $1 AND document_id = $2',
      [userId, documentId]
    );

    let result;
    if (existingRating.rows.length > 0) {
      // Update existing rating
      result = await query(
        `UPDATE ratings 
         SET rating = $1, comment = $2, updated_at = NOW()
         WHERE user_id = $3 AND document_id = $4
         RETURNING rating_id, rating, comment, created_at, updated_at`,
        [rating, comment, userId, documentId]
      );
    } else {
      // Create new rating
      result = await query(
        `INSERT INTO ratings (user_id, document_id, rating, comment)
         VALUES ($1, $2, $3, $4)
         RETURNING rating_id, rating, comment, created_at, updated_at`,
        [userId, documentId, rating, comment]
      );
    }

    const ratingData = result.rows[0];

    res.json({
      success: true,
      message: existingRating.rows.length > 0 ? 'Cập nhật đánh giá thành công' : 'Đánh giá thành công',
      data: {
        rating: {
          id: ratingData.rating_id,
          rating: ratingData.rating,
          comment: ratingData.comment,
          createdAt: ratingData.created_at,
          updatedAt: ratingData.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get ratings for a document with pagination
const getDocumentRatings = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Check if document exists
    const docResult = await query(
      'SELECT document_id, title FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    // Validate sort parameters
    const validSortFields = ['created_at', 'rating', 'updated_at'];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Get ratings with user information
    const ratingsResult = await query(
      `SELECT r.rating_id, r.rating, r.comment, r.created_at, r.updated_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.document_id = $1 AND u.is_active = true
       ORDER BY r.${finalSortBy} ${sortOrder}
       LIMIT $2 OFFSET $3`,
      [documentId, limit, offset]
    );

    // Get total count and average rating
    const statsResult = await query(
      `SELECT COUNT(*) as total_ratings,
              AVG(rating) as avg_rating,
              COUNT(CASE WHEN rating = 5 THEN 1 END) as five_star,
              COUNT(CASE WHEN rating = 4 THEN 1 END) as four_star,
              COUNT(CASE WHEN rating = 3 THEN 1 END) as three_star,
              COUNT(CASE WHEN rating = 2 THEN 1 END) as two_star,
              COUNT(CASE WHEN rating = 1 THEN 1 END) as one_star
       FROM ratings r
       JOIN users u ON r.user_id = u.user_id
       WHERE r.document_id = $1 AND u.is_active = true`,
      [documentId]
    );

    const stats = statsResult.rows[0];
    const total = parseInt(stats.total_ratings);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        ratings: ratingsResult.rows.map(row => ({
          id: row.rating_id,
          rating: row.rating,
          comment: row.comment,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          user: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          }
        })),
        statistics: {
          totalRatings: total,
          avgRating: stats.avg_rating ? parseFloat(stats.avg_rating).toFixed(1) : null,
          distribution: {
            fiveStar: parseInt(stats.five_star),
            fourStar: parseInt(stats.four_star),
            threeStar: parseInt(stats.three_star),
            twoStar: parseInt(stats.two_star),
            oneStar: parseInt(stats.one_star)
          }
        },
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: total,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete user's rating
const deleteRating = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      'DELETE FROM ratings WHERE user_id = $1 AND document_id = $2 RETURNING rating_id',
      [userId, documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Không tìm thấy đánh giá để xóa'
      });
    }

    res.json({
      success: true,
      message: 'Xóa đánh giá thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Get user's rating for a document
const getUserRating = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      `SELECT rating_id, rating, comment, created_at, updated_at
       FROM ratings
       WHERE user_id = $1 AND document_id = $2`,
      [userId, documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Chưa có đánh giá cho tài liệu này'
      });
    }

    const rating = result.rows[0];

    res.json({
      success: true,
      data: {
        rating: {
          id: rating.rating_id,
          rating: rating.rating,
          comment: rating.comment,
          createdAt: rating.created_at,
          updatedAt: rating.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Like/unlike a rating comment
const toggleRatingLike = async (req, res, next) => {
  try {
    const { ratingId } = req.params;
    const userId = req.user.user_id;

    // Check if rating exists
    const ratingResult = await query(
      'SELECT user_id FROM ratings WHERE rating_id = $1',
      [ratingId]
    );

    if (ratingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Đánh giá không tồn tại'
      });
    }

    // Users cannot like their own ratings
    if (ratingResult.rows[0].user_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể like đánh giá của chính mình'
      });
    }

    // Check if already liked
    const existingLike = await query(
      'SELECT 1 FROM rating_likes WHERE user_id = $1 AND rating_id = $2',
      [userId, ratingId]
    );

    let isLiked;
    if (existingLike.rows.length > 0) {
      // Unlike
      await query(
        'DELETE FROM rating_likes WHERE user_id = $1 AND rating_id = $2',
        [userId, ratingId]
      );
      isLiked = false;
    } else {
      // Like
      await query(
        'INSERT INTO rating_likes (user_id, rating_id) VALUES ($1, $2)',
        [userId, ratingId]
      );
      isLiked = true;
    }

    // Get updated like count
    const likeCountResult = await query(
      'SELECT COUNT(*) as like_count FROM rating_likes WHERE rating_id = $1',
      [ratingId]
    );

    const likeCount = parseInt(likeCountResult.rows[0].like_count);

    res.json({
      success: true,
      message: isLiked ? 'Liked đánh giá' : 'Unliked đánh giá',
      data: {
        isLiked,
        likeCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Report a rating for inappropriate content
const reportRating = async (req, res, next) => {
  try {
    const { ratingId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.user_id;

    // Check if rating exists
    const ratingResult = await query(
      'SELECT rating_id, user_id FROM ratings WHERE rating_id = $1',
      [ratingId]
    );

    if (ratingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Đánh giá không tồn tại'
      });
    }

    // Users cannot report their own ratings
    if (ratingResult.rows[0].user_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể báo cáo đánh giá của chính mình'
      });
    }

    // Check if already reported by this user
    const existingReport = await query(
      'SELECT 1 FROM reports WHERE reporter_id = $1 AND rating_id = $2',
      [userId, ratingId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Bạn đã báo cáo đánh giá này rồi'
      });
    }

    // Create report
    await query(
      `INSERT INTO reports (reporter_id, rating_id, reason, description, report_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, ratingId, reason, description, 'rating']
    );

    res.json({
      success: true,
      message: 'Báo cáo đánh giá thành công. Chúng tôi sẽ xem xét sớm nhất.'
    });
  } catch (error) {
    next(error);
  }
};

// Get top-rated documents
const getTopRatedDocuments = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const minRatings = parseInt(req.query.minRatings) || 5;
    const category = req.query.category;

    let categoryCondition = '';
    let queryParams = [minRatings, limit];
    
    if (category) {
      categoryCondition = 'AND d.category = $3';
      queryParams = [minRatings, category, limit];
    }

    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.thumbnail_url,
              d.category, d.subject, d.credit_cost, d.download_count,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              AVG(r.rating) as avg_rating,
              COUNT(r.rating_id) as rating_count
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       JOIN ratings r ON d.document_id = r.document_id
       WHERE d.status = 'approved' ${categoryCondition}
       GROUP BY d.document_id, u.user_id
       HAVING COUNT(r.rating_id) >= $1
       ORDER BY AVG(r.rating) DESC, COUNT(r.rating_id) DESC
       LIMIT $${queryParams.length}`,
      queryParams
    );

    res.json({
      success: true,
      data: {
        documents: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          thumbnailUrl: row.thumbnail_url,
          category: row.category,
          subject: row.subject,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          avgRating: parseFloat(row.avg_rating).toFixed(1),
          ratingCount: parseInt(row.rating_count),
          author: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          }
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  rateDocument,
  getDocumentRatings,
  deleteRating,
  getUserRating,
  toggleRatingLike,
  reportRating,
  getTopRatedDocuments
};