# Bird Submission Web Application

A full-stack web application for tracking monthly bird sightings. Users can log in with Google, select their region, and submit up to 31 birds per submission. Previously submitted birds are permanently greyed out to prevent resubmission.

## Features

- ✅ Google OAuth authentication (no password management)
- ✅ Multi-region support (regions defined by Excel sheets)
- ✅ Select up to 31 birds per submission via user-friendly checkboxes
- ✅ Previously submitted birds are permanently greyed out
- ✅ Submissions saved to Google Sheets with user information
- ✅ Real-time validation (31-bird limit, duplicate prevention)
- ✅ Editable bird database (update Excel file, restart server)
- ✅ Responsive design for desktop and mobile

## Tech Stack

### Backend
- Node.js + Express
- Google OAuth 2.0 + JWT
- Google Sheets API
- Excel file parsing (xlsx library)

### Frontend
- React 18
- React Router 6
- Axios for API calls
- Context API for state management

## Project Structure

```
birds/
├── backend/              # Node.js/Express API
│   ├── src/
│   │   ├── config/       # OAuth, Sheets, database config
│   │   ├── controllers/  # Request handlers
│   │   ├── middleware/   # Auth, error handling
│   │   ├── routes/       # API routes
│   │   ├── services/     # Business logic
│   │   ├── app.js        # Express setup
│   │   └── server.js     # Server entry
│   └── package.json
│
├── frontend/             # React SPA
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── contexts/     # Auth & Bird contexts
│   │   ├── services/     # API services
│   │   └── App.jsx       # Main app
│   └── package.json
│
├── Bird Species Database.xlsx  # Bird data source
└── README.md             # This file
```

## Setup Instructions

### Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Google Cloud account
- Google Sheet for storing submissions

### Step 1: Google Cloud Setup

#### 1.1 Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Bird Submission App")

#### 1.2 Enable Required APIs
1. In the sidebar, go to "APIs & Services" → "Library"
2. Search and enable:
   - Google+ API (for OAuth)
   - Google Sheets API

#### 1.3 Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth 2.0 Client ID"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - (Later add production URL)
5. Save the **Client ID** and **Client Secret**

#### 1.4 Create Service Account
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Give it a name (e.g., "bird-sheets-writer")
4. Click "Create and Continue"
5. Skip optional fields, click "Done"
6. Click on the service account name
7. Go to "Keys" tab → "Add Key" → "Create new key" → JSON
8. Download the JSON key file
9. Save the **client_email** and **private_key** for later

### Step 2: Google Sheets Setup

1. Create a new Google Sheet
2. Name it "Bird Submissions" (or your preference)
3. Share it with your service account email (from Step 1.4) with **Editor** access
4. Copy the **Spreadsheet ID** from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`

### Step 3: Backend Setup

#### 3.1 Install Dependencies

```bash
cd backend
npm install
```

**Note:** If you encounter npm cache permission errors, try:
```bash
npm cache clean --force
npm install --legacy-peer-deps
```

#### 3.2 Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Google OAuth (from Step 1.3)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# JWT (generate a random secret)
JWT_SECRET=your_random_256bit_secret
JWT_EXPIRES_IN=7d

# Google Sheets (from Step 1.4 and Step 2)
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Excel Database
BIRD_DATABASE_PATH=/Users/lukeroberts/Documents/code/projects/birds/Bird Species Database.xlsx
```

**Generate JWT Secret:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### 3.3 Start Backend Server

```bash
npm run dev
```

The server will start on `http://localhost:5000`

Verify it's working:
```bash
curl http://localhost:5000/health
```

### Step 4: Frontend Setup

#### 4.1 Install Dependencies

```bash
cd ../frontend
npm install
```

#### 4.2 Configure Environment Variables

Create a `.env` file in the `frontend` directory:

```bash
cp .env.example .env
```

Edit `.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

#### 4.3 Start Frontend Development Server

```bash
npm start
```

The app will open in your browser at `http://localhost:3000`

## Usage

### Testing the Application

1. **Login**: Click "Sign in with Google" on the login page
2. **Select Region**: Choose your region (e.g., "South Africa")
3. **Select Birds**: Check up to 31 birds using the checkbox interface
   - Previously submitted birds will be greyed out
   - Counter shows "X/31 birds selected"
4. **Submit**: Click "Submit X Bird(s)" button
5. **Success**: View confirmation and submit more birds if desired

### Testing with Multiple Users

1. Open the app in Chrome
2. Open an incognito window
3. Log in with a different Google account
4. Verify that each user has separate submission tracking

## Managing Bird Database

### Adding a New Region

1. Open [Bird Species Database.xlsx](Bird%20Species%20Database.xlsx)
2. Create a new sheet (e.g., "Kenya")
3. Add columns: **Common Name**, **Scientific Name**, **Status**
4. Add bird data
5. Save the file
6. Restart the backend server

### Adding Birds to Existing Region

1. Open the Excel file
2. Navigate to the region's sheet
3. Add new rows with bird data
4. Save the file
5. Restart the backend server

### Refreshing Database Without Restart (Optional)

Make a POST request to:
```bash
curl -X POST http://localhost:5000/api/regions/refresh
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Get current user (protected)

### Regions
- `GET /api/regions` - Get all regions
- `POST /api/regions/refresh` - Refresh bird database

### Birds
- `GET /api/birds?region={region}` - Get birds with disabled flags (protected)
- `GET /api/birds/stats?region={region}` - Get user stats (protected)

### Submissions
- `POST /api/submissions` - Submit birds (protected)
  ```json
  {
    "region": "South Africa",
    "birds": ["Common Ostrich", "Egyptian Goose", ...]
  }
  ```
- `GET /api/submissions/history?region={region}` - Get submission history (protected)

## Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Create a new app on your platform
2. Add environment variables (same as `.env`)
3. Update `GOOGLE_REDIRECT_URI` to production URL:
   - `https://your-backend-url.com/api/auth/google/callback`
4. Update this in Google Cloud Console OAuth settings
5. Deploy the `backend` folder

### Frontend Deployment (Vercel/Netlify)

1. Create a new site/project
2. Set build command: `npm run build`
3. Set publish directory: `build`
4. Add environment variables:
   - `REACT_APP_API_URL=https://your-backend-url.com/api`
   - `REACT_APP_GOOGLE_CLIENT_ID=your_client_id`
5. Deploy the `frontend` folder

## Troubleshooting

### npm Permission Errors

If you see EACCES errors during `npm install`:

```bash
# Option 1: Clean cache
npm cache clean --force

# Option 2: Use legacy peer deps
npm install --legacy-peer-deps

# Option 3: Fix permissions (macOS/Linux)
sudo chown -R $USER:$GROUP ~/.npm
```

### Google OAuth Errors

**Error: redirect_uri_mismatch**
- Ensure the redirect URI in `.env` exactly matches what's in Google Cloud Console
- Include `http://` or `https://`

**Error: access_denied**
- Check that Google+ API is enabled
- Verify OAuth consent screen is configured

### Google Sheets Errors

**Error: Permission denied**
- Ensure the Google Sheet is shared with your service account email
- Give Editor access, not just Viewer

**Error: Spreadsheet not found**
- Verify `GOOGLE_SHEETS_SPREADSHEET_ID` is correct
- Check that Google Sheets API is enabled

### Backend Won't Start

**Error: Failed to load bird database**
- Check that `BIRD_DATABASE_PATH` points to the correct Excel file
- Verify the file exists and is readable

## Future Enhancements

- [ ] Admin dashboard for viewing all submissions
- [ ] Monthly leaderboards
- [ ] Bird photos in the UI
- [ ] Email confirmation after submission
- [ ] Export submission history to CSV
- [ ] Monthly reset option (add month/year tracking)
- [ ] Mobile app (React Native)
- [ ] Dark mode

## License

This project is for personal use.

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend logs: `backend/` console output
3. Review frontend console: Browser DevTools
4. Check Google Sheets for submission data

## Contributors

Built for bird enthusiasts who want to track their monthly sightings!
