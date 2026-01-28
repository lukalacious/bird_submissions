# Development Learnings Log

A running log of lessons learned while building the Twitch bird-watching app. These are real issues encountered and their solutions.

---

## How to Use This File

When you encounter a problem and solve it, add an entry:

```markdown
### [Date] - Brief Title

**Problem:** What went wrong
**Root Cause:** Why it happened
**Solution:** How you fixed it
**Prevention:** How to avoid it in future
```

---

## 2026

### January 28, 2026 - Schema Drift Between Dev and Production

**Problem:** Community page worked locally but crashed in production with "column does not exist" error.

**Root Cause:**
- Added `isJokerSubmission` column to Prisma schema
- Ran `prisma db push` which only updated the **dev** Neon branch
- Deployed code to Vercel which uses **production** Neon branch
- Production database didn't have the new column

**Solution:**
1. Used Neon MCP tools to compare schemas: `compare_database_schema`
2. Applied migration to production: `prepare_database_migration` + `complete_database_migration`
3. Redeployed

**Prevention:**
- Always compare dev/production schemas before deploying
- Consider switching to `prisma migrate` for trackable migrations
- Add "sync schema to production" to pre-deploy checklist

**Related Docs:** [DATABASE_SCHEMA_MANAGEMENT.md](./processes/DATABASE_SCHEMA_MANAGEMENT.md)

---

### January 27, 2026 - Vercel Build Failing on Prisma Generate

**Problem:** Vercel builds failed with "Prisma Client not generated" error.

**Root Cause:**
- `prisma generate` wasn't running during the Vercel build
- Prisma Client needs to be generated on the deployment server (different architecture)

**Solution:**
Updated `vercel.json` build command:
```json
{
  "buildCommand": "npx prisma generate && next build"
}
```

**Prevention:**
- Always include `prisma generate` in production build commands
- The `postinstall` script in `package.json` helps but isn't always reliable on all platforms

---

### January 26, 2026 - Next.js Image Component Blocking External URLs

**Problem:** GitHub profile images not loading, showing broken image placeholder.

**Root Cause:**
- Next.js Image component requires explicit allowlisting of external domains
- GitHub uses `avatars.githubusercontent.com` for profile pictures

**Solution:**
Added to `next.config.ts`:
```typescript
images: {
  remotePatterns: [
    { protocol: "https", hostname: "github.com" },
    { protocol: "https", hostname: "avatars.githubusercontent.com" },
  ],
}
```

**Prevention:**
- When adding external images, immediately check if domain is in `remotePatterns`
- Consider using a catch-all pattern for trusted CDNs (with caution)

---

### January 25, 2026 - NextAuth Session Not Available in Server Components

**Problem:** `session` was `null` in server components even when user was logged in.

**Root Cause:**
- Was using `useSession()` hook (client-side only) in server components
- Server components need to use `auth()` from the auth config

**Solution:**
```typescript
// Server Component - CORRECT
import { auth } from "@/lib/auth";
const session = await auth();

// Client Component - CORRECT
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

**Prevention:**
- Server Components: use `auth()`
- Client Components: use `useSession()`
- Check if component has `"use client"` directive before choosing

---

### January 24, 2026 - Prisma Unique Constraint Error on Upsert

**Problem:** `prisma.submission.upsert()` failing with unique constraint violation.

**Root Cause:**
- The `where` clause didn't match the actual unique constraint in schema
- Schema had `@@unique([userId, regionId, birdName, year, month])`
- Was only passing `{ id }` in where clause

**Solution:**
```typescript
// Use the compound unique constraint
await prisma.submission.upsert({
  where: {
    userId_regionId_birdName_year_month: {
      userId,
      regionId,
      birdName,
      year,
      month,
    },
  },
  // ...
});
```

**Prevention:**
- Always check `schema.prisma` for `@@unique` constraints
- Prisma generates typed helpers for compound uniques: `fieldName1_fieldName2_...`

---

### January 23, 2026 - React Hydration Mismatch with Portals

**Problem:** Console error: "Hydration failed because the initial UI does not match what was rendered on the server."

**Root Cause:**
- Using `createPortal(content, document.body)` in a component
- `document.body` doesn't exist during server-side rendering

**Solution:**
```typescript
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true);
}, []);

// Only render portal after mount
{mounted && createPortal(<Menu />, document.body)}
```

**Prevention:**
- Any code accessing `document` or `window` must be wrapped in useEffect or checked with `typeof window !== 'undefined'`
- Use the `mounted` pattern for portals

---

## Template for New Entries

Copy this template when adding new learnings:

```markdown
### [Date] - Title

**Problem:**

**Root Cause:**

**Solution:**

**Prevention:**

**Related Docs:** (optional)
```

---

## Quick Reference: Common Gotchas

| Issue | Quick Fix |
|-------|-----------|
| Prisma types out of sync | `npx prisma generate` |
| Schema not in production | Compare schemas, apply migration |
| External images broken | Add domain to `next.config.ts` remotePatterns |
| Session null in server component | Use `auth()` not `useSession()` |
| Hydration mismatch | Check for `document`/`window` access, use `mounted` state |
| Build fails on Vercel | Check build command includes `prisma generate` |
| Unique constraint error | Check `@@unique` in schema, use compound key |

---

*Keep this file updated as you learn!*
