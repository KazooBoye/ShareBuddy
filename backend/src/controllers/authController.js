/**
 * Authentication controller
 * Handles user registration, login, and OAuth operations
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query, withTransaction } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Register new user
const register = async (req, res, next) => {
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

    const { email, username, password, fullName, university, major } = req.body;

    // Check if user already exists
    const existingUser = await query(
      'SELECT user_id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Email hoặc username đã được sử dụng'
      });
    }

    // Hash password
    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create new user
    const result = await query(
      `INSERT INTO users (email, password_hash, username, full_name, university, major, credits)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING user_id, email, username, full_name, university, major, credits, role, created_at`,
      [email, hashedPassword, username, fullName, university, major, 10] // Start with 10 credits
    );

    const user = result.rows[0];

    // Create credit transaction for welcome bonus
    await query(
      `INSERT INTO credit_transactions (user_id, amount, transaction_type, description)
       VALUES ($1, $2, $3, $4)`,
      [user.user_id, 10, 'bonus', 'Chào mừng thành viên mới - Bonus 10 credits']
    );

    // Generate token
    const token = generateToken(user.user_id);

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          university: user.university,
          major: user.major,
          credits: user.credits,
          role: user.role,
          createdAt: user.created_at
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
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

    const { email, password } = req.body;

    // Find user
    const result = await query(
      `SELECT user_id, email, username, full_name, password_hash, role, credits, is_active, avatar_url
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    const user = result.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Tài khoản đã bị vô hiệu hóa'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Email hoặc mật khẩu không đúng'
      });
    }

    // Generate token
    const token = generateToken(user.user_id);

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          role: user.role,
          credits: user.credits,
          avatarUrl: user.avatar_url
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT user_id, email, username, full_name, bio, university, major, 
              role, credits, is_verified_author, avatar_url, created_at
       FROM users WHERE user_id = $1`,
      [req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Người dùng không tồn tại'
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.user_id,
          email: user.email,
          username: user.username,
          fullName: user.full_name,
          bio: user.bio,
          university: user.university,
          major: user.major,
          role: user.role,
          credits: user.credits,
          isVerifiedAuthor: user.is_verified_author,
          avatarUrl: user.avatar_url,
          createdAt: user.created_at
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Placeholder functions for other auth operations
const logout = async (req, res) => {
  res.json({
    success: true,
    message: 'Đăng xuất thành công'
  });
};

const refreshToken = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng refresh token chưa được triển khai'
  });
};

const forgotPassword = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng quên mật khẩu chưa được triển khai'
  });
};

const resetPassword = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng reset mật khẩu chưa được triển khai'
  });
};

const verifyEmail = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng xác thực email chưa được triển khai'
  });
};

const googleAuth = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Đăng nhập Google chưa được triển khai'
  });
};

const googleCallback = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Google OAuth callback chưa được triển khai'
  });
};

const facebookAuth = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Đăng nhập Facebook chưa được triển khai'
  });
};

const facebookCallback = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Facebook OAuth callback chưa được triển khai'
  });
};

const updateProfile = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng cập nhật profile chưa được triển khai'
  });
};

const changePassword = async (req, res) => {
  res.status(501).json({
    success: false,
    error: 'Chức năng đổi mật khẩu chưa được triển khai'
  });
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleAuth,
  googleCallback,
  facebookAuth,
  facebookCallback,
  getMe,
  updateProfile,
  changePassword
};