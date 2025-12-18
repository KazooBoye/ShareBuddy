# ShareBuddy - Complete Setup and Testing Guide

**Date:** December 14, 2025  
**Version:** 1.0  
**Project:** ShareBuddy Document Sharing Platform

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Backend Configuration](#backend-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Module Testing Guide](#module-testing-guide)
   - [Module 1: Email System](#module-1-email-system)
   - [Module 2: OAuth Authentication](#module-2-oauth-authentication)
   - [Module 3: Payment System (Stripe)](#module-3-payment-system-stripe)
   - [Module 4: Q&A System](#module-4-qa-system)
   - [Module 5: Recommendation System](#module-5-recommendation-system)
   - [Module 6: Document Preview](#module-6-document-preview)
   - [Module 7: Verified Author Badge](#module-7-verified-author-badge)
   - [Module 8: Full-Text Search](#module-8-full-text-search)
7. [Core Features Testing](#core-features-testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Node.js**: Version 16+ ([Download](https://nodejs.org/))
- **PostgreSQL**: Version 14+ ([Download](https://www.postgresql.org/download/))
- **Git**: For version control
- **Code Editor**: VS Code recommended

### Required Accounts (for full testing)
1. **Gmail Account**: For email services
   - Need to enable 2FA and create App Password
2. **Stripe Account**: For payment testing
   - Sign up at [dashboard.stripe.com](https://dashboard.stripe.com/register)
3. **Google Cloud Console** (Optional): For OAuth
   - [console.cloud.google.com](https://console.cloud.google.com/)
4. **Facebook Developers** (Optional): For OAuth
   - [developers.facebook.com](https://developers.facebook.com/)

### System Requirements
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 2GB free space
- **OS**: Windows 10/11, macOS, or Linux
- **Browser**: Chrome, Firefox, or Edge (latest version)

---

## Initial Setup

### Step 1: Clone the Repository

```bash
# If you haven't cloned yet
git clone <repository-url>
cd ShareBuddy

# If already cloned, pull latest changes
git pull origin main
```

### Step 2: Check Current Database Connection

Your current `.env` file shows:
```
DB_HOST=dingleberries.ddns.net
DB_PORT=5432
DB_NAME=sharebuddy_db
DB_USER=postgres
DB_PASSWORD=98tV2v_!pT*:nuc>
```

Test the connection:
```bash
psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db
```

If successful, you'll see:
```
Password for user postgres: [enter password]
psql (14.x)
Type "help" for help.

sharebuddy_db=#
```

---

## Database Setup

### Step 1: Verify Database Structure

Check if database is already initialized:

```sql
-- In psql
\dt

-- Should show tables like: users, documents, comments, etc.
```

### Step 2: Run Migrations

Execute migrations in order:

#### A. Check if uuid extension exists
```sql
-- In psql
\dx

-- If uuid-ossp doesn't exist, create it:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### B. Run Migration 1 (Add Missing Features)
```bash
# From ShareBuddy root directory
psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/migration_001_add_missing_features.sql
```

Expected output:
```
ALTER TABLE
ALTER TABLE
CREATE TABLE
CREATE INDEX
...
INSERT 0 6  -- Credit packages inserted
```

#### C. Run Migration 2 (Fix Missing Columns)
```bash
psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/migration_002_fix_missing_columns.sql
```

Expected output:
```
NOTICE: Added admin_note column to verified_author_requests
ALTER TABLE
CREATE INDEX
...
```

### Step 3: Verify Tables

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
-- users, documents, ratings, comments
-- questions, answers, question_votes, answer_votes
-- payment_transactions, credit_packages
-- verified_author_requests
-- oauth_tokens
-- and more...
```

### Step 4: Load Sample Data (Optional)

```bash
# Only if you want test data
psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/sample_data.sql
```

---

## Backend Configuration

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

Expected packages (70+ total):
- express, cors, helmet
- pg, bcryptjs, jsonwebtoken
- passport, passport-google-oauth20, passport-facebook
- nodemailer
- stripe
- multer, sharp, pdf-lib
- and more...

### Step 2: Create Complete .env File

Your current `.env` is minimal. Let's complete it:

```bash
# Open backend/.env and update:
```

```env
# ==========================================
# SERVER CONFIGURATION
# ==========================================
NODE_ENV=development
PORT=5001

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DB_HOST=dingleberries.ddns.net
DB_PORT=5432
DB_NAME=sharebuddy_db
DB_USER=postgres
DB_PASSWORD=98tV2v_!pT*:nuc>
DB_MAX_CONNECTIONS=20
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=2000

# ==========================================
# JWT & SECURITY
# ==========================================
JWT_SECRET=sharebuddy-super-secret-jwt-key-change-in-production-2024
JWT_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
SESSION_SECRET=sharebuddy-session-secret-2024

# ==========================================
# FILE UPLOAD CONFIGURATION
# ==========================================
UPLOAD_PATH=uploads
MAX_FILE_SIZE=10485760
MAX_AVATAR_SIZE=5242880
ALLOWED_FILE_TYPES=pdf,doc,docx,ppt,pptx,xls,xlsx
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif

# ==========================================
# CORS & FRONTEND
# ==========================================
FRONTEND_URL=http://localhost:3000

# ==========================================
# RATE LIMITING
# ==========================================
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# ==========================================
# EMAIL CONFIGURATION (Gmail)
# ==========================================
# REQUIRED FOR MODULE 1
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
EMAIL_FROM=ShareBuddy <noreply@sharebuddy.com>
EMAIL_VERIFICATION_EXPIRES=24h
PASSWORD_RESET_EXPIRES=1h

# ==========================================
# OAUTH CONFIGURATION
# ==========================================
# REQUIRED FOR MODULE 2
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:5001/api/auth/google/callback

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:5001/api/auth/facebook/callback

# ==========================================
# STRIPE PAYMENT CONFIGURATION
# ==========================================
# REQUIRED FOR MODULE 3
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# ==========================================
# CLOUDINARY (Optional - for cloud storage)
# ==========================================
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Step 3: Setup Gmail for Email Service (Module 1)

**IMPORTANT**: You need this for Module 1 to work!

1. **Enable 2-Factor Authentication**:
   - Go to [myaccount.google.com](https://myaccount.google.com)
   - Security → 2-Step Verification → Turn On

2. **Create App Password**:
   - Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other (Custom name)"
   - Name it "ShareBuddy"
   - Copy the 16-character password (e.g., `abcd efgh ijkl mnop`)

3. **Update .env**:
   ```env
   EMAIL_USER=your-actual-email@gmail.com
   EMAIL_PASSWORD=abcdefghijklmnop
   ```

### Step 4: Setup Stripe (Module 3)

1. **Create Stripe Account**:
   - Sign up at [dashboard.stripe.com/register](https://dashboard.stripe.com/register)

2. **Get Test API Keys**:
   - Go to [dashboard.stripe.com/test/apikeys](https://dashboard.stripe.com/test/apikeys)
   - Copy "Publishable key" (starts with `pk_test_`)
   - Copy "Secret key" (starts with `sk_test_`)

3. **Setup Webhook**:
   - Go to [dashboard.stripe.com/test/webhooks](https://dashboard.stripe.com/test/webhooks)
   - Click "Add endpoint"
   - Endpoint URL: `http://localhost:5001/api/payment/webhook`
   - Events to listen: 
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Copy "Signing secret" (starts with `whsec_`)

4. **Update .env**:
   ```env
   STRIPE_SECRET_KEY=sk_test_xxxxx
   STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx
   ```

### Step 5: Setup OAuth (Module 2 - Optional)

#### Google OAuth

1. **Create Project**:
   - Go to [console.cloud.google.com](https://console.cloud.google.com)
   - Create new project "ShareBuddy"

2. **Enable Google+ API**:
   - APIs & Services → Library
   - Search "Google+ API" → Enable

3. **Create OAuth Credentials**:
   - APIs & Services → Credentials
   - Create Credentials → OAuth 2.0 Client ID
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5001/api/auth/google/callback`
   - Copy Client ID and Client Secret

4. **Update .env**:
   ```env
   GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=xxxxx
   ```

#### Facebook OAuth

1. **Create App**:
   - Go to [developers.facebook.com](https://developers.facebook.com)
   - My Apps → Create App → Consumer

2. **Add Facebook Login**:
   - Dashboard → Add Product → Facebook Login → Setup

3. **Configure Settings**:
   - Settings → Basic → Copy App ID and App Secret
   - Facebook Login → Settings
   - Valid OAuth Redirect URIs: `http://localhost:5001/api/auth/facebook/callback`

4. **Update .env**:
   ```env
   FACEBOOK_APP_ID=xxxxx
   FACEBOOK_APP_SECRET=xxxxx
   ```

### Step 6: Create Upload Directories

```bash
# From backend directory
mkdir -p uploads\documents
mkdir -p uploads\avatars
mkdir -p uploads\previews
mkdir -p uploads\thumbnails
```

### Step 7: Start Backend Server

```bash
# From backend directory
npm run dev
```

Expected output:
```
> sharebuddy-backend@1.0.0 dev
> nodemon src/app.js

[nodemon] starting `node src/app.js`
✅ Connected to PostgreSQL database: sharebuddy_db
🚀 Server running on port 5001
🌐 Frontend URL: http://localhost:3000
📧 Email service configured
💳 Stripe configured (Test mode)
🔐 Passport configured (OAuth ready)
```

If you see errors, check:
- Database connection
- Missing environment variables
- Port 5001 not already in use

---

## Frontend Configuration

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

Expected packages (30+ total):
- react, react-dom, react-router-dom
- redux, @reduxjs/toolkit
- axios
- bootstrap, react-bootstrap
- @stripe/stripe-js, @stripe/react-stripe-js
- react-pdf
- and more...

### Step 2: Create/Update .env File

```bash
# Create frontend/.env
```

```env
# API Configuration
REACT_APP_API_URL=http://localhost:5001

# App Information
REACT_APP_APP_NAME=ShareBuddy
REACT_APP_VERSION=1.0.0

# Stripe Public Key
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key

# Feature Flags (all enabled by default)
REACT_APP_ENABLE_OAUTH=true
REACT_APP_ENABLE_PAYMENT=true
REACT_APP_ENABLE_RECOMMENDATIONS=true
REACT_APP_ENABLE_QNA=true
```

### Step 3: Update Stripe Key

Make sure to use the same Stripe publishable key from backend:
```env
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
```

### Step 4: Start Frontend Server

```bash
# From frontend directory
npm start
```

Expected output:
```
Compiled successfully!

You can now view frontend in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

Browser should automatically open to `http://localhost:3000`

---

## Module Testing Guide

Now that everything is set up, let's test each module systematically.

---

## Module 1: Email System

**Status:** ✅ Implemented  
**Dependencies:** Gmail App Password configured

### Feature 1.1: Email Verification

#### Test Scenario A: New User Registration

**Steps:**
1. Open browser to `http://localhost:3000/register`
2. Fill registration form:
   ```
   Email: test-user-1@example.com
   Username: testuser1
   Password: Test123!@#
   Full Name: Test User One
   ```
3. Click "Register"
4. Check backend terminal for log:
   ```
   📧 Verification email sent to test-user-1@example.com
   ```
5. Check Gmail inbox for verification email
6. Email should contain:
   - Subject: "Verify your ShareBuddy account"
   - Verification link: `http://localhost:3000/verify-email?token=...`
   - Token is UUID format
7. Click verification link
8. Should redirect to login page with success message

**Database Verification:**
```sql
-- Check user was created with verification fields
SELECT user_id, email, username, email_verified, 
       email_verification_token, email_verification_expires
FROM users 
WHERE email = 'test-user-1@example.com';

-- Before verification: email_verified = false, token exists
-- After verification: email_verified = true, token = null
```

**Expected Results:**
- ✅ Email sent within 2 seconds
- ✅ Verification link is valid for 24 hours
- ✅ Clicking link sets `email_verified = TRUE`
- ✅ Token is cleared after verification
- ✅ Success toast shown: "Email verified! You can now login."

#### Test Scenario B: Expired Token

**Steps:**
1. Register new user: `test-user-2@example.com`
2. Get verification token from database:
   ```sql
   SELECT email_verification_token FROM users 
   WHERE email = 'test-user-2@example.com';
   ```
3. Manually expire the token:
   ```sql
   UPDATE users 
   SET email_verification_expires = NOW() - INTERVAL '1 hour'
   WHERE email = 'test-user-2@example.com';
   ```
4. Try to verify using the link

**Expected Results:**
- ✅ Error message: "Token không hợp lệ hoặc đã hết hạn"
- ✅ User remains unverified

#### Test Scenario C: Invalid Token

**Steps:**
1. Visit: `http://localhost:3000/verify-email?token=invalid-uuid-token`

**Expected Results:**
- ✅ Error message: "Token không hợp lệ hoặc đã hết hạn"

### Feature 1.2: Password Reset

#### Test Scenario A: Forgot Password Flow

**Steps:**
1. Go to `http://localhost:3000/forgot-password`
2. Enter existing user email: `test-user-1@example.com`
3. Click "Send Reset Link"
4. Check email inbox
5. Email should contain:
   - Subject: "Reset your ShareBuddy password"
   - Reset link: `http://localhost:3000/reset-password?token=...`
6. Click reset link
7. Enter new password: `NewPass123!@#`
8. Confirm password: `NewPass123!@#`
9. Click "Reset Password"
10. Try logging in with new password

**Database Verification:**
```sql
-- Check reset token was created
SELECT email, password_reset_token, password_reset_expires
FROM users 
WHERE email = 'test-user-1@example.com';

-- After reset: password_reset_token should be NULL
```

**Expected Results:**
- ✅ Reset email sent
- ✅ Token valid for 1 hour
- ✅ Password updated successfully
- ✅ Token cleared after reset
- ✅ Old password doesn't work
- ✅ New password works for login

#### Test Scenario B: Reset Token Expiration

**Steps:**
1. Request password reset
2. Wait more than 1 hour OR manually expire:
   ```sql
   UPDATE users 
   SET password_reset_expires = NOW() - INTERVAL '1 hour'
   WHERE email = 'test-user-1@example.com';
   ```
3. Try to use reset link

**Expected Results:**
- ✅ Error: "Token đã hết hạn"
- ✅ Password not changed

### Feature 1.3: Welcome Email (Optional)

**Steps:**
1. Register new user
2. Verify email
3. Check inbox for welcome email

**Expected Results:**
- ✅ Welcome email sent after verification
- ✅ Contains welcome message and platform overview

### Module 1 Testing Checklist

- [ ] Email verification link works
- [ ] Email verification expires after 24h
- [ ] Invalid tokens are rejected
- [ ] Password reset flow works
- [ ] Reset tokens expire after 1h
- [ ] Old passwords don't work after reset
- [ ] Emails are properly formatted with HTML
- [ ] All email templates render correctly

---

## Module 2: OAuth Authentication

**Status:** ✅ Implemented  
**Dependencies:** Google/Facebook OAuth credentials configured

### Feature 2.1: Google OAuth Login

#### Test Scenario A: New User via Google

**Steps:**
1. Go to `http://localhost:3000/login`
2. Click "Sign in with Google" button
3. Should redirect to Google OAuth consent screen
4. Select Google account (use a test account)
5. Review permissions:
   - View basic profile info
   - View email address
6. Click "Continue"
7. Should redirect back to `http://localhost:5001/api/auth/google/callback`
8. Then redirect to `http://localhost:3000/oauth-success`
9. Should auto-redirect to dashboard

**Database Verification:**
```sql
-- Check user created with Google ID
SELECT user_id, email, username, full_name, google_id, 
       email_verified, oauth_provider
FROM users 
WHERE google_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- ✅ User created with Google data
- ✅ `google_id` populated with Google user ID
- ✅ `email_verified` = TRUE (auto-verified)
- ✅ `oauth_provider` = 'google'
- ✅ Profile picture from Google
- ✅ JWT token stored in localStorage
- ✅ User logged in automatically

#### Test Scenario B: Existing User Login via Google

**Steps:**
1. Register regular account: `google-test@gmail.com`
2. Logout
3. Login with Google using same email
4. Should link accounts

**Database Verification:**
```sql
SELECT user_id, email, google_id, password_hash
FROM users 
WHERE email = 'google-test@gmail.com';

-- Should have both google_id AND password_hash
```

**Expected Results:**
- ✅ Google account linked to existing user
- ✅ No duplicate user created
- ✅ Can login with both methods

### Feature 2.2: Facebook OAuth Login

#### Test Scenario A: New User via Facebook

**Steps:**
1. Go to `http://localhost:3000/login`
2. Click "Sign in with Facebook" button
3. Facebook login dialog appears
4. Enter Facebook credentials
5. Authorize ShareBuddy
6. Redirect back to app

**Database Verification:**
```sql
SELECT user_id, email, username, full_name, facebook_id, 
       email_verified, oauth_provider
FROM users 
WHERE facebook_id IS NOT NULL
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- ✅ User created with Facebook data
- ✅ `facebook_id` populated
- ✅ Email auto-verified
- ✅ Profile picture from Facebook

### Feature 2.3: OAuth Error Handling

#### Test Scenario A: Denied Permissions

**Steps:**
1. Click "Sign in with Google"
2. On consent screen, click "Cancel" or "Deny"

**Expected Results:**
- ✅ Redirected back to login
- ✅ Error message: "Authentication cancelled"
- ✅ No user created

#### Test Scenario B: Invalid OAuth Config

**Steps:**
1. Temporarily set wrong Google Client ID in .env
2. Restart backend
3. Try Google login

**Expected Results:**
- ✅ Error: "OAuth configuration error"
- ✅ Backend logs show detailed error

### Module 2 Testing Checklist

- [ ] Google OAuth login works for new users
- [ ] Google OAuth links to existing accounts
- [ ] Facebook OAuth login works
- [ ] Profile pictures fetched correctly
- [ ] Emails auto-verified from OAuth
- [ ] Both OAuth and email login work for same user
- [ ] OAuth errors handled gracefully
- [ ] Logout works for OAuth users

---

## Module 3: Payment System (Stripe)

**Status:** ✅ Implemented  
**Dependencies:** Stripe test keys and webhook configured

### Feature 3.1: View Credit Packages

#### Test Scenario A: Display Packages

**Steps:**
1. Login to application
2. Navigate to `/purchase-credits`
3. View available credit packages

**Expected Results:**
- ✅ 6 packages displayed:
  - 10 credits - $1.00 (25,000 VND)
  - 25 credits - $2.00 (50,000 VND) + 5 bonus
  - 50 credits - $3.50 (87,500 VND) + 10 bonus [Popular]
  - 100 credits - $6.00 (150,000 VND) + 25 bonus
  - 250 credits - $12.00 (300,000 VND) + 75 bonus
  - 500 credits - $20.00 (500,000 VND) + 200 bonus [Popular]
- ✅ Prices shown in both USD and VND
- ✅ Bonus credits highlighted
- ✅ "Popular" badge on packages 3 and 6

**API Test:**
```bash
curl http://localhost:5001/api/payment/packages
```

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "package_id": "uuid",
      "credits": 10,
      "price_usd": "1.00",
      "price_vnd": "25000.00",
      "bonus_credits": 0,
      "is_popular": false
    },
    // ... more packages
  ]
}
```

### Feature 3.2: Purchase Credits - Successful Payment

#### Test Scenario A: Buy 50 Credits

**Steps:**
1. At `/purchase-credits`, select "50 credits" package
2. Click "Purchase"
3. Stripe Checkout modal appears
4. Use test card:
   ```
   Card number: 4242 4242 4242 4242
   Expiry: Any future date (e.g., 12/25)
   CVC: Any 3 digits (e.g., 123)
   ZIP: Any 5 digits (e.g., 12345)
   ```
5. Click "Pay"
6. Payment processing...
7. Redirect to success page

**Database Verification:**
```sql
-- Check payment transaction created
SELECT payment_id, user_id, amount, currency, credits_purchased, 
       payment_status, stripe_payment_intent_id
FROM payment_transactions
ORDER BY created_at DESC 
LIMIT 1;

-- Check user credits increased
SELECT credits FROM users WHERE user_id = 'your-user-id';
-- Should be: old_credits + 50 + 10 (bonus) = old_credits + 60
```

**Backend Logs:**
```
💳 Payment intent created: pi_xxxxx
✅ Payment succeeded for user: user-id
💰 Added 60 credits to user account (50 + 10 bonus)
```

**Expected Results:**
- ✅ Payment intent created
- ✅ Stripe charges $3.50
- ✅ Payment status: "succeeded"
- ✅ User credits increased by 60 (50 + 10 bonus)
- ✅ Transaction recorded in database
- ✅ Success toast: "Payment successful! 60 credits added."

### Feature 3.3: Failed Payment

#### Test Scenario A: Declined Card

**Steps:**
1. Select any package
2. Use declined test card:
   ```
   Card number: 4000 0000 0000 0002
   ```
3. Try to pay

**Expected Results:**
- ✅ Payment fails
- ✅ Error message: "Your card was declined"
- ✅ No credits added
- ✅ Transaction status: "failed"

### Feature 3.4: Payment History

#### Test Scenario A: View Transactions

**Steps:**
1. Navigate to `/payment-history`
2. View list of transactions

**Expected Results:**
- ✅ All payments listed (newest first)
- ✅ Shows: Date, Package, Amount, Status
- ✅ Status badges color-coded:
  - Green: succeeded
  - Red: failed
  - Yellow: pending
  - Gray: refunded

**API Test:**
```bash
# Replace TOKEN with your JWT
curl -H "Authorization: Bearer TOKEN" \
     http://localhost:5001/api/payment/history
```

### Feature 3.5: Webhook Processing

#### Test Scenario A: Webhook Receives Event

**Steps:**
1. Make a test payment
2. Check backend logs for webhook events:

**Backend Logs:**
```
🎣 Webhook received: payment_intent.succeeded
✅ Webhook verified: pi_xxxxx
💰 Credits added via webhook
```

**Note:** For local testing, you may need Stripe CLI:
```bash
# Install Stripe CLI
# Windows: Download from https://stripe.com/docs/stripe-cli
# Mac: brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:5001/api/payment/webhook
```

### Module 3 Testing Checklist

- [ ] All credit packages display correctly
- [ ] Prices shown in USD and VND
- [ ] Bonus credits calculated correctly
- [ ] Successful payments add credits
- [ ] Failed payments don't add credits
- [ ] Payment history shows all transactions
- [ ] Webhook events processed correctly
- [ ] Stripe test cards work as expected
- [ ] Transaction records complete in database

---

## Module 4: Q&A System

**Status:** ✅ Implemented  
**Dependencies:** Database migrations completed

### Feature 4.1: Ask Question

#### Test Scenario A: Create Question

**Steps:**
1. Login to application
2. Navigate to any document detail page
3. Scroll to "Questions & Answers" section
4. Click "Ask Question" button
5. Fill form:
   ```
   Title: How do I solve problem 5 in chapter 3?
   Content: I'm stuck on the integral calculus problem. 
            Can someone explain the step-by-step solution?
   ```
6. Click "Submit Question"

**Database Verification:**
```sql
-- Check question created
SELECT question_id, document_id, user_id, title, content, 
       is_answered, view_count, vote_count
FROM questions
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Results:**
- ✅ Question created successfully
- ✅ Shows in questions list
- ✅ `is_answered` = FALSE initially
- ✅ `vote_count` = 0
- ✅ Question author displayed with avatar

### Feature 4.2: Answer Question

#### Test Scenario A: Provide Answer

**Steps:**
1. Login as different user (or same)
2. View question detail
3. Click "Answer this question"
4. Write answer:
   ```
   Content: Here's the solution:
            1. First, apply integration by parts...
            2. Then simplify the expression...
            3. Final answer: x^2/2 + C
   ```
5. Click "Submit Answer"

**Database Verification:**
```sql
-- Check answer created
SELECT answer_id, question_id, user_id, content, 
       is_accepted, vote_count
FROM answers
WHERE question_id = 'your-question-id'
ORDER BY created_at;
```

**Expected Results:**
- ✅ Answer created
- ✅ Shows under question
- ✅ Answer author displayed
- ✅ `is_accepted` = FALSE initially

### Feature 4.3: Vote on Questions

#### Test Scenario A: Upvote Question

**Steps:**
1. View question
2. Click upvote (▲) button
3. Vote count increases by 1
4. Click again to remove vote

**Database Verification:**
```sql
-- Check vote recorded
SELECT vote_id, question_id, user_id, vote_type
FROM question_votes
WHERE question_id = 'your-question-id';

-- vote_type: 1 = upvote, -1 = downvote
```

**Expected Results:**
- ✅ Vote count increases
- ✅ Button changes color (highlighted)
- ✅ Can't vote multiple times
- ✅ Click again removes vote

#### Test Scenario B: Downvote Question

**Steps:**
1. Click downvote (▼) button
2. Vote count decreases by 1

**Expected Results:**
- ✅ Vote count decreases
- ✅ Downvote button highlighted
- ✅ Can't downvote if already upvoted (changes vote)

### Feature 4.4: Accept Answer

#### Test Scenario A: Mark as Accepted

**Steps:**
1. Login as question author
2. View your question with answers
3. Find best answer
4. Click "✓ Accept" button on that answer

**Database Verification:**
```sql
-- Check answer marked as accepted
SELECT answer_id, is_accepted 
FROM answers 
WHERE answer_id = 'your-answer-id';

-- Check question marked as answered
SELECT question_id, is_answered, accepted_answer_id
FROM questions
WHERE question_id = 'your-question-id';
```

**Expected Results:**
- ✅ Answer marked with green checkmark
- ✅ Question status: "Answered"
- ✅ Only question author can accept
- ✅ Only one answer can be accepted

### Feature 4.5: Browse Questions

#### Test Scenario A: Filter and Sort

**Steps:**
1. Go to document's Q&A section
2. Try different filters:
   - All Questions
   - Unanswered
   - Answered
3. Try different sorts:
   - Recent
   - Most Voted
   - Most Viewed

**Expected Results:**
- ✅ Filters work correctly
- ✅ Sort order updates
- ✅ Pagination works (if >10 questions)

### Module 4 Testing Checklist

- [ ] Can create questions
- [ ] Questions display with author info
- [ ] Can provide answers
- [ ] Answers display under questions
- [ ] Upvote/downvote works for questions
- [ ] Upvote/downvote works for answers
- [ ] Question author can accept answers
- [ ] Only one answer can be accepted
- [ ] Question marked as "answered"
- [ ] Filters work (all/answered/unanswered)
- [ ] Sort works (recent/votes/views)
- [ ] View count increments

---

## Module 5: Recommendation System

**Status:** ✅ Implemented  
**Dependencies:** Sample data for accurate recommendations

### Feature 5.1: View Recommendations

#### Test Scenario A: Get Personalized Recommendations

**Steps:**
1. Login to application
2. View/download several documents (at least 3)
3. Navigate to homepage or sidebar
4. View "Recommended for You" section

**Expected Results:**
- ✅ Shows 5-10 recommended documents
- ✅ Based on your viewed/downloaded documents
- ✅ Similar subjects/universities
- ✅ Different from what you already viewed

**API Test:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5001/api/recommendations/user
```

### Feature 5.2: Similar Documents

#### Test Scenario A: View Similar Documents

**Steps:**
1. Go to any document detail page
2. Scroll to "Similar Documents" section

**Expected Results:**
- ✅ Shows 4-6 similar documents
- ✅ Same subject/university
- ✅ Excludes current document

**API Test:**
```bash
curl http://localhost:5001/api/recommendations/similar/DOCUMENT_ID
```

### Feature 5.3: Popular Documents

#### Test Scenario A: View Trending

**Steps:**
1. Go to homepage
2. View "Popular This Week" section

**Expected Results:**
- ✅ Shows most downloaded documents
- ✅ High ratings prioritized
- ✅ Updated based on recent activity

### Module 5 Testing Checklist

- [ ] Personalized recommendations work
- [ ] Similar documents relevant
- [ ] Popular documents display
- [ ] Recommendations exclude already viewed
- [ ] Algorithm considers multiple factors
- [ ] Performance is acceptable (<1s)

---

## Module 6: Document Preview

**Status:** ✅ Implemented  
**Dependencies:** PDF.js, file-handling libraries

### Feature 6.1: PDF Preview

#### Test Scenario A: View PDF in Browser

**Steps:**
1. Upload a PDF document (if not already)
2. Go to document detail page
3. Click "Preview" button
4. PDF viewer opens

**Expected Results:**
- ✅ PDF renders correctly
- ✅ Can navigate pages
- ✅ Zoom in/out works
- ✅ Download button available
- ✅ Page numbers shown

### Feature 6.2: DOCX Preview

#### Test Scenario A: View Word Document

**Steps:**
1. Upload .docx file
2. Click "Preview"

**Expected Results:**
- ✅ Document converted to viewable format
- ✅ Text readable
- ✅ Formatting preserved (mostly)

### Feature 6.3: Thumbnail Generation

#### Test Scenario A: Document Thumbnails

**Steps:**
1. Upload any document
2. View documents list
3. Thumbnails should appear

**Database Verification:**
```sql
SELECT document_id, title, thumbnail_url
FROM documents
WHERE thumbnail_url IS NOT NULL
LIMIT 5;
```

**Expected Results:**
- ✅ Thumbnails generated automatically
- ✅ Stored in `uploads/thumbnails/`
- ✅ Display correctly in list view

### Module 6 Testing Checklist

- [ ] PDF preview works
- [ ] DOCX preview works
- [ ] PPTX preview works (if implemented)
- [ ] Thumbnails generate automatically
- [ ] Preview doesn't require credit cost
- [ ] Can close preview without downloading
- [ ] Download button works from preview

---

## Module 7: Verified Author Badge

**Status:** ✅ Implemented  
**Dependencies:** Admin account created

### Feature 7.1: Request Verification

#### Test Scenario A: Submit Request

**Steps:**
1. Login as regular user
2. Go to Profile or Settings
3. Find "Request Verified Author Badge"
4. Fill form:
   ```
   Reason: I'm a university professor with 10+ years experience.
            I want to share high-quality academic materials.
   ```
5. Submit request

**Database Verification:**
```sql
SELECT request_id, user_id, reason, status, 
       created_at, reviewed_at, admin_note
FROM verified_author_requests
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Results:**
- ✅ Request created with status "pending"
- ✅ User notified: "Request submitted"
- ✅ Can view request status

### Feature 7.2: Admin Review Process

#### Test Scenario A: Approve Request

**Steps:**
1. Login as admin account
2. Go to Admin Panel
3. Navigate to "Verification Requests"
4. View pending request
5. Click "Approve"
6. Add note: "Verified credentials"
7. Confirm approval

**Database Verification:**
```sql
-- Check request approved
SELECT status, reviewed_by, reviewed_at, admin_note
FROM verified_author_requests
WHERE request_id = 'request-id';

-- Check user badge granted
SELECT is_verified_author FROM users WHERE user_id = 'user-id';
-- Should be TRUE
```

**Expected Results:**
- ✅ Request status: "approved"
- ✅ `reviewed_at` timestamp set
- ✅ User's `is_verified_author` = TRUE
- ✅ User notified of approval

#### Test Scenario B: Reject Request

**Steps:**
1. Select different request
2. Click "Reject"
3. Add note: "Insufficient evidence"
4. Confirm rejection

**Expected Results:**
- ✅ Request status: "rejected"
- ✅ User notified with reason
- ✅ `is_verified_author` remains FALSE

### Feature 7.3: Verified Badge Display

#### Test Scenario A: Badge Visibility

**Steps:**
1. View profile of verified author
2. View documents by verified author
3. Check search results

**Expected Results:**
- ✅ Blue checkmark badge next to name
- ✅ Visible in: Profile, Documents list, Comments, Q&A
- ✅ Tooltip: "Verified Author"

### Feature 7.4: Credit Bonus Multiplier

#### Test Scenario A: Earn Credits

**Steps:**
1. As verified author, upload document
2. Other user downloads it (costs 2 credits)
3. Check credits earned

**Database Verification:**
```sql
-- Check credit transaction
SELECT * FROM credit_transactions
WHERE user_id = 'verified-author-id'
ORDER BY created_at DESC
LIMIT 1;

-- Regular author earns: 2 credits
-- Verified author earns: 2 * 1.5 = 3 credits
```

**Expected Results:**
- ✅ Verified authors earn 1.5x credits
- ✅ Transaction shows bonus multiplier

### Module 7 Testing Checklist

- [ ] Can submit verification request
- [ ] Admin can view pending requests
- [ ] Admin can approve requests
- [ ] Admin can reject requests
- [ ] Badge displays correctly
- [ ] Badge shows in all relevant places
- [ ] Credit multiplier works (1.5x)
- [ ] Users notified of status changes

---

## Module 8: Full-Text Search

**Status:** ✅ Implemented  
**Dependencies:** PostgreSQL tsvector configured

### Feature 8.1: Basic Search

#### Test Scenario A: Search by Title

**Steps:**
1. Go to homepage or search page
2. Enter search term: `"calculus"`
3. Press Enter or click Search

**Expected Results:**
- ✅ Shows documents with "calculus" in title
- ✅ Ranked by relevance
- ✅ Fast response (<500ms)

### Feature 8.2: Advanced Search

#### Test Scenario A: Multi-field Search

**Steps:**
1. Search: `"linear algebra MIT"`
2. Results include:
   - Documents with "linear algebra" in title/description
   - Documents from MIT university

**Expected Results:**
- ✅ Searches title, description, subject
- ✅ Multiple terms work (AND logic)
- ✅ Fuzzy matching works

### Feature 8.3: Filters

#### Test Scenario A: Filter by Subject

**Steps:**
1. Search: `"mathematics"`
2. Apply filter: Subject = "Calculus"
3. Results update

**Expected Results:**
- ✅ Only calculus documents shown
- ✅ Maintains search relevance
- ✅ Can combine multiple filters

### Feature 8.4: Autocomplete

#### Test Scenario A: Search Suggestions

**Steps:**
1. Click search box
2. Type: `"lin"`
3. Suggestions appear

**Expected Results:**
- ✅ Shows: "linear algebra", "linguistics", etc.
- ✅ Based on popular searches/documents
- ✅ Updates as you type

### Module 8 Testing Checklist

- [ ] Basic text search works
- [ ] Multi-field search works
- [ ] Filters apply correctly
- [ ] Can combine search + filters
- [ ] Autocomplete suggestions appear
- [ ] Search is fast (<500ms)
- [ ] Results ranked by relevance
- [ ] Pagination works for many results

---

## Core Features Testing

### Feature: Document Upload

#### Test Scenario: Upload PDF

**Steps:**
1. Login to application
2. Go to "Upload Document" page
3. Fill form:
   ```
   Title: Introduction to Machine Learning
   Description: Comprehensive guide for beginners
   Subject: Computer Science
   University: MIT
   Credit Cost: 2
   ```
4. Select PDF file (<10MB)
5. Click "Upload"

**Expected Results:**
- ✅ File uploaded successfully
- ✅ Document appears in "My Documents"
- ✅ Thumbnail generated
- ✅ Searchable immediately

### Feature: Document Download

#### Test Scenario: Download with Credits

**Steps:**
1. Find document (cost: 2 credits)
2. Current credits: 10
3. Click "Download"
4. Confirm purchase
5. File downloads

**Database Verification:**
```sql
-- Check credit transaction
SELECT * FROM credit_transactions
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 1;

-- User credits should decrease by 2
SELECT credits FROM users WHERE user_id = 'your-user-id';
```

**Expected Results:**
- ✅ Credits deducted (10 → 8)
- ✅ File downloads
- ✅ Transaction recorded
- ✅ Download count increments

### Feature: Rating System

#### Test Scenario: Rate Document

**Steps:**
1. View document detail
2. Click 4 stars
3. Rating submits

**Expected Results:**
- ✅ Rating recorded
- ✅ Average rating updates
- ✅ Can't rate twice
- ✅ Can update own rating

### Feature: Comments

#### Test Scenario: Add Comment

**Steps:**
1. Scroll to comments section
2. Write comment: "Great document!"
3. Submit

**Expected Results:**
- ✅ Comment appears
- ✅ Shows author avatar and name
- ✅ Timestamp displayed

---

## Troubleshooting

### Database Issues

#### Problem: Can't connect to database

**Solution:**
```bash
# Check PostgreSQL is running
psql -h dingleberries.ddns.net -p 5432 -U postgres

# Verify .env database credentials
cat backend/.env | grep DB_

# Test connection from Node.js
node -e "require('./backend/src/config/database').connectDB()"
```

#### Problem: Migration fails

**Solution:**
```sql
-- Check if tables already exist
\dt

-- Drop tables if needed (WARNING: Deletes data!)
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS answers CASCADE;

-- Re-run migration
\i docs/database-design/migration_001_add_missing_features.sql
```

### Email Issues

#### Problem: Emails not sending

**Solution:**
1. Verify Gmail App Password:
   ```bash
   # Test SMTP connection
   node -e "
   const nodemailer = require('nodemailer');
   const transport = nodemailer.createTransport({
     service: 'gmail',
     auth: {
       user: 'your-email@gmail.com',
       pass: 'your-app-password'
     }
   });
   transport.verify().then(console.log).catch(console.error);
   "
   ```

2. Check backend logs for email errors
3. Verify 2FA enabled on Gmail
4. Regenerate App Password if needed

### Stripe Issues

#### Problem: Webhooks not working locally

**Solution:**
Use Stripe CLI to forward webhooks:
```bash
# Install Stripe CLI
# Download from: https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:5001/api/payment/webhook

# Get webhook secret from output
# Update STRIPE_WEBHOOK_SECRET in .env
```

#### Problem: Test cards not working

**Solution:**
- Use correct test card: `4242 4242 4242 4242`
- Check Stripe is in test mode
- Verify publishable key starts with `pk_test_`

### OAuth Issues

#### Problem: Google OAuth fails

**Solution:**
1. Verify redirect URI: `http://localhost:5001/api/auth/google/callback`
2. Check Google Cloud Console:
   - OAuth consent screen configured
   - Authorized redirect URIs added
3. Ensure Google+ API enabled
4. Check backend logs for detailed error

### Port Conflicts

#### Problem: Port 5001 or 3000 already in use

**Solution:**
```bash
# Windows - Find and kill process
netstat -ano | findstr :5001
taskkill /PID <PID> /F

# Or change port in .env
PORT=5002  # Backend
# Update REACT_APP_API_URL in frontend/.env
```

### Build Issues

#### Problem: npm install fails

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules
rm package-lock.json

# Reinstall
npm install

# If still fails, try:
npm install --legacy-peer-deps
```

---

## Summary

You now have a complete guide to:
1. ✅ Set up PostgreSQL database with all tables
2. ✅ Configure backend with all environment variables
3. ✅ Configure frontend and connect to backend
4. ✅ Test all 8 modules systematically
5. ✅ Verify core features work correctly
6. ✅ Troubleshoot common issues

### Next Steps

1. **Complete Environment Setup**:
   - Get Gmail App Password
   - Get Stripe test keys
   - (Optional) Get OAuth credentials

2. **Run Migrations**:
   ```bash
   psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/migration_001_add_missing_features.sql
   psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/migration_002_fix_missing_columns.sql
   ```

3. **Start Servers**:
   ```bash
   # Terminal 1
   cd backend && npm run dev
   
   # Terminal 2
   cd frontend && npm start
   ```

4. **Test Each Module** following the scenarios above

### Support Resources

- **Backend API Docs**: `http://localhost:5001/api-docs` (if Swagger configured)
- **Database Schema**: `docs/database-design/ER-Diagram.md`
- **Implementation Guide**: `docs/IMPLEMENTATION_GUIDE.md`
- **Testing Guides**: 
  - `docs/MODULE_1_2_TESTING_GUIDE.md`
  - `docs/MODULE_4_6_TESTING_GUIDE.md`
  - `docs/TESTING_GUIDE.md`

---

**Happy Testing! 🚀**
