# ShareBuddy - Ứng dụng Chia sẻ Tài liệu

## Mô tả
ShareBuddy là một nền tảng trực tuyến cho phép sinh viên, giảng viên và người học chia sẻ, tìm kiếm, tải xuống cũng như đánh giá các tài liệu học tập. Hệ thống bao gồm các tính năng nâng cao như thanh toán qua Stripe, tìm kiếm full-text, hệ thống Q&A, và gợi ý tài liệu thông minh.

## Công nghệ sử dụng
- **Frontend**: React 19 + TypeScript + Redux Toolkit + Bootstrap 5
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL 14+ (with full-text search)
- **Authentication**: JWT + OAuth 2.0 (Google, Facebook)
- **Payment**: Stripe Payment Gateway
- **File Storage**: Local storage với preview support (PDF, DOCX, PPTX)
- **Email**: Nodemailer (Gmail SMTP)
- **Styling**: CSS3 với Dark Theme và Pastel Colors

## Tính năng chính

### Module 1: Hệ thống Email ✅
- Email verification khi đăng ký
- Password reset qua email
- Email notifications
- Template hóa email

### Module 2: OAuth Authentication ✅
- Đăng nhập Google OAuth 2.0
- Đăng nhập Facebook OAuth 2.0
- Auto-create user profile

### Module 3: Payment System (Stripe) ✅
- Credit packages với bonus
- Payment intents integration
- Webhook handling
- Payment history

### Module 4: Q&A System ✅
- Hỏi đáp cho tài liệu
- Upvote/downvote
- Best answer selection
- Reputation points

### Module 5: Recommendation System ✅
- Collaborative filtering
- Content-based recommendations
- Popular documents

### Module 6: Document Preview ✅
- PDF preview với React-PDF
- DOCX/PPTX preview
- Thumbnail generation

### Module 7: Verified Author Badge ✅
- Verification requests
- Admin review workflow
- Credit reward multiplier

### Module 8: Full-Text Search ✅
- PostgreSQL tsvector search
- Advanced filters
- Autocomplete suggestions

### Tính năng cốt lõi
- 📤 Upload/Download tài liệu
- ⭐ Đánh giá và bình luận
- 👥 Follow tác giả
- 🔖 Bookmark tài liệu
- 🔔 Hệ thống thông báo
- 👨‍💼 Admin panel

## Cài đặt và Chạy

### Prerequisites
- Node.js 16+ và npm/yarn
- PostgreSQL 14+
- Stripe account (for payment testing)
- Gmail account (for email features)
- Google/Facebook OAuth apps (optional)

### 1. Cài đặt Database
```bash
# Tạo database PostgreSQL
createdb sharebuddy_db

# Chạy migration scripts theo thứ tự
psql -d sharebuddy_db -f docs/database-design/migration_001_initial_setup.sql
psql -d sharebuddy_db -f docs/database-design/migration_002_fix_missing_columns.sql

# (Optional) Load sample data
psql -d sharebuddy_db -f docs/database-design/sample_data.sql
```

### 2. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Copy và cấu hình environment variables
cp .env.example .env
# Chỉnh sửa .env với thông tin thực tế (database, email, Stripe keys, etc.)

# Tạo thư mục uploads
mkdir -p uploads/documents uploads/avatars uploads/previews

# Start development server
npm run dev
```

Backend sẽ chạy tại: http://localhost:5001

### 3. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Copy và cấu hình environment variables
cp .env.example .env
# Chỉnh sửa .env với API URL và Stripe publishable key

# Start development server
npm start
```

Frontend sẽ chạy tại: http://localhost:3000

## Cấu hình Environment Variables

### Backend (.env)
Xem chi tiết trong `backend/.env.example`. Các biến quan trọng:

#### Database
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sharebuddy_db
DB_USER=postgres
DB_PASSWORD=your_password
```

#### Email (Gmail)
1. Enable 2FA trên Gmail account
2. Tạo App Password: https://myaccount.google.com/apppasswords
3. Cấu hình:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

#### Stripe Payment
1. Đăng ký: https://dashboard.stripe.com/register
2. Lấy test keys: https://dashboard.stripe.com/test/apikeys
3. Setup webhook: https://dashboard.stripe.com/test/webhooks
   - Endpoint: `http://localhost:5001/api/payment/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### OAuth (Optional)
**Google:** https://console.cloud.google.com/apis/credentials
**Facebook:** https://developers.facebook.com/apps/

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5001
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

## Cấu trúc thư mục
```
ShareBuddy/
├── README.md
├── .gitignore
├── docs/
│   ├── database-design/
│   │   ├── ER-Diagram.md
│   │   ├── init_database.sql
│   │   └── sample_data.sql
│   └── api-documentation/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── app.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   └── uploads/
│       └── documents/
└── frontend/
    ├── package.json
    ├── public/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   ├── styles/
    │   └── utils/
    └── build/
```

## API Endpoints
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `GET /api/documents` - Lấy danh sách tài liệu
- `POST /api/documents` - Upload tài liệu
- `GET /api/documents/:id` - Chi tiết tài liệu
- `POST /api/documents/:id/download` - Tải xuống
- `POST /api/documents/:id/ratings` - Đánh giá
- `POST /api/documents/:id/comments` - Bình luận

