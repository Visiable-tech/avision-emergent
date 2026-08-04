# AVISION ONE — Architecture Audit
*Read-only snapshot as of the current commit. No code was modified while producing this audit.*

---

## 1. Technology Stack (current)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Mobile Frontend** | Expo (React Native) + expo-router | expo-video ~3.0.16, react-native-web bundled | File-based routing under `/app/frontend/app/` |
| **Language** | TypeScript | strict via tsconfig | |
| **Backend** | FastAPI + Uvicorn | fastapi 0.110.1 | Modular routers |
| **Async Mongo Driver** | Motor | 3.3.1 | |
| **Auth** | JWT + bcrypt (custom) | pyjwt, bcrypt 4.1.3 | 30-day access token, HS256 |
| **Payments** | Razorpay Python SDK | 2.0.1 (TEST key configured) | Web checkout via inline script |
| **AI** | Claude Sonnet 4.5 via `emergentintegrations` | Emergent LLM key | Also used in `/ai/chat`, `/ai-doubt/*` |
| **Websockets** | FastAPI websockets | native | Live classroom, chat, polls |
| **Realtime** | Server-Sent Events | native | AI doubt streaming |
| **Database** | MongoDB (single db) | Motor 3.3.1 | ~27 collections in use |
| **Website** | *NOT PRESENT* | — | avision.co.in is out-of-repo |
| **Super Admin** | *NOT PRESENT* | — | No admin UI exists |

**Verdict:** the stack is solid and modern; nothing needs replacing to reach AVISION ONE. What's missing is (a) a unified content-management layer and (b) additional frontends (website + admin).

---

## 2. Current Backend Modules

Routers registered in `server.py`:

| File | Prefix | Purpose | Storage |
|---|---|---|---|
| `auth.py` | `/api/auth` | Register / login / reset / update category / update language | DB (`users`, `revoked_tokens`, `password_reset_tokens`) |
| `categories.py` | `/api`, `/api/admin` | Exam category master + admin CRUD | DB (`exam_categories`, `exams`) ✅ |
| `home_extras.py` | `/api` | Banners, Job Alerts, Daily Challenge subjects | **Hardcoded lists** + DB (`daily_challenge_attempts`) |
| `feed.py` | `/api/feed` | Social posts | **Hardcoded posts** + DB (`feed_likes`, `feed_comments`) |
| `reels.py` | `/api/reels` | Reels/Shorts | **Hardcoded seed** |
| `live_batches.py` | `/api/live-batches` | Legacy live batches | **Hardcoded** |
| `exam_info.py` | `/api/exam-info` | SEO exam info pages | **Hardcoded** |
| `test_prime.py` | `/api/test-prime` | CBT tests, exams, entitlements, orders | Mixed (`tp_admin_tests` DB + hardcoded question-gen + hardcoded EXAMS/TP_PLANS) |
| `magazine_booster.py` | `/api` | Magazine + Booster commerce | **Hardcoded issues/articles/packs** |
| `live_courses.py` | `/api/live-courses` | Live course catalog + enrollment + Razorpay | **Hardcoded COURSES + FACULTIES**; DB (`lc_enrollments`, `lc_orders`) |
| `live_classroom.py` | `/api/live-classroom` | Real-time WS chat/polls/presence | Fully DB (`lc_sessions`, `lc_chat`, `lc_polls`, `lc_hand_raises`) ✅ |
| `study_materials.py` | `/api/study-materials` | Course PDFs / notes | Fully DB (`lc_study_materials`, `lc_material_downloads`) ✅ |
| `ai_doubt.py` | `/api/ai-doubt` | Claude-powered doubt Q&A | Fully DB (`ai_threads`, `ai_messages`) ✅ |
| `video_courses.py` | `/api/video-courses` | Video course catalog + Razorpay | **Hardcoded COURSES + COUPONS + CATEGORIES**; DB (`vc_enrollments`, `vc_orders`) |

### Mongo collections in use (27)
```
users, revoked_tokens, password_reset_tokens          — identity
exam_categories, exams                                 — masters (✅ DB-backed)
feed_likes, feed_comments                              — feed engagement
daily_challenge_attempts, chat_messages                — engagement
ai_threads, ai_messages                                — AI conversations
lc_enrollments, lc_orders                              — live course commerce
lc_sessions, lc_chat, lc_polls, lc_hand_raises         — live classroom realtime
lc_study_materials, lc_material_downloads              — study materials
tp_admin_tests, tp_questions, tp_attempts,
tp_entitlements, tp_orders                             — test prime
vc_enrollments, vc_orders, vc_coupons                  — video course commerce
```

---

## 3. Current Frontend Structure

Screens under `/app/frontend/app/`:

```
(tabs)/          — Home, Courses (VOD landing), Test (test-prime), Live, Profile, etc.
auth/            — welcome, login, register, forgot
live-courses/    — [id] sales, dashboard/, my-courses, faculty, session/, analytics/, materials/
video-courses/   — [id] sales, my.tsx  (dashboard + player NOT YET BUILT)
live-classroom/  — WS classroom UI
ai-doubt/        — AI chat threads
test-prime/      — CBT engine
magazine/, booster/, feed, job-alerts, planner, quiz, practice, exam/, course/, daily-challenge/, reels/
```

Shared `src/`:
- `api.ts` — thin fetch helper with JWT header
- `AuthContext.tsx` — user session
- `CategoryContext.tsx` — exam category filter
- `i18n.tsx` — en/hi/bn strings
- `theme.ts` — design tokens
- `razorpay.ts` — web checkout helper
- `classroomWs.ts`, `aiDoubtStream.ts` — realtime helpers

---

## 4. Deep-Dive: Where do things live today?

### 4.1 Students / Identity ✅ DB-backed
- Collection `users` with `user_id, email, password_hash, name, phone, category_id, course_id, language, coins, xp, streak, is_instructor`.
- **Missing** for AVISION ONE: `avision_id` (public human-readable), `roles[]` (student/admin/faculty/counsellor), `centre_id`, `admission_source`, `counsellor_id`, `enrolment_channel` (online/offline), `kyc/status`, `active`, `phone_verified`, `email_verified`.

### 4.2 Courses ❌ Hardcoded
- **Live Courses:** `COURSES = [...]` list in `live_courses.py` (~8 courses). Faculty as `FACULTIES = [...]`. Subjects/topics inline dicts.
- **Video Courses:** `COURSES = [...]` list in `video_courses.py` (~8 courses). Faculty as image URLs only. `CATEGORIES = [...]`, `COUPONS = [...]` all hardcoded.
- **Legacy Course Master:** `seed_data.py::COURSES` — a separate 3rd list of "old" courses.
- **Verdict:** three parallel course universes. To reach *"create once, display everywhere"* they must merge into a single `products` collection with typed sub-collections.

### 4.3 Purchases / Orders ⚠️ Fragmented DB
- `lc_orders`, `tp_orders`, `vc_orders` — three parallel order tables, each with its own Razorpay flow.
- No unified `orders` or `payments` collection.
- No refund tracking, no invoicing, no order-history endpoint that spans all products.

### 4.4 Entitlements ⚠️ Fragmented
- `tp_entitlements` (Test Prime plan/expiry).
- `lc_enrollments` doubles as live-course entitlement.
- `vc_enrollments` doubles as video-course entitlement.
- **No unified access engine** — every module rolls its own "is the user allowed to see X?" check.

### 4.5 Content (banners / jobs / articles / feed / reels / magazine) ❌ Hardcoded
- All static arrays in Python files. No CMS, no admin CRUD endpoints, no versioning.

### 4.6 Faculty ⚠️ Hardcoded list
- `live_courses.py::FACULTIES` — 6 records. Rendered via `/api/live-courses/faculty` + `/faculty/{fid}`.
- Video course faculty are just image URLs (no linkage).
- **No Faculty Master collection**. No admin CRUD.

### 4.7 Test Prime ✅ Mostly DB (with quirks)
- Admin-created tests stored in `tp_admin_tests`.
- Question bank auto-generated on demand (`_gen_question_bank`) — good but not curated.
- Categories/exams/test-types/plans are hardcoded.
- Attempt tracking in `tp_attempts` ✅ correctly DB-backed.

### 4.8 Categories/Exams ✅ DB-backed already
- `exam_categories`, `exams` collections with public + admin routers. This is the *only* clean master today and is a **good template** for the rest.

### 4.9 Auth / Roles ⚠️ Minimal
- Only `is_instructor` (bool) and an ad-hoc admin check based on email address (`test_prime.py::_is_admin` compares email against `admin@avision.com`, `test@avision.com`).
- No proper `roles[]`, no permission table.

---

## 5. What must be refactored for AVISION ONE

Priority order (P0 → P3):

### P0 — Common Foundation (foundational, blocks everything else)
1. **Unified Product Master** — replace three `COURSES` lists with one `products` collection typed `live_course | video_course | test_series | booster | magazine | study_pack`.
2. **Unified Order + Payment tables** — merge `lc_orders`/`tp_orders`/`vc_orders` → `orders` and separate `payments` (Razorpay + offline + coupon adjustments).
3. **Entitlement Engine** — single `entitlements` collection: `{user_id, product_id, product_type, source: online|offline|coupon|admin, granted_at, expires_at, active, order_id, centre_id}`. Every gate (video watch / test attempt / course dashboard) queries this.
4. **AVISION Student ID** — every `user` gets a stable public id (`AV-2026-000123`). Add `roles[]`, `centre_id`, `admission_source`, `counsellor_id`, `active`, `verification` flags.
5. **Secure API contract** — introduce `X-Client` header (`app|website|admin`) + role-based route guards; harden existing `/api/admin/*` routes with a proper `is_admin` middleware.

### P1 — Connect Existing App to the Foundation
6. Migrate `live_courses.py`, `video_courses.py`, `magazine_booster.py`, `test_prime.py` to read from `products` (drop hardcoded lists). Keep the API contracts stable so the mobile app doesn't break.
7. Faculty Master collection with admin CRUD; attach `faculty_ids` on `products`.
8. Coupon Master collection with admin CRUD (replace `COUPONS = [...]`).
9. Merge study materials + video lectures under one `content_assets` schema (PDF / video / quiz / current-affair / notes) with `product_id` linkage.
10. `progress` collection — per-user per-lecture watch state (backbone for Video Course dashboard analytics, Phase 3 of the Video Courses feature).

### P2 — Super Admin Panel (new frontend)
11. React (or Next.js) admin app inside a new folder `/app/admin/` — separate build, same backend.
12. Modules: Students, Products, Live Courses, Video Courses, Test Prime, Question Bank, Study Materials, Current Affairs, Orders, Payments, Coupons, Entitlements, Faculty Master, Banners/Offers, Notifications, Centres, Reports.
13. Manual-enrollment flow (offline pay → admin enrolls → entitlement grant).

### P3 — Public Website (avision.co.in) & AI Layer
14. Next.js website + student web portal reading the same backend.
15. AI Study Assistant / weak-topic analysis / recommendations.

### Things that can remain unchanged
- Auth flow, JWT + bcrypt — solid.
- Live Classroom (WS), AI Doubt (SSE), Study Materials, Categories, `ai_threads/messages` — already DB-backed and modular.
- Frontend design system (`theme.ts`), Category context, i18n, expo-router structure — do not touch.

---

## 6. Proposed Database Schema Changes

New / evolved collections (name → key fields):

```txt
users             +avision_id, +roles[], +centre_id, +admission_source,
                  +counsellor_id, +active, +phone_verified, +email_verified

centres           id, name, type: own|franchise, city, state, active, admin_user_ids[]

products          id, type: live_course|video_course|test_series|booster|magazine|study_pack,
                  name, slug, category_id, exam_ids[], faculty_ids[], banner, gradient,
                  price, offer_price, currency, validity_days, language, features[],
                  visibility: {app, website, admin_only},
                  active, display_order, seo{title,desc,keywords},
                  meta: {...type-specific payload...}

subjects          id, product_id, name, key, order, hours

chapters          id, product_id, subject_id, name, order

lectures          id, product_id, subject_id, chapter_id, title,
                  duration_sec, is_free, video_url, poster, downloadable

content_assets    id, product_id, type: pdf|note|quiz|current_affair|video_extra,
                  title, url, subject_id?, chapter_id?

faculty           id, name, photo, designation, subject, experience_years,
                  bio, courses_assigned[], visibility{app,website}, active

coupons           id, code, discount_pct, max_discount_inr, applies_to_types[],
                  applies_to_products[], valid_from, valid_until, usage_limit,
                  used_count, active

orders            id, avision_order_id, user_id, items:[{product_id, price, qty}],
                  subtotal, discount_inr, coupon_code, total, currency,
                  status: created|paid|failed|refunded, source: app|website|admin,
                  channel: online|offline, centre_id, counsellor_id, created_at

payments          id, order_id, gateway: razorpay|offline|admin_grant,
                  gateway_order_id, gateway_payment_id, amount, status, method,
                  paid_at, verified_at, raw_response

entitlements      id, user_id, product_id, product_type, order_id?,
                  source: online|offline|coupon|admin_grant, granted_at,
                  expires_at, active, notes

progress          id, user_id, product_id, lecture_id, chapter_id, subject_id,
                  watched_pct, watch_seconds, last_pos_seconds, completed,
                  first_watched_at, last_watched_at

bookmarks         id, user_id, product_id, item_type, item_id, created_at

notifications     id, user_id?, audience{roles[], categories[]}, title, body,
                  cta_url, sent_at, read_by[]

banners           id, image, cta_url, target: app|website, position, order, active

cms_pages         id, slug, target: app|website, title, blocks[], published
```

Existing collections that can stay **as-is**: `revoked_tokens`, `password_reset_tokens`, `lc_sessions`, `lc_chat`, `lc_polls`, `lc_hand_raises`, `lc_material_downloads`, `ai_threads`, `ai_messages`, `daily_challenge_attempts`, `chat_messages`, `feed_likes`, `feed_comments`, `tp_attempts`, `tp_questions`.

Collections to **rename / merge**:
- `lc_orders` + `tp_orders` + `vc_orders` → `orders`
- `lc_enrollments` + `vc_enrollments` + `tp_entitlements` → `entitlements`
- `lc_study_materials` → `content_assets` (type=pdf|note)

---

## 7. Proposed API/Service Architecture

```
/api/auth/*                 — identity (existing)
/api/categories/*           — exam categories (existing)
/api/products/*             — NEW unified catalog (list, detail, search)
/api/products/{id}/purchase — NEW unified checkout (Razorpay/offline)
/api/entitlements/mine      — NEW unified access check
/api/progress/*             — NEW watch + attempt aggregation
/api/live-courses/*         — thin façade → products.type=live_course
/api/video-courses/*        — thin façade → products.type=video_course
/api/test-prime/*           — thin façade → products.type=test_series
/api/live-classroom/*       — real-time (unchanged)
/api/study-materials/*      — thin façade → content_assets (type=pdf|note)
/api/ai-doubt/*             — unchanged
/api/faculty/*              — NEW admin CRUD + public read
/api/admin/*                — role-guarded admin endpoints
/api/cms/*                  — website + app CMS blocks
```

Rule: every "list" endpoint accepts `x-client: app|website|admin` header and applies `visibility` filter. Every "detail" endpoint attaches an `access` block computed against the caller's entitlements.

---

## 8. Migration Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Breaking mobile app during refactor | HIGH | Keep existing endpoints (`/api/live-courses/*`, `/api/video-courses/*`, `/api/test-prime/*`) as thin façades over the new `products` table. Do NOT change response shapes — the mobile app continues to work. |
| Data migration from hardcoded lists | MEDIUM | Write idempotent seed scripts that upsert into `products` at startup. Keep hardcoded lists as fallback for one release. |
| Existing enrollments losing linkage | HIGH | On migration, backfill `entitlements` from `lc_enrollments` + `vc_enrollments` + `tp_entitlements`; keep old tables read-only for 1 release. |
| Payment orders in flight | HIGH | Freeze writes to old order tables during cut-over. Or run both tables in parallel and reconcile. |
| Auth changes might invalidate JWTs | MEDIUM | Any user-doc field additions are additive. Do NOT change JWT structure. |
| Emergent LLM key exposure | LOW | Already backend-only via `EMERGENT_LLM_KEY`. Keep gated behind `/api/ai-doubt/*` role guard. |
| Realtime (WS) coupling to `lc_sessions` | LOW | These live-classroom collections are separate and safe to keep. |

---

## 9. Recommended Implementation Sequence

**Phase 1a — Foundation (backend only, no UI change)**
1. Add fields to `users`: `avision_id`, `roles[]`, `centre_id`, `admission_source`, `counsellor_id`, `active`. Backfill.
2. Create `products`, `faculty`, `coupons`, `orders`, `payments`, `entitlements`, `progress`, `centres` collections + indexes.
3. Migrate seed lists into `products` (idempotent script). Live/Video/Test/Booster/Magazine all become rows in one table.
4. Introduce entitlement helper `has_access(user_id, product_id) -> bool` and use it as a `Depends()` in gated routes.
5. Route all Razorpay flows through unified `/api/products/{id}/purchase` while keeping legacy façades.

**Phase 1b — Video Courses Post-Purchase (the deferred user request)**
6. Ship the Post-Purchase Video Courses Dashboard + Player + Progress + Analytics (Phase 2 & 3 of the earlier plan) — now built on top of `entitlements` + `progress` collections instead of the ad-hoc `vc_enrollments`.

**Phase 2 — Connect Existing App**
7. Rewrite live/video/test-prime router internals to read `products`. External responses unchanged.
8. Faculty Master admin routes + move `FACULTIES` list into `faculty` collection.
9. Coupon Master admin routes + move `COUPONS` list into `coupons` collection.
10. Manual-enrollment endpoint (`POST /api/admin/enroll`) that creates an `orders` row (channel=offline) + entitlement.

**Phase 3 — Super Admin Panel**
11. Bootstrap a Next.js admin app at `/app/admin/` sharing the same backend. Ship Students, Products, Orders, Entitlements, Faculty, Coupons first.

**Phase 4 — Public Website**
12. Bootstrap Next.js website at `/app/website/`. SEO course marketplace + student web portal.

**Phase 5 — AI Layer**
13. Study assistant, weak-topic analysis, recommender.

---

## 10. What we should NOT do

- Do **not** delete `live_courses.py`, `video_courses.py`, `test_prime.py`, `magazine_booster.py` routers. Wrap, don't remove.
- Do **not** rename `EXPO_PACKAGER_PROXY_URL` / `EXPO_PACKAGER_HOSTNAME` / `MONGO_URL`.
- Do **not** modify JWT structure — additive fields only on user documents.
- Do **not** ship the Super Admin as a separate backend. One backend, one DB, one identity.

---

*End of audit.*
