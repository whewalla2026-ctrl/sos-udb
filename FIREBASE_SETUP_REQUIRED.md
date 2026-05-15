# FIREBASE SETUP REQUIRED - PRODUCTION CERTIFICATION GAP

**Gap:** Auth score 90% → 100%
**Required Action:** Configure Firebase credentials

## CURRENT STATE

- JWT Authentication: ✅ WORKING
- Firebase Auth: ❌ NOT CONFIGURED

## REQUIRED CREDENTIALS

To enable Firebase authentication, add these to `.env`:

```env
# Firebase Admin SDK (Backend)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk@your-project.iam.gserviceaccount.com"

# Firebase Client (Frontend)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSy..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef"
```

## SETUP STEPS

### 1. Create Firebase Project
1. Go to https://console.firebase.google.com/
2. Create new project or use existing
3. Enable Authentication in Firebase Console

### 2. Get Service Account Credentials
1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Download JSON file
4. Extract: project_id, private_key, client_email

### 3. Update Environment
```bash
# Add to .env
echo 'FIREBASE_PROJECT_ID="your-project-id"' >> .env
echo 'FIREBASE_PRIVATE_KEY="..."' >> .env
echo 'FIREBASE_CLIENT_EMAIL="..."' >> .env
```

### 4. Restart API
```bash
docker compose -f docker-compose.prod.yml restart api
```

## VERIFICATION

After setup, test:
```bash
# Test login
curl -X POST http://localhost:4000/auth/login-with-firebase \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken": "..."}'
```

## IMPACT ON SCORE

| Component | Before | After |
|-----------|--------|-------|
| Auth | 90% | 100% |
| Overall | 9.2 | 9.6 |

## ALTERNATIVE: JWT-ONLY MODE

If Firebase is not available, the system defaults to JWT-only authentication which is fully functional for production use.

---

**Status:** 🔴 BLOCKED - Requires external credentials