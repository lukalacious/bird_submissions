# Bird Submission Tracker

A Next.js application for tracking bird submissions by region with Google OAuth authentication and Google Sheets integration for stakeholder access.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js v5 with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui
- **External Sync**: Google Sheets API
- **Hosting**: Vercel, Kinsta, or Render (see [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md))

## Features

- **Invite-Only Access**: Admins add users via email before they can sign in
- **Multi-Region Support**: Track birds across different geographic regions
- **Yearly Greying**: Submitted birds are greyed out for the current year
- **Admin Panel**: Manage users, settings, and view statistics
- **Google Sheets Sync**: Submissions are synced to Google Sheets for stakeholder access

## Getting Started

**Deployed?** See **[NEXT_STEPS.md](NEXT_STEPS.md)** for what to do after the Vercel build. **Local setup:** see below.

### Prerequisites

- Node.js 18+
- PostgreSQL database (e.g. [Neon](https://neon.tech) free tier)
- Google Cloud Project with OAuth (and optionally Sheets API) enabled

### Local Development

1. **Clone and install dependencies**:
   ```bash
   cd birds-app
   npm install
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/birds_tracker"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
   GOOGLE_CLIENT_ID="your-client-id"
   GOOGLE_CLIENT_SECRET="your-client-secret"
   GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id"
   GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

3. **Set up the database**:
   ```bash
   npm run db:push    # Push schema to database
   npm run db:seed    # Seed bird data from Excel
   ```

4. **Create initial admin user**:
   Set `ADMIN_EMAIL` in `.env` before running seed, or manually insert via Prisma Studio:
   ```bash
   npm run db:studio
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```
   Or: `npm run local:start` (runs db:push, db:seed, then dev).

## Deployment (Vercel + Neon — $0/month)

- **What to do after the build:** [NEXT_STEPS.md](NEXT_STEPS.md)
- **Env vars, Render, pooling, troubleshooting:** [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)

**Important for Vercel:** Use Neon’s **pooled** connection string (`-pooler` or serverless-compatible) in `DATABASE_URL` so Prisma does not exhaust connections in serverless. See [DEPLOY_VERCEL.md#6-prisma--vercel-serverless](DEPLOY_VERCEL.md#6-prisma--vercel-serverless).

---

## Deployment to Kinsta

### 1. Create Kinsta Application

1. Log in to [Kinsta Dashboard](https://my.kinsta.com)
2. Go to **Applications** > **Add Application**
3. Connect your GitHub repository
4. Select the `birds-app` directory as the root

### 2. Add PostgreSQL Database

1. In Kinsta, go to **Databases** > **Add Database**
2. Create a PostgreSQL database
3. Note the connection string

### 3. Configure Build Settings

- **Build command**: `npx prisma generate && npm run build`
- **Start command**: `npm start`
- **Node.js version**: 18 or 20

### 4. Set Environment Variables

In Kinsta Application settings, add:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Your Kinsta PostgreSQL connection string |
| `NEXTAUTH_URL` | `https://your-app.kinsta.app` |
| `NEXTAUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Your Google Sheet ID |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service account email |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Service account private key |

### 5. Update Google OAuth

In [Google Cloud Console](https://console.cloud.google.com):

1. Go to **APIs & Services** > **Credentials**
2. Edit your OAuth 2.0 Client ID
3. Add authorized redirect URI:
   ```
   https://your-app.kinsta.app/api/auth/callback/google
   ```

### 6. Initialize Database

After first deployment, run migrations:

```bash
# Connect to your app's shell or use Kinsta's database tools
npx prisma db push
npx prisma db seed
```

## Google Cloud Setup

### OAuth Credentials

1. Create project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable **Google+ API**
3. Go to **APIs & Services** > **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://your-app.kinsta.app/api/auth/callback/google` (production)

### Service Account for Sheets

1. Go to **IAM & Admin** > **Service Accounts**
2. Create service account
3. Create JSON key and download
4. Extract `client_email` and `private_key` for environment variables
5. Share your Google Sheet with the service account email

## Project Structure

```
birds-app/
├── prisma/
│   ├── schema.prisma      # Database schema
│   ├── seed.ts            # Seed script
│   └── Bird Species Database.xlsx
├── src/
│   ├── app/
│   │   ├── page.tsx       # Login page
│   │   ├── (protected)/   # Auth-required pages
│   │   │   ├── region/    # Region selection
│   │   │   ├── submit/    # Bird submission
│   │   │   └── success/   # Success page
│   │   ├── admin/         # Admin panel
│   │   ├── api/           # API routes
│   │   └── actions/       # Server actions
│   ├── components/
│   │   ├── ui/            # shadcn/ui components
│   │   └── admin/         # Admin components
│   └── lib/
│       ├── auth.ts        # NextAuth config
│       ├── prisma.ts      # Prisma client
│       └── google-sheets.ts
└── package.json
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed bird data |
| `npm run db:studio` | Open Prisma Studio |
| `npm run local:start` | Run db:push, db:seed, then dev |

## Adding Initial Admin

Before anyone can use the app, an admin must be created:

**Option 1**: Set `ADMIN_EMAIL` environment variable before seeding

**Option 2**: Use Prisma Studio
```bash
npm run db:studio
```
Then manually add a user with `role: ADMIN`

**Option 3**: Direct database insert
```sql
INSERT INTO "User" (id, email, role, "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'admin@example.com', 'ADMIN', NOW(), NOW());
```

## License

Private - All rights reserved
