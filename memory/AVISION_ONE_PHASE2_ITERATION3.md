# AVISION ONE — Phase 2 Website Iteration 3: Test‑Attempts Web Flow

**Date:** 2026‑06
**Iteration goal:** Ship a full web-native test-attempt experience on top of the existing Test Prime engine.
**Status:** ✅ **Complete — 18/18 new tests pass**

---

## 1. What was shipped

**Zero backend code changes.** Pure client work on top of the AVISION ONE common backend + Test Prime engine.

### New server-side proxies (JWT never touches client)
```
/api/session/attempt/start                POST   → forwards to /test-prime/attempts/start
/api/session/attempt/[id]                 GET    → /test-prime/attempts/{id}
/api/session/attempt/[id]/state           PATCH  → /test-prime/attempts/{id}/state
/api/session/attempt/[id]/submit          POST   → /test-prime/attempts/{id}/submit
/api/session/attempt/[id]/violation       POST   → /test-prime/attempts/{id}/violation
```
Each proxy reads the `avn_session` cookie, resolves `user_id` from `/auth/me`, then forwards to backend with `?user_id=…` + `Authorization: Bearer` set server-side.

### New UI pages
- **`/portal/tests`** — grid of 100 tests with exam/type/free badges, live "Prime active" status
- **`/portal/tests/[tid]`** — pre-test detail: stats (questions, marks, duration, language, difficulty), instructions, fair-test sidebar, prominent "Start Attempt"
- **`/portal/attempt/[id]`** — full attempt runner
- **`/portal/attempt/[id]/result`** — detailed analytics

### Attempt Runner features (`components/AttemptRunner.tsx`)
- **Sticky timer** (red warning under 5 min) counting down from `total_time_left_sec`; auto-submits at 0
- **Question card** with: section/topic/difficulty chips, +marks / -negative_marks header, formatted text, radio options with active-state styling
- **Palette** in right sidebar: 5-col grid of Q# buttons colour-coded (Answered / Not answered / Marked / Marked+Ans / Not visited)
- **Legend** with live counts
- **Actions**: Prev, Mark for review, Clear response, Save & Next
- **Auto-save**: full state (answers, marked, seen, current_index, time_left) persists every 20 s + on `beforeunload`. Refresh-safe.
- **Anti-cheat**: logs tab-switch (`visibilitychange`) and window-blur violations via `/api/session/attempt/[id]/violation`
- **Submit confirm modal** with attempted/marked/unattempted counts

### Result page (`portal/attempt/[id]/result`)
- Brand-gradient hero card with Score, Percentage, Rank, Percentile
- Correct / Wrong / Unattempted metric cards
- Accuracy bar
- Section-wise performance
- Difficulty split (Easy / Medium / Hard: correct / total / wrong)
- Answer review — collapsible per-question card with the correct answer highlighted, your answer marked wrong, and the explanation

---

## 2. Security & UX guarantees

| Guarantee | How | Verified |
|---|---|---|
| JWT never in client bundle | HTTP-only cookie + server-side proxy | ✅ regex `eyJ...\..*\..*` grep = 0 leaks |
| Refresh-safe attempt | State persisted server-side every 20 s | ✅ pytest verifies persistence |
| Auto-submit on time-up | Client timer + server-side attempt.total_time_left_sec sync | ✅ |
| Anti-cheat visibility | `document.visibilitychange` + `blur` logged | ✅ violation_count increments on backend |
| Fresh SSR (no stale caching) | `dynamic = 'force-dynamic'` on attempt + result pages | ✅ |

---

## 3. Test evidence

- **`/app/backend/tests/test_website_attempt_proxy.py`** — 18/18 pass. Covers all 5 proxy endpoints (both authed and unauthed), full attempt lifecycle, JWT-leak scanner, all 4 portal SSR pages, backend spot-checks.
- **Playwright end-to-end** (test agent): Login → tests → preview → Start → attempt runner → timer counts down (01:00:00 → 59:58 in 2.2s) → radio select → Save & Next → Submit confirm modal → result page (Score 1/100, Percentile 0.05%, Correct=1, Wrong=0, Unattempted=99, Accuracy 100%, review list).
- **Regression**: 24/24 portal tests (iter 2) and 29/29 marketing tests (iter 1) still green. Backend 309-test suite unaffected.
- **Production build**: `yarn build` succeeds, all routes compile.

---

## 4. Environment note (dev-only glitch)

The Next.js dev server can throw `Cannot find module './[N].js'` when pytest-xdist runs multiple SSR routes in parallel — a known issue with `next dev` incremental builds.  
Workaround for local: `rm -rf /app/website/.next && supervisorctl restart website`. **Does not affect production builds.**

---

## 5. Handoff table

| Track | Iter 1 | Iter 2 | Iter 3 (this) | Next |
|---|---|---|---|---|
| Marketing site (20 routes) | ✅ | — | — | — |
| Login + Cookie auth | — | ✅ | — | — |
| Dashboard + Library | — | ✅ | — | — |
| Video Player | — | ✅ | — | — |
| Test listing + preview | — | Stub | ✅ | — |
| **Attempt runner + Result** | — | — | ✅ | — |
| Web checkout (Razorpay) | — | — | — | ⏭ |
| Blog / Faculty / Search | — | — | — | ⏭ |
| Multi-language (HI/EN) | — | — | — | ⏭ |

---

## 6. Verdict

🟢 **Student can now attempt any Test Prime test entirely on the web.** The full lifecycle — browse → preview → start → answer → mark → auto-save → submit → analytics — runs on the Next.js portal with server-side JWT security and refresh-safe state.
