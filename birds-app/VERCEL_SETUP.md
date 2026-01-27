# Vercel Deployment Checklist

## ⚠️ CRITICAL: NextAuth v5 Variable Name Change

NextAuth v5 uses `AUTH_SECRET` instead of `NEXTAUTH_SECRET`

### Required Vercel Environment Variables

Set these in: **Vercel Dashboard → Project Settings → Environment Variables**

#### Authentication (CRITICAL)
```
AUTH_SECRET                          # ✅ Use this (NextAuth v5)
                                     # ❌ NOT NEXTAUTH_SECRET (v4 only)
```
Copy the value from your local `NEXTAUTH_SECRET` and save it as `AUTH_SECRET` on Vercel.

#### Database (CRITICAL)
```
DATABASE_URL                         # Your Neon PostgreSQL pooled connection
```

#### Google OAuth (CRITICAL)
```
GOOGLE_CLIENT_ID                     # From Google Cloud Console
GOOGLE_CLIENT_SECRET                 # From Google Cloud Console
```

#### Optional Features
```
GOOGLE_SHEETS_SPREADSHEET_ID         # For Google Sheets sync
GOOGLE_SERVICE_ACCOUNT_EMAIL         # Service account
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY   # Service account private key
ADMIN_EMAIL                          # Default admin email for seeding
```

---

## Environment Configuration

### For each variable:
1. Set for **Production** ✅
2. Set for **Preview** ✅ (important for testing)
3. Set for **Development** (optional - for vercel dev)

### Google OAuth Redirect URIs

Make sure these are configured in Google Cloud Console:

**Production:**
```
https://bird-submissions.vercel.app/api/auth/callback/google
```

**Preview (for each branch):**
```
https://bird-submissions-*-[your-vercel-username].vercel.app/api/auth/callback/google
```

Or use wildcard:
```
https://*.vercel.app/api/auth/callback/google
```

---

## Deployment Process

1. **Set all environment variables** in Vercel dashboard
2. **Redeploy**: Go to Deployments → Click ⋯ → Redeploy
3. **Check logs**: Deployments → View Function Logs
4. **Test**: Visit https://bird-submissions.vercel.app

---

## Troubleshooting

### "Application error: a server-side exception has occurred"

**Likely causes:**
1. ❌ Using `NEXTAUTH_SECRET` instead of `AUTH_SECRET`
2. ❌ Missing `DATABASE_URL`
3. ❌ Missing Google OAuth credentials
4. ❌ Variables set for Production but not Preview
5. ❌ Google OAuth redirect URIs not configured

### Check Vercel Function Logs:
```
Vercel Dashboard → Deployments → Latest → View Function Logs
```

Look for:
- "Missing AUTH_SECRET"
- "Prisma connection error"
- "Google OAuth error"

---

## Quick Fix Commands

If you need to update variables via CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Remove old variable (if exists)
vercel env rm NEXTAUTH_SECRET production
vercel env rm NEXTAUTH_SECRET preview

# Add new AUTH_SECRET variable
vercel env add AUTH_SECRET production
vercel env add AUTH_SECRET preview
# (Paste your secret when prompted)

# Redeploy
vercel --prod
```

---

## Verification Steps

After fixing variables:

1. ✅ Visit homepage → Should show Google Sign In button
2. ✅ Click Sign In → Should redirect to Google OAuth
3. ✅ After auth → Should redirect back to dashboard
4. ✅ Check browser tab → Should show bird favicon 🐦

### If still failing:
- Check Vercel deployment logs for specific error
- Verify database connection string is pooled endpoint
- Confirm Google OAuth URIs match Vercel domains
