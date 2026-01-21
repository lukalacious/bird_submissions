# 🚀 Deployment Guide: Render + Vercel

## Prerequisites
- [ ] Code pushed to GitHub repository: `bird_submissions`
- [ ] Google Cloud Console access
- [ ] Google Sheets with "Bird Submissions" sheet created

---

## Step 1: Deploy Backend to Render (15 minutes)

### 1.1 Create Render Account
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with your GitHub account
4. Authorize Render to access your GitHub

### 1.2 Create Web Service
1. Click "**New +**" in top right
2. Select "**Web Service**"
3. Connect your repository:
   - Find `bird_submissions` repository
   - Click "**Connect**"

### 1.3 Configure Service
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Name** | `bird-tracker-backend` (or your choice) |
| **Region** | Oregon (US West) or closest to you |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node src/server.js` |
| **Instance Type** | **Free** |

### 1.4 Add Environment Variables
Click "**Advanced**" → Scroll to "**Environment Variables**"

**Option A: Add one-by-one** (Click "Add Environment Variable" for each):
- Open file: `/Users/lukeroberts/Documents/code/projects/birds/RENDER_ENV_COMPLETE.txt`
- Copy each variable name and value

**Option B: Bulk import** (if available):
- Click "Add from .env" and paste contents of `RENDER_ENV_COMPLETE.txt`

**⚠️ IMPORTANT**: After deployment, you'll need to update these two variables:
1. `FRONTEND_URL` - Replace with your Vercel URL
2. `GOOGLE_REDIRECT_URI` - Replace `YOUR_RENDER_APP` with your actual Render URL

### 1.5 Deploy
1. Click "**Create Web Service**"
2. Wait 5-10 minutes for deployment
3. Once deployed, you'll see a URL like: `https://bird-tracker-backend.onrender.com`
4. **SAVE THIS URL** - you'll need it for Vercel and Google OAuth

### 1.6 Test Backend
Visit: `https://YOUR_RENDER_URL/health`

You should see: `{"status":"ok","message":"Server is running"}`

---

## Step 2: Deploy Frontend to Vercel (10 minutes)

### 2.1 Create Vercel Account
1. Go to https://vercel.com
2. Click "**Sign Up**"
3. Sign up with your GitHub account
4. Authorize Vercel to access your GitHub

### 2.2 Import Project
1. Click "**Add New...**" → "**Project**"
2. Find your `bird_submissions` repository
3. Click "**Import**"

### 2.3 Configure Project
Fill in these settings:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Create React App |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` (auto-detected) |
| **Output Directory** | `build` (auto-detected) |
| **Install Command** | `npm install` (auto-detected) |

### 2.4 Add Environment Variables
Click "**Environment Variables**" section:

Add these 2 variables:

**Variable 1:**
- **Name**: `REACT_APP_API_URL`
- **Value**: `https://YOUR_RENDER_URL/api` (replace with your Render URL from Step 1.5)

**Variable 2:**
- **Name**: `REACT_APP_GOOGLE_CLIENT_ID`
- **Value**: `836873570554-9shbb2t4j52gsmrqbbsbskdr1gim73s1.apps.googleusercontent.com`

### 2.5 Deploy
1. Click "**Deploy**"
2. Wait 2-5 minutes for deployment
3. Once deployed, you'll get a URL like: `https://bird-submissions-xyz.vercel.app`
4. **SAVE THIS URL**

---

## Step 3: Update Render Environment Variables

Now that you have your Vercel URL, update Render:

1. Go to your Render dashboard: https://dashboard.render.com
2. Click on your `bird-tracker-backend` service
3. Click "**Environment**" tab
4. Update these 2 variables:

   **FRONTEND_URL**
   - Old: `https://YOUR_VERCEL_APP.vercel.app`
   - New: `https://bird-submissions-xyz.vercel.app` (your actual Vercel URL)

   **GOOGLE_REDIRECT_URI**
   - Old: `https://YOUR_RENDER_APP.onrender.com/api/auth/google/callback`
   - New: `https://bird-tracker-backend.onrender.com/api/auth/google/callback` (your actual Render URL)

5. Click "**Save Changes**"
6. Render will automatically redeploy (wait 2-3 minutes)

---

## Step 4: Update Google OAuth Settings

### 4.1 Go to Google Cloud Console
1. Visit: https://console.cloud.google.com/apis/credentials
2. Find your OAuth 2.0 Client ID: `836873570554-9shbb2t4j52gsmrqbbsbskdr1gim73s1.apps.googleusercontent.com`
3. Click on it to edit

### 4.2 Add Production URLs

**Authorized JavaScript origins:**
Add these (keep existing localhost URLs for local development):
```
https://bird-submissions-xyz.vercel.app
```
(Replace with your actual Vercel URL)

**Authorized redirect URIs:**
Add these (keep existing localhost URLs for local development):
```
https://bird-tracker-backend.onrender.com/api/auth/google/callback
```
(Replace with your actual Render URL)

4. Click "**Save**"

---

## Step 5: Test Production Deployment

### 5.1 Test the App
1. Visit your Vercel URL: `https://bird-submissions-xyz.vercel.app`
2. Click "**Sign in with Google**"
3. Authorize the app
4. Select a region
5. Select some birds (up to 31)
6. Click "**Submit**"
7. Check your Google Sheet for the submission

### 5.2 Test "Already Submitted" Feature
1. Log out
2. Log back in with the same Google account
3. Select the same region
4. The birds you submitted should be greyed out with "Already Submitted" badge
5. Try to submit different birds

---

## Step 6: Custom Domain (Optional)

### For Vercel (Frontend):
1. In Vercel dashboard, go to your project
2. Click "**Settings**" → "**Domains**"
3. Add your custom domain (e.g., `birdtracker.com`)
4. Follow DNS configuration instructions
5. Update Google OAuth settings with new domain

### For Render (Backend):
1. In Render dashboard, go to your service
2. Click "**Settings**" → "**Custom Domain**"
3. Add your custom domain (e.g., `api.birdtracker.com`)
4. Follow DNS configuration instructions
5. Update `FRONTEND_URL` in Render environment variables
6. Update Google OAuth redirect URI

---

## Troubleshooting

### Backend won't start
- ✅ Check Render logs for errors
- ✅ Verify all environment variables are set
- ✅ Ensure `Bird Species Database.xlsx` is in repository
- ✅ Check `BIRD_DATABASE_PATH=./Bird Species Database.xlsx`

### Frontend can't connect to backend
- ✅ Check `REACT_APP_API_URL` in Vercel
- ✅ Verify backend is running (visit `/health` endpoint)
- ✅ Check browser console for CORS errors
- ✅ Ensure `FRONTEND_URL` in Render matches Vercel URL exactly

### Google OAuth errors
- ✅ Check redirect URIs in Google Console
- ✅ Ensure URLs match exactly (no trailing slashes)
- ✅ Verify `GOOGLE_REDIRECT_URI` in Render
- ✅ Check `GOOGLE_CLIENT_ID` in both Render and Vercel

### Birds not loading
- ✅ Check backend logs in Render
- ✅ Verify Excel file is in repository
- ✅ Check Excel file has correct sheet names
- ✅ Test API endpoint: `https://YOUR_RENDER_URL/api/regions`

### Submissions not saving
- ✅ Check Google Sheets has "Bird Submissions" sheet
- ✅ Verify service account has edit access to the sheet
- ✅ Check `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` has `\n` escaped correctly
- ✅ Check backend logs for Google Sheets API errors

---

## Monitoring & Maintenance

### Check Logs
**Render:**
- Dashboard → Your service → "Logs" tab
- Real-time log streaming

**Vercel:**
- Dashboard → Your project → "Logs" tab
- Function logs for serverless requests

### Update Bird Database
1. Edit `Bird Species Database.xlsx` locally
2. Commit and push to GitHub:
   ```bash
   git add "Bird Species Database.xlsx"
   git commit -m "Update bird database"
   git push
   ```
3. Render auto-deploys on push

### Check Uptime
- Render Free tier: App sleeps after 15 min of inactivity
- First request after sleep: 30-60 seconds to wake up
- Upgrade to paid tier for 24/7 uptime

---

## Success Checklist

- [ ] Backend deployed to Render
- [ ] Frontend deployed to Vercel
- [ ] Environment variables configured on both platforms
- [ ] Google OAuth updated with production URLs
- [ ] Tested sign-in flow
- [ ] Tested bird selection and submission
- [ ] Verified birds are greyed out after submission
- [ ] Checked Google Sheets for submission data
- [ ] Shared app URL with users

---

## 🎉 You're Live!

Your app is now deployed and accessible at:
- **Frontend**: `https://YOUR_VERCEL_URL.vercel.app`
- **Backend**: `https://YOUR_RENDER_URL.onrender.com`

Share the frontend URL with your users and start tracking birds! 🦅

---

## Need Help?

- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- GitHub Repo: `bird_submissions`
- Project Status: `PROJECT_STATUS.md`
