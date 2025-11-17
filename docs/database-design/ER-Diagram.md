# ShareBuddy - ER Diagram và Database Design

## Tổng quan
Hệ thống ShareBuddy cần quản lý thông tin về người dùng, tài liệu, đánh giá, bình luận, theo dõi, và hệ thống điểm thưởng.

## Các Entity chính

### 1. USERS (Người dùng)
- **user_id** (PK): UUID - Khóa chính
- **email**: VARCHAR(255) UNIQUE - Email đăng nhập
- **password_hash**: VARCHAR(255) - Mật khẩu đã mã hóa
- **username**: VARCHAR(100) UNIQUE - Tên người dùng
- **full_name**: VARCHAR(255) - Họ tên đầy đủ
- **avatar_url**: TEXT - Đường dẫn ảnh đại diện
- **bio**: TEXT - Mô tả bản thân
- **university**: VARCHAR(255) - Trường đại học
- **major**: VARCHAR(255) - Chuyên ngành
- **role**: ENUM('user', 'moderator', 'admin') - Vai trò
- **credits**: INTEGER DEFAULT 0 - Số điểm hiện có
- **is_verified_author**: BOOLEAN DEFAULT FALSE - Tác giả được xác thực
- **oauth_provider**: VARCHAR(50) - Nhà cung cấp OAuth (google, facebook)
- **oauth_id**: VARCHAR(255) - ID từ OAuth provider
- **created_at**: TIMESTAMP DEFAULT NOW()
- **updated_at**: TIMESTAMP DEFAULT NOW()
- **is_active**: BOOLEAN DEFAULT TRUE

### 2. DOCUMENTS (Tài liệu)
- **document_id** (PK): UUID - Khóa chính
- **title**: VARCHAR(500) NOT NULL - Tiêu đề tài liệu
- **description**: TEXT - Mô tả chi tiết
- **file_name**: VARCHAR(255) - Tên file gốc
- **file_path**: TEXT NOT NULL - Đường dẫn file trên server
- **file_size**: BIGINT - Kích thước file (bytes)
- **file_type**: VARCHAR(50) - Loại file (pdf, docx, pptx, etc.)
- **university**: VARCHAR(255) - Trường đại học
- **subject**: VARCHAR(255) - Môn học
- **author_id** (FK): UUID - Người tải lên (references users.user_id)
- **download_count**: INTEGER DEFAULT 0 - Số lượt tải xuống
- **view_count**: INTEGER DEFAULT 0 - Số lượt xem
- **credit_cost**: INTEGER DEFAULT 1 - Chi phí tải xuống
- **is_public**: BOOLEAN DEFAULT TRUE - Công khai hay riêng tư
- **is_premium**: BOOLEAN DEFAULT FALSE - Tài liệu premium
- **status**: ENUM('pending', 'approved', 'rejected') DEFAULT 'approved' - Trạng thái duyệt
- **created_at**: TIMESTAMP DEFAULT NOW()
- **updated_at**: TIMESTAMP DEFAULT NOW()

### 3. DOCUMENT_TAGS (Tags cho tài liệu)
- **tag_id** (PK): SERIAL
- **document_id** (FK): UUID (references documents.document_id)
- **tag_name**: VARCHAR(100) NOT NULL - Tên tag
- **created_at**: TIMESTAMP DEFAULT NOW()

### 4. RATINGS (Đánh giá tài liệu)
- **rating_id** (PK): UUID
- **document_id** (FK): UUID (references documents.document_id)
- **user_id** (FK): UUID (references users.user_id)
- **rating**: INTEGER CHECK (rating >= 1 AND rating <= 5) - Điểm đánh giá 1-5 sao
- **created_at**: TIMESTAMP DEFAULT NOW()
- **updated_at**: TIMESTAMP DEFAULT NOW()

### 5. COMMENTS (Bình luận)
- **comment_id** (PK): UUID
- **document_id** (FK): UUID (references documents.document_id)
- **user_id** (FK): UUID (references users.user_id)
- **parent_comment_id** (FK): UUID NULL (references comments.comment_id) - Cho reply
- **content**: TEXT NOT NULL - Nội dung bình luận
- **likes_count**: INTEGER DEFAULT 0 - Số lượt thích
- **is_question**: BOOLEAN DEFAULT FALSE - Đánh dấu câu hỏi trong Q&A
- **is_answer**: BOOLEAN DEFAULT FALSE - Đánh dấu câu trả lời
- **created_at**: TIMESTAMP DEFAULT NOW()
- **updated_at**: TIMESTAMP DEFAULT NOW()

### 6. COMMENT_LIKES (Thích bình luận)
- **like_id** (PK): UUID
- **comment_id** (FK): UUID (references comments.comment_id)
- **user_id** (FK): UUID (references users.user_id)
- **created_at**: TIMESTAMP DEFAULT NOW()

### 7. FOLLOWS (Theo dõi tác giả)
- **follow_id** (PK): UUID
- **follower_id** (FK): UUID (references users.user_id) - Người theo dõi
- **following_id** (FK): UUID (references users.user_id) - Người được theo dõi
- **created_at**: TIMESTAMP DEFAULT NOW()

### 8. BOOKMARKS (Lưu tài liệu yêu thích)
- **bookmark_id** (PK): UUID
- **user_id** (FK): UUID (references users.user_id)
- **document_id** (FK): UUID (references documents.document_id)
- **created_at**: TIMESTAMP DEFAULT NOW()

### 9. DOWNLOADS (Lịch sử tải xuống)
- **download_id** (PK): UUID
- **user_id** (FK): UUID (references users.user_id)
- **document_id** (FK): UUID (references documents.document_id)
- **credits_used**: INTEGER - Số điểm đã sử dụng
- **download_date**: TIMESTAMP DEFAULT NOW()

### 10. CREDIT_TRANSACTIONS (Giao dịch điểm)
- **transaction_id** (PK): UUID
- **user_id** (FK): UUID (references users.user_id)
- **amount**: INTEGER NOT NULL - Số điểm (+ hoặc -)
- **transaction_type**: ENUM('upload', 'download', 'comment', 'rating', 'purchase', 'bonus') - Loại giao dịch
- **reference_id**: UUID NULL - ID tham chiếu (document_id, comment_id, etc.)
- **description**: TEXT - Mô tả giao dịch
- **created_at**: TIMESTAMP DEFAULT NOW()

### 11. REPORTS (Báo cáo vi phạm)
- **report_id** (PK): UUID
- **reporter_id** (FK): UUID (references users.user_id) - Người báo cáo
- **document_id** (FK): UUID (references documents.document_id) - Tài liệu bị báo cáo
- **reason**: TEXT NOT NULL - Lý do báo cáo
- **status**: ENUM('pending', 'reviewed', 'resolved', 'dismissed') DEFAULT 'pending'
- **reviewed_by** (FK): UUID NULL (references users.user_id) - Admin/Moderator xử lý
- **created_at**: TIMESTAMP DEFAULT NOW()
- **updated_at**: TIMESTAMP DEFAULT NOW()

### 12. NOTIFICATIONS (Thông báo)
- **notification_id** (PK): UUID
- **user_id** (FK): UUID (references users.user_id) - Người nhận thông báo
- **type**: ENUM('new_document', 'new_follower', 'new_comment', 'new_rating', 'document_approved') - Loại thông báo
- **title**: VARCHAR(255) NOT NULL - Tiêu đề thông báo
- **content**: TEXT - Nội dung chi tiết
- **reference_id**: UUID NULL - ID tham chiếu (document_id, user_id, etc.)
- **is_read**: BOOLEAN DEFAULT FALSE - Đã đọc chưa
- **created_at**: TIMESTAMP DEFAULT NOW()

## Relationships (Mối quan hệ)

### One-to-Many Relationships:
1. **USERS → DOCUMENTS**: Một user có thể tải lên nhiều tài liệu
2. **USERS → RATINGS**: Một user có thể đánh giá nhiều tài liệu
3. **USERS → COMMENTS**: Một user có thể bình luận nhiều tài liệu
4. **USERS → DOWNLOADS**: Một user có thể tải xuống nhiều tài liệu
5. **USERS → CREDIT_TRANSACTIONS**: Một user có nhiều giao dịch điểm
6. **USERS → BOOKMARKS**: Một user có thể bookmark nhiều tài liệu
7. **USERS → REPORTS**: Một user có thể báo cáo nhiều tài liệu
8. **USERS → NOTIFICATIONS**: Một user có nhiều thông báo
9. **DOCUMENTS → RATINGS**: Một tài liệu có nhiều đánh giá
10. **DOCUMENTS → COMMENTS**: Một tài liệu có nhiều bình luận
11. **DOCUMENTS → DOCUMENT_TAGS**: Một tài liệu có nhiều tags
12. **DOCUMENTS → DOWNLOADS**: Một tài liệu có nhiều lượt tải xuống
13. **DOCUMENTS → BOOKMARKS**: Một tài liệu có thể được bookmark bởi nhiều users
14. **COMMENTS → COMMENT_LIKES**: Một bình luận có nhiều likes
15. **COMMENTS → COMMENTS**: Self-referencing for replies (parent_comment_id)

### Many-to-Many Relationships:
1. **USERS ↔ USERS (FOLLOWS)**: Một user có thể theo dõi nhiều users và được nhiều users theo dõi
2. **USERS ↔ DOCUMENTS (BOOKMARKS)**: Một user có thể bookmark nhiều documents và một document có thể được bookmark bởi nhiều users
3. **USERS ↔ COMMENTS (COMMENT_LIKES)**: Một user có thể like nhiều comments và một comment có thể được like bởi nhiều users

### Unique Constraints:
- **RATINGS**: (user_id, document_id) - Mỗi user chỉ đánh giá 1 lần cho 1 tài liệu
- **FOLLOWS**: (follower_id, following_id) - Không được follow trùng
- **BOOKMARKS**: (user_id, document_id) - Không được bookmark trùng
- **COMMENT_LIKES**: (user_id, comment_id) - Không được like trùng

## Indexes để tối ưu hóa performance:
- **users**: email, username, oauth_id
- **documents**: author_id, university, subject, created_at
- **document_tags**: document_id, tag_name
- **ratings**: document_id, user_id
- **comments**: document_id, user_id, parent_comment_id
- **follows**: follower_id, following_id
- **downloads**: user_id, document_id, download_date
- **credit_transactions**: user_id, transaction_type, created_at
- **notifications**: user_id, is_read, created_at

## Triggers và Functions:
1. **Update document rating average** khi có rating mới
2. **Update user credits** khi có giao dịch mới
3. **Update download_count** khi có download mới
4. **Update likes_count** khi có comment_like mới
5. **Auto create notification** khi có follow, comment, rating mới