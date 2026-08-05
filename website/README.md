# Avision Institute — Public Website (Next.js 15)

Standalone Next.js 15 App Router project that consumes the AVISION ONE common backend. Includes marketing pages + student web portal with Test Prime attempts.

## Local dev

```bash
yarn install
yarn dev
# → http://localhost:3001
```

Set `NEXT_PUBLIC_API_ORIGIN` in `.env` to your FastAPI backend URL (defaults to `http://localhost:8001`).

## Deploy to Vercel (5 minutes)

You need a Vercel account (free tier is fine).

### Step 1 — Push this folder to a GitHub repo
```bash
cd /app/website
git init
git add -A
git commit -m "Avision staging website"
# Create a new empty repo on github.com/<your-user>/avision-website
git remote add origin git@github.com:<your-user>/avision-website.git
git push -u origin main
```

### Step 2 — Import into Vercel
1. Go to https://vercel.com/new
2. Click **Import Git Repository** → pick `avision-website`
3. Framework preset: **Next.js** (auto-detected)
4. Root Directory: `./` (keep default)
5. **Environment Variables** → add:
   ```
   NEXT_PUBLIC_API_ORIGIN = https://<YOUR-EMERGENT-PREVIEW-DOMAIN>
   NEXT_PUBLIC_SITE_URL   = https://avision-staging.vercel.app  (or your custom staging URL)
   NEXT_PUBLIC_SITE_NAME  = Avision Institute
   ```
   Replace `<YOUR-EMERGENT-PREVIEW-DOMAIN>` with the same host you use to open the Expo app. Example: `https://avision-42abcd.preview.emergentagent.com`. The `/api/*` proxy on that domain routes to the FastAPI backend — no CORS issues because the Next.js server calls it, not the browser.
6. Click **Deploy** — done in ~90 seconds.

Vercel will give you a public URL like `https://avision-website-<hash>.vercel.app`. Point a `staging.avision.co.in` CNAME at it later if you like — your live `avision.co.in` stays untouched.

### Step 3 — Verify

Open the Vercel URL and confirm:
- Home page loads with courses/testimonials (proves backend integration).
- Log in at `/login` with `test@avision.com` / `Test@123`.
- Portal at `/portal` shows KPIs.
- Then in the Super Admin (`/admin/settings/status` on your Expo preview URL) confirm the "Website" heartbeat flips to **connected**.

## What's inside

- 20 marketing routes: home, exams, courses, live-courses, current-affairs, testimonials, results, faqs, centres, franchise, contact, dynamic CMS pages, sitemap, robots
- Student web portal: login, register, dashboard, library, course-detail, video-player, tests (list + preview + attempt runner + result), profile
- Full Test Prime web flow: 100 tests, 100 questions per attempt, timer + auto-save + anti-cheat, unified with mobile app via the common `tp_attempts` collection

## Architecture

```
                  COMMON BACKEND (FastAPI + Mongo)
                             │
                ┌────────────┼─────────────┐
                ▼            ▼             ▼
           EXPO APP     SUPER ADMIN     THIS WEBSITE
```

Every read/write goes through `NEXT_PUBLIC_API_ORIGIN/api/*`. HTTP-only cookies (`avn_session`) hold the student JWT — never exposed to client JS. Server-side Next.js route handlers proxy privileged calls (video progress, attempt state/submit/violation).
