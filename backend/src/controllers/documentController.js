/**
 * Document controller
 * Handles document management, search, and related operations
 */

const { query, withTransaction } = require('../config/database');
const path = require('path');

// Get all documents with filters and pagination
const getDocuments = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const offset = (page - 1) * limit;
    
    const {
      search,
      subject,
      university,
      major,
      minRating,
      maxCost,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = req.query;

    // Build WHERE clause dynamically
    let whereConditions = ["d.status = 'approved'"];
    let queryParams = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      whereConditions.push(`(d.title ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    if (subject) {
      paramCount++;
      whereConditions.push(`d.subject = $${paramCount}`);
      queryParams.push(subject);
    }

    if (university) {
      paramCount++;
      whereConditions.push(`u.university = $${paramCount}`);
      queryParams.push(university);
    }

    if (major) {
      paramCount++;
      whereConditions.push(`u.major = $${paramCount}`);
      queryParams.push(major);
    }

    if (minRating) {
      paramCount++;
      whereConditions.push(`d.average_rating >= $${paramCount}`);
      queryParams.push(parseFloat(minRating));
    }

    if (maxCost) {
      paramCount++;
      whereConditions.push(`d.credit_cost <= $${paramCount}`);
      queryParams.push(parseInt(maxCost));
    }

    // Add pagination params
    queryParams.push(limit, offset);
    const limitParam = ++paramCount;
    const offsetParam = ++paramCount;

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Validate sort parameters
    const validSortFields = ['created_at', 'title', 'download_count', 'avg_rating', 'credit_cost'];
    const validSortOrders = ['ASC', 'DESC'];
    const finalSortBy = validSortFields.includes(sortBy) ? sortBy : 'created_at';
    const finalSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

    const documentsQuery = `
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.file_name,
        d.file_size,
        d.file_type,
        d.university,
        d.subject,
        d.download_count,
        d.view_count,
        d.credit_cost,
        d.is_public,
        d.is_premium,
        d.status,
        d.average_rating,
        d.rating_count,
        d.created_at,
        d.updated_at,
        u.user_id,
        u.username,
        u.full_name,
        u.avatar_url,
        u.is_verified_author
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      ${whereClause}
      ORDER BY ${finalSortBy === 'avg_rating' ? 'd.average_rating' : 'd.' + finalSortBy} ${finalSortOrder}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await query(documentsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT d.document_id) as total
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      data: {
        items: result.rows.map(row => ({
          id: row.document_id,
          title: row.title,
          description: row.description,
          subject: row.subject,
          university: row.university,
          creditCost: row.credit_cost,
          downloadCount: row.download_count,
          viewCount: row.view_count,
          avgRating: row.average_rating ? parseFloat(row.average_rating).toFixed(1) : '0.0',
          ratingCount: row.rating_count || 0,
          createdAt: row.created_at,
          author: {
            id: row.user_id,
            username: row.username,
            fullName: row.full_name,
            avatarUrl: row.avatar_url,
            isVerifiedAuthor: row.is_verified_author
          }
        })),
        page,
        totalPages,
        totalItems: total,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get document by ID
const getDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT d.document_id, d.title, d.description, d.file_url, d.thumbnail_url,
              d.subject, d.credit_cost, d.download_count, d.status,
              d.created_at, d.updated_at,
              u.user_id, u.username, u.full_name, u.avatar_url, u.is_verified_author,
              u.university, u.major,
              AVG(r.rating) as avg_rating,
              COUNT(r.rating_id) as rating_count
       FROM documents d
       JOIN users u ON d.author_id = u.user_id
       LEFT JOIN ratings r ON d.document_id = r.document_id
       WHERE d.document_id = $1
       GROUP BY d.document_id, u.user_id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại'
      });
    }

    const document = result.rows[0];

    // Check if document is approved or user is owner
    if (document.status !== 'approved' && 
        (!req.user || req.user.user_id !== document.author_id)) {
      return res.status(403).json({
        success: false,
        error: 'Không có quyền truy cập tài liệu này'
      });
    }

    // Check if user has bookmarked this document
    let isBookmarked = false;
    let userRating = null;
    let canDownload = false;

    if (req.user) {
      // Check bookmark
      const bookmarkResult = await query(
        'SELECT 1 FROM bookmarks WHERE user_id = $1 AND document_id = $2',
        [req.user.user_id, id]
      );
      isBookmarked = bookmarkResult.rows.length > 0;

      // Check user's rating
      const ratingResult = await query(
        'SELECT rating, comment FROM ratings WHERE user_id = $1 AND document_id = $2',
        [req.user.user_id, id]
      );
      if (ratingResult.rows.length > 0) {
        userRating = {
          rating: ratingResult.rows[0].rating,
          comment: ratingResult.rows[0].comment
        };
      }

      // Check if user can download (is owner, has enough credits, or already downloaded)
      if (req.user.user_id === document.user_id) {
        canDownload = true;
      } else {
        const downloadResult = await query(
          'SELECT 1 FROM downloads WHERE user_id = $1 AND document_id = $2',
          [req.user.user_id, id]
        );
        canDownload = downloadResult.rows.length > 0 || req.user.credits >= document.credit_cost;
      }
    }

    res.json({
      success: true,
      data: {
        document: {
          id: document.document_id,
          title: document.title,
          description: document.description,
          fileUrl: document.file_url,
          thumbnailUrl: document.thumbnail_url,
          subject: document.subject,
          creditCost: document.credit_cost,
          downloadCount: document.download_count,
          status: document.status,
          avgRating: document.avg_rating ? parseFloat(document.avg_rating).toFixed(1) : null,
          ratingCount: parseInt(document.rating_count),
          createdAt: document.created_at,
          updatedAt: document.updated_at,
          author: {
            id: document.author_id,
            username: document.username,
            fullName: document.full_name,
            avatarUrl: document.avatar_url,
            isVerifiedAuthor: document.is_verified_author,
            university: document.university,
            major: document.major
          },
          userInteraction: req.user ? {
            isBookmarked,
            userRating,
            canDownload
          } : null
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Upload document
const uploadDocument = async (req, res, next) => {
  try {
    const requestId = Math.random().toString(36).substring(7);
    console.log(`\n🆕 [${requestId}] Upload request received`);
    console.log(`[${requestId}] Request body:`, req.body);
    console.log(`[${requestId}] Request file:`, req.file);
    
    if (!req.file) {
      console.log(`[${requestId}] No file in request`);
      return res.status(400).json({
        success: false,
        error: 'Không có file được upload'
      });
    }

    // Validate required fields
    const { title } = req.body;
    
    if (!title || title.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Tiêu đề phải có ít nhất 3 ký tự'
      });
    }

    const {
      description,
      subject,
      creditCost,
      university,
      tags
    } = req.body;

    const userId = req.user.user_id;
    const fileUrl = `/uploads/documents/${req.file.filename}`; // Permanent path
    const fileName = req.file.originalname;
    const fileSize = req.file.size;
    const fileType = path.extname(req.file.originalname).toLowerCase().slice(1);
    
    console.log(`[${requestId}] Creating document with data:`, {
      userId,
      title,
      description,
      subject,
      university,
      creditCost,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      tags
    });
    
    let document;
    let moderationJob;
    
    // Use transaction to ensure all operations succeed or fail together
    console.log(`[${requestId}] 🔄 Starting transaction for user ${userId}`);
    await withTransaction(async (client) => {
      console.log(`[${requestId}] 📝 Inserting document with status 'pending'...`);
      
      // Create document with status 'pending' (awaiting moderation)
      const result = await client.query(
        `INSERT INTO documents (author_id, title, description, file_path, file_name, file_size, file_type, subject, university, credit_cost, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING document_id, title, description, file_path, file_name, file_size, file_type, subject, university, credit_cost, status, created_at`,
        [userId, title, description, fileUrl, fileName, fileSize, fileType, subject, university || null, parseInt(creditCost) || 0, 'pending']
      );

      document = result.rows[0];
      console.log(`[${requestId}] ✅ Document created with ID: ${document.document_id}, status: pending`);
      
      // Create moderation job record
      console.log(`[${requestId}] 📋 Creating moderation job record...`);
      const moderationResult = await client.query(
        `INSERT INTO moderation_jobs (document_id, moderation_status)
         VALUES ($1, $2)
         RETURNING job_id, document_id, moderation_status, created_at`,
        [document.document_id, 'queued']
      );
      moderationJob = moderationResult.rows[0];
      console.log(`[${requestId}] ✅ Moderation job created with ID: ${moderationJob.job_id}`);
    });
    console.log(`[${requestId}] ✅ Transaction completed successfully`);
    
    // Process and insert tags if provided
    if (tags) {
      const tagList = typeof tags === 'string' 
        ? tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
        : Array.isArray(tags) ? tags : [];
      
      if (tagList.length > 0) {
        console.log(`[${requestId}] Inserting tags:`, tagList);
        for (const tag of tagList) {
          await query(
            'INSERT INTO document_tags (document_id, tag_name) VALUES ($1, $2)',
            [document.document_id, tag]
          );
        }
      }
    }
    
    // Push to Redis queue for AI moderation (async, non-blocking)
    console.log(`[${requestId}] 🚀 Pushing to Redis queue for moderation...`);
    setImmediate(async () => {
      try {
        const { addModerationJob } = require('../services/moderationQueue');
        await addModerationJob({
          document_id: document.document_id,
          file_path: fileUrl,
          metadata: {
            title,
            description,
            subject,
            fileType,
            userId
          }
        });
        console.log(`[${requestId}] ✅ Job pushed to Redis queue successfully`);
      } catch (queueError) {
        console.error(`[${requestId}] ⚠️ Failed to push to Redis queue:`, queueError.message);
        // Log but don't fail - moderation job record exists and can be retried
      }
    });
    
    console.log(`[${requestId}] ℹ️ Credit will be awarded after moderation approval`);
    console.log(`[${requestId}] 🎉 Document uploaded successfully - awaiting moderation`);

    res.status(201).json({
      success: true,
      message: 'Tài liệu đã được tải lên và đang được kiểm duyệt. Bạn sẽ nhận được thông báo khi tài liệu được phê duyệt.',
      data: {
        document: {
          id: document.document_id,
          title: document.title,
          description: document.description,
          fileName: document.file_name,
          fileSize: document.file_size,
          fileType: document.file_type,
          subject: document.subject,
          university: document.university,
          creditCost: document.credit_cost,
          status: document.status,
          createdAt: document.created_at
        },
        moderation: moderationJob ? {
          jobId: moderationJob.job_id,
          status: moderationJob.moderation_status
        } : null
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    next(error);
  }
};

// Download document
const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.user_id;

    // Get document info
    const docResult = await query(
      'SELECT author_id, title, file_url, credit_cost FROM documents WHERE document_id = $1 AND status = $2',
      [id, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại hoặc chưa được duyệt'
      });
    }

    const document = docResult.rows[0];

    // Check if user already downloaded
    const existingDownload = await query(
      'SELECT 1 FROM downloads WHERE user_id = $1 AND document_id = $2',
      [userId, id]
    );

    if (existingDownload.rows.length > 0 || document.user_id === userId) {
      // Already downloaded or is owner - allow free download
      return res.json({
        success: true,
        message: 'Download được phép',
        data: {
          downloadUrl: document.file_url,
          title: document.title
        }
      });
    }

    // Check if user has enough credits
    const userResult = await query(
      'SELECT credits FROM users WHERE user_id = $1',
      [userId]
    );

    const userCredits = userResult.rows[0].credits;

    if (userCredits < document.credit_cost) {
      return res.status(402).json({
        success: false,
        error: 'Không đủ credits để tải tài liệu',
        data: {
          required: document.credit_cost,
          available: userCredits
        }
      });
    }

    // Process download with transaction
    await withTransaction(async (client) => {
      // Record download
      await client.query(
        'INSERT INTO downloads (user_id, document_id) VALUES ($1, $2)',
        [userId, id]
      );

      // Update download count
      await client.query(
        'UPDATE documents SET download_count = download_count + 1 WHERE document_id = $1',
        [id]
      );

      // Record credit transactions (trigger will auto-update user credits)
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, -document.credit_cost, 'download', `Tải tài liệu: ${document.title}`, id]
      );

      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, description, reference_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [document.author_id, document.credit_cost, 'earn', `Bán tài liệu: ${document.title}`, id]
      );
    });

    res.json({
      success: true,
      message: `Download thành công! Đã trừ ${document.credit_cost} credits.`,
      data: {
        downloadUrl: document.file_url,
        title: document.title,
        creditsSpent: document.credit_cost
      }
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder functions for other operations
const updateDocument = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng cập nhật tài liệu chưa được triển khai'
  });
};

const deleteDocument = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng xóa tài liệu chưa được triển khai'
  });
};

const rateDocument = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng đánh giá tài liệu chưa được triển khai'
  });
};

const getDocumentRatings = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng xem đánh giá chưa được triển khai'
  });
};

const bookmarkDocument = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user.user_id;

    // Check if document exists and is approved
    const docResult = await query(
      'SELECT document_id, title FROM documents WHERE document_id = $1 AND status = $2',
      [documentId, 'approved']
    );

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Tài liệu không tồn tại hoặc chưa được duyệt'
      });
    }

    // Check if already bookmarked
    const existingBookmark = await query(
      'SELECT 1 FROM bookmarks WHERE user_id = $1 AND document_id = $2',
      [userId, documentId]
    );

    if (existingBookmark.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Tài liệu đã được bookmark rồi'
      });
    }

    // Create bookmark
    await query(
      'INSERT INTO bookmarks (user_id, document_id) VALUES ($1, $2)',
      [userId, documentId]
    );

    res.json({
      success: true,
      message: 'Bookmark tài liệu thành công'
    });
  } catch (error) {
    next(error);
  }
};

const removeBookmark = async (req, res, next) => {
  try {
    const { id: documentId } = req.params;
    const userId = req.user.user_id;

    const result = await query(
      'DELETE FROM bookmarks WHERE user_id = $1 AND document_id = $2',
      [userId, documentId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Bookmark không tồn tại'
      });
    }

    res.json({
      success: true,
      message: 'Xóa bookmark thành công'
    });
  } catch (error) {
    next(error);
  }
};



const reportDocument = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng báo cáo tài liệu chưa được triển khai'
  });
};

module.exports = {
  getDocuments,
  getDocumentById: getDocument,
  searchDocuments: getDocuments,
  getFeaturedDocuments: getDocuments,
  getRecentDocuments: getDocuments,
  getPopularDocuments: getDocuments,
  getPopularTags: getDocuments, // Return empty list instead of error
  previewDocument: getDocument,
  incrementView: getDocument, // TODO: Implement view counter
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  rateDocument, // Placeholder - use ratingController instead
  getDocumentRatings, // Placeholder - use ratingController instead
  updateRating: rateDocument,
  deleteRating: deleteDocument,
  addComment: rateDocument, // Placeholder - use commentController instead
  getDocumentComments: getDocumentRatings,
  updateComment: rateDocument,
  deleteComment: deleteDocument,
  likeComment: rateDocument,
  unlikeComment: deleteDocument,
  bookmarkDocument,
  removeBookmark,
  getUserBookmarks: getDocuments,
  reportDocument,
  getDocumentAnalytics: getDocument // TODO: Implement analytics
};