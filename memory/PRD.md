# Avision Institute - PRD

## Overview
Premium mobile learning app for Indian competitive exam preparation, driven by **Exam Categories** (Banking, SSC, Railway, Insurance, Defence, Police, Teaching, MBA, Law, UPSC, CUET, State Exams).

## Brand
- Name: Avision Institute
- Tagline: One Destination for Every Competitive Exam
- Colors: Royal Blue (#0B4DB8), Copper Gold (#C68A2D), Clean White
- Design: Apple-inspired, glassmorphism, 20-24px rounded corners

## Tech Stack
- Frontend: React Native (Expo Router SDK 54), TypeScript
- Backend: FastAPI + MongoDB (Motor async)
- AI: Claude Sonnet 4.5 via emergentintegrations & EMERGENT_LLM_KEY
- Auth: JWT (PyJWT HS256, 30-day), bcrypt(12), expo-secure-store / localStorage

## Architecture — Exam Category driven
- `exam_categories` collection: 12 seeded categories, each with slug/icon/color/banner/status/display_order.
- `exams` collection: many-to-one to categories, each with slug/status/display_order.
- `users` collection: `category_id`, `selected_exam_id` (optional), `language` (en/hi/bn), plus name/email/password/phone/coins/xp/streak/level/referral_code.
- All content endpoints support `?category=<id>` filter. Content with `category_id: None` is treated as universal.
- Admin CRUD endpoints for categories & exams — ready for a web/mobile admin UI.

## Registration Flow (rewritten)
1. **Welcome** — brand hero + Create Account / I already have an account.
2. **Category Select (`/auth/category-select`)** — beautiful grid of 12 category cards with icon + name + top-3-exams subtitle + live search box. Selected card gets blue background + checkmark badge. Continue button disabled until pick.
3. **Register (`/auth/register`)** — chip showing selected category (with Change link) + Name, Email, Phone (+91 with 10-digit validation), Password, Confirm Password.
4. On success → auto-login → home; `category_id`, `language`, and 100-coin welcome bonus saved on the user.

## Header (Home)
- Time-aware localized greeting + user first name
- **Exam Category dropdown** chip → opens bottom-sheet with search + 12 categories, tap to switch
- **Language dropdown** chip → English / हिन्दी / বাংলা with flags
- Streak chip + Coins chip
- Category & language change refresh Home content immediately and persist across reloads (localStorage + backend sync)

## i18n
- Provider: `/app/frontend/src/i18n.tsx`
- ~90 key strings translated in English, Hindi, Bengali
- Covers: navigation labels, greetings, welcome/register/login/forgot-password flows, home sections, profile menu, tests page, error messages
- Selected language persisted locally and mirrored to `/api/auth/update-language` for logged-in users

## Content Filtering
Every listing endpoint accepts `?category=<slug>` — courses, live classes, mock tests, current affairs. Frontend `CategoryContext` centralizes selected category and threads it through all API calls. Content tagged with `category_id: None` (e.g. general daily current affairs) is visible in every category.

## Backend Endpoints (added / updated)
### Categories (new)
- `GET  /api/exam-categories/active?search=` — active list with search + subtitles
- `GET  /api/exam-categories/all` — all (including inactive) for admin
- `GET  /api/exam-categories/{id}` — detail with exams
- `GET  /api/exams-by-category/{cid}` — exams under a category

### Admin (new, no auth-gate yet — see next steps)
- `POST/PUT/DELETE /api/admin/categories[/id]`
- `POST/PUT/DELETE /api/admin/exams[/id]` — validates parent category

### Auth (updated)
- `POST /api/auth/register` — now accepts `category_id` (new) OR `course_id` (legacy) + `language` field
- `POST /api/auth/update-category` — Bearer required
- `POST /api/auth/update-language` — Bearer required
- Everything else unchanged and passing tests

### Content (updated, backward compatible)
- All content endpoints accept `?category=<slug>` filter
- Old signatures still work (no filter → returns all)

## Screens
### Auth
- Welcome, **Category Select** (new grid), Register, Login, Forgot Password (all localized)

### Tabs
- Home (header dropdowns, category-filtered content)
- Courses (category filter)
- Tests (category filter, daily challenge, leaderboard)
- Current Affairs
- Profile (logout, all menu labels localized)

### Detail / modals
- Exam Detail (11 tabs), Course Detail, AI Tutor (Claude Sonnet 4.5), AI Study Planner, Daily Quiz, Live Class player

## Testing Summary
- Iteration 1: 25/25 backend tests PASS + full frontend flows PASS
- Iteration 2 (Auth): 33/33 backend tests PASS + full auth frontend PASS
- Iteration 3 (Category arch): **87/87 backend tests PASS** (25 base + 33 auth + 29 categories) + full frontend PASS including:
  - Category grid rendering + search filter
  - Register with category_id auto-login
  - Header language switch → UI re-renders in Hindi
  - Header category switch → Home content refreshes
  - Category + language persist across app reload

## Not Built (still deferred)
- **Admin UI** — CRUD endpoints exist and are unit-tested, but a full mobile admin panel isn't built. Recommended: build a lightweight web admin (React/Next) that hits the same `/api/admin/*` endpoints.
- Admin auth-gating: the `/api/admin/*` endpoints are OPEN in this MVP. **Before production**, add a role check (add `role: "admin"` on user + `require_admin` dependency).
- Emergent Google Sign-In (still email/password JWT only)
- Razorpay subscription (awaiting user's test keys)
- Persistent per-user quiz history / real leaderboard
- Refer & Earn redemption UI
- Push notifications, offline downloads, multi-language for AI chat replies
