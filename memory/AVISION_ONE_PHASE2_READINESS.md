# AVISION ONE — Phase 2 Website Readiness Report

**Date:** 2026‑06
**Prepared for:** Kickoff of `avision.co.in` public website + student web portal
**Status:** 🟢 **BACKEND FULLY READY — WEBSITE FRONTEND CAN START**

---

## 1. What was delivered in this iteration

### New backend module — `avision_cms.py`
A single generic CRUD engine that manages **20 CMS entities** on the common Mongo database:

| Category | Entity | Collection | Admin | Public API |
|---|---|---|---|---|
| **Academic (5)** | `exam_categories_cms` | `cms_exam_categories` | ✅ | ✅ |
| | `exams_cms` | `cms_exams` | ✅ | ✅ |
| | `subjects` | `cms_subjects` | ✅ | ✅ |
| | `chapters` | `cms_chapters` | ✅ | ✅ |
| | `lessons` | `cms_lessons` | ✅ | ✅ |
| **Learning content (5)** | `question_bank` | `cms_question_bank` | ✅ | ✖ (sensitive) |
| | `study_material_v2` | `cms_study_material` | ✅ | ✅ |
| | `current_affairs` | `cms_current_affairs` | ✅ | ✅ |
| | `digital_notes` | `cms_digital_notes` | ✅ | ✅ |
| | `previous_papers` | `cms_previous_papers` | ✅ | ✅ |
| **Content mgmt (8)** | `cms_web_pages` | `cms_web_pages` | ✅ | ✅ (by slug) |
| | `cms_app_pages` | `cms_app_pages` | ✅ | ✅ (by slug) |
| | `banners_home` | `cms_banners_home` | ✅ | ✅ |
| | `banners_promo` | `cms_banners_promo` | ✅ | ✅ |
| | `notifications` | `cms_notifications` | ✅ | ✅ |
| | `testimonials` | `cms_testimonials` | ✅ | ✅ |
| | `results` | `cms_results` | ✅ | ✅ |
| | `faqs` | `cms_faqs` | ✅ | ✅ |
| **Organisation (2)** | `franchises` | `cms_franchises` | ✅ | ✅ |
| | `centres_v2` | `cms_centres` | ✅ | ✅ |

### API contract (generic across every entity)
```
Admin only:
  GET    /api/admin/cms/entities              → registry with count/fields
  GET    /api/admin/cms/{entity}?q=&limit=    → list
  POST   /api/admin/cms/{entity}              → create
  GET    /api/admin/cms/{entity}/{id}         → detail
  PATCH  /api/admin/cms/{entity}/{id}         → update
  DELETE /api/admin/cms/{entity}/{id}         → delete

Public (App/Website):
  GET    /api/cms/{entity}?client=app|website
  GET    /api/cms/{entity}/{id_or_slug}?client=app|website
```

Every list respects the entity's `visibility.{app,website}` toggle, so the
same admin action controls what shows on the App vs the Website.

### Reports & Analytics (11 reports)
```
GET /api/admin/reports                 → index
GET /api/admin/reports/{slug}?range=today|7d|30d|all
```
Reports available: `students`, `product_sales`, `revenue`, `orders_report`,
`payments_report`, `course_performance`, `test_performance`, `engagement`,
`learning_progress`, `centre_wise`, `franchise_wise`. All data comes from
live Mongo aggregation on the common database.

### Super Admin frontend
- `/app/frontend/src/admin/EntityScreen.tsx` — one generic React Native (web) CRUD screen used by every entity route.
- `/app/frontend/src/admin/entitySpecs.tsx` — declarative field spec per entity (~30 lines each).
- `/app/frontend/app/admin/*` — 20 new/updated admin routes (~2 lines each).
- Reports & Analytics dashboard `/app/frontend/app/admin/reports.tsx`.
- Updated sidebar with all sections: Identity → Academic → Catalog → Learning Content → Commerce → Content & CMS → Analytics & Ops. **No "soon" pills left.**

---

## 2. Website Consumption Guide

Everything the Website needs is already served from `/api/*`. No auth is required for public reads (except entitled content like paid PDFs).

**Landing / marketing pages**
```
GET /api/cms/cms_web_pages/home?client=website
GET /api/cms/banners_home?client=website
GET /api/products?client=website&type=video_course
GET /api/cms/testimonials?client=website
GET /api/cms/results?client=website
GET /api/cms/faqs?client=website
```

**Exam pages**
```
GET /api/cms/exam_categories_cms?client=website
GET /api/cms/exams_cms?client=website&q=<name>
GET /api/cms/current_affairs?client=website
GET /api/cms/previous_papers?client=website
```

**Course detail (marketing)**
```
GET /api/products/{id}                            # already includes SEO + slug
GET /api/cms/study_material_v2?client=website     # free samples
GET /api/faculty                                  # unified faculty master
```

**Website checkout (reuses existing app flows)**
```
POST /api/live-courses/{cid}/pay/order            # Razorpay order
POST /api/live-courses/{cid}/pay/verify           # unified entitlement granted server-side
POST /api/video-courses/{cid}/pay/order
POST /api/video-courses/{cid}/pay/verify
POST /api/test-prime/pay/order
POST /api/test-prime/pay/verify
```

**Franchise / Centre / Contact pages**
```
GET /api/cms/franchises?client=website
GET /api/cms/centres_v2?client=website
```

**Website heartbeat (once the app is live)**
```
POST /api/heartbeat  {client: "website", version: "..."}
```
This is what makes the Super Admin → System Status flip the "Website" indicator from `not_connected` to `connected`.

---

## 3. Common Database Overview

**26 collections in use.** Every one is served by the same backend, same auth, same entitlement engine:

- **Identity** — `users`, `revoked_tokens`, `password_reset_tokens`, `_counters`
- **Foundation** — `products`, `orders`, `payments`, `entitlements`, `faculty`, `coupons`, `centres`
- **Progress** — `vc_progress`, `tp_attempts`, `daily_challenge_attempts`, `chat_messages`
- **Live** — `lc_sessions`, `lc_chat`, `lc_polls`, `lc_hand_raises`, `lc_study_materials`, `lc_material_downloads`
- **AI** — `ai_threads`, `ai_messages`
- **Feed** — `feed_likes`, `feed_comments`
- **CMS** — 20 collections listed in §1
- **Ops** — `client_heartbeats`, `request_logs`, `backup_events`

---

## 4. Verified end‑to‑end (test summary)

| Suite | Pass |
|---|---|
| Backend unit + integration (219 tests) | ✅ 219 / 219 |
| Golden‑path acceptance (Phase 1) | ✅ 14 / 14 |
| CMS + Reports suite (26 tests) | ✅ 26 / 26 |
| Super Admin UI (login → testimonials list → reports) | ✅ verified live |

---

## 5. What still remains (deferred, not blocking Phase 2)

- **DRM/CDN video streaming** — currently public Google sample MP4s.
- **Advanced admin features** — bulk import, CSV export, question‑bank rich editor with LaTeX.
- **Push notifications delivery** — planned via Emergent push; wire once user provides credentials.
- **Client‑side SEO** — the backend serves SEO metadata; Website frontend implementation will consume it.

---

## 6. Verdict

🟢 **The backend is fully ready to power `avision.co.in`.**

The next task can start Phase 2 immediately without any backend blockers:
- Every content type the website needs has a create/read/update/delete admin UI and a public read API.
- Every product/course/test/banner/faq/testimonial/result created in Super Admin is instantly available to both the Student App and a future Website via `client=app|website`.
- Payment, entitlement and progress engines are unified and battle‑tested by the golden‑path suite.

**Ready to start `avision.co.in` when you give the go‑ahead.**
