# Bird Submission API - Backend

Backend API for the Bird Submission web application.

## Setup Instructions

### 1. Install Dependencies

Due to npm cache issues, you may need to run:

```bash
cd backend
npm install
```

If you encounter permission errors, try:
- Clear npm cache: `npm cache clean --force`
- Or install with: `npm install --legacy-peer-deps`

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required environment variables:
- `GOOGLE_CLIENT_ID` - From Google Cloud Console OAuth credentials
- `GOOGLE_CLIENT_SECRET` - From Google Cloud Console OAuth credentials
- `GOOGLE_SHEETS_SPREADSHEET_ID` - ID of your Google Sheet for submissions
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` - Service account email
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` - Service account private key (keep the \n characters)
- `JWT_SECRET` - Random secret string for JWT signing
- `BIRD_DATABASE_PATH` - Path to your Excel file (defaults to ../Bird Species Database.xlsx)

### 3. Google Cloud Setup

#### OAuth 2.0 Credentials
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable "Google+ API"
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - Add production URL later
7. Copy Client ID and Client Secret to `.env`

#### Service Account
1. In Google Cloud Console → "Credentials" → "Create Credentials" → "Service Account"
2. Give it a name and create
3. Click on the service account → "Keys" → "Add Key" → "Create new key" → JSON
4. Download the JSON file
5. Copy `client_email` to `GOOGLE_SERVICE_ACCOUNT_EMAIL` in `.env`
6. Copy `private_key` to `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` in `.env` (keep quotes and \n)

#### Google Sheets API
1. In Google Cloud Console → "APIs & Services" → "Library"
2. Search for "Google Sheets API"
3. Click "Enable"
4. Create a new Google Sheet named "Bird Submissions"
5. Share the sheet with your service account email (Editor access)
6. Copy the Spreadsheet ID from the URL to `.env`

### 4. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:5000`

### 5. Test the API

Health check:
```bash
curl http://localhost:5000/health
```

Get regions:
```bash
curl http://localhost:5000/api/regions
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth login
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/me` - Get current user (protected)
- `POST /api/auth/logout` - Logout (protected)

### Regions
- `GET /api/regions` - Get all available regions
- `POST /api/regions/refresh` - Refresh bird database from Excel

### Birds
- `GET /api/birds?region={region}` - Get birds for region with disabled flags (protected)
- `GET /api/birds/stats?region={region}` - Get user stats (protected)

### Submissions
- `POST /api/submissions` - Submit birds (protected)
  - Body: `{ region: string, birds: string[] }`
- `GET /api/submissions/history?region={region}` - Get submission history (protected)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── app.js          # Express app setup
│   └── server.js       # Server entry point
├── .env                # Environment variables (create this)
├── .env.example        # Example env file
└── package.json        # Dependencies
```

## Troubleshooting

### Excel File Not Found
Make sure the `BIRD_DATABASE_PATH` in `.env` points to the correct location of your Excel file.

### Google Sheets Permission Denied
Make sure you've shared the Google Sheet with your service account email.

### OAuth Redirect Mismatch
Make sure the redirect URI in Google Cloud Console exactly matches `GOOGLE_REDIRECT_URI` in `.env`.

### JWT Token Issues
Generate a strong random secret for `JWT_SECRET`. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
