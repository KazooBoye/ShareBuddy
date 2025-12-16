/**
 * Document controller
 * Handles document management, search, and related operations
 */

const { validationResult } = require('express-validator');
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
      category,
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

    if (category) {
      paramCount++;
      whereConditions.push(`d.category = $${paramCount}`);
      queryParams.push(category);
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
      whereConditions.push(`avg_ratings.avg_rating >= $${paramCount}`);
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
        d.created_at,
        d.updated_at,
        u.username as author_name,
        u.full_name as author_full_name,
        COALESCE(avg_ratings.avg_rating, 0) as average_rating,
        COALESCE(rating_counts.rating_count, 0) as rating_count
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      LEFT JOIN (
        SELECT document_id, AVG(rating) as avg_rating
        FROM ratings
        GROUP BY document_id
      ) avg_ratings ON d.document_id = avg_ratings.document_id
      LEFT JOIN (
        SELECT document_id, COUNT(*) as rating_count
        FROM ratings
        GROUP BY document_id
      ) rating_counts ON d.document_id = rating_counts.document_id
      ${whereClause}
      ORDER BY ${finalSortBy === 'avg_rating' ? 'avg_ratings.avg_rating' : 'd.' + finalSortBy} ${finalSortOrder}
      LIMIT $${limitParam} OFFSET $${offsetParam}
    `;

    const result = await query(documentsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT d.document_id) as total
      FROM documents d
      JOIN users u ON d.author_id = u.user_id
      LEFT JOIN (
        SELECT document_id, AVG(rating) as avg_rating
        FROM ratings
        GROUP BY document_id
      ) avg_ratings ON d.document_id = avg_ratings.document_id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
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
          downloadCount: row.download_count,
          avgRating: parseFloat(row.avg_rating).toFixed(1),
          ratingCount: parseInt(row.rating_count),
          createdAt: row.created_at,
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
        },
        filters: {
          search: search || null,
          category: category || null,
          subject: subject || null,
          university: university || null,
          major: major || null,
          minRating: minRating || null,
          maxCost: maxCost || null,
          sortBy: finalSortBy,
          sortOrder: finalSortOrder
        }
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
              d.category, d.subject, d.credit_cost, d.download_count, d.status,
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
          category: document.category,
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
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(`[${requestId}] Validation errors:`, errors.array());
      return res.status(400).json({
        success: false,
        error: 'Dữ liệu không hợp lệ',
        details: errors.array()
      });
    }

    if (!req.file) {
      console.log(`[${requestId}] No file in request`);
      return res.status(400).json({
        success: false,
        error: 'Không có file được upload'
      });
    }

    const {
      title,
      description,
      subject,
      creditCost,
      university,
      tags
    } = req.body;

    const userId = req.user.user_id;
    const fileUrl = `/uploads/documents/${req.file.filename}`;
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
    
    // Use transaction to ensure all operations succeed or fail together
    console.log(`[${requestId}] 🔄 Starting transaction for user ${userId}`);
    await withTransaction(async (client) => {
      console.log(`[${requestId}] 📝 Inserting document...`);
      
      // Create document with status 'approved' (immediately available)
      const result = await client.query(
        `INSERT INTO documents (author_id, title, description, file_path, file_name, file_size, file_type, subject, university, credit_cost, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING document_id, title, description, file_path, file_name, file_size, file_type, subject, university, credit_cost, status, created_at`,
        [userId, title, description, fileUrl, fileName, fileSize, fileType, subject, university || null, parseInt(creditCost) || 0, 'approved']
      );

      document = result.rows[0];
      console.log(`[${requestId}] ✅ Document created with ID: ${document.document_id}`);
      
      // Record credit transaction (trigger will auto-update user credits)
      console.log(`[${requestId}] 📊 Recording credit transaction (trigger will update credits automatically)...`);
      await client.query(
        `INSERT INTO credit_transactions (user_id, amount, transaction_type, reference_id, description)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, 1, 'upload', document.document_id, `Tải lên tài liệu: ${title}`]
      );
      console.log(`[${requestId}] ✅ Transaction recorded - trigger awarded 1 credit`);
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
    
    console.log(`[${requestId}] 🎉 Document created successfully:`, document);

    res.status(201).json({
      success: true,
      message: 'Tài liệu đã được tải lên thành công và đã có sẵn để tải xuống!',
      data: {
        document: {
          id: document.document_id,
          title: document.title,
          description: document.description,
          fileUrl: document.file_path,
          fileName: document.file_name,
          fileSize: document.file_size,
          fileType: document.file_type,
          subject: document.subject,
          university: document.university,
          creditCost: document.credit_cost,
          status: document.status,
          createdAt: document.created_at
        }
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

const getCategories = async (req, res) => {
  const categories = [
    'Khoa học Tự nhiên',
    'Khoa học Xã hội',
    'Công nghệ Thông tin',
    'Kinh tế',
    'Ngôn ngữ',
    'Nghệ thuật',
    'Y học',
    'Luật',
    'Giáo dục',
    'Khác'
  ];
  
  res.json({
    success: true,
    data: { categories }
  });
};

const getSubjects = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng lấy môn học chưa được triển khai'
  });
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
  getPopularTags: getCategories,
  previewDocument: getDocument,
  incrementView: getDocument, // Placeholder
  uploadDocument,
  updateDocument,
  deleteDocument,
  downloadDocument,
  rateDocument,
  getDocumentRatings,
  updateRating: rateDocument, // Placeholder
  deleteRating: deleteDocument, // Placeholder
  addComment: rateDocument, // Placeholder - will use comment controller later
  getDocumentComments: getDocumentRatings, // Placeholder
  updateComment: rateDocument, // Placeholder
  deleteComment: deleteDocument, // Placeholder
  likeComment: rateDocument, // Placeholder
  unlikeComment: deleteDocument, // Placeholder
  bookmarkDocument,
  removeBookmark,
  getUserBookmarks: getDocuments,
  getCategories,
  getSubjects,
  reportDocument,
  getDocumentAnalytics: getDocument // Placeholder
};