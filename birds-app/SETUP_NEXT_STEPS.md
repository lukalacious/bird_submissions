# Step-by-step: What to do next

Use this checklist to get the Bird Submission Tracker running locally, then optionally deploy it.

---

## Part 1: Run locally

### Step 1. Install dependencies

```bash
cd birds-app
npm install
```

---

### Step 2. Get a PostgreSQL database (Neon)

1. Go to [neon.tech](https://neon.tech) and sign up (free, no card).
2. **Create a new project** → choose a name and region → **Create Project**.
3. On the project dashboard, find the **Connection string**.
4. For **local** use, you can use either:
   - the **direct** connection string (e.g. `postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`), or  
   - the **pooled** one (host contains `-pooler`).  
   If you get a TLS “bad certificate format” error when running `db:push` or `db:seed`, try the other one.
5. Copy the connection string (you’ll paste it in Step 4).

---

### Step 3. Create your `.env` file

1. If you don’t have `.env` yet:
   ```bash
   cp .env.example .env
   ```
2. Open `birds-app/.env` in an editor.

---

### Step 4. Fill in required variables in `.env`

Set these. Replace placeholders with your real values.

| Variable | What to put |
|----------|-------------|
| `DATABASE_URL` | The Neon connection string from Step 2. |
| `NEXTAUTH_URL` | `http://localhost:3000` (for local). |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` in a terminal and paste the result. |
| `GOOGLE_CLIENT_ID` | From Step 6 (you’ll add this after creating the OAuth client). |
| `GOOGLE_CLIENT_SECRET` | From Step 6. |

**Optional now, add later if you want them:**

- `ADMIN_EMAIL` — Your Google email. If you set this **before** running `db:seed`, the seed will create an admin user for you.
- `GOOGLE_SHEETS_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — Only needed if you want submissions synced to Google Sheets. You can leave these out for local testing.

**Example `.env` (minimum for local):**

```env
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<output of openssl rand -base64 32>"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

You’ll fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Step 6.

---

### Step 5. Create the database schema and load bird data

From the `birds-app` folder:

```bash
npx prisma db push
npm run db:seed
```

- `db push` creates the tables.
- `db:seed` loads regions and birds from `prisma/Bird Species Database.xlsx`. **It deletes existing submissions, birds, and regions** and re-imports. If `ADMIN_EMAIL` is set in `.env`, it also creates or updates an admin user.

If you see a TLS or connection error with Neon, try the other connection string (direct vs pooled) in `DATABASE_URL` and run the commands again.

---

### Step 6. Set up Google OAuth (required for login)

1. Go to [Google Cloud Console](https://console.cloud.google.com).
2. Create or select a project.
3. **APIs & Services** → **Credentials** → **Create credentials** → **OAuth client ID**.
4. If asked, configure the **OAuth consent screen** (External, add your email as a test user).
5. Application type: **Web application**.
6. **Authorized redirect URIs** → **Add URI**:
   - `http://localhost:3000/api/auth/callback/google`
7. Create and copy the **Client ID** and **Client secret**.
8. Put them in `.env`:
   ```env
   GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="xxx"
   ```

---

### Step 7. Create an admin user (if you didn’t use `ADMIN_EMAIL`)

You need at least one user with `role: ADMIN` to sign in and invite others.

**Option A — Use the seed**

1. In `.env` set:
   ```env
   ADMIN_EMAIL="your@gmail.com"
   ```
2. Run:
   ```bash
   npm run db:seed
   ```
   (This will re-import regions and birds and create/update the admin. Existing submissions are cleared.)

**Option B — Use Prisma Studio**

1. Run:
   ```bash
   npx prisma studio
   ```
2. Open the `User` table → **Add record**.
3. Set:
   - `email`: your Google email  
   - `role`: `ADMIN`  
4. Save. You can leave `id` blank so it auto-generates.

---

### Step 8. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the Google account that has `ADMIN` (and that you added to the OAuth consent screen if it’s in test mode). From **Admin Panel** you can invite more users.

---

## Part 2: Deploy to production (optional)

When you’re ready to put the app online for **$0/month**:

- **Quick checklist:** **[DEPLOY_NOW.md](DEPLOY_NOW.md)**
- **Full guide:** [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md) — Vercel + Neon, env vars, Google OAuth, and `db:push` / `db:seed` for a new production DB.

---

## Part 3: Google Sheets sync (optional)

If you want submissions to sync to a Google Sheet:

1. In Google Cloud: **IAM & Admin** → **Service Accounts** → create a service account → **Keys** → **Add key** → **JSON**. Download the key.
2. In the JSON, note `client_email` and `private_key`. Put `\n` in the `private_key` as literal `\n` in `.env` (e.g. `"-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"`).
3. Create a Google Sheet and share it with the service account email (Editor).
4. In `.env` set:
   ```env
   GOOGLE_SHEETS_SPREADSHEET_ID="<id from the sheet URL>"
   GOOGLE_SERVICE_ACCOUNT_EMAIL="<client_email from JSON>"
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="<private_key with \n as literal \n>"
   ```
5. The app expects a sheet tab named **Bird Submissions**; it will create it if the spreadsheet exists but the tab does not.

---

## Quick checklist (local)

- [ ] `npm install` in `birds-app`
- [ ] Neon project created and `DATABASE_URL` in `.env`
- [ ] `NEXTAUTH_URL`, `NEXTAUTH_SECRET` in `.env`
- [ ] `npx prisma db push` and `npm run db:seed` run successfully
- [ ] Google OAuth client created; `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`
- [ ] Redirect URI `http://localhost:3000/api/auth/callback/google` in OAuth client
- [ ] Admin user exists (`ADMIN_EMAIL` before seed, or via Prisma Studio)
- [ ] `npm run dev` → open http://localhost:3000 and sign in with the admin Google account
