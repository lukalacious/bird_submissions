# Local setup for Bird Submission Tracker

Follow these steps to run the app on your machine.

---

## 1. Get a PostgreSQL database

### Option A: Neon (recommended, no install)

1. Go to [neon.tech](https://neon.tech) and sign up (free, no card).
2. Create a new project → **Create Project**.
3. Copy the connection string (looks like `postgresql://user:xxx@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`).
4. In `birds-app/.env`, set:
   ```env
   DATABASE_URL="<paste your Neon connection string>"
   ```

### Option B: Local PostgreSQL (Homebrew)

If Homebrew has permission errors, run once:

```bash
sudo chown -R $(whoami) /opt/homebrew /opt/homebrew/Cellar /opt/homebrew/Frameworks /opt/homebrew/bin /opt/homebrew/etc /opt/homebrew/include /opt/homebrew/lib /opt/homebrew/opt /opt/homebrew/sbin /opt/homebrew/share /opt/homebrew/var/homebrew/linked /opt/homebrew/var/homebrew/locks
```

Then:

```bash
brew install postgresql@16
brew services start postgresql@16
createdb birds_tracker
```

In `.env`:

```env
DATABASE_URL="postgresql://lukeroberts@localhost:5432/birds_tracker?schema=public"
```

(Use your Mac username if it’s not `lukeroberts`.)

---

## 2. Create tables and load bird data

From the `birds-app` folder:

```bash
npx prisma db push
npm run db:seed
```

---

## 3. Create your first admin user

**Option A – via env and re-seed**

1. In `.env` add:
   ```env
   ADMIN_EMAIL="your@gmail.com"
   ```
2. Run:
   ```bash
   npm run db:seed
   ```
   (This adds/updates the admin user; it won’t wipe existing data.)

**Option B – Prisma Studio**

```bash
npx prisma studio
```

Create a `User` with:

- `email`: your Google email  
- `role`: `ADMIN`  
- `id`: any CUID (or leave blank to auto-generate)

---

## 4. Google OAuth (required for login)

1. Open [Google Cloud Console](https://console.cloud.google.com) and create or pick a project.
2. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback/google`
5. Copy **Client ID** and **Client secret** into `.env`:
   ```env
   GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="xxx"
   ```

Google Sheets vars (`GOOGLE_SHEETS_*`) can stay empty for local dev; submissions won’t sync to Sheets but the app will run.

---

## 5. Start the app

After `DATABASE_URL` is set and you’ve run `db push` and `db:seed` at least once:

```bash
npm run dev
```

Or, to run push + seed + dev in one go:

```bash
npm run local:start
```

Open [http://localhost:3000](http://localhost:3000), sign in with the Google account you added as admin, and use **Admin Panel** to invite more users.

---

## Quick checklist

- [ ] `DATABASE_URL` in `.env` (Neon or local Postgres)
- [ ] `npx prisma db push` and `npm run db:seed` run without errors
- [ ] Admin user exists (via `ADMIN_EMAIL` + seed or Prisma Studio)
- [ ] `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- [ ] `npm run dev` and login at http://localhost:3000
