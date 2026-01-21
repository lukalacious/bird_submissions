# ⚡ Quick Deploy Reference Card

## 🎯 Quick Links
- **Render**: https://dashboard.render.com
- **Vercel**: https://vercel.com/dashboard
- **Google Console**: https://console.cloud.google.com/apis/credentials
- **Google Sheet**: https://docs.google.com/spreadsheets/d/1q1jQRbQlQoFMwCmkRgabg-CjiQTrKSteyKcPS-tC3mI/edit

---

## 📋 Render Setup (Backend)
```
Name: bird-tracker-backend
Root Directory: backend
Build: npm install
Start: node src/server.js
Instance: Free
```

**Environment Variables File**: `RENDER_ENV_COMPLETE.txt`

---

## 📋 Vercel Setup (Frontend)
```
Framework: Create React App
Root Directory: frontend
Build: npm run build
Output: build
```

**Environment Variables**:
```
REACT_APP_API_URL=https://YOUR_RENDER_URL/api
REACT_APP_GOOGLE_CLIENT_ID=836873570554-9shbb2t4j52gsmrqbbsbskdr1gim73s1.apps.googleusercontent.com
```

---

## 🔄 After Deployment

1. **Update Render** (Environment tab):
   - `FRONTEND_URL` → Your Vercel URL
   - `GOOGLE_REDIRECT_URI` → `https://YOUR_RENDER_URL/api/auth/google/callback`

2. **Update Google OAuth**:
   - Add Vercel URL to Authorized JavaScript origins
   - Add Render callback URL to Authorized redirect URIs

3. **Test**:
   - Visit Vercel URL
   - Sign in with Google
   - Submit birds
   - Check Google Sheet

---

## 🆘 Quick Fixes

**Backend won't start?**
→ Check Render logs, verify all env vars set

**OAuth error?**
→ Check redirect URIs in Google Console match exactly

**CORS error?**
→ Verify `FRONTEND_URL` in Render matches Vercel URL

**Birds not loading?**
→ Test `https://YOUR_RENDER_URL/api/regions`

**Submissions not saving?**
→ Check Google Sheet has "Bird Submissions" sheet

---

## 📝 Deployment Order
1. Push to GitHub
2. Deploy to Render (get URL)
3. Deploy to Vercel (get URL)
4. Update Render env vars with Vercel URL
5. Update Google OAuth with both URLs
6. Test!
