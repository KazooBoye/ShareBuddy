/**
 * Verified Author Service
 * Handles verified author badge requests and management
 */

const { query, withTransaction } = require('../config/database');

// Submit verified author request
const submitRequest = async (userId, reason) => {
  try {
    // Check if user already has a pending request
    const existingRequest = await query(
      'SELECT request_id FROM verified_author_requests WHERE user_id = $1 AND status = $2',
      [userId, 'pending']
    );

    if (existingRequest.rows.length > 0) {
      throw new Error('Bạn đã có yêu cầu đang chờ xét duyệt');
    }

    // Check if user is already verified
    const user = await query(
      'SELECT is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );

    if (user.rows[0]?.is_verified_author) {
      throw new Error('Bạn đã là tác giả uy tín');
    }

    // Create new request
    const result = await query(
      `INSERT INTO verified_author_requests (user_id, reason, status)
       VALUES ($1, $2, $3)
       RETURNING request_id, created_at`,
      [userId, reason, 'pending']
    );

    return result.rows[0];
  } catch (error) {
    throw error;
  }
};

// Get user's requests
const getUserRequests = async (userId) => {
  try {
    const result = await query(
      `SELECT 
        request_id,
        reason,
        status,
        admin_note,
        created_at,
        updated_at
       FROM verified_author_requests
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
};

// [ADMIN] Get all pending requests
const getPendingRequests = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        r.request_id,
        r.user_id,
        r.reason,
        r.status,
        r.created_at,
        u.username,
        u.full_name,
        u.email,
        u.avatar_url,
        COUNT(DISTINCT d.document_id) as document_count,
        AVG(d.average_rating) as avg_rating,
        SUM(d.download_count) as total_downloads
       FROM verified_author_requests r
       JOIN users u ON r.user_id = u.user_id
       LEFT JOIN documents d ON u.user_id = d.user_id AND d.status = 'approved'
       WHERE r.status = 'pending'
       GROUP BY r.request_id, u.user_id
       ORDER BY r.created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM verified_author_requests WHERE status = $1',
      ['pending']
    );

    return {
      requests: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    throw error;
  }
};

// [ADMIN] Review request
const reviewRequest = async (requestId, adminId, action, adminNote) => {
  try {
    return await withTransaction(async (client) => {
      // Get request details
      const requestResult = await client.query(
        'SELECT user_id, status FROM verified_author_requests WHERE request_id = $1',
        [requestId]
      );

      if (requestResult.rows.length === 0) {
        throw new Error('Không tìm thấy yêu cầu');
      }

      const request = requestResult.rows[0];

      if (request.status !== 'pending') {
        throw new Error('Yêu cầu đã được xử lý');
      }

      // Update request status
      await client.query(
        `UPDATE verified_author_requests
         SET status = $1, admin_note = $2, reviewed_by = $3, updated_at = NOW()
         WHERE request_id = $4`,
        [action, adminNote, adminId, requestId]
      );

      // If approved, update user's verified status
      if (action === 'approved') {
        await client.query(
          'UPDATE users SET is_verified_author = TRUE WHERE user_id = $1',
          [request.user_id]
        );

        // Create notification
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, $2, $3, $4)`,
          [
            request.user_id,
            'system',
            'Yêu cầu tác giả uy tín được chấp nhận',
            'Chúc mừng! Bạn đã trở thành tác giả uy tín trên ShareBuddy.'
          ]
        );
      } else if (action === 'rejected') {
        // Create rejection notification
        await client.query(
          `INSERT INTO notifications (user_id, type, title, message)
           VALUES ($1, $2, $3, $4)`,
          [
            request.user_id,
            'system',
            'Yêu cầu tác giả uy tín bị từ chối',
            adminNote || 'Yêu cầu của bạn không đáp ứng tiêu chuẩn. Vui lòng thử lại sau.'
          ]
        );
      }

      return { success: true };
    });
  } catch (error) {
    throw error;
  }
};

// Get verified authors list
const getVerifiedAuthors = async (page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;

    const result = await query(
      `SELECT 
        u.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.bio,
        u.university,
        u.major,
        COUNT(DISTINCT d.document_id) as document_count,
        AVG(d.average_rating) as avg_rating,
        SUM(d.download_count) as total_downloads,
        COUNT(DISTINCT f.follower_id) as follower_count
       FROM users u
       LEFT JOIN documents d ON u.user_id = d.user_id AND d.status = 'approved'
       LEFT JOIN follows f ON u.user_id = f.following_id
       WHERE u.is_verified_author = TRUE
       GROUP BY u.user_id
       ORDER BY total_downloads DESC, avg_rating DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await query(
      'SELECT COUNT(*) FROM users WHERE is_verified_author = TRUE'
    );

    return {
      authors: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    throw error;
  }
};

// Check if user is verified
const isVerified = async (userId) => {
  try {
    const result = await query(
      'SELECT is_verified_author FROM users WHERE user_id = $1',
      [userId]
    );

    return result.rows[0]?.is_verified_author || false;
  } catch (error) {
    return false;
  }
};

module.exports = {
  submitRequest,
  getUserRequests,
  getPendingRequests,
  reviewRequest,
  getVerifiedAuthors,
  isVerified
};
