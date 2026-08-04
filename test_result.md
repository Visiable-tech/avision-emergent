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
  - agent: "testing"
    message: |
      [iteration_12] Super Admin Panel frontend verified. 16/16 flows pass on web
      preview (1280x800). Non-admin login correctly blocked. All 9 sidebar routes
      render and hydrate from /api/admin/*. Manual Enroll created a real order that
      appears in Orders list. Native gate confirmed via code inspection. Minor
      polish items noted (user email in orders row — fixed by main agent).
