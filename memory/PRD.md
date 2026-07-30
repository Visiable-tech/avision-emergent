# Avision Institute - PRD

## Overview
A premium mobile learning app for Indian competitive exam preparation. Combines the strengths of Adda247, Physics Wallah, EduRev, BYJU'S, Unacademy, Testbook, and Oliveboard under a distinctive Avision Institute identity.

## Brand
- Name: Avision Institute
- Tagline: One Destination for Every Competitive Exam
- Colors: Royal Blue (#0B4DB8), Copper Gold (#C68A2D), Clean White
- Design: Apple-inspired, premium glassmorphism, 20-24px rounded corners

## Tech Stack
- Frontend: React Native (Expo Router), TypeScript, expo-blur, expo-linear-gradient, expo-image
- Backend: FastAPI + MongoDB (Motor async)
- AI: Claude Sonnet 4.5 (Anthropic) via emergentintegrations & EMERGENT_LLM_KEY

## Screens Implemented
1. **Home Dashboard** (`/(tabs)/index`) — Personalized greeting, streak/coins chips, rotating search bar, Continue Learning hero card with progress, 12-tile Quick Access grid, Live Classes horizontal scroll, all 9 Exam Categories with sub-exams
2. **Video Courses** (`/(tabs)/courses`) — Subject filter chips, Live-now horizontal strip, Netflix-style course cards with rating/progress
3. **Test Series** (`/(tabs)/tests`) — Daily Challenge hero, filter chips (Full Mock/Sectional/PYQ), mock test list, leaderboard (with "You" highlighted)
4. **Current Affairs** (`/(tabs)/current-affairs`) — Newspaper style: featured hero + category chips + news list
5. **Profile** (`/(tabs)/profile`) — Gradient header (XP/Coins/Streak/Level), Performance analytics with weekly-hours bar chart & subject-strength bars, AI Suggestions, badges, menu
6. **Exam Detail** (`/exam/[id]`) — Hero gradient banner, 11 pinned tabs (Overview, Eligibility, Salary, Syllabus, Pattern, Books, Strategy, Cutoffs, PYQ, Roadmap, FAQs), sticky "Start AI Preparation" CTA
7. **Course Detail** (`/course/[id]`) — Full player mock, instructor card, progress, lesson list with checkmarks, Notes / Discussion tabs
8. **AI Tutor** (`/ai-tutor`) — Full chat UI, quick prompts, persistent history in MongoDB, streaming via Claude Sonnet 4.5
9. **AI Study Planner** (`/planner`) — Exam / hours / weak-subjects / target-date inputs → markdown plan from Claude
10. **Daily Quiz** (`/quiz`) — Timed 5-Q flow, prev/next nav, submit → results screen with score, accuracy, coins/XP, question-wise review with explanations
11. **Live Class** (`/live/[id]`) — Player mock with LIVE badge + viewers, action row (Raise Hand, Polls, Notes, Save), live chat with send

## Backend Endpoints
- `GET /api/greeting` — greeting + streak/coins/xp
- `GET /api/quick-access` — 12 tiles
- `GET /api/exam-categories` — 9 groups, ~60 exams
- `GET /api/exams/{id}` — full exam detail
- `GET /api/courses`, `GET /api/courses/{id}`
- `GET /api/live-classes`
- `GET /api/current-affairs`, `GET /api/current-affairs/{id}`
- `GET /api/daily-quiz`
- `POST /api/quiz/submit` — scoring + coin/XP earnings
- `GET /api/mock-tests`
- `GET /api/leaderboard`
- `GET /api/profile`
- `GET /api/performance` — weekly hours, subject strength, AI suggestions
- `POST /api/ai/chat` — multi-turn Claude Sonnet 4.5
- `GET /api/ai/history/{session_id}`
- `POST /api/ai/reset/{session_id}`
- `POST /api/study-planner` — AI-generated markdown plan

## Not Implemented (MVP scope)
- Firebase auth / Google / Apple sign-in (mock student profile used)
- Razorpay payment integration (UI only, no charge)
- Push notifications
- Offline downloads (UI only)
- Admin panel (out of MVP scope)
- Multi-language (English only)
