# Avision Institute - PRD

## Overview
Premium mobile learning app for Indian competitive exam preparation (SSC, Banking, UPSC, Railway, Teaching, Law, Management, Defence, State Exams). Combines the strengths of Adda247, Physics Wallah, EduRev, BYJU'S, Unacademy, Testbook, and Oliveboard under a distinctive Avision Institute identity.

## Brand
- Name: Avision Institute
- Tagline: One Destination for Every Competitive Exam
- Colors: Royal Blue (#0B4DB8), Copper Gold (#C68A2D), Clean White
- Design: Apple-inspired, glassmorphism, 20-24px rounded corners

## Tech Stack
- Frontend: React Native (Expo Router SDK 54), TypeScript, expo-blur, expo-linear-gradient, expo-image, expo-secure-store
- Backend: FastAPI + MongoDB (Motor async)
- AI: Claude Sonnet 4.5 (Anthropic) via emergentintegrations & EMERGENT_LLM_KEY
- Auth: JWT (PyJWT, HS256), bcrypt(12), tokens in expo-secure-store (native) / localStorage (web)

## Auth Flow (added in Iteration 2)
1. **/auth/welcome** — Landing screen with Create Account + Login options.
2. **/auth/course-select** — Step 1 of registration: mandatory course selection from active courses. Card highlights on select; Continue disabled until picked.
3. **/auth/register** — Step 2: Name, Email, Phone (+91), Password, Confirm Password. Client + server validation. On success → auto-login → home. Selected course is saved as `course_id` on the user.
4. **/auth/login** — Email + Password → JWT. Forgot Password link.
5. **/auth/forgot-password** — Enter email → mock reset token surfaced in UI → paste token + new password → reset done → back to login.
6. Route guarding: `_layout.tsx` redirects unauthenticated users to `/auth/welcome`; authenticated users away from `/auth/*` to `/(tabs)`.
7. Logout available in Profile menu → clears token & redirects to welcome.

Security features: bcrypt rounds=12, 72-byte password enforcement, 5-failed-attempts → 15-min account lockout, dummy-hash check against timing attacks on unknown emails, revoked-JTI store, TTL indexes for token cleanup, no `_id` leakage.

## Screens Implemented
### Tabs (protected)
1. **Home Dashboard** — Personalized greeting (uses logged-in user name & real coins/xp/streak), rotating search, Continue Learning hero, Quick Access grid, Live Classes, all 9 exam categories with ~60 sub-exams
2. **Video Courses** — Netflix-style
3. **Test Series** — Daily Challenge + Mocks + Leaderboard
4. **Current Affairs** — Newspaper style
5. **Profile** — Real user data (name, email), XP/Coins/Streak/Level, performance chart, subject strength bars, AI Suggestions, badges, menu with **Logout**

### Detail / modals
6. Exam Detail (11 tabs)
7. Course Detail
8. AI Tutor chat (Claude Sonnet 4.5)
9. AI Study Planner
10. Daily Quiz with per-question review
11. Live Class player with chat + Raise Hand

### Auth (new)
12. Welcome
13. Course Select (Step 1)
14. Register (Step 2)
15. Login
16. Forgot Password

## Backend Endpoints
### Auth (new)
- `POST /api/auth/register` — creates user (welcome bonus 100 coins, referral_code generated)
- `POST /api/auth/login` — issues 30-day JWT
- `GET  /api/auth/me` — current user (Bearer)
- `POST /api/auth/logout` — revokes JTI
- `POST /api/auth/forgot-password` — returns mock reset token (dev)
- `POST /api/auth/reset-password` — resets password
- `POST /api/auth/update-course` — change selected course (Bearer)

### Courses / content
- `GET /api/courses` — all courses
- `GET /api/courses/active` — active only (for course-select step)
- `GET /api/courses/{id}`
- `GET /api/exam-categories`, `GET /api/exams/{id}`
- `GET /api/live-classes`
- `GET /api/current-affairs`, `GET /api/current-affairs/{id}`
- `GET /api/daily-quiz`, `POST /api/quiz/submit`
- `GET /api/mock-tests`, `GET /api/leaderboard`
- `GET /api/profile` (mock dashboard), `GET /api/performance`
- `GET /api/greeting` — Bearer-aware (uses logged-in user data if provided)
- `GET /api/quick-access`

### AI
- `POST /api/ai/chat` — multi-turn Claude Sonnet 4.5
- `GET /api/ai/history/{session_id}`
- `POST /api/ai/reset/{session_id}`
- `POST /api/study-planner`

## Data Model
### users collection
`user_id, name, email (unique), password_hash, phone, course_id, auth_provider, coins, xp, streak, level, referral_code (unique), referred_by, created_at, failed_login_attempts, lock_until, last_login_at`

### Supporting collections
- `revoked_tokens` (TTL: exp)
- `password_reset_tokens` (TTL: exp)
- `chat_messages` (AI tutor history)

## Testing Summary
- Iteration 1: 25/25 backend tests PASS + all critical frontend flows PASS
- Iteration 2 (Auth): 33/33 backend tests PASS + all auth frontend flows PASS

## Not Built (still deferred)
- Emergent Google Sign-In (only email/password JWT for now — user can revisit later)
- Razorpay payment (awaiting user's test keys)
- Persistent per-user quiz attempt history / real leaderboard (currently static)
- Refer & Earn — referral_code is generated per user but the redemption flow (200-coin credit + `referred_by` handling on register) is not yet wired end-to-end. Backend has the field but UI is not exposed. Next iteration.
- Push notifications, offline downloads, admin panel, multi-language
