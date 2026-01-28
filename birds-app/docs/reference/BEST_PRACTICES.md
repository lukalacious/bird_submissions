# Best Practices for This Stack

Quick reference guide for best practices specific to the Twitch app's technology stack.

## Stack Overview

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.x |
| Language | TypeScript | 5.x |
| UI Library | React | 19.x |
| Styling | Tailwind CSS | 4.x |
| Components | Radix UI + shadcn/ui | - |
| Database | PostgreSQL (Neon) | 17 |
| ORM | Prisma | 5.x |
| Auth | NextAuth.js | 5.0 beta |
| Animations | Framer Motion | 12.x |
| Icons | Lucide React | - |
| Deployment | Vercel | - |

---

## Next.js App Router

### File Organization

```
src/app/
├── (auth)/           # Auth-related routes (login, register)
├── (protected)/      # Routes requiring authentication
│   ├── dashboard/
│   ├── community/
│   └── layout.tsx    # Shared layout with auth check
├── api/              # API routes
├── layout.tsx        # Root layout
└── page.tsx          # Home page
```

### Server vs Client Components

```typescript
// Default: Server Component (no directive needed)
// ✅ Can use: async/await, direct DB access, auth()
export default async function Page() {
  const session = await auth();
  const data = await prisma.user.findMany();
  return <div>{/* render data */}</div>;
}

// Client Component: add "use client" directive
// ✅ Can use: useState, useEffect, onClick, useSession
"use client";
export function InteractiveButton() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### When to Use Each

| Use Server Components | Use Client Components |
|-----------------------|----------------------|
| Fetching data | Interactivity (onClick, onChange) |
| Accessing backend resources | Browser APIs (localStorage, etc.) |
| Sensitive operations | useState, useEffect |
| Large dependencies (keep off client bundle) | Real-time updates |

### Data Fetching Pattern

```typescript
// page.tsx (Server Component) - fetches data
export default async function CommunityPage() {
  const data = await prisma.submission.findMany();
  return <CommunityView data={data} />;
}

// community-view.tsx (Client Component) - handles interactivity
"use client";
export function CommunityView({ data }: { data: Submission[] }) {
  const [filter, setFilter] = useState("all");
  // Interactive UI here
}
```

### Search Params in App Router

```typescript
// Next.js 15+: searchParams is a Promise
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ query?: string }>;
}) {
  const params = await searchParams;
  const query = params.query;
}
```

---

## Prisma + Neon

### Schema Best Practices

```prisma
// Always use @id with cuid() for primary keys
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  submissions Submission[]

  // Indexes for frequently queried fields
  @@index([email])
}

// Use compound unique constraints when needed
model Submission {
  id       String @id @default(cuid())
  userId   String
  birdName String
  year     Int
  month    Int

  @@unique([userId, birdName, year, month])
  @@index([userId, year, month])
}
```

### Query Patterns

```typescript
// ✅ Select only needed fields
const users = await prisma.user.findMany({
  select: {
    id: true,
    name: true,
    // Don't select large fields you don't need
  },
});

// ✅ Use include sparingly (can cause N+1)
const submissions = await prisma.submission.findMany({
  include: {
    user: {
      select: { name: true, image: true },
    },
  },
});

// ✅ Use transactions for multiple operations
await prisma.$transaction([
  prisma.submission.create({ data: submission }),
  prisma.userJoker.update({ where: {...}, data: {...} }),
]);

// ✅ Use upsert for "create or update" patterns
await prisma.settings.upsert({
  where: { id: "default" },
  create: { id: "default", ...defaults },
  update: { ...updates },
});
```

### Connection Management

```typescript
// lib/prisma.ts - Singleton pattern for Prisma Client
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

### Schema Changes Workflow

1. Edit `schema.prisma`
2. Run `npx prisma db push` (development)
3. Test locally
4. **Sync to production before deploying** (see DATABASE_SCHEMA_MANAGEMENT.md)
5. Deploy code

---

## NextAuth.js v5

### Auth Configuration

```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import prisma from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
        role: user.role,
      },
    }),
  },
});
```

### Protecting Routes

```typescript
// Server Component
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }
  // Render protected content
}

// Or use middleware for route protection
// middleware.ts
export { auth as middleware } from "@/lib/auth";
export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
```

### Client-Side Session Access

```typescript
"use client";
import { useSession } from "next-auth/react";

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === "loading") return <Skeleton />;
  if (!session) return <SignInButton />;

  return <div>Hello, {session.user.name}</div>;
}
```

---

## Tailwind CSS v4

### Class Organization

```tsx
// Order: layout → sizing → spacing → typography → colors → effects → states
<div
  className={`
    flex flex-col          // Layout
    w-full max-w-md        // Sizing
    p-4 gap-2              // Spacing
    text-sm font-medium    // Typography
    bg-white text-gray-900 // Colors
    rounded-lg shadow-sm   // Effects
    hover:bg-gray-50       // States
  `}
/>
```

### Responsive Design

```tsx
// Mobile-first: base styles apply to mobile, add breakpoints for larger
<div className="
  px-4        // Mobile: 16px padding
  md:px-6     // Tablet+: 24px padding
  lg:px-8     // Desktop+: 32px padding
">

// Common breakpoints
// sm: 640px, md: 768px, lg: 1024px, xl: 1280px, 2xl: 1536px
```

### Dark Mode (if using next-themes)

```tsx
// Use dark: variant for dark mode styles
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

// Or use CSS variables for theme colors
<div className="bg-background text-foreground">
```

### Conditional Classes with clsx/cn

```typescript
import { cn } from "@/lib/utils";

<button
  className={cn(
    "px-4 py-2 rounded-md font-medium",
    isActive
      ? "bg-blue-600 text-white"
      : "bg-gray-100 text-gray-700",
    isDisabled && "opacity-50 cursor-not-allowed"
  )}
/>
```

---

## React Patterns

### State Management

```typescript
// ✅ Local state for UI-only concerns
const [isOpen, setIsOpen] = useState(false);

// ✅ URL state for shareable/bookmarkable state
const searchParams = useSearchParams();
const filter = searchParams.get("filter") || "all";

// ✅ Server state via Server Components or React Query
// Just fetch in Server Component and pass as props
```

### Optimizing Re-renders

```typescript
// ✅ useMemo for expensive computations
const filtered = useMemo(() => {
  return items.filter(item => item.name.includes(query));
}, [items, query]);

// ✅ useCallback for stable function references
const handleClick = useCallback(() => {
  setCount(c => c + 1);
}, []);

// ✅ Split components to isolate re-renders
// Instead of one big component, split into smaller ones
```

### Form Handling with Server Actions

```typescript
// actions.ts
"use server";

export async function createSubmission(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const birdName = formData.get("birdName") as string;

  await prisma.submission.create({
    data: { userId: session.user.id, birdName },
  });

  revalidatePath("/submissions");
}

// form.tsx
<form action={createSubmission}>
  <input name="birdName" required />
  <button type="submit">Submit</button>
</form>
```

---

## Radix UI + shadcn/ui

### Component Usage

```typescript
// Import from your ui folder, not directly from Radix
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Components are pre-styled with Tailwind
<Button variant="outline" size="sm">
  Click me
</Button>
```

### Customizing shadcn Components

```typescript
// Edit the component file directly in components/ui/
// Or use className to override styles
<Button className="bg-purple-600 hover:bg-purple-700">
  Custom Color
</Button>

// Or create variants in the component file using cva
```

---

## Framer Motion

### Basic Animations

```typescript
import { motion } from "framer-motion";

// Simple fade in
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  exit={{ opacity: 0 }}
>
  Content
</motion.div>

// Slide in from right
<motion.div
  initial={{ x: "100%" }}
  animate={{ x: 0 }}
  exit={{ x: "100%" }}
  transition={{ type: "spring", damping: 30, stiffness: 300 }}
>
  Sliding Panel
</motion.div>
```

### AnimatePresence for Exit Animations

```typescript
import { AnimatePresence } from "framer-motion";

// Wrap conditional renders with AnimatePresence
<AnimatePresence mode="wait">
  {isOpen && (
    <motion.div
      key="modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      Modal Content
    </motion.div>
  )}
</AnimatePresence>
```

---

## Vercel Deployment

### Environment Variables

```bash
# Vercel Dashboard > Settings > Environment Variables

# Required:
DATABASE_URL          # Production Neon connection string
AUTH_SECRET           # Generate with: openssl rand -base64 32
AUTH_GOOGLE_ID        # Google OAuth client ID
AUTH_GOOGLE_SECRET    # Google OAuth client secret

# Optional:
NEXTAUTH_URL          # Usually auto-detected by Vercel
```

### Build Configuration

```json
// vercel.json
{
  "buildCommand": "npx prisma generate && next build",
  "framework": "nextjs",
  "crons": [
    {
      "path": "/api/cron/some-job",
      "schedule": "0 6 1 * *"
    }
  ]
}
```

### Pre-Deployment Checklist

- [ ] Schema synced to production database
- [ ] Environment variables set in Vercel
- [ ] No hardcoded secrets in code
- [ ] Build succeeds locally with `npm run build`
- [ ] No TypeScript errors

---

## Security Best Practices

### Input Validation

```typescript
// Always validate on the server, never trust client
"use server";

export async function createSubmission(formData: FormData) {
  const birdName = formData.get("birdName");

  // Validate
  if (typeof birdName !== "string" || birdName.length > 100) {
    throw new Error("Invalid bird name");
  }

  // Sanitize if needed
  const sanitized = birdName.trim();

  // Then use
  await prisma.submission.create({ data: { birdName: sanitized } });
}
```

### Auth Checks

```typescript
// Always check auth in server actions and API routes
"use server";

export async function adminAction() {
  const session = await auth();

  // Check authenticated
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  // Check role if needed
  if (session.user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }

  // Proceed with action
}
```

### Sensitive Data

```typescript
// Never expose sensitive data in client components
// ✅ Server Component - can access secrets
const apiKey = process.env.SECRET_API_KEY;

// ❌ Client Component - will be undefined (and shouldn't be there anyway)
// Only NEXT_PUBLIC_* vars are available client-side
```

---

## Performance Tips

### Database

- Use `select` to fetch only needed fields
- Add indexes for frequently queried columns
- Use `take` and `skip` for pagination
- Avoid N+1 queries (use `include` wisely or batch queries)

### Next.js

- Keep Client Components small and leaf-level
- Use Server Components for data fetching
- Implement proper loading states with `loading.tsx`
- Use `generateStaticParams` for static pages when possible

### Images

```typescript
// Always use next/image for optimization
import Image from "next/image";

<Image
  src={user.image}
  alt={user.name}
  width={48}
  height={48}
  className="rounded-full"
/>
```

### Bundle Size

- Import only what you need from icon libraries
- Check bundle with `npm run build` (shows page sizes)
- Consider dynamic imports for heavy components

```typescript
const HeavyChart = dynamic(() => import("./heavy-chart"), {
  loading: () => <Skeleton />,
});
```

---

*Last updated: January 2026*
