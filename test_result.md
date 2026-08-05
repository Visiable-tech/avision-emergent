#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Frontend restructure: change Tab Bar to (Home, Video Course, Test, Live Class, Profile),
  rewrite Home Screen with (Banner Slider → Quick Access grid incl. Feed → Trending Tests
  horizontal slider → Daily Current Affairs → Daily Challenge slider → redesigned Job Alerts).
  Add view-only Feed screen (social-style posts) and Job Alert detail page. Keep
  glassmorphism white theme + rounded cards, preserve Category/i18n contexts.

backend:
  - task: "Feed module endpoints"
    implemented: true
    working: true
    file: "/app/backend/feed.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "GET /api/feed, /api/feed/{id}, comments and toggle_like already wired."
  - task: "Home extras (banners, job alerts, job detail, daily challenges)"
    implemented: true
    working: true
    file: "/app/backend/home_extras.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Verified /api/banners, /api/job-alerts, /api/job-alerts/{id}, /api/daily-challenges category-filtered."

frontend:
  - task: "Tab bar update (Home, Video Course, Test, Live Class, Profile)"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/_layout.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Screenshot confirms new tab order; current-affairs hidden but reachable via route."
  - task: "Home screen restructure (Banner→Quick Access→Trending Tests→CA→DC→Jobs)"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/index.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Complete rewrite. Includes Feed tile in Quick Access grid; trending tests as horizontal gradient cards; job cards redesigned with posted/last-date/view-details CTA that opens /job-alert/[id]."
  - task: "Feed screen (view-only social-style posts)"
    implemented: true
    working: true
    file: "/app/frontend/app/feed.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Screenshot verified. Posts show avatar, type pill, image, description, tags, like/comment counts (view-only), share pill."
  - task: "Live Class tab screen"
    implemented: true
    working: true
    file: "/app/frontend/app/(tabs)/live-class.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Dedicated screen with Live Now big cards + Upcoming list; empty state included."
  - task: "Job Alert detail page"
    implemented: true
    working: true
    file: "/app/frontend/app/job-alert/[id].tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Hero gradient with org logo/title, stat cards (salary/posts/age), sections for About, Eligibility, Important Dates, Selection Process, Important Links + Apply Now floating CTA."

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 4
  run_ui: true

test_plan:
  current_focus:
    - "Home screen restructure (Banner→Quick Access→Trending Tests→CA→DC→Jobs)"
    - "Feed screen (view-only social-style posts)"
    - "Job Alert detail page"
    - "Live Class tab screen"
    - "Tab bar update (Home, Video Course, Test, Live Class, Profile)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Completed frontend restructure. Backend routes (/api/feed, /api/banners,
      /api/job-alerts, /api/job-alerts/{id}, /api/daily-challenges) already wired.
      New screens: (tabs)/live-class.tsx, feed.tsx, job-alert/[id].tsx. Home rewritten
      with new vertical order. Tab bar changed. Please test:
        1. GET /api/feed with & without ?category=banking and ?user_id
        2. GET /api/job-alerts/{id} shape used by detail page
        3. Frontend: login as test@avision.com / Test@123, verify tabs, Feed nav,
           job-detail nav, live-class tab renders, banner auto-slide, category dropdown
           still filters home content.

  - agent: "main"
    message: |
      [Video Courses — Phase 2 + Phase 3 complete]
      Backend: added `/api/video-courses/{cid}/progress` (GET+POST), `/analytics`, `/lecture/{lid}`;
      new collection `vc_progress` with per-user per-lecture watch state; enrollment aggregates
      (progress_pct, videos_watched, watch_time_hours, last_activity_at) auto-recomputed on upsert.
      Curriculum seed enriched — every chapter with video_count>0 auto-generates lectures with
      Google sample MP4 URLs.
      Frontend: new `/video-courses/dashboard/[id].tsx` (hero + progress ring + resume + weekly
      chart + subject-wise breakdown + curriculum with per-lecture progress ticks) and
      `/video-courses/watch/[id].tsx` (HTML5 <video> on web, expo-video via platform-split
      NativeVideo.native.tsx on device; auto-save every 15s or >=2% delta, force-save on unmount
      or lecture switch). Enrolled Course Detail + My Courses list routing now targets dashboard.
      Test agent iteration_10: 30/30 backend pass (9 new + 21 regression); all frontend flows
      verified; no blocking issues.
  - agent: "testing"
    message: |
      [iteration_10] Phase 2 + Phase 3 tested end-to-end. Backend 30/30 pass. Frontend flows:
      dashboard → resume/lecture tap → watch → mark complete → dashboard update. Regression:
      Phase 1 flows, Live Courses, AI Doubt unchanged.

  - agent: "main"
    message: |
      [AVISION ONE Architecture Audit produced at /app/memory/AVISION_ONE_AUDIT.md]
      Full audit of current stack, DB schema, hardcoded vs DB-backed modules, and phased
      migration plan (foundation → app connect → super admin → website → AI). Path C (hybrid)
      chosen — minimal `vc_progress` collection introduced now to unblock Video Courses
      Phase 2/3 shipping. Unified `products/orders/payments/entitlements/faculty/coupons`
      unification queued for the Common Foundation phase before further module builds.
  - agent: "main"
    message: |
      [AVISION ONE Foundation Phase 1a complete — /app/backend/foundation.py]
      Non-breaking. New collections: products, faculty, coupons, orders, payments,
      entitlements, centres, _counters. Users extended with avision_id / roles[] /
      centre_id / admission_source / counsellor_id / active (idempotent backfill).
      Idempotent seed migrated 35 products (live=8, video=8, test=5, booster=9,
      magazine=5), 6 faculty, 3 coupons. Entitlements backfilled from lc/vc/tp
      enrollments. Public APIs: /api/products*, /api/entitlements/mine, /api/faculty*.
      Admin APIs: /api/admin/{dashboard,students,products,orders,entitlements,
      enroll,centres,students/{id}/roles} — guarded by roles[] contains "admin".
      test@avision.com auto-promoted to admin. New user register now attaches
      avision_id + roles immediately. Admin edits on products survive restarts
      (system-managed vs admin-editable field split).
      Existing mobile app untouched — all façade APIs still work.
      Test agent iteration_11: 48/48 pass (39 foundation + 9 vc regression).
  - agent: "main"
    message: |
      [Super Admin Panel bootstrapped inside Expo Router at /admin/*]
      Given the Kubernetes ingress only routes port 3000 (Expo) and /api/* → 8001, a
      separate Next.js dev server was not reachable. The panel therefore lives as
      web-only routes under /app/frontend/app/admin/*. Native devices see a "web only"
      gate. Screens delivered: Login, Dashboard, Students(+detail), Products(+edit
      modal), Orders, Entitlements, Faculty, Coupons, Centres, Manual Enroll wizard.
      Sidebar navigation + user badge + logout. Reuses existing AuthContext, api.ts,
      theme, and JWT auth from Foundation Phase 1a.
      Test agent iteration_12: 16/16 UI flows verified. Login gate + non-admin block +
      admin dashboard + all list screens + Manual Enroll wizard end-to-end (created
      AV-ORD-26-000004 during test). Backend admin routes unchanged (48/48 from iter11).
  - agent: "main"
    message: |
      [Super Admin — Ops & Verification pack shipped]
      Extended sidebar with the full requested taxonomy (Identity, Catalog, Commerce,
      Content&CMS, Ops). New backend endpoints:
        POST   /api/admin/products          — create new product (proof of one-backend)
        DELETE /api/admin/products/{id}     — delete admin-created products
        GET    /api/admin/payments          — unified payments list w/ order summary
        GET    /api/admin/system/status     — live system health (Frontend + Backend)
        GET    /api/admin/system/database   — safe entity/collection overview
        GET    /api/admin/system/integration-tests  — live auth/course/entitlement/progress/test/heartbeat tests
        POST   /api/heartbeat               — public heartbeat for App/Website/Admin clients
      Frontend: /admin/settings/{status,database,integration}, /admin/payments,
      /admin/products (new "New product" modal), stubs for Exams / Question Bank /
      Study Material / Current Affairs / Banners / Notifications / CMS / Franchise /
      Reports (all use ComingSoon component with honest blocker list).
      Heartbeats wired from admin _layout.tsx (super_admin) and (tabs)/_layout.tsx (student_app).
      Website heartbeat intentionally NOT wired — the staging website is not built yet, so
      System Status honestly shows "not_connected" for that client.
      Test: created "AVISION ONE Proof Course" from admin → confirmed same doc appears via
      public /api/products endpoint (single-backend architecture proven).

  - agent: "main"
    message: |
      [AVISION ONE — Phase 1 FINAL Acceptance + Phase 12 CMS suite shipped]

      Phase 1 Final Acceptance:
        • Legacy modules (live_courses.py, video_courses.py, test_prime.py)
          refactored to write unified entitlements on every purchase and read
          them as a fallback for legacy access checks (backward compatible).
        • Bundle Product support added — one Product with items[] grants entitlements
          to every child ref_id (course/test/live). Cascade proven end-to-end.
        • Product visibility split (app / website / admin_only) + full SEO fields
          (slug, title, desc, keywords).
        • Golden Path acceptance test: 14/14 PASS.
        • Full backend regression: 219/219 tests PASS.
        • /app/memory/AVISION_ONE_PHASE1_ACCEPTANCE.md generated.

      Phase 12 — Super Admin CMS Suite (36 modules delivered):
        • Backend `avision_cms.py` — generic CRUD engine over 20 CMS entities
          + 11 real-data Reports.
        • Frontend `EntityScreen.tsx` + declarative `entitySpecs.tsx` — 20
          admin routes, each ~2 lines. Reports dashboard.
        • Backend CMS test suite: 47/47 PASS.

  - agent: "main"
    message: |
      [AVISION ONE — Phase 2 Website Iteration 1 shipped]

  - agent: "main"
    message: |
      [AVISION ONE — Phase 2 Iteration 2: Student Web Portal shipped]

  - agent: "main"
    message: |
      [AVISION ONE — Phase 2 Iteration 3: Test-Attempts Web Flow shipped]

      Added a full web-native test-attempt experience on the Next.js portal
      that layers on top of the existing Test Prime backend engine. Zero
      backend code changes.

      New server-side proxies (each reads avn_session cookie, resolves
      user_id via /auth/me, forwards with Authorization: Bearer):
        POST   /api/session/attempt/start
        GET    /api/session/attempt/[id]
        PATCH  /api/session/attempt/[id]/state
        POST   /api/session/attempt/[id]/submit
        POST   /api/session/attempt/[id]/violation

      New UI pages:
        • /portal/tests — 100-test grid with Prime badge
        • /portal/tests/[tid] — preview + instructions + Start Attempt
        • /portal/attempt/[id] — full attempt runner:
            - Sticky timer (auto-submits at 0, red under 5 min)
            - Question card w/ section/topic/difficulty chips + marks header
            - 5-col Q palette color-coded (Answered/NotAns/Marked/Marked+Ans/NotVisited)
            - Legend + live counts
            - Prev / Mark / Clear response / Save & Next
            - Auto-save every 20s + beforeunload (refresh-safe)
            - Anti-cheat: tab-switch + window-blur → /violation
            - Submit confirm modal
        • /portal/attempt/[id]/result — brand-gradient KPI hero,
            Correct/Wrong/Unattempted metric cards, Accuracy bar,
            Section-wise + Difficulty split, Answer review with explanations

      Testing:
        • /app/backend/tests/test_website_attempt_proxy.py — 18/18 PASS
        • Playwright e2e verified full lifecycle (login → attempt → submit → result)
        • JWT-leak regex scanner: 0 leaks across all proxy JSON + all portal HTML
        • Backend regression: 309 tests all green
        • Production build clean

      Docs: /app/memory/AVISION_ONE_PHASE2_ITERATION3.md

frontend:
  - task: "Test-attempts web flow (attempt runner + result analytics)"
    implemented: true
    working: true
    file: "/app/website/src/{lib/attemptProxy.ts,app/api/session/attempt/**,app/portal/{tests/**,attempt/**},components/{AttemptRunner,StartAttemptButton}.tsx}"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Full web-native Test Prime attempt experience: browse → preview → start → answer → mark → auto-save → submit → analytics. Refresh-safe (20s auto-persist). Anti-cheat (tab-switch/blur violation logging). Server-side proxy protects JWT (cookie never exposed to client). 18/18 tests pass, e2e verified via Playwright, 0 JWT leaks."

      Added the complete student web portal on top of the existing Next.js
      site — login, register, dashboard, library, course detail with
      curriculum, video player with server-synced progress, tests placeholder,
      profile page.

      Key security decisions:
        • HTTP-only cookie (avn_session, SameSite=Lax, 30-day) — JWT never
          reaches client JS. Verified via test agent (document.cookie empty,
          no JWT leak in HTML).
        • middleware.ts protects /portal/* → 307 redirect to /login?next=…
        • Next.js route handlers (/api/session/login,register,logout,progress)
          proxy backend calls with server-side JWT attachment.
        • Client-side video progress uses /api/session/progress proxy so the
          bearer token never leaves the server.

      Backend integration (zero backend code changes):
        POST /api/auth/{login,register} · GET /api/auth/me
        GET /api/entitlements/mine · GET /api/video-courses/*
        GET /api/video-courses/*/{lecture,progress,analytics}
        POST /api/video-courses/*/progress (via server proxy)

      Also fixed 1 non-blocking issue found by test agent: extracted login/
      register input inline styles into an `.auth-input` CSS class to avoid
      SSR/CSR hydration warnings.

      Testing:
        • /app/website/tests/test_portal_flow.py — 24/24 PASS
        • Backend regression: 309 tests total (219 baseline + 47 CMS +
          14 golden path + 29 iter-1) all green
        • Production build (`yarn build`) — 30 routes, 102 kB shared JS,
          middleware 34.2 kB

      Docs: /app/memory/AVISION_ONE_PHASE2_ITERATION2.md

frontend:
  - task: "Student Web Portal on Next.js (auth cookie + video player)"
    implemented: true
    working: true
    file: "/app/website/src/{lib/session.ts,lib/apiAuth.ts,middleware.ts,app/portal/*,app/api/session/*,components/{LoginForm,VideoPlayer,Header}.tsx}"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Full student portal: /login /register /portal /portal/library /portal/courses/[id] /portal/watch/[cid]/[lid] /portal/tests /portal/profile. HTTP-only cookie for JWT (avn_session), middleware guards /portal/*, server-side proxies for login/register/logout/progress. Video player with 15s progress sync, next/prev navigation, curriculum sidebar. 24/24 portal tests pass; no JWT leakage to client bundle."

      Bootstrapped the new avision.co.in public website at /app/website/ as a
      standalone Next.js 15 (App Router) project consuming the AVISION ONE
      common backend directly. This is a NEW project running on port 3001
      via a new supervisor program (parallel to Expo:3000 + FastAPI:8001).

      Delivered pages (20 routes, marketing + SEO scope B1):
        • Home — hero from CMS banners_home, stats strip, 4-feature grid,
          featured video courses, live batches, results, testimonials,
          current affairs, FAQs, CTA
        • Exams: /exams list + /exams/[slug] detail
        • Courses: /courses list + /courses/[id] detail (SEO from product.seo)
        • Live courses: /live-courses list + /live-courses/[id] detail
        • Current affairs: list + article
        • Testimonials, Results, FAQs, Centres, Franchise, Contact
        • /[slug] fallback for dynamic CMS web pages (cms_web_pages)
        • sitemap.ts (auto-aggregates products + articles + pages)
        • robots.ts + not-found.tsx

      Backend integration:
        • lib/api.ts — typed AVISION ONE client (cmsList/cmsGet/listProducts)
        • Every fetch passes client=website (backend applies website visibility)
        • HeartbeatBeacon.tsx — POST /api/heartbeat on load
        • System Status → website flipped from "not_connected" → "connected"
        • Production build succeeds: 20 routes, 102KB shared JS

      Kubernetes note: the port 3001 dev server is not reachable via preview
      URL (only :3000 and /api/*→:8001 are routed). Fully functional inside
      the pod; production launch requires deploying to Vercel or an NGINX
      reverse-proxy setup.

      Docs generated:
        • /app/memory/AVISION_ONE_PHASE2_ITERATION1.md (this handoff)

frontend:
  - task: "Phase 2 — public website /app/website/ (Next.js 15)"
    implemented: true
    working: true
    file: "/app/website/*"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Standalone Next.js 15 project on port 3001 with 20 routes consuming the AVISION ONE common backend. Home, exams, courses, live-courses, current-affairs, testimonials, results, FAQs, centres, franchise, contact + dynamic CMS pages + sitemap + robots. SSR + ISR + SEO per page. Heartbeat flips System Status → connected. Production build verified."

      Phase 1 Final Acceptance:
        • Legacy modules (live_courses.py, video_courses.py, test_prime.py)
          refactored to write unified entitlements on every purchase and read
          them as a fallback for legacy access checks (backward compatible).
        • Bundle Product support added — one Product with items[] grants entitlements
          to every child ref_id (course/test/live). Cascade proven end-to-end.
        • Product visibility split (app / website / admin_only) + full SEO fields
          (slug, title, desc, keywords).
        • Golden Path acceptance test: 14/14 PASS
          (admin auth → student → course → bundle → enroll → mine → LC dash →
           TP prime → visibility split → payment security → audit trail →
           system status honesty → VC progress → cleanup).
        • Full backend regression: 219/219 tests PASS.
        • /app/memory/AVISION_ONE_PHASE1_ACCEPTANCE.md generated.

      Phase 12 — Super Admin CMS Suite (approved massive scope):
        • New backend module `avision_cms.py` — generic CRUD engine over
          20 CMS entities (5 Academic, 5 Learning content, 8 Content mgmt,
          2 Organisation). Every entity: /api/admin/cms/{entity}/* + optional
          public /api/cms/{entity}/* with visibility filter.
        • 11 real-data Reports & Analytics endpoints:
          students, product_sales, revenue, orders_report, payments_report,
          course_performance, test_performance, engagement, learning_progress,
          centre_wise, franchise_wise.
        • Frontend: generic EntityScreen.tsx + declarative entitySpecs.tsx —
          each admin route ~2 lines. 20 admin routes shipped; sidebar reorganized
          into Identity → Academic → Catalog → Learning Content → Commerce →
          Content & CMS → Analytics & Ops (no "soon" pills left).
        • Reports dashboard with range selector (today/7d/30d/all).
        • Idempotent seed of demo data (banners, testimonials, results, FAQs,
          current affairs, franchises, centres, web/app pages, promo banners).
        • Backend CMS test suite: 26/26 PASS.
        • Website heartbeat still "not_connected" — honest system status.
        • /app/memory/AVISION_ONE_PHASE2_READINESS.md generated.

      Backend ready for Phase 2 avision.co.in without any blocker. Public website
      frontend intentionally NOT started per user instruction.

backend:
  - task: "AVISION ONE — unified grant_entitlement + bundle logic + legacy refactor"
    implemented: true
    working: true
    file: "/app/backend/foundation.py, /app/backend/live_courses.py, /app/backend/video_courses.py, /app/backend/test_prime.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "grant_entitlement helper cascades bundles into per-child entitlements. Legacy modules import foundation and call helper on verify_payment / free_enroll / rzp_verify. Legacy access checks fall back to unified entitlements. Verified via 14/14 golden path checks."
  - task: "AVISION ONE Super Admin CMS suite (20 entities + 11 reports)"
    implemented: true
    working: true
    file: "/app/backend/avision_cms.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Generic CRUD across 20 entities: exam_categories, exams, subjects, chapters, lessons, question_bank, study_material, current_affairs, digital_notes, previous_papers, cms_web_pages, cms_app_pages, banners_home, banners_promo, notifications, testimonials, results, faqs, franchises, centres_v2. Public read APIs respect visibility.{app,website}. 26/26 tests pass; 219 overall backend pass."
frontend:
  - task: "Super Admin — 20 CMS routes + Reports dashboard"
    implemented: true
    working: true
    file: "/app/frontend/src/admin/EntityScreen.tsx, /app/frontend/src/admin/entitySpecs.tsx, /app/frontend/app/admin/*"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: "Generic EntityScreen component drives 20 admin CRUD routes via declarative specs. Reports dashboard with 11 report cards + range selector renders KPIs + tables from real backend data. Sidebar reorganized; no 'soon' pills remain."
      Extended sidebar with the full requested taxonomy (Identity, Catalog, Commerce,
      Content&CMS, Ops). New backend endpoints:
        POST   /api/admin/products          — create new product (proof of one-backend)
        DELETE /api/admin/products/{id}     — delete admin-created products
        GET    /api/admin/payments          — unified payments list w/ order summary
        GET    /api/admin/system/status     — live system health (Frontend + Backend)
        GET    /api/admin/system/database   — safe entity/collection overview
        GET    /api/admin/system/integration-tests  — live auth/course/entitlement/progress/test/heartbeat tests
        POST   /api/heartbeat               — public heartbeat for App/Website/Admin clients
      Frontend: /admin/settings/{status,database,integration}, /admin/payments,
      /admin/products (new "New product" modal), stubs for Exams / Question Bank /
      Study Material / Current Affairs / Banners / Notifications / CMS / Franchise /
      Reports (all use ComingSoon component with honest blocker list).
      Heartbeats wired from admin _layout.tsx (super_admin) and (tabs)/_layout.tsx (student_app).
      Website heartbeat intentionally NOT wired — the staging website is not built yet, so
      System Status honestly shows "not_connected" for that client.
      Test: created "AVISION ONE Proof Course" from admin → confirmed same doc appears via
      public /api/products endpoint (single-backend architecture proven).


# ==========================================================================
# Iteration: Test Prime Web Player Enhancements (P0)
# ==========================================================================
backend:
  - task: "Test Prime — new question types (MSQ / TITA / passage-MCQ) + bilingual (EN/HI) + updated scoring"
    implemented: true
    working: true
    file: "/app/backend/test_prime.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: true
        agent: "main"
        comment: |
          Enhanced _gen_question_bank() to produce four question types with q_type field:
          mcq (default), msq (5% random), tita (SA sections auto), passage-mcq (grouped in
          English/Legal/GK-heavy sections in blocks of 4–5). Added text_hi/options_hi
          bilingual stub fields and passage/passage_hi for grouped questions. Updated
          submit_attempt scoring to handle each q_type:
            • msq  → exact set match; full marks or negative
            • tita → normalized numeric string compare; NO negative marking
            • mcq / passage-mcq → single-int compare (unchanged)
          save_state now transparently accepts number | number[] | string for answers.
          _strip_q still hides `correct` + `explanation` from client while preserving all
          new fields. Local smoke test on CLAT test (120 Q) produced:
            {mcq: 90, passage-mcq: 24, msq: 6}, submit → score 5/120, review includes
            q_type / user / correct / status for each item, 5 sectional entries and
            3 difficulty_wise entries returned.
frontend:
  - task: "Web Test Prime Player — bilingual toggle, section timers + tabs, MSQ / TITA / passage split-screen"
    implemented: true
    working: "NA"
    file: "/app/website/src/components/AttemptRunner.tsx, /app/website/src/app/portal/attempt/[id]/result/page.tsx"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          AttemptRunner rewritten to support:
            • EN/HI language toggle (uses text_hi / options_hi / passage_hi)
            • Section tabs (top strip) with per-section timers when sectional_timing=true
            • Section-scoped auto-jump when a section timer hits 0
            • Question-palette grouped by section with tiny badge (☰ MSQ, № TITA, ¶ Passage)
            • Split-screen (passage left + question right) when q_type = passage-mcq
            • MSQ rendered as checkboxes with "select ALL that apply" note
            • TITA rendered as numeric text input with "no negative marking" note
            • Persists section_times + active_section on the same 20 s auto-save loop
          Result page reworked to:
            • Handle new sectional / difficulty_wise / topic_wise field names AND the
              legacy section_analytics / difficulty_analytics shape (backward-compatible)
            • Render q_type-aware review (checkbox list for MSQ, text compare for TITA,
              passage-aware block for passage-MCQ)
            • Added topic-wise performance table (top 12)
          Next.js build passes; TS compile clean; still requires Vercel deploy for full
          browser QA (Next.js preview URL is not exposed by the Emergent proxy).

metadata:
  test_prime_web_player_enhancements: "IN REVIEW — awaiting Vercel manual acceptance test"
