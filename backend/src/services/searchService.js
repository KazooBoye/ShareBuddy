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

    // Process search query
    const trimmedQuery = searchQuery.trim();
    const isShortQuery = trimmedQuery.length < 3;
    
    let processedQuery = '';
    let useILike = false;
    let usePrefixMatch = false;
    
    if (isShortQuery) {
      // For short queries (< 3 chars), use ILIKE for partial matching
      useILike = true;
      processedQuery = trimmedQuery;
    } else {
      // For longer queries, use full-text search with tsquery
      // Check if it's a single word (no spaces) - use prefix matching for partial word matches
      const words = trimmedQuery.split(/\s+/).filter(w => w.length > 0);
      
      if (words.length === 1) {
        // Single word query - use prefix matching (:* operator) to match partial words
        // Example: "lap" will match "laptop", "laptrinhmang", etc.
        usePrefixMatch = true;
        const cleanWord = words[0].replace(/[^\w]/g, '');
        processedQuery = cleanWord + ':*'; // Prefix match operator
      } else {
        // Multiple words - use standard tsquery with OR operator
        processedQuery = words
          .map(term => term.replace(/[^\w\s]/g, ''))
          .filter(term => term.length > 0)
          .join(' | '); // OR operator for better results
      }
    }

    // Build base query based on search type
    let sqlQuery;
    if (useILike) {
      // Use ILIKE query for short queries
      sqlQuery = `
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
          1.0 as relevance
        FROM documents d
        JOIN users u ON d.author_id = u.user_id
        WHERE d.status = 'approved'
      `;
      
      // Add ILIKE search condition
      if (processedQuery && processedQuery.length > 0) {
        conditions.push(`(
          d.title ILIKE $${++paramCount} OR 
          d.description ILIKE $${++paramCount} OR 
          d.subject ILIKE $${++paramCount}
        )`);
        const likePattern = `%${processedQuery}%`;
        queryParams.push(likePattern, likePattern, likePattern);
      }
    } else {
      // Use full-text search for longer queries
      if (processedQuery && processedQuery.length > 0) {
        queryParams.push(processedQuery);
        sqlQuery = `
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
        conditions.push(`d.search_vector @@ query`);
      } else {
        // No search query, just list all
        sqlQuery = `
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
            1.0 as relevance
          FROM documents d
          JOIN users u ON d.author_id = u.user_id
          WHERE d.status = 'approved'
        `;
      }
    }

    // --- APPLY FILTERS ---

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

    if (filters.maxCost !== undefined && filters.maxCost !== null && filters.maxCost !== '') {
      conditions.push(`d.credit_cost <= $${++paramCount}`);
      queryParams.push(parseInt(filters.maxCost));
    }

    if (filters.fileType) {
      conditions.push(`d.file_type = $${++paramCount}`);
      queryParams.push(filters.fileType);
    }

    if (filters.verifiedOnly === 'true' || filters.verifiedOnly === true) {
      conditions.push('u.is_verified_author = TRUE');
    }

    // Year filter - filter by upload year
    if (filters.year) {
      conditions.push(`EXTRACT(YEAR FROM d.created_at) = $${++paramCount}`);
      queryParams.push(parseInt(filters.year));
    }

    // 🟢 ADDED: TAGS FILTER LOGIC
    if (filters.tags) {
      let tagsArray = [];
      // Handle array or comma-separated string
      if (Array.isArray(filters.tags)) {
        tagsArray = filters.tags;
      } else if (typeof filters.tags === 'string') {
        tagsArray = filters.tags.split(',').map(t => t.trim());
      }
      
      tagsArray = tagsArray.filter(tag => tag.length > 0);

      if (tagsArray.length > 0) {
        // Create OR condition: Document exists if it has ANY of the requested tags
        // Using EXISTS prevents duplicates in the result set
        const tagSubConditions = tagsArray.map(() => {
          paramCount++;
          // We push the tag value later in the loop to keep order correct
          return `t.tag_name ILIKE $${paramCount}`;
        });

        // Add values to queryParams
        tagsArray.forEach(tag => queryParams.push(`%${tag}%`));

        conditions.push(`EXISTS (
          SELECT 1 FROM document_tags t 
          WHERE t.document_id = d.document_id 
          AND (${tagSubConditions.join(' OR ')})
        )`);
      }
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

    // ---------------------------------------------------------
    // COUNT QUERY (Must replicate ALL filters including tags)
    // ---------------------------------------------------------
    
    // We can't reuse queryParams easily because limit/offset were added. 
    // We need to rebuild the count params.
    const countParams = [];
    let countParamIndex = 0;
    
    // Build count query - match the main query structure
    let countQuery;
    if (useILike && processedQuery && processedQuery.length > 0) {
      // Use ILIKE for count query
      const likePattern = `%${processedQuery}%`;
      countParams.push(likePattern, likePattern, likePattern);
      countParamIndex = 3;
      countQuery = `
        SELECT COUNT(*) 
        FROM documents d
        JOIN users u ON d.author_id = u.user_id
        WHERE d.status = 'approved' AND (
          d.title ILIKE $1 OR 
          d.description ILIKE $2 OR 
          d.subject ILIKE $3
        )
      `;
    } else if (!useILike && processedQuery && processedQuery.length > 0) {
      // Use full-text search for count query (with prefix matching if applicable)
      countParams.push(processedQuery);
      countQuery = `
        SELECT COUNT(*) 
        FROM documents d
        JOIN users u ON d.author_id = u.user_id,
        to_tsquery('simple', $1) query
        WHERE d.status = 'approved' AND d.search_vector @@ query
      `;
      countParamIndex = 1;
    } else {
      // No search, just count all
      countQuery = `
        SELECT COUNT(*) 
        FROM documents d
        JOIN users u ON d.author_id = u.user_id
        WHERE d.status = 'approved'
      `;
      countParamIndex = 0;
    }

    // Add same filters to count query
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
    if (filters.maxCost !== undefined && filters.maxCost !== null && filters.maxCost !== '') {
      countQuery += ` AND d.credit_cost <= $${++countParamIndex}`;
      countParams.push(parseInt(filters.maxCost));
    }
    if (filters.fileType) {
      countQuery += ` AND d.file_type = $${++countParamIndex}`;
      countParams.push(filters.fileType);
    }
    if (filters.verifiedOnly === 'true' || filters.verifiedOnly === true) {
      countQuery += ' AND u.is_verified_author = TRUE';
    }
    if (filters.year) {
      countQuery += ` AND EXTRACT(YEAR FROM d.created_at) = $${++countParamIndex}`;
      countParams.push(parseInt(filters.year));
    }

    // 🟢 ADDED: TAGS FILTER LOGIC FOR COUNT
    if (filters.tags) {
      let tagsArray = [];
      if (Array.isArray(filters.tags)) {
        tagsArray = filters.tags;
      } else if (typeof filters.tags === 'string') {
        tagsArray = filters.tags.split(',').map(t => t.trim());
      }
      tagsArray = tagsArray.filter(t => t.length > 0);

      if (tagsArray.length > 0) {
        const tagSubConditions = tagsArray.map(() => {
          countParamIndex++;
          return `t.tag_name ILIKE $${countParamIndex}`;
        });
        
        tagsArray.forEach(tag => countParams.push(`%${tag}%`));

        countQuery += ` AND EXISTS (
          SELECT 1 FROM document_tags t 
          WHERE t.document_id = d.document_id 
          AND (${tagSubConditions.join(' OR ')})
        )`;
      }
    }

    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    // Map response fields to match frontend expectations
    const mappedDocuments = result.rows.map(doc => ({
      ...doc,
      author_username: doc.username,
      is_author_verified: doc.is_verified_author,
      // Keep original fields for backward compatibility
      username: doc.username,
      is_verified_author: doc.is_verified_author
    }));

    return {
      documents: mappedDocuments,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      // Keep backward compatibility
      total,
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

    // Return array of title strings for autocomplete (frontend expects strings)
    return result.rows.map(row => row.title);
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

    return result.rows.map(row => ({ term: row.term, count: parseInt(row.count) }));
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
       GROUP BY u.user_id, u.username, u.full_name, u.avatar_url, u.bio, u.university, u.is_verified_author
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

    // 🟢 UPDATED: Tags logic for partial match
    if (criteria.tags && criteria.tags.length > 0) {
      let tagsArray = Array.isArray(criteria.tags) ? criteria.tags : [criteria.tags];
      
      const tagConditions = tagsArray.map(tag => {
        paramCount++;
        queryParams.push(`%${tag}%`);
        return `dt.tag_name ILIKE $${paramCount}`;
      });

      conditions.push(`EXISTS (
        SELECT 1 FROM document_tags dt 
        WHERE dt.document_id = d.document_id 
        AND (${tagConditions.join(' OR ')})
      )`);
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
    
    // Note: To return correct total pages for advanced search, 
    // you would technically need a count query here too.
    
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