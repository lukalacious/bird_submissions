# Quick Start Guide

Follow these steps to get your Bird Submission App running locally.

## Prerequisites Checklist

- [ ] Node.js installed (v18+)
- [ ] Google Cloud account
- [ ] Excel file with bird data ([Bird Species Database.xlsx](Bird%20Species%20Database.xlsx))

## Setup in 5 Steps

### Step 1: Google Cloud Setup (10 minutes)

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Click "New Project" → Name it → Create

2. **Enable APIs**
   - Navigate to "APIs & Services" → "Library"
   - Enable: **Google+ API** and **Google Sheets API**

3. **Create OAuth Credentials**
   - Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
   - Application type: Web application
   - Authorized redirect URI: `http://localhost:5000/api/auth/google/callback`
   - Save **Client ID** and **Client Secret**

4. **Create Service Account**
   - "Credentials" → "Create Credentials" → "Service Account"
   - Name it → Create
   - Go to Keys tab → Add Key → Create new key (JSON)
   - Download and save the JSON file

5. **Create Google Sheet**
   - Create new sheet named "Bird Submissions"
   - Share with service account email (from JSON: `client_email`)
   - Give **Editor** access
   - Copy Spreadsheet ID from URL

### Step 2: Backend Setup (5 minutes)

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your Google Cloud credentials:
- Paste Google OAuth Client ID and Secret
- Paste Service Account email and private key (from JSON)
- Paste Spreadsheet ID
- Generate JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Start backend:
```bash
npm run dev
```

✅ Verify at http://localhost:5000/health

### Step 3: Frontend Setup (5 minutes)

```bash
cd ../frontend
npm install
cp .env.example .env
```

Edit `.env`:
- Set `REACT_APP_GOOGLE_CLIENT_ID` to your OAuth Client ID

Start frontend:
```bash
npm start
```

✅ Browser opens to http://localhost:3000

### Step 4: Test the App (2 minutes)

1. Click "Sign in with Google"
2. Authorize the app
3. Select region "South Africa"
4. Check a few bird checkboxes
5. Click "Submit X Bird(s)"
6. Verify submission appears in your Google Sheet!

### Step 5: Test Permanent Greying Out (2 minutes)

1. Go back to region selection
2. Select "South Africa" again
3. Verify previously submitted birds are greyed out with "Already Submitted" badge
4. Select different birds
5. Submit again

## Common Issues

### npm Install Fails
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

### OAuth Redirect Error
- Check redirect URI in `.env` matches Google Cloud Console exactly
- Must include `http://localhost:5000/api/auth/google/callback`

### Google Sheets Permission Denied
- Share sheet with service account email
- Must give **Editor** access, not Viewer

### Backend Can't Read Excel File
- Check `BIRD_DATABASE_PATH` in backend `.env`
- Use absolute path: `/Users/lukeroberts/Documents/code/projects/birds/Bird Species Database.xlsx`

## Next Steps

### Add a New Region

1. Open Excel file
2. Create new sheet (e.g., "Kenya")
3. Add columns: Common Name, Scientific Name, Status
4. Add bird rows
5. Save file
6. Restart backend: `npm run dev`

### Deploy to Production

See [README.md](README.md#deployment) for deployment instructions.

## File Structure Summary

```
birds/
├── backend/
│   ├── src/
│   │   ├── services/excelReader.service.js    # Reads Excel file
│   │   ├── services/googleSheets.service.js   # Writes to Sheets
│   │   ├── services/submission.service.js     # Business logic
│   │   └── server.js                          # Start here
│   └── .env                                    # Your secrets
│
├── frontend/
│   ├── src/
│   │   ├── pages/                             # 4 pages: Login, Region, Submit, Success
│   │   ├── contexts/                          # Auth & Bird state
│   │   └── App.jsx                            # Main app
│   └── .env                                    # Frontend config
│
└── Bird Species Database.xlsx                  # Your bird data
```

## Support

Questions? Check the full [README.md](README.md) or review:
- Backend logs in terminal
- Frontend console (F12 in browser)
- Google Sheet for submission data

Happy bird tracking! 🐦
