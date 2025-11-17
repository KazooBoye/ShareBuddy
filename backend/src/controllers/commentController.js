/**
 * Comment controller
 * Handles document comments and comment threads functionality
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');

// Create a new comment on a document
const createComment = async (req, res, next) => {
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
    const { content, parentId = null } = req.body;
    const userId = req.user.user_id;

    // Check if document exists and is approved
    const docResult = await query(
      'SELECT document_id, title, user_id FROM documents WHERE document_id = $1 AND status = $2',
      [documentId, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại hoặc chưa được duyệt'
      });
    }

    // If replying to a comment, check if parent comment exists
    if (parentId) {
      const parentResult = await query(
        'SELECT comment_id, parent_id FROM comments WHERE comment_id = $1 AND document_id = $2',
        [parentId, documentId]
      );

      if (parentResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Comment cha không tồn tại'
        });
      }

      // Prevent nested replies (only 2 levels: comment -> reply)
      if (parentResult.rows[0].parent_id !== null) {
        return res.status(400).json({
          success: false,
          error: 'Không thể reply cho một reply'
        });
      }
    }

    // Create comment
    const result = await query(
      `INSERT INTO comments (user_id, document_id, parent_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING comment_id, content, parent_id, created_at, updated_at`,
      [userId, documentId, parentId, content]
    );

    const comment = result.rows[0];

    // Get user information
    const userResult = await query(
      'SELECT username, full_name, avatar_url, is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );

    const user = userResult.rows[0];

    res.status(201).json({
      success: true,
      message: 'Tạo comment thành công',
      data: {
        comment: {
          id: comment.comment_id,
          content: comment.content,
          parentId: comment.parent_id,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          likeCount: 0,
          replyCount: 0,
          isLiked: false,
          user: {
            id: userId,
            username: user.username,
            fullName: user.full_name,
            avatarUrl: user.avatar_url,
            isVerifiedAuthor: user.is_verified_author
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get comments for a document with pagination
const getDocumentComments = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'created_at';
    const sortOrder = req.query.sortOrder === 'asc' ? 'ASC' : 'DESC';

    // Check if document exists
    const docResult = await query(
      'SELECT document_id FROM documents WHERE document_id = $1',
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    // Validate sort parameters
    const validSortFields = ['created_at', 'updated_at'];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';

    // Get top-level comments (not replies)
    const commentsResult = await query(
      `SELECT c.comment_id, c.content, c.created_at, c.updated_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              COUNT(DISTINCT cl.like_id) as like_count,
              COUNT(DISTINCT cr.comment_id) as reply_count,
              CASE WHEN ucl.like_id IS NOT NULL THEN true ELSE false END as is_liked
       FROM comments c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN comment_likes cl ON c.comment_id = cl.comment_id
       LEFT JOIN comments cr ON c.comment_id = cr.parent_id
       LEFT JOIN comment_likes ucl ON c.comment_id = ucl.comment_id AND ucl.user_id = $1
       WHERE c.document_id = $2 AND c.parent_id IS NULL AND u.is_active = true
       GROUP BY c.comment_id, u.user_id, ucl.like_id
       ORDER BY c.${finalSortBy} ${sortOrder}
       LIMIT $3 OFFSET $4`,
      [req.user?.user_id || null, documentId, limit, offset]
    );

    // Get total count of top-level comments
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM comments c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.document_id = $1 AND c.parent_id IS NULL AND u.is_active = true`,
      [documentId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    // For each comment, get recent replies
    const commentsWithReplies = await Promise.all(
      commentsResult.rows.map(async (comment) => {
        const repliesResult = await query(
          `SELECT c.comment_id, c.content, c.created_at, c.updated_at,
                  u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
                  COUNT(DISTINCT cl.like_id) as like_count,
                  CASE WHEN ucl.like_id IS NOT NULL THEN true ELSE false END as is_liked
           FROM comments c
           JOIN users u ON c.user_id = u.user_id
           LEFT JOIN comment_likes cl ON c.comment_id = cl.comment_id
           LEFT JOIN comment_likes ucl ON c.comment_id = ucl.comment_id AND ucl.user_id = $1
           WHERE c.parent_id = $2 AND u.is_active = true
           GROUP BY c.comment_id, u.user_id, ucl.like_id
           ORDER BY c.created_at ASC
           LIMIT 3`,
          [req.user?.user_id || null, comment.comment_id]
        );

        return {
          id: comment.comment_id,
          content: comment.content,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          likeCount: parseInt(comment.like_count),
          replyCount: parseInt(comment.reply_count),
          isLiked: comment.is_liked,
          user: {
            id: comment.user_id,
            username: comment.username,
            fullName: comment.full_name,
            avatarUrl: comment.avatar_url,
            isVerifiedAuthor: comment.is_verified_author
          },
          replies: repliesResult.rows.map(reply => ({
            id: reply.comment_id,
            content: reply.content,
            createdAt: reply.created_at,
            updatedAt: reply.updated_at,
            likeCount: parseInt(reply.like_count),
            isLiked: reply.is_liked,
            user: {
              id: reply.user_id,
              username: reply.username,
              fullName: reply.full_name,
              avatarUrl: reply.avatar_url,
              isVerifiedAuthor: reply.is_verified_author
            }
          }))
        };
      })
    );

    res.json({
      success: true,
      data: {
        comments: commentsWithReplies,
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

// Get replies for a specific comment
const getCommentReplies = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Check if parent comment exists
    const parentResult = await query(
      'SELECT comment_id, parent_id FROM comments WHERE comment_id = $1',
      [commentId]
    );

    if (parentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment không tồn tại'
      });
    }

    if (parentResult.rows[0].parent_id !== null) {
      return res.status(400).json({
        success: false,
        error: 'Comment này là một reply, không có sub-replies'
      });
    }

    // Get replies
    const repliesResult = await query(
      `SELECT c.comment_id, c.content, c.created_at, c.updated_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              COUNT(DISTINCT cl.like_id) as like_count,
              CASE WHEN ucl.like_id IS NOT NULL THEN true ELSE false END as is_liked
       FROM comments c
       JOIN users u ON c.user_id = u.user_id
       LEFT JOIN comment_likes cl ON c.comment_id = cl.comment_id
       LEFT JOIN comment_likes ucl ON c.comment_id = ucl.comment_id AND ucl.user_id = $1
       WHERE c.parent_id = $2 AND u.is_active = true
       GROUP BY c.comment_id, u.user_id, ucl.like_id
       ORDER BY c.created_at ASC
       LIMIT $3 OFFSET $4`,
      [req.user?.user_id || null, commentId, limit, offset]
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total
       FROM comments c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.parent_id = $1 AND u.is_active = true`,
      [commentId]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        replies: repliesResult.rows.map(reply => ({
          id: reply.comment_id,
          content: reply.content,
          createdAt: reply.created_at,
          updatedAt: reply.updated_at,
          likeCount: parseInt(reply.like_count),
          isLiked: reply.is_liked,
          user: {
            id: reply.user_id,
            username: reply.username,
            fullName: reply.full_name,
            avatarUrl: reply.avatar_url,
            isVerifiedAuthor: reply.is_verified_author
          }
        })),
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

// Update a comment
const updateComment = async (req, res, next) => {
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

    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.user_id;

    const result = await query(
      `UPDATE comments 
       SET content = $1, updated_at = NOW()
       WHERE comment_id = $2 AND user_id = $3
       RETURNING comment_id, content, created_at, updated_at`,
      [content, commentId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment không tồn tại hoặc bạn không có quyền chỉnh sửa'
      });
    }

    const comment = result.rows[0];

    res.json({
      success: true,
      message: 'Cập nhật comment thành công',
      data: {
        comment: {
          id: comment.comment_id,
          content: comment.content,
          createdAt: comment.created_at,
          updatedAt: comment.updated_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete a comment
const deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user_id;

    // Check if user owns the comment or is admin/moderator
    const commentResult = await query(
      'SELECT user_id, parent_id FROM comments WHERE comment_id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment không tồn tại'
      });
    }

    const comment = commentResult.rows[0];
    const isOwner = comment.user_id === userId;
    const isAdminOrMod = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isOwner && !isAdminOrMod) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền xóa comment này'
      });
    }

    await withTransaction(async (client) => {
      // Delete all likes for this comment
      await client.query(
        'DELETE FROM comment_likes WHERE comment_id = $1',
        [commentId]
      );

      // If this is a parent comment, delete all replies
      if (comment.parent_id === null) {
        const repliesResult = await client.query(
          'SELECT comment_id FROM comments WHERE parent_id = $1',
          [commentId]
        );

        for (const reply of repliesResult.rows) {
          await client.query(
            'DELETE FROM comment_likes WHERE comment_id = $1',
            [reply.comment_id]
          );
        }

        await client.query(
          'DELETE FROM comments WHERE parent_id = $1',
          [commentId]
        );
      }

      // Delete the comment itself
      await client.query(
        'DELETE FROM comments WHERE comment_id = $1',
        [commentId]
      );
    });

    res.json({
      success: true,
      message: 'Xóa comment thành công'
    });
  } catch (error) {
    next(error);
  }
};

// Like/unlike a comment
const toggleCommentLike = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.user_id;

    // Check if comment exists
    const commentResult = await query(
      'SELECT user_id FROM comments WHERE comment_id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment không tồn tại'
      });
    }

    // Users cannot like their own comments
    if (commentResult.rows[0].user_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể like comment của chính mình'
      });
    }

    // Check if already liked
    const existingLike = await query(
      'SELECT 1 FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
      [userId, commentId]
    );

    let isLiked;
    if (existingLike.rows.length > 0) {
      // Unlike
      await query(
        'DELETE FROM comment_likes WHERE user_id = $1 AND comment_id = $2',
        [userId, commentId]
      );
      isLiked = false;
    } else {
      // Like
      await query(
        'INSERT INTO comment_likes (user_id, comment_id) VALUES ($1, $2)',
        [userId, commentId]
      );
      isLiked = true;
    }

    // Get updated like count
    const likeCountResult = await query(
      'SELECT COUNT(*) as like_count FROM comment_likes WHERE comment_id = $1',
      [commentId]
    );

    const likeCount = parseInt(likeCountResult.rows[0].like_count);

    res.json({
      success: true,
      message: isLiked ? 'Liked comment' : 'Unliked comment',
      data: {
        isLiked,
        likeCount
      }
    });
  } catch (error) {
    next(error);
  }
};

// Report a comment
const reportComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.user_id;

    // Check if comment exists
    const commentResult = await query(
      'SELECT user_id FROM comments WHERE comment_id = $1',
      [commentId]
    );

    if (commentResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Comment không tồn tại'
      });
    }

    // Users cannot report their own comments
    if (commentResult.rows[0].user_id === userId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể báo cáo comment của chính mình'
      });
    }

    // Check if already reported by this user
    const existingReport = await query(
      'SELECT 1 FROM reports WHERE reporter_id = $1 AND comment_id = $2',
      [userId, commentId]
    );

    if (existingReport.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Bạn đã báo cáo comment này rồi'
      });
    }

    // Create report
    await query(
      `INSERT INTO reports (reporter_id, comment_id, reason, description, report_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, commentId, reason, description, 'comment']
    );

    res.json({
      success: true,
      message: 'Báo cáo comment thành công. Chúng tôi sẽ xem xét sớm nhất.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createComment,
  getDocumentComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  toggleCommentLike,
  reportComment
};