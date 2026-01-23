# Bird Submission Tracker - Complete Application Replication Prompt

## Project Overview

Build a full-stack web application that allows users to track bird submissions by region. Users authenticate with Google OAuth, select a region (South Africa or Northeast Europe), choose up to 31 birds per submission, and have their submissions permanently recorded. Previously submitted birds are permanently greyed out and cannot be resubmitted for that region.

**Key Differentiator**: This is NOT a monthly challenge app. Once a user submits a bird for a region, it's permanently marked as submitted and cannot be selected again.

---

## Technical Stack

### Backend Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "passport": "^0.6.0",
    "passport-google-oauth20": "^2.0.0",
    "jsonwebtoken": "^9.0.0",
    "googleapis": "^118.0.0",
    "xlsx": "^0.18.5"
  }
}
```

### Frontend Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.11.0",
    "axios": "^1.4.0",
    "jwt-decode": "^3.1.2"
  }
}
```

---

## Architecture

### Folder Structure
```
bird-submission-tracker/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── google-oauth.js       # Passport OAuth configuration
│   │   │   ├── google-sheets.js      # Google Sheets client setup
│   │   │   └── database.js           # Excel file path config
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── birds.controller.js
│   │   │   ├── regions.controller.js
│   │   │   └── submissions.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.js               # JWT verification middleware
│   │   │   └── errorHandler.js       # Global error handler
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── birds.routes.js
│   │   │   ├── regions.routes.js
│   │   │   └── submissions.routes.js
│   │   ├── services/
│   │   │   ├── excelReader.service.js    # Reads bird database
│   │   │   ├── googleSheets.service.js   # Manages submissions
│   │   │   └── submission.service.js     # Business logic
│   │   ├── app.js                    # Express app setup
│   │   └── server.js                 # Server entry point
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── ruddy.jpg                 # Featured bird image
│   ├── src/
│   │   ├── components/
│   │   │   └── BirdList/
│   │   │       ├── BirdList.jsx
│   │   │       ├── BirdList.css
│   │   │       ├── BirdCheckbox.jsx
│   │   │       └── BirdCheckbox.css
│   │   ├── contexts/
│   │   │   ├── AuthContext.jsx       # Auth state management
│   │   │   └── BirdContext.jsx       # Bird selection state
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── LoginPage.css
│   │   │   ├── RegionSelectionPage.jsx
│   │   │   ├── RegionSelectionPage.css
│   │   │   ├── BirdSubmissionPage.jsx
│   │   │   ├── BirdSubmissionPage.css
│   │   │   ├── SuccessPage.jsx
│   │   │   └── SuccessPage.css
│   │   ├── services/
│   │   │   ├── api.js                # Axios instance with interceptors
│   │   │   ├── authService.js
│   │   │   └── birdService.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   └── package.json
│
└── Bird Species Database.xlsx        # Bird data source
```

---

## Data Model

### Excel Bird Database Structure

**File**: `Bird Species Database.xlsx`

**Sheet Structure**: Each sheet represents one region
- Sheet 1: `south_africa` (876 birds)
- Sheet 2: `northeast_europe` (16 birds)

**Columns** (exact names):
- `Alphabetical Name` - Alphabetical sorting name
- `Full  Name ` or `Full Name` - Display name (handle both with/without extra spaces)
- `Scientific Name` - Latin scientific name

**Data Transformation**:
```javascript
{
  id: "south_africa-1",              // Generated: region-index
  alphabeticalName: "Albatross, Amsterdam",
  fullName: "Amsterdam Albatross",    // Trimmed
  scientificName: "Diomedea amsterdamensis",
  region: "south_africa"
}
```

### Google Sheets Submission Storage

**Sheet Name**: `Bird Submissions`

**Columns** (A:AJ = 36 columns):
```
A: Timestamp (ISO format)
B: UserId (Google OAuth ID)
C: Email
D: UserName
E: Region
F-AJ: Bird1, Bird2, Bird3, ..., Bird31 (31 columns for bird names)
```

**Example Row**:
```
2025-01-21T14:30:00.000Z | google-id-123 | user@gmail.com | John Doe | south_africa | Common Ostrich | Egyptian Goose | ... | [empty] | [empty]
```

**Important**: Always write 36 columns. Fill unused bird columns with empty strings.

---

## Authentication Flow

### Complete OAuth Implementation

#### 1. Frontend Initiates Login
```javascript
// LoginPage.jsx
const handleGoogleLogin = () => {
  window.location.href = 'http://localhost:5000/api/auth/google';
};
```

#### 2. Backend OAuth Configuration
```javascript
// backend/src/config/google-oauth.js
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const jwt = require('jsonwebtoken');

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_REDIRECT_URI // http://localhost:5000/api/auth/google/callback
    },
    (accessToken, refreshToken, profile, done) => {
      const user = {
        userId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        picture: profile.photos[0]?.value || null
      };

      // Generate JWT with 7-day expiry
      const token = jwt.sign(user, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });

      return done(null, { token, user });
    }
  )
);
```

#### 3. OAuth Routes
```javascript
// backend/src/routes/auth.routes.js
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false
}));

router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  (req, res) => {
    const { token, user } = req.user;
    const encodedName = encodeURIComponent(user.name);
    res.redirect(`${process.env.FRONTEND_URL}?token=${token}&name=${encodedName}`);
  }
);
```

#### 4. Frontend Receives Token
```javascript
// LoginPage.jsx
useEffect(() => {
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get('token');

  if (token) {
    // Decode JWT to get user data
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };

    // Store in context and localStorage
    login(token, userData);

    // Clear URL params
    window.history.replaceState({}, document.title, '/');

    // Navigate to region selection
    navigate('/region');
  }
}, []);
```

#### 5. JWT Middleware Protection
```javascript
// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user; // Attach to request
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}
```

#### 6. Axios Request Interceptor
```javascript
// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api'
});

// Add token to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401/403
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export default api;
```

---

## Core Features

### Feature 1: User Flow

**Step 1: Login Page**
- URL: `/`
- Purple gradient background (#667eea to #764ba2)
- Title: "Bird Submission Tracker"
- Subtitle: "Track the birds you've spotted each month"
- 4 feature cards in 2x2 grid
- Google sign-in button with Google favicon
- Featured bird image at bottom (Ruddy Turnstone)

**Step 2: Region Selection**
- URL: `/region` (protected)
- Header: User name + logout button
- Grid of region cards (responsive: `repeat(auto-fit, minmax(250px, 1fr))`)
- Each card shows formatted region name ("South Africa" not "south_africa")
- Click navigates to `/submit`

**Step 3: Bird Submission**
- URL: `/submit` (protected)
- Header: Region name, user name, "Change Region" button
- Counter: "X / 31 birds selected"
- Warning when limit reached (red banner)
- Submit and Clear buttons at TOP and BOTTOM
- Bird grid with checkboxes
- Birds previously submitted are greyed with "Already Submitted" badge

**Step 4: Success Page**
- URL: `/success` (protected)
- Green checkmark icon
- "Submission Successful!" message
- Count of birds submitted
- "Submit More Birds" button (back to same region)
- "Done" button (back to region selection)

### Feature 2: Multi-Region Support

**Implementation**:
- Excel sheets become regions automatically
- User submissions are scoped to region
- Previously submitted birds tracked per region
- User can submit different birds in different regions

**Region Name Formatting**:
```javascript
const formatRegionName = (regionName) => {
  return regionName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
// "south_africa" → "South Africa"
// "northeast_europe" → "Northeast Europe"
```

### Feature 3: Bird Selection with Limits

**Rules**:
1. Maximum 31 birds per submission
2. Cannot submit empty selection
3. Cannot submit duplicates
4. Cannot resubmit previously submitted birds
5. All birds must exist in selected region

**Visual States**:
1. **Default**: White background, grey border
2. **Selected**: Light blue background (#f0f4ff), purple border (#667eea, 3px)
3. **Previously Submitted**: Grey background, disabled, "Already Submitted" badge, no interaction
4. **Limit Reached**: Opacity 0.6, disabled (but can deselect selected birds)

**State Management with Set**:
```javascript
// BirdContext.jsx
const [selectedBirds, setSelectedBirds] = useState(new Set());

const toggleBird = (birdFullName) => {
  setSelectedBirds((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(birdFullName)) {
      newSet.delete(birdFullName); // Always allow deselection
    } else {
      if (newSet.size < 31) { // Only add if under limit
        newSet.add(birdFullName);
      }
    }
    return newSet;
  });
};

const canSelectMore = selectedBirds.size < 31;
```

**Why Set**: O(1) lookup for `selectedBirds.has(bird.fullName)` checks, automatic deduplication

### Feature 4: Permanent Bird Greying

**NOT Monthly Reset**: Once a bird is submitted for a region, it's permanently marked.

**Implementation**:
```javascript
// Backend: submission.service.js
async getBirdsForRegion(region, userId) {
  // Get ALL user submissions for this region (all time)
  const submittedBirds = await googleSheets.getUserSubmissions(userId, region);

  // Get all birds for region
  const birds = excelReader.getBirdsByRegion(region);

  // Mark submitted birds as disabled
  return birds.map(bird => ({
    ...bird,
    isDisabled: submittedBirds.includes(bird.fullName)
  }));
}
```

---

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/auth/google` | No | Initiates Google OAuth flow |
| GET | `/api/auth/google/callback` | No | OAuth callback, returns JWT in redirect |

### Region Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/regions` | No | Get all available regions |
| POST | `/api/regions/refresh` | No | Reload Excel file (hot reload) |

**Response Example**:
```json
{
  "regions": ["south_africa", "northeast_europe"]
}
```

### Bird Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/api/birds?region={region}` | Yes | Get birds for region with disabled flags |

**Response Example**:
```json
{
  "birds": [
    {
      "id": "south_africa-1",
      "alphabeticalName": "Albatross, Amsterdam",
      "fullName": "Amsterdam Albatross",
      "scientificName": "Diomedea amsterdamensis",
      "region": "south_africa",
      "isDisabled": true  // User already submitted this bird
    },
    {
      "id": "south_africa-2",
      "alphabeticalName": "Goose, Egyptian",
      "fullName": "Egyptian Goose",
      "scientificName": "Alopochen aegyptiaca",
      "region": "south_africa",
      "isDisabled": false  // Not submitted yet
    }
  ]
}
```

### Submission Endpoints

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/api/submissions` | Yes | Submit birds for a region |

**Request Body**:
```json
{
  "region": "south_africa",
  "birds": [
    "Egyptian Goose",
    "Common Ostrich",
    "Cape Sparrow"
  ]
}
```

**Response Example**:
```json
{
  "success": true,
  "submissionCount": 3,
  "message": "Successfully submitted 3 birds"
}
```

**Validation Errors**:
```json
{
  "success": false,
  "errors": [
    "Cannot submit more than 31 birds",
    "Already submitted: Egyptian Goose",
    "Invalid birds for region: Northern Cardinal"
  ]
}
```

---

## Frontend Components

### Component Hierarchy

```
App
├── AuthContext.Provider
│   └── BirdContext.Provider
│       ├── LoginPage (/)
│       ├── ProtectedRoute
│       │   ├── RegionSelectionPage (/region)
│       │   ├── BirdSubmissionPage (/submit)
│       │   │   └── BirdList
│       │   │       └── BirdCheckbox (repeated)
│       │   └── SuccessPage (/success)
```

### AuthContext Implementation

```javascript
// frontend/src/contexts/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored token on mount
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const decoded = jwtDecode(storedToken);
        const isExpired = decoded.exp * 1000 < Date.now();

        if (!isExpired) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      } catch (err) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }

    setLoading(false);
  }, []);

  const login = (newToken, userData) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
```

### BirdContext Implementation

```javascript
// frontend/src/contexts/BirdContext.jsx
import React, { createContext, useState, useContext } from 'react';

const BirdContext = createContext();
const MAX_BIRDS = 31;

export const BirdProvider = ({ children }) => {
  const [region, setRegion] = useState(null);
  const [birds, setBirds] = useState([]);
  const [selectedBirds, setSelectedBirds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const toggleBird = (birdFullName) => {
    setSelectedBirds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(birdFullName)) {
        newSet.delete(birdFullName);
      } else {
        if (newSet.size < MAX_BIRDS) {
          newSet.add(birdFullName);
        }
      }
      return newSet;
    });
  };

  const clearSelection = () => {
    setSelectedBirds(new Set());
  };

  const resetState = () => {
    setRegion(null);
    setBirds([]);
    setSelectedBirds(new Set());
    setError(null);
  };

  const value = {
    region,
    setRegion,
    birds,
    setBirds,
    selectedBirds,
    toggleBird,
    clearSelection,
    resetState,
    loading,
    setLoading,
    error,
    setError,
    canSelectMore: selectedBirds.size < MAX_BIRDS,
    selectedCount: selectedBirds.size,
    maxBirds: MAX_BIRDS
  };

  return <BirdContext.Provider value={value}>{children}</BirdContext.Provider>;
};

export const useBirds = () => useContext(BirdContext);
```

### Protected Route Pattern

```javascript
// App.jsx
import { useAuth } from './contexts/AuthContext';
import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
}

// Usage
<Route path="/region" element={
  <ProtectedRoute>
    <RegionSelectionPage />
  </ProtectedRoute>
} />
```

### BirdCheckbox Component

```javascript
// frontend/src/components/BirdList/BirdCheckbox.jsx
import React from 'react';
import './BirdCheckbox.css';

function BirdCheckbox({ bird, isSelected, onToggle, checkboxDisabled }) {
  const handleChange = () => {
    if (!bird.isDisabled && !checkboxDisabled) {
      onToggle(bird.fullName);
    }
  };

  return (
    <div
      className={`bird-checkbox ${isSelected ? 'selected' : ''} ${
        bird.isDisabled ? 'previously-submitted' : ''
      } ${checkboxDisabled && !bird.isDisabled ? 'limit-reached' : ''}`}
      onClick={handleChange}
    >
      <input
        type="checkbox"
        checked={isSelected}
        onChange={handleChange}
        disabled={bird.isDisabled || checkboxDisabled}
      />
      <div className="bird-info">
        <span className="common-name">{bird.fullName}</span>
        <span className="scientific-name">{bird.scientificName}</span>
        {bird.isDisabled && (
          <span className="submitted-badge">Already Submitted</span>
        )}
      </div>
    </div>
  );
}

export default BirdCheckbox;
```

---

## Styling & Design

### Color Palette

```css
/* Primary Colors */
--primary-purple: #667eea;
--secondary-purple: #764ba2;

/* State Colors */
--selected-bg: #f0f4ff;
--disabled-bg: #f3f4f6;
--disabled-border: #d1d5db;
--error-red: #ef4444;
--success-green: #10b981;

/* Text Colors */
--text-dark: #1f2937;
--text-medium: #6b7280;
--text-light: #9ca3af;

/* Badge Colors */
--badge-bg: #fef3c7;
--badge-text: #92400e;
```

### Typography

```css
/* Font Stack */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
  'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;

/* Sizes */
--text-xs: 0.75rem;
--text-sm: 0.875rem;
--text-base: 1rem;
--text-lg: 1.125rem;
--text-xl: 1.25rem;
--text-2xl: 1.5rem;
--text-3xl: 1.875rem;

/* Antialiasing */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### BirdCheckbox Styling

```css
/* BirdCheckbox.css */
.bird-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.bird-checkbox:hover:not(.previously-submitted):not(.limit-reached) {
  border-color: #667eea;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.1);
}

.bird-checkbox.selected {
  background: #f0f4ff;
  border-color: #667eea;
  border-width: 3px;
}

.bird-checkbox.previously-submitted {
  opacity: 0.5;
  background: #f3f4f6;
  border-color: #d1d5db;
  cursor: not-allowed;
  pointer-events: none;
}

.bird-checkbox.limit-reached:not(.previously-submitted) {
  opacity: 0.6;
  cursor: not-allowed;
}

.bird-checkbox input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: #667eea;
  flex-shrink: 0;
}

.bird-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.common-name {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.scientific-name {
  font-size: 0.875rem;
  font-style: italic;
  color: #6b7280;
}

.submitted-badge {
  display: inline-block;
  padding: 4px 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 4px;
  margin-top: 4px;
  width: fit-content;
}
```

### Grid Layouts

```css
/* Bird List Grid */
.bird-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  padding: 20px;
}

/* Region Cards Grid */
.region-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

/* Feature Cards Grid (Login Page) */
.features-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin-bottom: 30px;
}

@media (max-width: 600px) {
  .features-grid {
    grid-template-columns: 1fr;
  }
}
```

### Gradient Backgrounds

```css
/* Login Page */
.login-page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

/* Loading Screen */
.loading-screen {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
}
```

### Button Styles

```css
/* Primary Button (Submit) */
.submit-btn {
  background: #667eea;
  color: white;
  padding: 12px 30px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: #5568d3;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Secondary Button (Clear) */
.clear-btn {
  background: white;
  color: #667eea;
  padding: 12px 30px;
  border: 2px solid #667eea;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clear-btn:hover:not(:disabled) {
  background: #f0f4ff;
}

/* Google Sign-in Button */
.google-login-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  background: white;
  color: #1f2937;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.google-login-btn:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
  transform: translateY(-2px);
}

.google-icon {
  width: 20px;
  height: 20px;
}
```

### Loading Spinner

```css
.spinner {
  width: 50px;
  height: 50px;
  border: 4px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
```

---

## Environment Variables

### Backend `.env`

```env
# Server
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

# Google Sheets
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourPrivateKeyHere\n-----END PRIVATE KEY-----\n"

# Database
BIRD_DATABASE_PATH=../Bird Species Database.xlsx
```

### Frontend `.env`

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Application type: Web application
6. Authorized redirect URIs:
   - Development: `http://localhost:5000/api/auth/google/callback`
   - Production: `https://your-backend.onrender.com/api/auth/google/callback`

### Google Service Account Setup

1. In Google Cloud Console, go to IAM & Admin → Service Accounts
2. Create service account with name like "bird-tracker-sheets"
3. Create key → JSON format → Download
4. Extract `client_email` and `private_key` for `.env`
5. Create Google Sheet, share with service account email
6. Copy Sheet ID from URL: `docs.google.com/spreadsheets/d/{SHEET_ID}/edit`

---

## Backend Implementation Details

### Excel Reader Service (Singleton Pattern)

```javascript
// backend/src/services/excelReader.service.js
const XLSX = require('xlsx');
const path = require('path');

class ExcelReaderService {
  constructor() {
    this.birdData = null;
    this.regions = [];
    this.databasePath = path.resolve(__dirname, process.env.BIRD_DATABASE_PATH);
  }

  loadBirdDatabase() {
    try {
      const workbook = XLSX.readFile(this.databasePath);
      const birds = {};
      const regions = [];

      workbook.SheetNames.forEach((sheetName) => {
        regions.push(sheetName);
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet);

        birds[sheetName] = rawData.map((row, index) => ({
          id: `${sheetName.toLowerCase().replace(/\s+/g, '-')}-${index + 1}`,
          alphabeticalName: row['Alphabetical Name'] || '',
          fullName: (row['Full  Name '] || row['Full Name'] || '').trim(),
          scientificName: row['Scientific Name'] || '',
          region: sheetName
        }));
      });

      this.birdData = birds;
      this.regions = regions;
      console.log(`Loaded ${regions.length} regions with birds`);
    } catch (error) {
      console.error('Error loading bird database:', error);
      throw error;
    }
  }

  getRegions() {
    return this.regions;
  }

  getBirdsByRegion(region) {
    return this.birdData[region] || [];
  }

  getAllBirds() {
    return this.birdData;
  }

  refreshDatabase() {
    this.loadBirdDatabase();
  }
}

// Export singleton instance
module.exports = new ExcelReaderService();
```

### Google Sheets Service

```javascript
// backend/src/services/googleSheets.service.js
const { google } = require('googleapis');

class GoogleSheetsService {
  constructor() {
    this.sheets = null;
    this.auth = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  }

  async initialize() {
    const credentials = {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n')
    };

    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    this.sheets = google.sheets({ version: 'v4', auth: this.auth });

    // Initialize sheet with headers if needed
    await this.ensureHeadersExist();
  }

  async ensureHeadersExist() {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Bird Submissions!A1:AJ1'
      });

      if (!response.data.values || response.data.values.length === 0) {
        const headers = [
          'Timestamp',
          'UserId',
          'Email',
          'UserName',
          'Region',
          ...Array.from({ length: 31 }, (_, i) => `Bird${i + 1}`)
        ];

        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Bird Submissions!A1:AJ1',
          valueInputOption: 'RAW',
          resource: { values: [headers] }
        });
      }
    } catch (error) {
      console.error('Error ensuring headers exist:', error);
    }
  }

  async getAllSubmissions() {
    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: 'Bird Submissions!A:AJ'
    });

    return response.data.values || [];
  }

  async getUserSubmissions(userId, region) {
    const allSubmissions = await this.getAllSubmissions();

    // Filter by userId AND region (skip header row)
    const userSubmissions = allSubmissions.slice(1).filter(row => {
      return row[1] === userId && row[4] === region;
    });

    // Extract bird names from columns 5+ (F:AJ)
    const submittedBirds = userSubmissions.flatMap(row => {
      return row.slice(5).filter(bird => bird && bird.trim() !== '');
    });

    // Return unique bird names
    return [...new Set(submittedBirds)];
  }

  async addSubmission(submissionData) {
    const { userId, email, userName, region, birds } = submissionData;
    const timestamp = new Date().toISOString();

    // Create row with exactly 36 columns
    const row = [
      timestamp,
      userId,
      email,
      userName,
      region,
      ...birds,
      ...Array(31 - birds.length).fill('') // Fill remaining with empty strings
    ];

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: 'Bird Submissions!A:AJ',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: { values: [row] }
    });
  }
}

module.exports = new GoogleSheetsService();
```

### Submission Service with Validation

```javascript
// backend/src/services/submission.service.js
const googleSheets = require('./googleSheets.service');
const excelReader = require('./excelReader.service');

class SubmissionService {
  validateSubmission(birds, region, submittedBirds = []) {
    const errors = [];

    // 1. Check if empty
    if (!birds || birds.length === 0) {
      errors.push('No birds selected');
    }

    // 2. Check maximum limit
    if (birds.length > 31) {
      errors.push('Cannot submit more than 31 birds');
    }

    // 3. Check for duplicates in current submission
    const uniqueBirds = new Set(birds);
    if (uniqueBirds.size !== birds.length) {
      errors.push('Duplicate birds in submission');
    }

    // 4. Check if any birds were previously submitted
    const alreadySubmitted = birds.filter(bird => submittedBirds.includes(bird));
    if (alreadySubmitted.length > 0) {
      errors.push(`Already submitted: ${alreadySubmitted.join(', ')}`);
    }

    // 5. Verify birds exist in region
    const regionBirds = excelReader.getBirdsByRegion(region);
    const regionBirdNames = regionBirds.map(b => b.fullName);
    const invalidBirds = birds.filter(bird => !regionBirdNames.includes(bird));
    if (invalidBirds.length > 0) {
      errors.push(`Invalid birds for region ${region}: ${invalidBirds.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  async submitBirds(submissionData) {
    const { userId, email, userName, region, birds } = submissionData;

    // Get user's previous submissions for this region
    const submittedBirds = await googleSheets.getUserSubmissions(userId, region);

    // Validate submission
    const validation = this.validateSubmission(birds, region, submittedBirds);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Add to Google Sheets
    await googleSheets.addSubmission({
      userId,
      email,
      userName,
      region,
      birds
    });

    return {
      success: true,
      submissionCount: birds.length,
      message: `Successfully submitted ${birds.length} birds`
    };
  }

  async getBirdsForRegion(region, userId) {
    // Get previously submitted birds for this user and region
    const submittedBirds = await googleSheets.getUserSubmissions(userId, region);

    // Get all birds for the region
    const birds = excelReader.getBirdsByRegion(region);

    // Mark previously submitted birds as disabled
    return birds.map(bird => ({
      ...bird,
      isDisabled: submittedBirds.includes(bird.fullName)
    }));
  }
}

module.exports = new SubmissionService();
```

---

## Deployment

### Backend: Render

1. Create new Web Service on [Render](https://render.com)
2. Connect GitHub repository
3. Configure:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `node src/server.js`
   - **Plan**: Free
4. Add environment variables (all from backend `.env`)
5. Upload `Bird Species Database.xlsx` to root directory
6. Deploy

**Note**: Update `FRONTEND_URL` to Vercel URL after frontend deployment

### Frontend: Vercel

1. Create new project on [Vercel](https://vercel.com)
2. Connect GitHub repository
3. Configure:
   - **Root Directory**: `frontend`
   - **Framework**: Create React App
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
4. Add environment variables:
   - `REACT_APP_API_URL`: Your Render backend URL + `/api`
   - `REACT_APP_GOOGLE_CLIENT_ID`: Same as backend
5. Deploy

### Post-Deployment

1. Update Google OAuth redirect URIs:
   - Add: `https://your-backend.onrender.com/api/auth/google/callback`
2. Update backend `FRONTEND_URL` env var to Vercel URL
3. Test complete flow end-to-end

---

## Unique Implementation Details

### 1. Why Excel as Database?

**Pros**:
- Non-technical users can edit bird data
- Version control with Git
- No database hosting costs
- Supports multiple sheets = regions automatically

**Cons**:
- Must reload to see changes (use `/api/regions/refresh` endpoint)
- Limited to ~65k rows per sheet
- No relational queries

### 2. Why Google Sheets for Submissions?

**Pros**:
- Easy to view/export data in familiar format
- No database setup required
- Built-in sharing and permissions
- Service account = app-controlled writes

**Cons**:
- API rate limits (but fine for this use case)
- Not ideal for complex queries
- Requires service account setup

### 3. Why Set Data Structure for Selected Birds?

**Performance**: O(1) lookup time for `selectedBirds.has(bird.fullName)` checks vs O(n) for arrays

**Automatic Deduplication**: Sets prevent duplicate entries by design

**Example**:
```javascript
// Fast lookup
if (selectedBirds.has(bird.fullName)) {
  // Bird is selected
}

// vs Array (slower)
if (selectedBirds.includes(bird.fullName)) {
  // O(n) operation
}
```

### 4. Why JWT in URL Callback?

**Stateless Backend**: No session storage needed on server

**Client-Side Storage**: Token stored in localStorage, sent with all requests via Axios interceptor

**Alternative Approach**: Could use httpOnly cookies, but JWT + localStorage is simpler for this use case

### 5. Why Permanent Greying (Not Monthly Reset)?

**Design Decision**: User's goal is to track lifetime submissions, not monthly challenges

**Implementation**: No date filtering in `getUserSubmissions()` - returns all submissions for region

**To Add Monthly Reset**: Would need to add `submissionMonth` column to Google Sheets and filter by current month

### 6. Why Service Account vs User OAuth for Sheets?

**Service Account**:
- App writes on behalf of itself
- No user permission prompts
- More secure (private key server-side only)
- Single shared sheet with service account email

**User OAuth**:
- Would need to create sheet in user's Drive
- Requires additional OAuth scope
- More complex setup

### 7. Three-Tier Checkbox State Logic

**Layer 1: Previously Submitted** (from API)
```javascript
bird.isDisabled = true // From backend, permanent
```

**Layer 2: Currently Selected** (local state)
```javascript
isSelected = selectedBirds.has(bird.fullName)
```

**Layer 3: Limit Reached** (computed)
```javascript
checkboxDisabled = bird.isDisabled || (!isSelected && !canSelectMore)
```

**Visual Priority**: previously-submitted > selected > limit-reached > default

### 8. Why Axios Interceptors?

**Auto Token Injection**:
```javascript
// Don't need to manually add token to every API call
api.get('/birds?region=south_africa'); // Token automatically added
```

**Auto Logout on Auth Errors**:
```javascript
// Automatically clear token and redirect on 401/403
// No need to handle in every component
```

### 9. Why Singleton Services in Backend?

**Memory Efficiency**: Single instance of bird data cached in memory

**Consistency**: All requests use same data instance

**Example**:
```javascript
// Export instance, not class
module.exports = new ExcelReaderService();

// Usage: just require and use
const excelReader = require('./services/excelReader.service');
excelReader.getBirdsByRegion('south_africa');
```

---

## Implementation Order (Recommended)

### Phase 1: Backend Setup (2-3 hours)
1. Initialize Express server with CORS
2. Set up Google OAuth config with Passport
3. Create JWT middleware
4. Implement Excel reader service
5. Test loading bird data

### Phase 2: Google Sheets Integration (1-2 hours)
1. Set up service account credentials
2. Implement Google Sheets service
3. Create sheet initialization (headers)
4. Test read/write operations

### Phase 3: Backend API Endpoints (2-3 hours)
1. Auth routes (Google OAuth)
2. Region routes (get regions, refresh)
3. Bird routes (get birds with disabled flags)
4. Submission routes (submit with validation)
5. Test all endpoints with Postman

### Phase 4: Frontend Auth Flow (2-3 hours)
1. Create React app with routing
2. Implement AuthContext
3. Build LoginPage with Google sign-in
4. Handle OAuth callback and token storage
5. Create ProtectedRoute component
6. Test auth flow end-to-end

### Phase 5: Frontend Core Features (3-4 hours)
1. Implement BirdContext
2. Create RegionSelectionPage
3. Build BirdSubmissionPage with counter
4. Implement BirdList and BirdCheckbox components
5. Add SuccessPage
6. Test full user flow

### Phase 6: Styling & Polish (2-3 hours)
1. Apply purple gradient theme
2. Style all four checkbox states
3. Add loading spinners
4. Implement error messages
5. Make responsive (mobile-friendly)
6. Add Ruddy Turnstone featured image

### Phase 7: Testing & Deployment (1-2 hours)
1. Test all validation rules
2. Test multi-region flow
3. Test permanent greying
4. Deploy backend to Render
5. Deploy frontend to Vercel
6. Update Google OAuth redirect URIs
7. Test production deployment

**Total Estimated Time**: 13-20 hours for complete implementation

---

## Testing Checklist

### Authentication
- [ ] Google sign-in redirects correctly
- [ ] JWT token stored in localStorage
- [ ] Token automatically added to API requests
- [ ] Protected routes redirect to login when not authenticated
- [ ] Logout clears token and redirects to login
- [ ] Expired token triggers auto-logout

### Region Selection
- [ ] All regions load from Excel sheets
- [ ] Region names formatted correctly (Title Case)
- [ ] Clicking region navigates to submission page
- [ ] Change Region button returns to region selection

### Bird Selection
- [ ] All birds load for selected region
- [ ] Previously submitted birds are greyed out
- [ ] Previously submitted birds cannot be clicked
- [ ] Counter shows correct selection count
- [ ] Cannot select more than 31 birds
- [ ] Warning appears when limit reached
- [ ] Can deselect birds after limit reached
- [ ] Selected birds show blue background
- [ ] Clear button resets selection

### Submission
- [ ] Cannot submit empty selection
- [ ] Cannot submit more than 31 birds
- [ ] Cannot submit duplicates
- [ ] Cannot submit previously submitted birds
- [ ] Cannot submit birds not in region
- [ ] Success page shows correct count
- [ ] Submission appears in Google Sheets
- [ ] Submitted birds become greyed out
- [ ] Submit More returns to same region
- [ ] Done returns to region selection

### Multi-Region
- [ ] Each region has independent bird list
- [ ] Submissions in one region don't affect another
- [ ] Previously submitted birds tracked per region
- [ ] User can submit different birds in different regions

### Visual
- [ ] Purple gradient backgrounds display correctly
- [ ] All buttons have hover effects
- [ ] Loading spinners show during API calls
- [ ] Error messages display when API fails
- [ ] Responsive on mobile devices
- [ ] Featured bird image loads on login page

---

## Common Issues & Solutions

### Issue: OAuth redirect_uri_mismatch
**Cause**: Google OAuth redirect URI doesn't match configured URI

**Solution**: Ensure exact match in Google Cloud Console:
- Development: `http://localhost:5000/api/auth/google/callback`
- Production: `https://your-backend.onrender.com/api/auth/google/callback`

### Issue: Google Sheets API 403 Forbidden
**Cause**: Sheet not shared with service account

**Solution**: Share sheet with service account email (found in `.env`)

### Issue: Excel file not found
**Cause**: Incorrect path in `BIRD_DATABASE_PATH`

**Solution**: Use relative path from backend/src: `../../Bird Species Database.xlsx`

### Issue: Previously submitted birds not greying out
**Cause**: Using `commonName` instead of `fullName`

**Solution**: Ensure all code uses `bird.fullName` consistently

### Issue: Token not persisting after refresh
**Cause**: Token not stored in localStorage

**Solution**: Check AuthContext stores token on login:
```javascript
localStorage.setItem('token', newToken);
```

### Issue: CORS errors
**Cause**: Frontend and backend on different origins

**Solution**: Add CORS middleware in backend:
```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

---

## Future Enhancements (Not Included)

1. **Monthly Reset**: Add date filtering to reset greyed birds each month
2. **Submission History**: View past submissions on a dedicated page
3. **Search/Filter Birds**: Add search bar to filter bird list
4. **Bird Details**: Click bird to see detailed info (habitat, images)
5. **Admin Dashboard**: Manage users, view stats, export data
6. **Email Notifications**: Send confirmation email after submission
7. **Social Sharing**: Share submission count on social media
8. **Leaderboards**: Show top contributors by region
9. **Mobile App**: React Native version
10. **Offline Support**: PWA with service workers

---

## Summary

This prompt provides everything needed to replicate the Bird Submission Tracker application:

✅ Complete technical stack with versions
✅ Exact folder structure and file organization
✅ Detailed data models (Excel + Google Sheets)
✅ Step-by-step authentication flow with OAuth + JWT
✅ Full API specification with request/response examples
✅ Component hierarchy and state management patterns
✅ Exact color values, CSS, and design specifications
✅ Backend services with singleton pattern
✅ Validation rules and error handling
✅ Deployment instructions for Render + Vercel
✅ Implementation order and time estimates
✅ Testing checklist and common issues

**Key Architectural Decisions**:
- Excel for bird database (easy editing, version control)
- Google Sheets for submissions (easy export, no DB hosting)
- JWT over sessions (stateless backend)
- Set for selected birds (O(1) lookups)
- Permanent greying (lifetime tracking, not monthly reset)
- Service account (app-controlled writes)

The application is production-ready with proper authentication, validation, error handling, and a polished UI with purple gradient theme and four distinct checkbox states.
