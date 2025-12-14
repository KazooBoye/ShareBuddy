# ShareBuddy - Visual Testing Workflow

**Quick reference for testing each module systematically**

---

## 🎯 Testing Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     START HERE                                  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 1: Database Setup                                  │  │
│  │  ✓ Run migration_001_add_missing_features.sql          │  │
│  │  ✓ Run migration_002_fix_missing_columns.sql           │  │
│  │  ✓ Run TEST_DATA.sql (optional test users)             │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 2: Backend Configuration                           │  │
│  │  ✓ npm install (in backend/)                            │  │
│  │  ✓ Check .env file exists                               │  │
│  │  ✓ npm run dev                                           │  │
│  │  ✓ Verify: "Server running on port 5001"                │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  STEP 3: Frontend Configuration                          │  │
│  │  ✓ npm install (in frontend/)                           │  │
│  │  ✓ Create .env from .env.example                        │  │
│  │  ✓ npm start                                             │  │
│  │  ✓ Verify: Browser opens to localhost:3000              │  │
│  └──────────────────────────────────────────────────────────┘  │
│                          ↓                                      │
│                   CHOOSE TESTING PATH                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────────────┐
                            │                                 │
                            ↓                                 ↓
                 ┌────────────────────┐         ┌────────────────────┐
                 │  PATH A: NO CONFIG │         │  PATH B: FULL TEST │
                 │  (Quick Test)      │         │  (With API Keys)   │
                 └────────────────────┘         └────────────────────┘
```

---

## 🎨 PATH A: Quick Testing (No Configuration Required)

**Time Required:** 30 minutes  
**Modules:** 4, 5, 6, 7, 8 + Core Features

```
┌─────────────────────────────────────────────────────┐
│ Step A1: Basic Authentication                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Go to localhost:3000/register                │ │
│ │ 2. Create account: test@test.com / Test123!     │ │
│ │ 3. Login (skip email verification for now)      │ │
│ │ 4. ✓ See dashboard                              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step A2: Document Operations                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Upload a PDF document                        │ │
│ │ 2. Browse documents list                        │ │
│ │ 3. Click document → view details                │ │
│ │ 4. ✓ Thumbnail displays                         │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step A3: MODULE 6 - Document Preview                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Click "Preview" button on PDF               │ │
│ │ 2. PDF viewer opens                             │ │
│ │ 3. Navigate pages                               │ │
│ │ 4. ✓ PDF renders correctly                      │ │
│ │ 5. ✓ Zoom works                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step A4: MODULE 8 - Full-Text Search                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Use search bar → enter "algorithms"          │ │
│ │ 2. ✓ Results appear                             │ │
│ │ 3. Apply filter: Subject = "Computer Science"   │ │
│ │ 4. ✓ Results filter correctly                   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step A5: MODULE 4 - Q&A System                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Go to document detail page                   │ │
│ │ 2. Scroll to "Questions & Answers"              │ │
│ │ 3. Click "Ask Question"                         │ │
│ │ 4. Enter: Title + Content                       │ │
│ │ 5. Submit question                              │ │
│ │ 6. ✓ Question appears in list                   │ │
│ │                                                 │ │
│ │ 7. Click "Answer" on a question                 │ │
│ │ 8. Write answer                                 │ │
│ │ 9. Submit answer                                │ │
│ │ 10. ✓ Answer appears                            │ │
│ │                                                 │ │
│ │ 11. Click ▲ to upvote                           │ │
│ │ 12. ✓ Vote count increases                      │ │
│ │                                                 │ │
│ │ 13. If you're question author:                  │ │
│ │     Click "✓ Accept" on best answer             │ │
│ │ 14. ✓ Answer marked as accepted                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step A6: MODULE 5 - Recommendations                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. View several documents (3+)                  │ │
│ │ 2. Go to homepage                               │ │
│ │ 3. Look for "Recommended for You"               │ │
│ │ 4. ✓ Recommendations display                    │ │
│ │                                                 │ │
│ │ 5. On document detail page                      │ │
│ │ 6. Scroll to "Similar Documents"                │ │
│ │ 7. ✓ Similar docs shown                         │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step A7: MODULE 7 - Verified Author                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Go to Profile/Settings                       │ │
│ │ 2. Find "Request Verified Badge"                │ │
│ │ 3. Fill reason + submit                         │ │
│ │ 4. ✓ Request created                            │ │
│ │                                                 │ │
│ │ 5. Login as admin:                              │ │
│ │    admin@example.com / Test123!                 │ │
│ │ 6. Go to Admin Panel                            │ │
│ │ 7. View verification requests                   │ │
│ │ 8. Approve or reject request                    │ │
│ │ 9. ✓ User receives badge                        │ │
│ │                                                 │ │
│ │ 10. Check user profile                          │ │
│ │ 11. ✓ Blue checkmark displays                   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
                   ✅ DONE!
            PATH A Testing Complete
      You've tested 5 modules + core features
```

---

## 🔑 PATH B: Full Testing (With API Keys)

**Time Required:** 1-2 hours  
**Modules:** All 8 modules

```
START: Complete PATH A first, then continue here
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B1: Configure Gmail (Module 1)                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Enable 2FA on Gmail                          │ │
│ │    → myaccount.google.com                       │ │
│ │                                                 │ │
│ │ 2. Create App Password                          │ │
│ │    → myaccount.google.com/apppasswords          │ │
│ │    → Mail → Other (ShareBuddy)                  │ │
│ │    → Copy 16-char password                      │ │
│ │                                                 │ │
│ │ 3. Update backend/.env:                         │ │
│ │    EMAIL_USER=your-email@gmail.com              │ │
│ │    EMAIL_PASSWORD=abcd efgh ijkl mnop           │ │
│ │                                                 │ │
│ │ 4. Restart backend: Ctrl+C → npm run dev        │ │
│ │ 5. ✓ See "Email service configured" in logs     │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B2: MODULE 1 - Email Verification              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Register new account                         │ │
│ │    Email: test-email@gmail.com                  │ │
│ │    Password: Test123!                           │ │
│ │                                                 │ │
│ │ 2. Check backend logs:                          │ │
│ │    ✓ "Verification email sent to..."           │ │
│ │                                                 │ │
│ │ 3. Check Gmail inbox                            │ │
│ │    ✓ Email received from ShareBuddy             │ │
│ │                                                 │ │
│ │ 4. Click verification link in email             │ │
│ │    → Should redirect to frontend                │ │
│ │    ✓ "Email verified! You can now login."      │ │
│ │                                                 │ │
│ │ 5. Verify in database:                          │ │
│ │    SELECT email_verified FROM users             │ │
│ │    WHERE email = 'test-email@gmail.com';        │ │
│ │    ✓ Should be TRUE                             │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B3: MODULE 1 - Password Reset                  │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Logout                                       │ │
│ │ 2. Click "Forgot Password"                      │ │
│ │ 3. Enter: test-email@gmail.com                  │ │
│ │ 4. Submit                                       │ │
│ │                                                 │ │
│ │ 5. Check email inbox                            │ │
│ │    ✓ "Reset your ShareBuddy password" email    │ │
│ │                                                 │ │
│ │ 6. Click reset link                             │ │
│ │ 7. Enter new password: NewPass123!              │ │
│ │ 8. Submit                                       │ │
│ │    ✓ "Password reset successful"               │ │
│ │                                                 │ │
│ │ 9. Try logging in with NEW password             │ │
│ │    ✓ Login works                                │ │
│ │                                                 │ │
│ │ 10. Try logging in with OLD password            │ │
│ │     ✓ Login fails (as expected)                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B4: Configure Stripe (Module 3)                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Sign up at dashboard.stripe.com/register     │ │
│ │                                                 │ │
│ │ 2. Get Test Keys:                               │ │
│ │    → dashboard.stripe.com/test/apikeys          │ │
│ │    → Copy "Publishable key" (pk_test_...)       │ │
│ │    → Copy "Secret key" (sk_test_...)            │ │
│ │                                                 │ │
│ │ 3. Setup Webhook:                               │ │
│ │    → dashboard.stripe.com/test/webhooks         │ │
│ │    → Add endpoint                               │ │
│ │    → URL: http://localhost:5001/api/payment/... │ │
│ │    → Events: payment_intent.succeeded, etc.     │ │
│ │    → Copy "Signing secret" (whsec_...)          │ │
│ │                                                 │ │
│ │ 4. Update backend/.env:                         │ │
│ │    STRIPE_SECRET_KEY=sk_test_xxxxx              │ │
│ │    STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx         │ │
│ │    STRIPE_WEBHOOK_SECRET=whsec_xxxxx            │ │
│ │                                                 │ │
│ │ 5. Update frontend/.env:                        │ │
│ │    REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_... │ │
│ │                                                 │ │
│ │ 6. Restart BOTH servers                         │ │
│ │    Backend: Ctrl+C → npm run dev                │ │
│ │    Frontend: Ctrl+C → npm start                 │ │
│ │                                                 │ │
│ │ 7. ✓ See "Stripe configured" in backend logs    │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B5: MODULE 3 - Purchase Credits                │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Login to application                         │ │
│ │ 2. Note current credits (e.g., 100)             │ │
│ │                                                 │ │
│ │ 3. Navigate to "Purchase Credits"               │ │
│ │    ✓ See 6 credit packages                      │ │
│ │    ✓ Prices in USD and VND                      │ │
│ │    ✓ Bonus credits shown                        │ │
│ │                                                 │ │
│ │ 4. Select "50 credits - $3.50" package          │ │
│ │    (50 base + 10 bonus = 60 total)              │ │
│ │                                                 │ │
│ │ 5. Click "Purchase"                             │ │
│ │    ✓ Stripe Checkout modal opens                │ │
│ │                                                 │ │
│ │ 6. Enter TEST card details:                     │ │
│ │    Card: 4242 4242 4242 4242                    │ │
│ │    Expiry: 12/25                                │ │
│ │    CVC: 123                                     │ │
│ │    ZIP: 12345                                   │ │
│ │                                                 │ │
│ │ 7. Click "Pay"                                  │ │
│ │    ✓ Processing...                              │ │
│ │    ✓ "Payment successful!"                      │ │
│ │                                                 │ │
│ │ 8. Check credits increased:                     │ │
│ │    Old: 100 → New: 160 (+60)                    │ │
│ │    ✓ Correct amount added                       │ │
│ │                                                 │ │
│ │ 9. Check backend logs:                          │ │
│ │    ✓ "Payment intent created: pi_xxxxx"         │ │
│ │    ✓ "Payment succeeded"                        │ │
│ │    ✓ "Added 60 credits"                         │ │
│ │                                                 │ │
│ │ 10. Check database:                             │ │
│ │     SELECT * FROM payment_transactions          │ │
│ │     ORDER BY created_at DESC LIMIT 1;           │ │
│ │     ✓ payment_status = 'succeeded'              │ │
│ │     ✓ credits_purchased = 60                    │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B6: MODULE 3 - Payment History                 │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Navigate to "Payment History"                │ │
│ │    ✓ See list of transactions                   │ │
│ │    ✓ Latest transaction shown first             │ │
│ │    ✓ Status: "Succeeded" (green badge)          │ │
│ │    ✓ Amount: $3.50                              │ │
│ │    ✓ Credits: 60                                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B7: Configure OAuth (Optional - Module 2)      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ GOOGLE OAUTH:                                   │ │
│ │ 1. Go to console.cloud.google.com               │ │
│ │ 2. Create project "ShareBuddy"                  │ │
│ │ 3. Enable Google+ API                           │ │
│ │ 4. Create OAuth credentials                     │ │
│ │    → Redirect URI:                              │ │
│ │      http://localhost:5001/api/auth/google/...  │ │
│ │ 5. Copy Client ID + Secret                      │ │
│ │ 6. Update backend/.env                          │ │
│ │                                                 │ │
│ │ FACEBOOK OAUTH:                                 │ │
│ │ 1. Go to developers.facebook.com                │ │
│ │ 2. Create app "ShareBuddy"                      │ │
│ │ 3. Add Facebook Login product                   │ │
│ │ 4. Configure redirect URI                       │ │
│ │ 5. Copy App ID + Secret                         │ │
│ │ 6. Update backend/.env                          │ │
│ │                                                 │ │
│ │ 7. Restart backend                              │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│ Step B8: MODULE 2 - OAuth Login                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Logout from application                      │ │
│ │ 2. Go to login page                             │ │
│ │ 3. Click "Sign in with Google"                  │ │
│ │    ✓ Redirects to Google consent screen         │ │
│ │                                                 │ │
│ │ 4. Select Google account                        │ │
│ │ 5. Click "Continue"                             │ │
│ │    ✓ Redirects back to app                      │ │
│ │    ✓ Automatically logged in                    │ │
│ │                                                 │ │
│ │ 6. Check user profile:                          │ │
│ │    ✓ Profile picture from Google                │ │
│ │    ✓ Name from Google                           │ │
│ │                                                 │ │
│ │ 7. Check database:                              │ │
│ │    SELECT google_id, email_verified             │ │
│ │    FROM users WHERE google_id IS NOT NULL;      │ │
│ │    ✓ google_id populated                        │ │
│ │    ✓ email_verified = TRUE (auto)              │ │
│ │                                                 │ │
│ │ 8. Repeat for Facebook:                         │ │
│ │    Click "Sign in with Facebook"                │ │
│ │    ✓ Similar flow                               │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                        ↓
                   ✅ DONE!
          All 8 Modules Tested Successfully!
```

---

## 📊 Testing Completion Checklist

### Core Features
- [ ] User registration works
- [ ] User login works
- [ ] JWT authentication works
- [ ] Document upload works
- [ ] Document download works (with credits)
- [ ] Rating system works
- [ ] Comment system works
- [ ] User profile management
- [ ] Avatar upload

### Module 1: Email System
- [ ] Email verification sent on registration
- [ ] Verification link works
- [ ] Email verified status updated
- [ ] Password reset email sent
- [ ] Reset link works
- [ ] Password updated successfully
- [ ] Old password no longer works

### Module 2: OAuth
- [ ] Google login button appears
- [ ] Google OAuth flow works
- [ ] User created with Google data
- [ ] Facebook login works (if configured)
- [ ] Profile pictures fetched
- [ ] Email auto-verified

### Module 3: Payment
- [ ] Credit packages display
- [ ] Package details correct (price, bonus)
- [ ] Stripe Checkout opens
- [ ] Test card accepted
- [ ] Payment succeeds
- [ ] Credits added to account
- [ ] Transaction recorded
- [ ] Payment history displays
- [ ] Webhook processes events

### Module 4: Q&A
- [ ] Can ask question on document
- [ ] Question displays in list
- [ ] Can provide answer
- [ ] Answer displays under question
- [ ] Can upvote question
- [ ] Can downvote question
- [ ] Can upvote answer
- [ ] Can downvote answer
- [ ] Question author can accept answer
- [ ] Accepted answer marked with checkmark
- [ ] Vote counts update correctly

### Module 5: Recommendations
- [ ] Personalized recommendations display
- [ ] Similar documents shown
- [ ] Popular documents display
- [ ] Recommendations update based on activity

### Module 6: Document Preview
- [ ] PDF preview opens
- [ ] Can navigate pages
- [ ] Zoom controls work
- [ ] DOCX preview works
- [ ] Thumbnails generate automatically
- [ ] Download button works from preview

### Module 7: Verified Author
- [ ] Can submit verification request
- [ ] Request shows in admin panel
- [ ] Admin can approve request
- [ ] Admin can reject request
- [ ] Badge displays on approved user
- [ ] Badge shows in all UI places
- [ ] Credit multiplier works (1.5x)

### Module 8: Full-Text Search
- [ ] Basic text search works
- [ ] Multi-field search works
- [ ] Filters apply correctly
- [ ] Can combine search + filters
- [ ] Results ranked by relevance
- [ ] Search is fast (<500ms)
- [ ] Autocomplete suggestions (if implemented)

---

## 🎓 Module Difficulty Levels

**Easy (10-15 min each):**
- ✅ Module 6: Document Preview
- ✅ Module 8: Full-Text Search
- ✅ Module 5: Recommendations

**Medium (20-30 min each):**
- ⚠️ Module 4: Q&A System
- ⚠️ Module 7: Verified Author
- ⚠️ Module 1: Email System

**Requires Setup (30-45 min each):**
- 🔑 Module 3: Payment System
- 🔑 Module 2: OAuth

---

## 💡 Pro Tips

1. **Test in Order**: Follow PATH A first, then PATH B
2. **Use Test Data**: Run `TEST_DATA.sql` for pre-populated scenarios
3. **Check Logs**: Backend terminal shows helpful debug info
4. **Browser DevTools**: Network tab shows API calls
5. **Database Queries**: Verify data changes in psql
6. **Test Accounts**: Use provided test users (testuser@example.com, etc.)
7. **Stripe Test Mode**: Always use test cards, never real cards
8. **Gmail Inbox**: Check spam folder if emails don't arrive

---

## 🆘 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check DB connection, port 5001 free |
| Frontend won't start | Clear node_modules, reinstall |
| Email not sending | Verify Gmail App Password |
| Stripe not working | Use test card 4242..., check keys |
| OAuth fails | Check redirect URIs match exactly |
| Database errors | Re-run migrations |
| Module not working | Check backend logs for errors |

---

**Ready to start?** Pick your path and begin testing! 🚀

For detailed testing scenarios, see: `COMPLETE_SETUP_AND_TESTING_GUIDE.md`
For quick setup, see: `QUICK_START_CHECKLIST.md`
For module status, see: `MODULE_STATUS.md`
