# ShareBuddy - Quick Start Checklist

**Use this checklist to get ShareBuddy up and running quickly**

---

## ☑️ Phase 1: Database Setup (15 minutes)

- [ ] **Test database connection**
  ```bash
  psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db
  # Password: 98tV2v_!pT*:nuc>
  ```

- [ ] **Run Migration 1**
  ```bash
  psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/migration_001_add_missing_features.sql
  ```

- [ ] **Run Migration 2**
  ```bash
  psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db -f docs/database-design/migration_002_fix_missing_columns.sql
  ```

- [ ] **Verify tables created**
  ```sql
  \dt
  -- Should show: users, documents, questions, answers, payment_transactions, etc.
  ```

---

## ☑️ Phase 2: Backend Setup (20 minutes)

- [ ] **Install dependencies**
  ```bash
  cd backend
  npm install
  ```

- [ ] **Update .env file** (backend/.env already exists, update these):
  
  - [ ] **Gmail Configuration** (Required for Module 1):
    ```env
    EMAIL_USER=your-email@gmail.com
    EMAIL_PASSWORD=your-16-char-app-password
    ```
    Get App Password: https://myaccount.google.com/apppasswords

  - [ ] **Stripe Configuration** (Required for Module 3):
    ```env
    STRIPE_SECRET_KEY=sk_test_xxxxx
    STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
    STRIPE_WEBHOOK_SECRET=whsec_xxxxx
    ```
    Get keys: https://dashboard.stripe.com/test/apikeys

  - [ ] **Google OAuth** (Optional for Module 2):
    ```env
    GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
    GOOGLE_CLIENT_SECRET=xxxxx
    ```
    Setup: https://console.cloud.google.com

  - [ ] **Facebook OAuth** (Optional for Module 2):
    ```env
    FACEBOOK_APP_ID=xxxxx
    FACEBOOK_APP_SECRET=xxxxx
    ```
    Setup: https://developers.facebook.com

- [ ] **Create upload directories**
  ```bash
  mkdir -p uploads\documents
  mkdir -p uploads\avatars
  mkdir -p uploads\previews
  mkdir -p uploads\thumbnails
  ```

- [ ] **Start backend server**
  ```bash
  npm run dev
  # Should see: "Server running on port 5001"
  ```

---

## ☑️ Phase 3: Frontend Setup (10 minutes)

- [ ] **Install dependencies**
  ```bash
  cd frontend
  npm install
  ```

- [ ] **Create/Update .env file** (frontend/.env.example exists, copy to .env):
  ```bash
  copy .env.example .env
  ```

- [ ] **Update Stripe key in .env**:
  ```env
  REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
  ```
  (Same as backend's STRIPE_PUBLISHABLE_KEY)

- [ ] **Start frontend server**
  ```bash
  npm start
  # Should open browser to http://localhost:3000
  ```

---

## ☑️ Phase 4: Basic Functionality Test (10 minutes)

- [ ] **Test Registration**
  1. Go to http://localhost:3000/register
  2. Create account
  3. Check for verification email

- [ ] **Test Login**
  1. Login with created account
  2. Should see dashboard

- [ ] **Test Document Upload**
  1. Upload a PDF file
  2. Fill in details
  3. Check upload successful

- [ ] **Test Document Browse**
  1. View uploaded documents
  2. Check thumbnail displays

---

## ☑️ Phase 5: Module Testing (Based on Priority)

### Must Test (Core Functionality)

- [ ] **Module 1: Email System** ⭐⭐⭐
  - [ ] Email verification works
  - [ ] Password reset works
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 1

- [ ] **Module 3: Payment System** ⭐⭐⭐
  - [ ] View credit packages
  - [ ] Purchase with test card: 4242 4242 4242 4242
  - [ ] Credits added to account
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 3

- [ ] **Module 4: Q&A System** ⭐⭐
  - [ ] Ask question on document
  - [ ] Answer question
  - [ ] Vote on questions/answers
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 4

- [ ] **Module 6: Document Preview** ⭐⭐
  - [ ] PDF preview works
  - [ ] Can navigate pages
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 6

### Optional Test (Enhanced Features)

- [ ] **Module 2: OAuth** ⭐
  - [ ] Google OAuth login
  - [ ] Facebook OAuth login
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 2

- [ ] **Module 5: Recommendations** ⭐
  - [ ] View recommended documents
  - [ ] Similar documents shown
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 5

- [ ] **Module 7: Verified Author** ⭐
  - [ ] Request verification
  - [ ] Admin review (need admin account)
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 7

- [ ] **Module 8: Search** ⭐
  - [ ] Search documents
  - [ ] Filters work
  - See: COMPLETE_SETUP_AND_TESTING_GUIDE.md → Module 8

---

## 🚨 Common Issues & Quick Fixes

### Backend won't start
```bash
# Check port not in use
netstat -ano | findstr :5001

# Check .env file exists
dir backend\.env

# Check database connection
psql -h dingleberries.ddns.net -p 5432 -U postgres -d sharebuddy_db
```

### Frontend won't start
```bash
# Clear node_modules and reinstall
cd frontend
rmdir /s node_modules
del package-lock.json
npm install

# Or try legacy peer deps
npm install --legacy-peer-deps
```

### Database errors
```sql
-- Check if migrations ran
SELECT * FROM questions LIMIT 1;
SELECT * FROM payment_transactions LIMIT 1;

-- If tables missing, re-run migrations
```

### Emails not sending
1. Check Gmail App Password (not regular password!)
2. Verify 2FA enabled on Gmail
3. Check backend logs for error details
4. Test SMTP connection (see Troubleshooting section)

### Stripe not working
1. Use test card: `4242 4242 4242 4242`
2. Check keys start with `sk_test_` and `pk_test_`
3. Verify Stripe is in test mode
4. Check browser console for errors

---

## 📚 Reference Documents

- **Full Setup Guide**: `COMPLETE_SETUP_AND_TESTING_GUIDE.md`
- **System Specification**: `docs/SYSTEM_SPECIFICATION.md`
- **Implementation Guide**: `docs/IMPLEMENTATION_GUIDE.md`
- **Database Design**: `docs/database-design/ER-Diagram.md`
- **README**: `README.md`

---

## ✅ Success Criteria

You're good to go when:
- ✅ Backend running without errors
- ✅ Frontend loads in browser
- ✅ Can register and login
- ✅ Can upload and view documents
- ✅ At least one module test passes (email or payment)

---

## 🎯 Minimum Viable Test

**Quick 5-minute test to verify everything works:**

1. **Backend**: `cd backend && npm run dev` → Should see "Server running"
2. **Frontend**: `cd frontend && npm start` → Browser opens
3. **Register**: Create account → Check email verification sent
4. **Upload**: Upload a PDF → Should succeed
5. **Browse**: View documents → Should see uploaded file

If all 5 steps work → **System is operational! 🎉**

---

## 📞 Need Help?

1. Check **Troubleshooting** section in `COMPLETE_SETUP_AND_TESTING_GUIDE.md`
2. Review backend logs in terminal
3. Check browser console for frontend errors
4. Verify database queries in psql
5. Review relevant testing guide in `docs/` folder

---

**Good luck! 🚀**
