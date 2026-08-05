# Avision Institute — Access Sheet

_This file is a snapshot of the currently accessible interfaces + a step-by-step Owner Acceptance Test._

---

## 1) Emergent preview URL (public, live)

`https://avision-study-dash.preview.emergentagent.com`

That domain routes:
- `/` (and everything except `/api/*`) → the **Expo Student App** + **Super Admin** panel (they share the same Metro build)
- `/api/*` → the **FastAPI Common Backend** on port 8001

The Kubernetes ingress here CANNOT expose additional ports. The new Next.js website therefore ships to Vercel — see step (C) below.

---

## 2) The four access points

### A. Avision Student App
| | |
|---|---|
| **URL** | `https://avision-study-dash.preview.emergentagent.com` |
| **Test student** | `test@avision.com` / `Test@123` |
| **Prime access** | Auto-granted via `POST /api/admin/enroll` (see step 3 below if you need to re-grant) |

### B. Avision Super Admin
| | |
|---|---|
| **URL** | `https://avision-study-dash.preview.emergentagent.com/admin/login` |
| **Email** | `test@avision.com` |
| **Password** | `Test@123` |
| **Modules visible** | Dashboard, Students, Centres, Centre Management, Franchise Master, Exam Categories, Exams, Subjects, Chapters, Lessons, Products, Live Courses, Video Courses, Test Prime, Faculty, Question Bank, Study Material, Current Affairs, Digital Notes, Previous Papers, Orders, Payments, Coupons, Entitlements, Manual Enroll, Home Banners, Promo Banners, Notifications, Testimonials, Results, FAQs, Website CMS, App CMS, Reports & Analytics, System Status, Database, Integration Test |

### C. New Avision Website — Staging (Vercel)
| | |
|---|---|
| **URL** | _Will be `https://<project>.vercel.app` after you deploy — see next section._ |
| **How to deploy** | Follow `/app/website/README.md`. Total time: ~5 minutes. |
| **Env vars to set on Vercel** | `NEXT_PUBLIC_API_ORIGIN=https://avision-study-dash.preview.emergentagent.com`, `NEXT_PUBLIC_SITE_URL=<the vercel URL vercel gives you>`, `NEXT_PUBLIC_SITE_NAME=Avision Institute` |
| **Live avision.co.in** | Untouched. |

### D. Student Web Portal (inside the staging website)
| | |
|---|---|
| **Login URL** | `<vercel-url>/login` |
| **Test student** | `test@avision.com` / `Test@123` (same account as the App — single-source of truth) |

---

## 3) 10-minute Owner Acceptance Test

Do these steps in order to prove the common-backend architecture end-to-end.

**Prereq:** the Vercel website is deployed and reachable at `<vercel-url>`.

### Test 1 — Product synchronization (App ↔ Website ↔ Admin)
1. Open Super Admin → **Products** → **New** → create:
   `type=video_course`, name = `TEST WEBSITE BANKING COURSE`, price = 999, offer_price = 499, visibility.app = true, visibility.website = true.
2. Open the App preview URL. Browse to Video Courses. **The new course should appear.**
3. Open `<vercel-url>/courses`. **Same course visible.**
4. In Super Admin, toggle `visibility.website=false`. Refresh the website — course disappears. Toggle back on.

### Test 2 — Entitlement synchronization
1. Super Admin → **Manual Enroll** → user_id of `test@avision.com`, product_id of the course above, method=`admin_grant`, amount=0.
2. Open the App with `test@avision.com`. **The course now appears in "My Library".**
3. Open `<vercel-url>/portal/library` after login. **Same course, same expiry date.**

### Test 3 — Video progress synchronization
1. On `<vercel-url>/portal/watch/vc-banking-2026/ch-number-system--lec-0`, play the video for ~90 seconds, then close the tab.
2. Open the same lecture on the App (Video Courses → Banking → Number System → first lecture). **Playback resumes at ~90 seconds.**
3. Watch on the App for another 60 seconds. Close.
4. Refresh the website `/portal/watch/...` — timestamp is now ~150 seconds, `progress_pct` updated.

### Test 4 — Test Prime cross-client history
1. On `<vercel-url>/portal/tests/t_sbi-po_pyq_5` click **Start Attempt**.
2. Answer 5 questions. Mark 2 for review. Click **Submit**.
3. Land on `<vercel-url>/portal/attempt/<id>/result` — record the score.
4. Open the App → **Test Prime** → **My Attempts**. **The same attempt (same score, same date) appears.**
5. From the App, open the same attempt's analytics. **Section-wise breakdown matches.**

### Test 5 — System Status honesty
1. Super Admin → **Settings → System Status**. Before you visit the Vercel URL: Website = `not_connected` (or `stale`).
2. After you open `<vercel-url>/` in a browser: refresh System Status. Website flips to **`connected`** with a recent heartbeat timestamp.
3. Backend, Database, Super Admin, Student App should all show **connected** too.

### Test 6 — Integration test end-to-end
1. Super Admin → **Settings → Integration Test** → **Run all**.
2. Expect PASS on: Backend API, Database, Authentication, Admin→Backend, App→Backend, Website→Backend, Products, Entitlements, Video Progress R/W, Test Prime Retrieval, Test Attempt Creation, Answer Persistence, Timer Persistence, Test Submission, Test Result Retrieval, Cross-client Test History.
3. Any FAIL row is a real failure — please report it.

### Test 7 — Paywall (entitlement guard)
1. Log out of the website. On `<vercel-url>/portal/tests/<any-test>` → redirected to `/login?next=…`.
2. Log in as a fresh student (no Prime entitlement). Try the URL again. Preview loads but **Start Attempt** button says "Activate Test Prime".
3. From Admin, grant `tp-plan-12m` via Manual Enroll. Refresh — button turns green.

---

## 4) What's still to build (paused pending your acceptance)

The Iteration 3 report has details, but summary:

**Already shipped (visible now)**
- Marketing pages (20) — home, exams, courses, live, current affairs, testimonials, results, FAQs, centres, franchise, contact, dynamic CMS
- Student portal — dashboard, library, course detail w/ curriculum, video player w/ progress sync
- Test Prime web flow — list, preview, attempt runner (timer, palette, auto-save every 20s, anti-cheat visibility/blur violations), submit modal, result page (score, %, rank, percentile, section-wise, difficulty split, question review with explanations)

**Explicitly pending (from your requirement #4 onward — I'll do these AFTER your acceptance of #1-3)**
- Tabs on `/portal/tests`: **Available | Attempted | Analysis** + filters by Exam / Test Type / Subject / Test Kind
- Exam-pattern-driven Test Player: section tabs, per-section timers, section-switching rules honored from backend exam pattern
- Passage/DI split-screen for CLAT/RC/DI question sets
- Language toggle mid-attempt (EN↔HI) without losing progress
- Numerical-answer & multiple-select question type rendering
- Section-wise analysis table on the result page

**Explicitly NOT starting (per your directive #23)**
- Razorpay Web Checkout
- Multi-language site chrome
- Global search
- Blog enhancements

---

## 5) Environment reminders

- The Emergent Publish flow deploys the **Expo mobile app** — not the Next.js website. The website is a separate Vercel deployment.
- Preview URL refresh takes 20-30s. Scan the QR code beside the preview panel to open the mobile app in Expo Go.
- Native features (push, background audio, camera) can only be validated on device builds.
- The production domain `avision.co.in` is untouched. DNS, hosting, and files remain in your control.
