# AVISION ONE — Phase 2 Website Iteration 2 — Student Web Portal

**Date:** 2026‑06
**Iteration goal:** Ship the Student Web Portal (login, dashboard, library, course detail, video player, profile) on the Next.js `avision.co.in` site.
**Scope picked (from Plan B):** Iteration 1 of the 3‑iteration B2 roadmap → items 1a + 1b (Login + Dashboard + Video Player).
**Status:** ✅ **Iteration 2 complete — 24/24 portal tests PASS**

---

## 1. What was shipped

### New backend routes: (zero) — pure client work on top of the AVISION ONE common backend.
The portal uses these existing endpoints:
```
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
GET  /api/entitlements/mine
GET  /api/video-courses/{cid}
GET  /api/video-courses/{cid}/lecture/{lid}
GET  /api/video-courses/{cid}/progress
GET  /api/video-courses/{cid}/analytics
POST /api/video-courses/{cid}/progress
GET  /api/video-courses/continue-learning
GET  /api/test-prime/entitlement?user_id=...
```

### New Next.js code (`/app/website/`)

**Session infrastructure**
- `src/lib/session.ts` — `setSession()` / `clearSession()` / `getSessionToken()` using **HTTP‑only, SameSite=Lax cookies**. Cookie name: `avn_session`. Max‑age: 30 days.
- `src/lib/apiAuth.ts` — auth‑aware server‑side API client. Reads the cookie and attaches `Authorization: Bearer` when calling the FastAPI backend. **JWT never touches the client bundle.**
- `src/middleware.ts` — protects `/portal/*` → redirects to `/login?next=…` when no cookie.

**Session route handlers** (Next.js server, they proxy to backend and manage the cookie)
- `POST /api/session/login` — login → sets cookie
- `POST /api/session/register` — register → sets cookie
- `POST /api/session/logout` — clears cookie
- `POST /api/session/progress` — proxies video progress w/ server‑side JWT

**UI**
- `/login` — email + password form, redirects to `?next=…` or `/portal`
- `/register` — signup form (name, email, phone, password, category)
- `/portal` — dashboard: welcome header, 4 KPI cards, Continue Learning strip, Your Library grid
- `/portal/library` — full entitlement list grouped by product_type
- `/portal/courses/[id]` — course detail: header, progress bar, expandable curriculum by subject/chapter/lecture with watched badges + free‑preview flags
- `/portal/watch/[cid]/[lid]` — HTML5 video player + right‑sidebar curriculum
- `/portal/tests` — Test‑Prime status card
- `/portal/profile` — user profile info
- `HeartbeatBeacon` + auth‑aware `Header` (shows "My Learning" when signed in)

**Video player specifics** (`components/VideoPlayer.tsx`)
- Restores playback position from `progress.watch_seconds`
- Sends progress every 15 s + on pause + on end (via `/api/session/progress` proxy)
- Next / Previous lecture buttons
- Right‑sidebar curriculum (active lecture highlighted, subject/chapter grouped)
- `controlsList="nodownload"` on the `<video>` element

---

## 2. Security posture

| Concern | Approach | Verified |
|---|---|---|
| JWT theft via XSS | HTTP‑only cookie, `document.cookie` empty | ✅ test agent |
| Middleware bypass | `middleware.ts` matcher: `/portal/:path*` | ✅ 307 redirects |
| CSRF on session endpoints | `SameSite=Lax` on cookie; only POST endpoints | ✅ |
| Backend authorization | Backend validates JWT + entitlement on every video call | ✅ |
| JWT exposure via SSR | JWT read from cookie in server components only; never in props | ✅ test agent grep |
| Progress endpoint auth | `/api/session/progress` requires cookie; 401 otherwise | ✅ |

---

## 3. Test evidence

- **New:** `/app/website/tests/test_portal_flow.py` — 24/24 pass
- Manual verification via screenshot:
  - `/login` → clean form
  - `/portal` → user avatar, sidebar, KPIs (1 vc / 1 lc / 2 total), library cards showing seeded entitlements
  - `/portal/watch/vc-banking-2026/ch-number-system--lec-0` → video player + curriculum sidebar with "Introduction to Number System" highlighted
- Backend regression: 219 baseline + 47 CMS + 14 golden path + 29 iter‑1 website = **309 tests, 0 failures**
- Production build: `yarn build` → 30 routes, 102 kB shared JS, middleware 34.2 kB

---

## 4. B1 → B2 handoff

| Track | Iteration 1 (done) | Iteration 2 (done) | Iteration 3 (this session) | Next |
|---|---|---|---|---|
| Marketing site | ✅ 20 routes | — | — | — |
| Auth | — | ✅ Cookie + middleware | — | — |
| Portal | — | ✅ Dashboard + Library | — | — |
| Video player | — | ✅ SSR + progress proxy | — | — |
| Test attempts (web) | — | Stub only | ⏭ Iteration 3 candidate | — |
| Web checkout (Razorpay) | — | — | ⏭ Iteration 3 candidate | — |
| Blog / Faculty / Search | — | — | ⏭ Iteration 4 candidate | — |
| Multi‑language (Hindi/English) | — | — | ⏭ Iteration 4 candidate | — |

---

## 5. Verdict

🟢 **Student Web Portal is production‑ready for public login + browsing + watching.** Payments still go through the mobile app (web checkout is the next iteration).
