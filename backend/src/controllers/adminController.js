/**
 * Admin controller
 * Handles administrative functions like user management, document moderation, and system statistics
 */

const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');

// ============= USER MANAGEMENT =============

// Get all users with pagination and filters
const getUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // 'active', 'inactive'
    const role = req.query.role; // 'user', 'moderator', 'admin'
    const search = req.query.search;

    // Build WHERE clause
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      whereConditions.push(`u.is_active = $${paramCount}`);
      queryParams.push(status === 'active');
    }

    if (role) {
      paramCount++;
      whereConditions.push(`u.role = $${paramCount}`);
      queryParams.push(role);
    }

    if (search) {
      paramCount++;
      whereConditions.push(`(u.username ILIKE $${paramCount} OR u.full_name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Add pagination params
    queryParams.push(limit, offset);
    const limitParam = ++paramCount;
    const offsetParam = ++paramCount;

    // Get users with stats
    const usersResult = await query(
      `SELECT u.user_id, u.email, u.username, u.full_name, u.university, u.major,
              u.role, u.credits, u.is_active, u.is_verified_author, u.created_at, u.updated_at,
              COUNT(DISTINCT d.document_id) as document_count,
              COUNT(DISTINCT f1.following_id) as following_count,
              COUNT(DISTINCT f2.follower_id) as follower_count,
              SUM(CASE WHEN ct.transaction_type = 'earn' THEN ct.amount ELSE 0 END) as total_earned
       FROM users u
       LEFT JOIN documents d ON u.user_id = d.user_id
       LEFT JOIN follows f1 ON u.user_id = f1.follower_id
       LEFT JOIN follows f2 ON u.user_id = f2.following_id
       LEFT JOIN credit_transactions ct ON u.user_id = ct.user_id
       ${whereClause}
       GROUP BY u.user_id
       ORDER BY u.created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      queryParams
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(DISTINCT u.user_id) as total FROM users u ${whereClause}`,
      queryParams.slice(0, -2) // Remove limit and offset
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        users: usersResult.rows.map(row => ({
          id: row.user_id,
          email: row.email,
          username: row.username,
          fullName: row.full_name,
          university: row.university,
          major: row.major,
          role: row.role,
          credits: row.credits,
          isActive: row.is_active,
          isVerifiedAuthor: row.is_verified_author,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          stats: {
            documentCount: parseInt(row.document_count),
            followingCount: parseInt(row.following_count),
            followerCount: parseInt(row.follower_count),
            totalEarned: parseInt(row.total_earned) || 0
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

// Update user status or role
const updateUser = async (req, res, next) => {
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

    const { userId } = req.params;
    const { isActive, role, isVerifiedAuthor, reason } = req.body;
    const adminUserId = req.user.user_id;

    // Prevent self-modification
    if (userId === adminUserId) {
      return res.status(403).json({
        success: false,
        error: 'Không thể tự chỉnh sửa tài khoản của mình'
      });
    }

    // Check if target user exists
    const targetUserResult = await query(
      'SELECT username, role, is_active FROM users WHERE user_id = $1',
      [userId]
    );

    if (targetUserResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const targetUser = targetUserResult.rows[0];

    // Prevent modifying other admins (unless super admin)
    if (targetUser.role === 'admin' && req.user.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền chỉnh sửa tài khoản admin khác'
      });
    }

    // Build update query
    let updateFields = [];
    let updateParams = [];
    let paramCount = 0;

    if (typeof isActive === 'boolean') {
      paramCount++;
      updateFields.push(`is_active = $${paramCount}`);
      updateParams.push(isActive);
    }

    if (role && ['user', 'moderator', 'admin'].includes(role)) {
      paramCount++;
      updateFields.push(`role = $${paramCount}`);
      updateParams.push(role);
    }

    if (typeof isVerifiedAuthor === 'boolean') {
      paramCount++;
      updateFields.push(`is_verified_author = $${paramCount}`);
      updateParams.push(isVerifiedAuthor);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Không có trường nào được cập nhật'
      });
    }

    updateFields.push('updated_at = NOW()');
    updateParams.push(userId);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = $${updateParams.length}`,
      updateParams
    );

    // Log admin action
    const actionDescription = `Admin ${req.user.username} updated user ${targetUser.username}: ${reason || 'No reason provided'}`;
    console.log(`[ADMIN ACTION] ${actionDescription}`);

    res.json({
      success: true,
      message: 'Cập nhật người dùng thành công',
      data: {
        userId,
        updatedFields: Object.keys(req.body).filter(key => key !== 'reason'),
        reason: reason || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= DOCUMENT MODERATION =============

// Get pending documents for moderation
const getPendingDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'pending';

    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.file_url, d.thumbnail_url,
              d.category, d.subject, d.credit_cost, d.status, d.created_at, d.updated_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.status = $1
       ORDER BY d.created_at ASC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset]
    );

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) as total FROM documents WHERE status = $1',
      [status]
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        documents: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          fileUrl: row.file_url,
          thumbnailUrl: row.thumbnail_url,
          category: row.category,
          subject: row.subject,
          creditCost: row.credit_cost,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          author: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
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

// Approve or reject document
const moderateDocument = async (req, res, next) => {
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

    const { documentId } = req.params;
    const { action, reason } = req.body; // action: 'approve' or 'reject'
    const moderatorId = req.user.user_id;

    // Check if document exists and is pending
    const docResult = await query(
      `SELECT d.document_id, d.title, d.user_id, d.status,
              u.username, u.full_name
       FROM documents d
       JOIN users u ON d.user_id = u.user_id
       WHERE d.document_id = $1`,
      [documentId]
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = docResult.rows[0];

    if (document.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Tài liệu đã được xử lý rồi',
        data: { currentStatus: document.status }
      });
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    await withTransaction(async (client) => {
      // Update document status
      await client.query(
        'UPDATE documents SET status = $1, updated_at = NOW() WHERE document_id = $2',
        [newStatus, documentId]
      );

      // Create notification for document owner
      const notificationTitle = action === 'approve' 
        ? 'Tài liệu đã được duyệt'
        : 'Tài liệu bị từ chối';
      
      const notificationContent = action === 'approve'
        ? `Tài liệu "${document.title}" của bạn đã được duyệt và có thể tải xuống.`
        : `Tài liệu "${document.title}" của bạn bị từ chối. Lý do: ${reason}`;

      await client.query(
        `INSERT INTO notifications (user_id, type, title, content, related_document_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [document.user_id, 'document_moderation', notificationTitle, notificationContent, documentId]
      );

      // If approved, give credits to author
      if (action === 'approve') {
        const creditBonus = 5; // 5 credits for approved document
        
        await client.query(
          'UPDATE users SET credits = credits + $1 WHERE user_id = $2',
          [creditBonus, document.user_id]
        );

        await client.query(
          `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, related_document_id)
           VALUES ($1, $2, $3, $4, $5)`,
          [document.user_id, creditBonus, 'bonus', `Tài liệu được duyệt: ${document.title}`, documentId]
        );
      }
    });

    // Log moderation action
    const actionLog = `Moderator ${req.user.username} ${action}d document "${document.title}" by ${document.username}. Reason: ${reason || 'No reason provided'}`;
    console.log(`[MODERATION] ${actionLog}`);

    res.json({
      success: true,
      message: `${action === 'approve' ? 'Duyệt' : 'Từ chối'} tài liệu thành công`,
      data: {
        documentId,
        action,
        newStatus,
        reason: reason || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= REPORTS MANAGEMENT =============

// Get reports with pagination and filters
const getReports = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status || 'pending';
    const type = req.query.type; // 'document', 'rating', 'comment'

    // Build WHERE clause
    let whereCondition = 'WHERE r.status = $1';
    let queryParams = [status];

    if (type) {
      whereCondition += ' AND r.report_type = $2';
      queryParams.push(type);
    }

    // Add pagination params
    queryParams.push(limit, offset);
    const limitParam = queryParams.length - 1;
    const offsetParam = queryParams.length;

    const result = await query(
      `SELECT r.report_id, r.report_type, r.reason, r.description, r.status,
              r.created_at, r.updated_at,
              u.user_id as reporter_id, u.username as reporter_username, u.full_name as reporter_name,
              d.document_id, d.title as document_title,
              rt.rating_id, rt.rating, rt.comment as rating_comment,
              c.comment_id, c.content as comment_content,
              target_u.user_id as target_user_id, target_u.username as target_username
       FROM reports r
       JOIN users u ON r.reporter_id = u.user_id
       LEFT JOIN documents d ON r.document_id = d.document_id
       LEFT JOIN ratings rt ON r.rating_id = rt.rating_id
       LEFT JOIN comments c ON r.comment_id = c.comment_id
       LEFT JOIN users target_u ON (
         d.user_id = target_u.user_id OR 
         rt.user_id = target_u.user_id OR 
         c.user_id = target_u.user_id
       )
       ${whereCondition}
       ORDER BY r.created_at ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      queryParams
    );

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) as total FROM reports r ${whereCondition}`,
      queryParams.slice(0, -2) // Remove limit and offset
    );

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        reports: result.rows.map(row => ({
          id: row.report_id,
          type: row.report_type,
          reason: row.reason,
          description: row.description,
          status: row.status,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          reporter: {
            id: row.reporter_id,
            username: row.reporter_username,
            fullName: row.reporter_name
          },
          target: {
            userId: row.target_user_id,
            username: row.target_username
          },
          relatedContent: row.document_id ? {
            type: 'document',
            id: row.document_id,
            title: row.document_title
          } : row.rating_id ? {
            type: 'rating',
            id: row.rating_id,
            rating: row.rating,
            comment: row.rating_comment
          } : row.comment_id ? {
            type: 'comment',
            id: row.comment_id,
            content: row.comment_content
          } : null
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

// Resolve report
const resolveReport = async (req, res, next) => {
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

    const { reportId } = req.params;
    const { action, adminNote } = req.body; // action: 'dismiss' or 'take_action'
    const adminId = req.user.user_id;

    // Check if report exists and is pending
    const reportResult = await query(
      'SELECT report_id, status FROM reports WHERE report_id = $1',
      [reportId]
    );

    if (reportResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Báo cáo không tồn tại'
      });
    }

    if (reportResult.rows[0].status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Báo cáo đã được xử lý rồi'
      });
    }

    const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';

    await query(
      `UPDATE reports 
       SET status = $1, admin_note = $2, resolved_by = $3, updated_at = NOW()
       WHERE report_id = $4`,
      [newStatus, adminNote, adminId, reportId]
    );

    // Log admin action
    const actionLog = `Admin ${req.user.username} ${action} report ${reportId}. Note: ${adminNote || 'No note'}`;
    console.log(`[ADMIN ACTION] ${actionLog}`);

    res.json({
      success: true,
      message: 'Xử lý báo cáo thành công',
      data: {
        reportId,
        action,
        newStatus,
        adminNote: adminNote || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// ============= SYSTEM STATISTICS =============

// Get system dashboard statistics
const getSystemStatistics = async (req, res, next) => {
  try {
    const period = parseInt(req.query.period) || 30; // days

    // User statistics
    const userStats = await query(
      `SELECT 
         COUNT(*) as total_users,
         COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
         COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${period} days' THEN 1 END) as new_users,
         COUNT(CASE WHEN role = 'admin' OR role = 'moderator' THEN 1 END) as staff_users
       FROM users`
    );

    // Document statistics
    const documentStats = await query(
      `SELECT 
         COUNT(*) as total_documents,
         COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_documents,
         COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_documents,
         COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_documents,
         COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${period} days' THEN 1 END) as new_documents
       FROM documents`
    );

    // Transaction statistics
    const transactionStats = await query(
      `SELECT 
         COUNT(*) as total_transactions,
         SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as credits_distributed,
         SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END) as credits_spent,
         COUNT(CASE WHEN created_at >= NOW() - INTERVAL '${period} days' THEN 1 END) as recent_transactions
       FROM credit_transactions`
    );

    // Activity statistics
    const activityStats = await query(
      `SELECT 
         COUNT(DISTINCT d.download_id) as total_downloads,
         COUNT(DISTINCT r.rating_id) as total_ratings,
         COUNT(DISTINCT c.comment_id) as total_comments,
         COUNT(DISTINCT rep.report_id) as total_reports
       FROM downloads d
       FULL OUTER JOIN ratings r ON TRUE
       FULL OUTER JOIN comments c ON TRUE
       FULL OUTER JOIN reports rep ON TRUE
       WHERE d.download_date >= NOW() - INTERVAL '${period} days'
          OR r.created_at >= NOW() - INTERVAL '${period} days'
          OR c.created_at >= NOW() - INTERVAL '${period} days'
          OR rep.created_at >= NOW() - INTERVAL '${period} days'`
    );

    // Top categories
    const topCategories = await query(
      `SELECT category, COUNT(*) as document_count
       FROM documents 
       WHERE status = 'approved'
       GROUP BY category
       ORDER BY document_count DESC
       LIMIT 10`
    );

    // Recent activity
    const recentActivity = await query(
      `SELECT 'user_registered' as type, u.username, u.created_at as timestamp
       FROM users u
       WHERE u.created_at >= NOW() - INTERVAL '7 days'
       
       UNION ALL
       
       SELECT 'document_uploaded' as type, d.title as username, d.created_at as timestamp
       FROM documents d
       WHERE d.created_at >= NOW() - INTERVAL '7 days'
       
       ORDER BY timestamp DESC
       LIMIT 20`
    );

    res.json({
      success: true,
      data: {
        period: `${period} days`,
        users: {
          total: parseInt(userStats.rows[0].total_users),
          active: parseInt(userStats.rows[0].active_users),
          new: parseInt(userStats.rows[0].new_users),
          staff: parseInt(userStats.rows[0].staff_users)
        },
        documents: {
          total: parseInt(documentStats.rows[0].total_documents),
          approved: parseInt(documentStats.rows[0].approved_documents),
          pending: parseInt(documentStats.rows[0].pending_documents),
          rejected: parseInt(documentStats.rows[0].rejected_documents),
          new: parseInt(documentStats.rows[0].new_documents)
        },
        transactions: {
          total: parseInt(transactionStats.rows[0].total_transactions),
          creditsDistributed: parseInt(transactionStats.rows[0].credits_distributed) || 0,
          creditsSpent: parseInt(transactionStats.rows[0].credits_spent) || 0,
          recent: parseInt(transactionStats.rows[0].recent_transactions)
        },
        activity: {
          totalDownloads: parseInt(activityStats.rows[0].total_downloads) || 0,
          totalRatings: parseInt(activityStats.rows[0].total_ratings) || 0,
          totalComments: parseInt(activityStats.rows[0].total_comments) || 0,
          totalReports: parseInt(activityStats.rows[0].total_reports) || 0
        },
        topCategories: topCategories.rows.map(row => ({
          category: row.category,
          count: parseInt(row.document_count)
        })),
        recentActivity: recentActivity.rows.map(row => ({
          type: row.type,
          description: row.username,
          timestamp: row.timestamp
        }))
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  updateUser,
  getPendingDocuments,
  moderateDocument,
  getReports,
  resolveReport,
  getSystemStatistics
};