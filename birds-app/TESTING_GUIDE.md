# Testing Guide for Bird Tracker App

A step-by-step guide for testing the app after making development changes.

---

## Quick Start

```bash
cd /Users/lukeroberts/Documents/code/projects/birds/birds-app
npm run dev
```

Then open: **http://localhost:3000**

---

## Step-by-Step Testing Workflow

### Step 1: Check for Running Processes

Before starting the dev server, make sure nothing is already running on port 3000.

```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill any process on port 3000 (if needed)
kill -9 $(lsof -t -i:3000)
```

### Step 2: Start the Development Server

```bash
cd /Users/lukeroberts/Documents/code/projects/birds/birds-app
npm run dev
```

**Expected output:**
```
▲ Next.js 16.x.x (Turbopack)
- Local: http://localhost:3000
```

### Step 3: Open the App

Open your browser to: **http://localhost:3000**

### Step 4: Test Key Pages

| Page | URL | What to Check |
|------|-----|---------------|
| Login | `/` | Google OAuth button works |
| Dashboard | `/dashboard` | Region cards display, progress bars |
| Submit Birds | `/submit?region=XXX` | Bird list loads, checkboxes work |
| Submissions | `/submissions` | Historical data displays |
| Community | `/community` | Feed loads |
| Admin | `/admin` | (if admin user) Settings load |

---

## Common Terminal Issues & Fixes

### Issue: "Port 3000 is already in use"

**Fix:**
```bash
# Kill the process using port 3000
kill -9 $(lsof -t -i:3000)

# Then restart
npm run dev
```

### Issue: "Module not found" errors

**Fix:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: Prisma/Database errors

**Fix:**
```bash
# Regenerate Prisma client
npm run db:generate

# If schema changed, push to database
npm run db:push
```

### Issue: TypeScript errors

**Fix:**
```bash
# Run a build to see all errors
npm run build

# Or just check types without building
npx tsc --noEmit
```

### Issue: Styles not updating

**Fix:**
1. Hard refresh the browser: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

### Issue: "EACCES permission denied"

**Fix:**
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) node_modules
```

### Issue: Terminal frozen/unresponsive

**Fix:**
1. Press `Ctrl + C` to stop the current process
2. If that doesn't work, close the terminal and open a new one
3. Kill any orphaned node processes:
```bash
killall node
```

---

## Build & Lint Checks

### Run a Production Build

This catches errors that dev mode might miss:

```bash
npm run build
```

**Expected output:** "Compiled successfully" with no red errors.

### Run Linting

```bash
npm run lint
```

---

## Database Commands

```bash
# View database in browser UI
npm run db:studio

# Push schema changes to database
npm run db:push

# Run migrations (for production)
npm run db:migrate

# Seed the database with test data
npm run db:seed
```

---

## Environment Variables

Make sure `.env` or `.env.local` exists with:

```env
DATABASE_URL="your-database-url"
AUTH_SECRET="your-auth-secret"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
```

**Check if env is loaded:**
```bash
# Print env vars (careful with secrets!)
cat .env.local
```

---

## Visual Testing Checklist

After making UI changes, check:

- [ ] **Colors**: New slate blue theme applied (no purple)
- [ ] **Typography**: Headings use Fraunces font
- [ ] **Spacing**: Cards have generous padding
- [ ] **Dark mode**: Toggle works, colors look good
- [ ] **Mobile**: Test at 375px width (iPhone SE)
- [ ] **Touch targets**: Buttons/checkboxes are easy to tap

---

## Reset Everything (Nuclear Option)

If nothing works, reset the entire development environment:

```bash
# Stop any running processes
killall node

# Remove all generated files
rm -rf node_modules .next

# Reinstall everything
npm install

# Regenerate Prisma
npm run db:generate

# Start fresh
npm run dev
```

---

## Useful Keyboard Shortcuts

| Action | Mac | Windows |
|--------|-----|---------|
| Stop dev server | `Ctrl + C` | `Ctrl + C` |
| Hard refresh browser | `Cmd + Shift + R` | `Ctrl + Shift + R` |
| Open DevTools | `Cmd + Option + I` | `F12` |
| Clear console | `Cmd + K` | `Ctrl + L` |

---

## Getting Help

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Tailwind Docs**: https://tailwindcss.com/docs
