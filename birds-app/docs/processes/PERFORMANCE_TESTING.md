# Performance Testing Guide

This document covers how to run performance tests, interpret results, and fix common performance issues in the Birds App.

## Quick Start

```bash
# Run performance tests on desktop
npm run test:perf

# Run on mobile viewport
npm run test:perf:mobile

# Run with slow network simulation
npm run test:perf:slow

# Run all configurations
npm run test:perf:all

# View Playwright report
npm run test:perf:report

# Generate detailed HTML report
npm run test:perf:generate-report
```

## Core Web Vitals Explained

| Metric | Good | Needs Improvement | Poor | What It Measures |
|--------|------|-------------------|------|------------------|
| **TTFB** | < 800ms | 800-1800ms | > 1800ms | Server response time |
| **FCP** | < 1.8s | 1.8-3s | > 3s | First content visible |
| **LCP** | < 2.5s | 2.5-4s | > 4s | Main content loaded |
| **CLS** | < 0.1 | 0.1-0.25 | > 0.25 | Visual stability |
| **TBT** | < 200ms | 200-600ms | > 600ms | Main thread blocking |

---

## Common Lag Causes & Solutions

### 1. Slow Server Response (High TTFB)

**Symptoms:**
- Pages take a long time before anything appears
- Network tab shows waiting time on document request

**Causes in Birds App:**
- Prisma queries without proper indexes
- N+1 query patterns in server components
- No caching on frequently accessed data
- Cold starts on serverless functions

**Solutions:**

```typescript
// ❌ Bad: N+1 queries
const users = await prisma.user.findMany();
for (const user of users) {
  const submissions = await prisma.submission.findMany({
    where: { userId: user.id }
  });
}

// ✅ Good: Include related data
const users = await prisma.user.findMany({
  include: {
    submissions: {
      take: 10,
      orderBy: { createdAt: 'desc' }
    }
  }
});
```

```typescript
// ✅ Add caching for expensive queries
import { unstable_cache } from 'next/cache';

export const getLeaderboard = unstable_cache(
  async () => {
    return prisma.user.findMany({
      orderBy: { score: 'desc' },
      take: 100
    });
  },
  ['leaderboard'],
  { revalidate: 60 } // Cache for 1 minute
);
```

**Database Indexes:**
```sql
-- Add to Prisma schema for common queries
@@index([createdAt])
@@index([userId, createdAt])
@@index([regionId, status])
```

---

### 2. Slow First Paint (High FCP)

**Symptoms:**
- White screen for extended period
- Content appears all at once rather than progressively

**Causes in Birds App:**
- Large JavaScript bundles blocking render
- Render-blocking CSS
- Slow font loading (Google Fonts)
- Synchronous data fetching in layouts

**Solutions:**

```typescript
// ✅ Use next/font for optimized fonts (already in app)
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Show fallback immediately
  preload: true,
});
```

```typescript
// ✅ Use Suspense for progressive loading
import { Suspense } from 'react';

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Immediate content */}
      <WelcomeMessage />

      {/* Load async with skeleton */}
      <Suspense fallback={<SubmissionsSkeleton />}>
        <RecentSubmissions />
      </Suspense>

      <Suspense fallback={<LeaderboardSkeleton />}>
        <Leaderboard />
      </Suspense>
    </div>
  );
}
```

```typescript
// ✅ Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const AnalyticsChart = dynamic(
  () => import('@/components/admin/analytics-chart'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false // Only load on client
  }
);
```

---

### 3. Slow Main Content (High LCP)

**Symptoms:**
- Hero image or main content takes too long to appear
- Page looks "almost ready" but main element is missing

**Causes in Birds App:**
- Unoptimized images
- LCP element depends on JavaScript
- Missing priority hints for images
- Large above-the-fold content

**Solutions:**

```tsx
// ✅ Optimize hero images with priority
import Image from 'next/image';

export function DashboardHeader({ user }) {
  return (
    <div className="flex items-center gap-4">
      <Image
        src={user.image || '/default-avatar.png'}
        alt={user.name}
        width={64}
        height={64}
        priority // Preload this image
        className="rounded-full"
      />
      <h1>Welcome back, {user.name}</h1>
    </div>
  );
}
```

```tsx
// ✅ Preload critical images in layout
// In app/layout.tsx
export const metadata = {
  other: {
    link: [
      { rel: 'preload', href: '/bird-hero.webp', as: 'image' }
    ]
  }
};
```

```tsx
// ✅ Use static generation where possible
export async function generateStaticParams() {
  const regions = await prisma.region.findMany();
  return regions.map((region) => ({
    regionId: region.id,
  }));
}
```

---

### 4. Layout Shifts (High CLS)

**Symptoms:**
- Content jumps around as page loads
- Buttons/links move as you try to click them
- Images cause content to shift when they load

**Causes in Birds App:**
- Images without width/height
- Dynamically injected content (toasts, banners)
- Font loading causing text reflow
- Framer Motion animations affecting layout

**Solutions:**

```tsx
// ✅ Always specify image dimensions
// next/image does this automatically
<Image
  src="/bird.jpg"
  width={400}
  height={300}
  alt="Bird"
/>

// For dynamic aspect ratios
<div className="relative aspect-video">
  <Image
    src="/bird.jpg"
    fill
    alt="Bird"
    className="object-cover"
  />
</div>
```

```tsx
// ✅ Reserve space for dynamic content
export function SubmissionList() {
  return (
    <div className="min-h-[400px]">
      <Suspense fallback={<ListSkeleton count={5} />}>
        <Submissions />
      </Suspense>
    </div>
  );
}
```

```tsx
// ✅ Use transform for Framer Motion animations
// Avoid animating layout properties
<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  // ❌ Don't: initial={{ height: 0 }}
  // ✅ Do: Use transform properties
/>
```

---

### 5. Janky Interactions (High TBT/INP)

**Symptoms:**
- Clicks feel delayed
- Scrolling is choppy
- Animations stutter
- Input fields lag

**Causes in Birds App:**
- Heavy Framer Motion animations
- Large list re-renders
- Expensive computations on main thread
- Too many event listeners

**Solutions:**

```tsx
// ✅ Memoize expensive components
import { memo, useMemo, useCallback } from 'react';

const SubmissionCard = memo(function SubmissionCard({ submission }) {
  return (
    <div className="p-4 border rounded">
      <h3>{submission.species}</h3>
      <p>{submission.notes}</p>
    </div>
  );
});

// ✅ Memoize expensive calculations
export function Leaderboard({ users }) {
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => b.score - a.score),
    [users]
  );

  return sortedUsers.map(user => (
    <UserRow key={user.id} user={user} />
  ));
}
```

```tsx
// ✅ Debounce expensive event handlers
import { useDebouncedCallback } from 'use-debounce';

export function SearchInput({ onSearch }) {
  const debouncedSearch = useDebouncedCallback(
    (value) => onSearch(value),
    300
  );

  return (
    <input
      type="text"
      onChange={(e) => debouncedSearch(e.target.value)}
      placeholder="Search birds..."
    />
  );
}
```

```tsx
// ✅ Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';

export function SubmissionsList({ submissions }) {
  const parentRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: submissions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{ height: virtualizer.getTotalSize() }}
        className="relative w-full"
      >
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <SubmissionCard
            key={virtualRow.key}
            submission={submissions[virtualRow.index]}
            style={{
              transform: `translateY(${virtualRow.start}px)`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

---

### 6. Large Bundle Size

**Symptoms:**
- Slow initial load on mobile/slow networks
- Network tab shows large JS files
- "Chunk load failed" errors on slow connections

**Causes in Birds App:**
- Including all of framer-motion
- Large icon library imports
- Unused code from dependencies

**Solutions:**

```bash
# Analyze your bundle
ANALYZE=true npm run build
```

```typescript
// ❌ Bad: Import entire library
import { motion } from 'framer-motion';

// ✅ Good: Import only what you need
import { motion } from 'framer-motion';
// Or use the LazyMotion component for smaller bundle

import { LazyMotion, domAnimation, m } from 'framer-motion';

function App() {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ opacity: 1 }} />
    </LazyMotion>
  );
}
```

```typescript
// ❌ Bad: Import all icons
import * as Icons from 'lucide-react';

// ✅ Good: Import specific icons
import { Bird, ChevronDown, User } from 'lucide-react';
```

---

## Testing Protected Pages

For testing authenticated routes:

### Option 1: Run headed and login manually
```bash
npm run test:perf:headed
# Login in the browser that opens
# The session will be saved for subsequent tests
```

### Option 2: Create test user via database
```bash
npm run db:seed-mock
# This creates test users that can be used for testing
```

### Option 3: Environment-based test auth
```typescript
// In auth.ts, add test mode support
if (process.env.TEST_AUTH === 'true') {
  // Return mock session for testing
}
```

---

## Recommended Performance Monitoring

### 1. Enable Vercel Speed Insights (Already Installed)

```tsx
// Add to app/layout.tsx
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
```

### 2. Add Real User Monitoring

```tsx
// Track Core Web Vitals in production
import { onCLS, onFCP, onLCP, onTTFB, onINP } from 'web-vitals';

export function reportWebVitals(metric) {
  console.log(metric);
  // Send to analytics
  fetch('/api/analytics/vitals', {
    method: 'POST',
    body: JSON.stringify(metric),
  });
}
```

---

## Performance Checklist

Before deploying, check:

- [ ] Images use `next/image` with proper dimensions
- [ ] Hero/LCP images have `priority` prop
- [ ] Heavy components use dynamic imports
- [ ] Long lists are virtualized
- [ ] Server components fetch data efficiently
- [ ] Database queries have appropriate indexes
- [ ] Bundle size is under 500KB (gzipped)
- [ ] No layout shifts on load

---

## Troubleshooting

### Tests failing with timeout
```bash
# Increase timeout in playwright.config.ts
timeout: 60000,
```

### "Browser closed unexpectedly"
```bash
# Install browser dependencies
npx playwright install --with-deps chromium
```

### Network throttling not working
Make sure you're using Chrome-based project, not Firefox or WebKit.

### Need more detailed traces
```bash
# Run with traces enabled
npx playwright test --trace on
```
