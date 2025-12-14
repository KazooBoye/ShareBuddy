/**
 * Search Service - Full-Text Search
 * PostgreSQL full-text search with ranking
 */

const { query } = require('../config/database');

// Full-text search documents
const searchDocuments = async (searchQuery, filters = {}, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;
    const queryParams = [];
    const conditions = [];
    let paramCount = 0;

    // Base query with full-text search
    let sqlQuery = `
      SELECT 
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.file_type,
        d.credit_cost,
        d.download_count,
        d.view_count,
        d.average_rating,
        d.rating_count,
        d.thumbnail_url,
        d.created_at,
        u.user_id,
        u.username,
        u.full_name,
        u.is_verified_author,
        ts_rank(d.search_vector, query) as relevance
      FROM documents d
      JOIN users u ON d.author_id = u.user_id,
      to_tsquery('simple', $${++paramCount}) query
      WHERE d.status = 'approved'
    `;

    // Process search query (convert to tsquery format)
    const processedQuery = searchQuery
      .trim()
      .split(/\s+/)
      .map(term => term.replace(/[^\w\s]/g, ''))
      .filter(term => term.length > 0)
      .join(' | '); // OR operator for better results

    queryParams.push(processedQuery || '*'); // Fallback to match all

    // Add full-text search condition
    conditions.push(`d.search_vector @@ query`);

    // Add filters
    if (filters.category) {
      conditions.push(`d.category = $${++paramCount}`);
      queryParams.push(filters.category);
    }

    if (filters.subject) {
      conditions.push(`d.subject ILIKE $${++paramCount}`);
      queryParams.push(`%${filters.subject}%`);
    }

    if (filters.university) {
      conditions.push(`d.university ILIKE $${++paramCount}`);
      queryParams.push(`%${filters.university}%`);
    }

    if (filters.minRating) {
      conditions.push(`d.average_rating >= $${++paramCount}`);
      queryParams.push(filters.minRating);
    }

    if (filters.maxCost !== undefined) {
      conditions.push(`d.credit_cost <= $${++paramCount}`);
      queryParams.push(filters.maxCost);
    }

    if (filters.fileType) {
      conditions.push(`d.file_type = $${++paramCount}`);
      queryParams.push(filters.fileType);
    }

    if (filters.verifiedOnly === 'true' || filters.verifiedOnly === true) {
      conditions.push('u.is_verified_author = TRUE');
    }

    // Add conditions to query
    if (conditions.length > 0) {
      sqlQuery += ' AND ' + conditions.join(' AND ');
    }

    // Order by relevance and other factors
    const sortBy = filters.sortBy || 'relevance';
    let orderClause;

    switch (sortBy) {
      case 'relevance':
        orderClause = 'relevance DESC, d.download_count DESC';
        break;
      case 'newest':
        orderClause = 'd.created_at DESC';
        break;
      case 'popular':
        orderClause = 'd.download_count DESC';
        break;
      case 'rating':
        orderClause = 'd.average_rating DESC, d.rating_count DESC';
        break;
      default:
        orderClause = 'relevance DESC';
    }

    sqlQuery += ` ORDER BY ${orderClause}`;

    // Add pagination
    queryParams.push(limit, offset);
    sqlQuery += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;

    // Execute search query
    const result = await query(sqlQuery, queryParams);

    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) 
      FROM documents d
      JOIN users u ON d.author_id = u.user_id,
      to_tsquery('simple', $1) query
      WHERE d.status = 'approved' AND d.search_vector @@ query
    `;

    const countParams = [processedQuery || '*'];
    let countParamIndex = 1;

    // Add same filters to count query
    if (filters.category) {
      countQuery += ` AND d.category = $${++countParamIndex}`;
      countParams.push(filters.category);
    }
    if (filters.subject) {
      countQuery += ` AND d.subject ILIKE $${++countParamIndex}`;
      countParams.push(`%${filters.subject}%`);
    }
    if (filters.university) {
      countQuery += ` AND d.university ILIKE $${++countParamIndex}`;
      countParams.push(`%${filters.university}%`);
    }
    if (filters.minRating) {
      countQuery += ` AND d.average_rating >= $${++countParamIndex}`;
      countParams.push(filters.minRating);
    }
    if (filters.maxCost !== undefined) {
      countQuery += ` AND d.credit_cost <= $${++countParamIndex}`;
      countParams.push(filters.maxCost);
    }
    if (filters.fileType) {
      countQuery += ` AND d.file_type = $${++countParamIndex}`;
      countParams.push(filters.fileType);
    }
    if (filters.verifiedOnly === 'true' || filters.verifiedOnly === true) {
      countQuery += ' AND u.is_verified_author = TRUE';
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      documents: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  } catch (error) {
    console.error('Search error:', error);
    throw error;
  }
};

// Get search suggestions (autocomplete)
const getSearchSuggestions = async (searchQuery, limit = 10) => {
  try {
    const result = await query(
      `SELECT DISTINCT title, document_id
       FROM documents
       WHERE status = 'approved'
         AND title ILIKE $1
       ORDER BY download_count DESC
       LIMIT $2`,
      [`%${searchQuery}%`, limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Get popular search terms
const getPopularSearches = async (limit = 10) => {
  try {
    // This would typically come from a search_logs table
    // For now, return popular subjects
    const result = await query(
      `SELECT subject as term, COUNT(*) as count
       FROM documents
       WHERE status = 'approved' AND subject IS NOT NULL
       GROUP BY subject
       ORDER BY count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    throw error;
  }
};

// Search users
const searchUsers = async (searchQuery, page = 1, limit = 20) => {
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
        u.is_verified_author,
        COUNT(DISTINCT d.document_id) as document_count,
        COUNT(DISTINCT f.follower_id) as follower_count
       FROM users u
       LEFT JOIN documents d ON u.user_id = d.author_id AND d.status = 'approved'
       LEFT JOIN follows f ON u.user_id = f.following_id
       WHERE u.is_active = TRUE
         AND (
           u.username ILIKE $1 OR
           u.full_name ILIKE $1 OR
           u.university ILIKE $1
         )
       GROUP BY u.user_id
       ORDER BY follower_count DESC, document_count DESC
       LIMIT $2 OFFSET $3`,
      [`%${searchQuery}%`, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*)
       FROM users
       WHERE is_active = TRUE
         AND (username ILIKE $1 OR full_name ILIKE $1 OR university ILIKE $1)`,
      [`%${searchQuery}%`]
    );

    return {
      users: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    };
  } catch (error) {
    throw error;
  }
};

// Advanced search with multiple criteria
const advancedSearch = async (criteria, page = 1, limit = 20) => {
  try {
    const offset = (page - 1) * limit;
    const queryParams = [];
    const conditions = ['d.status = $1'];
    let paramCount = 1;

    queryParams.push('approved');

    // Build dynamic query based on criteria
    if (criteria.keywords) {
      conditions.push(`d.search_vector @@ to_tsquery('simple', $${++paramCount})`);
      const processedKeywords = criteria.keywords
        .trim()
        .split(/\s+/)
        .join(' | ');
      queryParams.push(processedKeywords);
    }

    if (criteria.author) {
      conditions.push(`u.username ILIKE $${++paramCount}`);
      queryParams.push(`%${criteria.author}%`);
    }

    if (criteria.dateFrom) {
      conditions.push(`d.created_at >= $${++paramCount}`);
      queryParams.push(criteria.dateFrom);
    }

    if (criteria.dateTo) {
      conditions.push(`d.created_at <= $${++paramCount}`);
      queryParams.push(criteria.dateTo);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      conditions.push(`EXISTS (
        SELECT 1 FROM document_tags dt 
        WHERE dt.document_id = d.document_id 
        AND dt.tag_name = ANY($${++paramCount})
      )`);
      queryParams.push(criteria.tags);
    }

    const result = await query(
      `SELECT 
        d.document_id,
        d.title,
        d.description,
        d.university,
        d.subject,
        d.average_rating,
        d.download_count,
        d.thumbnail_url,
        d.created_at,
        u.username,
        u.full_name,
        u.is_verified_author
       FROM documents d
       JOIN users u ON d.author_id = u.user_id
       WHERE ${conditions.join(' AND ')}
       ORDER BY d.created_at DESC
       LIMIT $${++paramCount} OFFSET $${++paramCount}`,
      [...queryParams, limit, offset]
    );

    return {
      documents: result.rows,
      page,
      limit
    };
  } catch (error) {
    throw error;
  }
};

module.exports = {
  searchDocuments,
  getSearchSuggestions,
  getPopularSearches,
  searchUsers,
  advancedSearch
};
