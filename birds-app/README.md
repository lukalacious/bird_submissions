# Bird Submission Tracker

A Next.js application for tracking bird sightings by region with Google OAuth authentication and Google Sheets integration.

## Live App

**Production:** https://bird-submissions.vercel.app

## Tech Stack

- **Framework**: Next.js 16 (App Router) with TypeScript
- **Database**: PostgreSQL (Neon) with Prisma ORM
- **Authentication**: NextAuth.js v5 with Google OAuth
- **Styling**: Tailwind CSS + shadcn/ui
- **External Sync**: Google Sheets API
- **Hosting**: Vercel

## Features

- **Open Registration**: Anyone with a Google account can sign up
- **Multi-Region Support**: Track birds across different geographic regions (South Africa, Netherlands, etc.)
- **Monthly Submission Limits**: 31 birds per month per user
- **Submission History**: View current and past month submissions
- **Admin Panel**: Manage users, settings, and view statistics
- **Google Sheets Sync**: Submissions automatically sync to Google Sheets

## Environment Setup

### Prerequisites

- Node.js 18+
- PostgreSQL database ([Neon](https://neon.tech) free tier recommended)
- Google Cloud Project with OAuth enabled

### Environment Variables

Create a `.env` file:

```env
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Google Sheets (optional)
GOOGLE_SHEETS_SPREADSHEET_ID="your-spreadsheet-id"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Admin
ADMIN_EMAIL="admin@example.com"
```

### Local Development

```bash
cd birds-app
npm install
npm run db:push    # Push schema to database
npm run db:seed    # Seed bird data
npm run dev        # Start dev server
```

## Deployment (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel Dashboard:
   - Use **Production** database URL for Production environment
   - Use **Dev branch** database URL for Preview/Development environments
   - Set `NEXTAUTH_URL` to your Vercel domain (no trailing slash)
3. Configure Google OAuth redirect URIs in Google Cloud Console

### Database Isolation

| Environment | Database |
|-------------|----------|
| Local dev | Neon dev branch |
| Vercel Preview | Neon dev branch |
| Vercel Production | Neon production branch |

## Project Structure

```
birds-app/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── seed.ts                # Seed script
│   └── Bird Species Database.xlsx
├── src/
│   ├── app/
│   │   ├── page.tsx           # Landing/login page
│   │   ├── (protected)/       # Auth-required pages
│   │   │   ├── region/        # Region selection + submission history
│   │   │   ├── submit/        # Bird submission form
│   │   │   └── success/       # Success confirmation
│   │   ├── admin/             # Admin panel
│   │   └── actions/           # Server actions
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   └── admin/             # Admin components
│   └── lib/
│       ├── auth.ts            # NextAuth config
│       ├── prisma.ts          # Prisma client
│       └── google-sheets.ts   # Sheets sync
└── package.json
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed bird data |
| `npm run db:studio` | Open Prisma Studio |

## License

Private - All rights reserved
