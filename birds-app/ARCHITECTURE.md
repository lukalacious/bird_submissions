# Birds App Architecture

A full-stack Next.js application for tracking bird sightings with gamification, community features, and an elimination challenge system.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Server Components) |
| Language | TypeScript |
| Database | PostgreSQL (Neon) |
| ORM | Prisma |
| Auth | NextAuth v5 + Google OAuth |
| Styling | TailwindCSS 4 + Radix UI |
| Animations | Framer Motion |
| Analytics | Tremor |
| Icons | Lucide React |

## Directory Structure

```
birds-app/
├── src/
│   ├── app/
│   │   ├── (protected)/        # Authenticated routes
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── submit/         # Bird submission form
│   │   │   ├── submissions/    # View user submissions
│   │   │   ├── success/        # Post-submission confirmation
│   │   │   ├── region/         # Region details & leaderboard
│   │   │   ├── community/      # Community feed
│   │   │   ├── activity/       # Activity timeline
│   │   │   ├── profile/        # User profile settings
│   │   │   ├── feedback/       # Feedback form
│   │   │   └── layout.tsx      # Protected layout with nav
│   │   ├── admin/              # Admin-only routes
│   │   │   ├── page.tsx        # Analytics dashboard
│   │   │   ├── settings/       # App configuration
│   │   │   ├── elimination/    # Elimination management
│   │   │   └── layout.tsx      # Admin sidebar layout
│   │   ├── api/auth/           # NextAuth API routes
│   │   ├── actions/            # Server Actions
│   │   ├── page.tsx            # Login page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                 # Reusable UI components
│   │   ├── admin/              # Admin-specific components
│   │   ├── gamification/       # Jokers, elimination, levels
│   │   ├── community/          # Activity feed components
│   │   └── providers/          # Context providers
│   ├── lib/
│   │   ├── auth.ts             # NextAuth configuration
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── google-sheets.ts    # Google Sheets sync
│   │   └── utils.ts            # Utility functions
│   └── types/
│       └── next-auth.d.ts      # Session type extensions
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Excel-based seeding
│   └── migrations/
└── public/
```

## Database Schema

### Core Models

**User** - Authentication and profile
- `id`, `email`, `name`, `username`, `image`, `role` (USER/ADMIN)
- Relations: submissions, jokers, challengeStatus

**Region** - Geographic areas for tracking
- `id`, `name` (identifier), `label` (display name)
- Relations: birds, submissions

**Bird** - Species per region
- `alphabeticalName`, `fullName`, `scientificName`, `groupName`
- Unique constraint: (fullName, regionId)

**Submission** - Individual bird submissions
- `userId`, `regionId`, `birdName`, `year`, `month`, `isCustomBird`
- Unique constraint: (userId, regionId, birdName, year, month)

**Settings** - App-wide configuration
- `maxBirdsPerPeriod` (default: 31)
- `resetPeriod` (YEARLY/MONTHLY/NEVER)
- `eliminationThreshold` (default: 30)
- `feedbackFormEmbedUrl`

### Gamification Models

**UserJoker** - Jokers earned from group submissions
- `userId`, `year`, `month`, `jokers`, `usedJokers`
- Formula: 3 birds of same group = 1 joker, +0.5 per additional

**UserChallengeStatus** - Elimination tracking
- `userId`, `year`, `isEliminated`, `eliminatedAt`, `eliminationMonth`

## Authentication

- NextAuth v5 with JWT strategy (30-day sessions)
- Google OAuth provider
- Prisma adapter for database persistence
- Session enriched with: user id, role, username

**Protected Routes**: All routes under `(protected)` layout require authentication. Unauthenticated users redirect to login.

## Server Actions

Located in `src/app/actions/`:

| File | Purpose |
|------|---------|
| `submit-birds.ts` | Create/delete submissions, validate limits |
| `joker-actions.ts` | Calculate jokers, use for immunity |
| `elimination-actions.ts` | Check status, eliminate/reinstate users |
| `community-actions.ts` | Community stats and feeds |
| `user-actions.ts` | Update username and profile |
| `admin-actions.ts` | Settings management, user administration |

## Key Features

### Bird Submission
- Submit up to 31 birds per month per region (configurable)
- Duplicate prevention within same period
- Custom bird entry for unlisted species
- Two-step flow: select birds, review, confirm
- Google Sheets sync for backup

### Gamification System
- **Jokers**: Earned from submitting multiple birds of the same group
- **Elimination**: Users below monthly threshold are eliminated
- **Levels**: Percentile-based (Fledgling, Birder, Twitcher)
- **Streaks**: Consecutive months with submissions

### Community Features
- Activity feed showing recent submissions
- Region-specific leaderboards
- User profiles with custom usernames

## Data Flow

```
User Action → React Component → Server Action → Prisma → PostgreSQL
                                     ↓
                              Google Sheets (async sync)
                                     ↓
                              Revalidate Cache → UI Update
```

## Security

- CSRF protection via Server Actions
- JWT-based authentication
- Role-based access control (USER/ADMIN)
- Security headers configured in `next.config.ts`:
  - X-Frame-Options: DENY
  - X-Content-Type-Options: nosniff
  - Permissions-Policy: denies camera/mic/geolocation

## Development

```bash
# Install dependencies
npm install

# Set up database
npx prisma migrate dev
npx prisma db seed

# Run development server
npm run dev
```

## Environment Variables

```env
DATABASE_URL=           # Neon PostgreSQL connection string
NEXTAUTH_URL=           # App URL (http://localhost:3000 for dev)
NEXTAUTH_SECRET=        # Random secret for JWT signing
GOOGLE_CLIENT_ID=       # Google OAuth client ID
GOOGLE_CLIENT_SECRET=   # Google OAuth client secret
```
