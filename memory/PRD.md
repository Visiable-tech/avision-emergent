# Avision Institute - PRD

## Overview
Premium mobile learning app for Indian competitive exam preparation, Exam Category driven, with a fully reordered Home screen matching top edtech UX patterns (Testbook / Adda247 / Oliveboard).

## Home Screen Order (final)
1. **Banner Slider** — auto-sliding carousel with category-filtered banners + CTAs
2. **Quick Access** — 12-tile icon grid
3. **Exam Category** — the ONE selected category card (icon + name + top-4 exams) with a `Change` button
4. **Daily Current Affairs** — ONE latest article card (image + headline + summary + date + Read More) + `View All →`
5. **Continue Learning** — Netflix-style hero (only if the top course has progress > 0)
6. **Featured Courses** — horizontal course cards + `View All →`
7. **Live Classes** — horizontal live class cards + `View All →`
8. **Mock Tests** — top 3 tests + `View All →`
9. **Daily Challenge** — 2×2 grid of 4 challenges (Current Affairs / English / Reasoning / Quantitative Aptitude) with difficulty chips and per-day attempt limit
10. **Latest Job Alerts** — 2 cards (Org logo + Title + Org + Posts/Salary/Last Date + Apply Now) + `View All →`

All 10 sections auto-filter by the selected exam category. Changing category via the header dropdown refreshes the whole home screen without logout.

## New Backend (iteration 4)
### Data
- `daily_challenge_attempts` collection (unique index on user_id + subject_id + date)
- Static seeds for banners, job alerts, and 4 daily-challenge subjects (10 questions each)

### Endpoints
- `GET  /api/banners[?category=]`
- `GET  /api/current-affairs/latest[?category=]`
- `GET  /api/job-alerts[?category=&limit=]`, `GET /api/job-alerts/{id}`
- `GET  /api/daily-challenges[?category=&user_id=]` — includes `attempted` flag per subject when user_id passed
- `GET  /api/daily-challenges/{subject_id}` — questions WITHOUT correct answers
- `POST /api/daily-challenges/submit[?user_id=]` — returns per-Q review with options + correct answer + explanation, coins/xp earned, rank. Dedupes to one attempt/day/user; credits coins & xp to user account.

## New Frontend (iteration 4)
- `app/(tabs)/index.tsx` — completely rewritten Home in the new order
- `app/job-alerts.tsx` — full job list with category filter, pull-to-refresh
- `app/daily-challenge/[subject].tsx` — quiz + result screen with score/accuracy/time/rank + coins/xp earned
- Reusable `SectionTitle` and `SectionRow` helpers within Home for consistent look

## Testing (all iterations cumulative)
- Iteration 1 (MVP): 25/25 backend + all frontend ✅
- Iteration 2 (Auth): 33/33 backend + all frontend ✅
- Iteration 3 (Category arch + i18n): 87/87 backend + all frontend ✅
- Iteration 4 (Home restructure): **103/103 backend PASS** (16 new tests) + all frontend flows PASS including auto-slide banners, daily-challenge quiz submit → review, job list, and the critical `options` field in submit-response (fixed after first test run).

## Tech Stack (unchanged)
- Frontend: Expo Router SDK 54, TypeScript, expo-blur, expo-linear-gradient, expo-image, expo-secure-store
- Backend: FastAPI + MongoDB (Motor async), PyJWT, bcrypt
- AI: Claude Sonnet 4.5 via emergentintegrations
- i18n: en / हिन्दी / বাংলা

## Not Built (still deferred)
- Web-based **Admin Panel** for CRUD on categories, exams, banners, job alerts, daily challenges (backend endpoints exist for categories/exams)
- Admin auth-gating (`/api/admin/*` still open — add `role: admin` + require_admin dependency before production)
- Razorpay subscription (awaiting test keys)
- Refer & Earn redemption UI (referral_code field already present per user)
- Push notifications, offline downloads
- Google / Apple Sign-In
