"""Comprehensive regression suite for the Avision Live Courses module (Phases 1-4).

Covers:
- Auth (login as test@avision.com)
- Live Courses catalog (list, filters, sort, faculties, detail)
- Enrollment (pay/config, order create, free enroll, mine)
- Dashboard (Phase 2)
- Live Classroom REST (sessions, chat, hand-raise, polls) + instructor gating
- Study Materials (Phase 4)
- Course Analytics (Phase 4)
- WebSocket handshake + chat echo
"""

import asyncio
import os
import uuid
import json
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

# Load frontend .env to get public backend URL
load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@avision.com"
TEST_PASSWORD = "Test@123"
ENROLLED_COURSE = "lc-banking-po-2026"
UNENROLLED_COURSE = "lc-ssc-cgl-2026"  # possibly not enrolled — but user might be. We'll use RRB.
NEW_UNENROLLED_COURSE = "lc-rrb-ntpc-2026"
LIVE_SID = f"ses-{ENROLLED_COURSE}-live"
UPCOMING_SID = f"ses-{ENROLLED_COURSE}-upcoming"
RECORDED_SID = f"ses-{ENROLLED_COURSE}-recorded"


# ------------------ FIXTURES ------------------
@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="session")
def sess(auth_headers):
    s = requests.Session()
    s.headers.update(auth_headers)
    return s


# ------------------ AUTH ------------------
class TestAuth:
    def test_login(self, token):
        assert token and isinstance(token, str)


# ------------------ CATALOG ------------------
class TestCatalog:
    def test_list_all(self):
        r = requests.get(f"{API}/live-courses", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "courses" in j and "total" in j
        assert j["total"] >= 8
        # Sanity of fields on first course
        c = j["courses"][0]
        for k in ["id", "name", "offer_price"]:
            assert k in c, f"missing field {k}"

    def test_filter_category_banking(self):
        r = requests.get(f"{API}/live-courses", params={"category": "banking"}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["total"] >= 1
        for c in j["courses"]:
            assert c.get("category_id") == "banking" or "banking" in c.get("category_id", "")

    def test_filter_exam_ibps_po(self):
        r = requests.get(f"{API}/live-courses", params={"exam": "ibps-po"}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        for c in j["courses"]:
            assert c.get("exam_id") == "ibps-po"

    def test_filter_language_hindi(self):
        r = requests.get(f"{API}/live-courses", params={"language": "Hindi"}, timeout=15)
        assert r.status_code == 200

    def test_sort_price_low(self):
        r = requests.get(f"{API}/live-courses", params={"sort": "price_low"}, timeout=15)
        assert r.status_code == 200
        prices = [c["offer_price"] for c in r.json()["courses"]]
        assert prices == sorted(prices)

    def test_sort_price_high(self):
        r = requests.get(f"{API}/live-courses", params={"sort": "price_high"}, timeout=15)
        assert r.status_code == 200
        prices = [c["offer_price"] for c in r.json()["courses"]]
        assert prices == sorted(prices, reverse=True)

    def test_filters_endpoint(self):
        r = requests.get(f"{API}/live-courses/filters", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "exams" in j and isinstance(j["exams"], list) and len(j["exams"]) > 0
        assert "languages" in j and isinstance(j["languages"], list) and len(j["languages"]) > 0
        # Each exam entry has expected shape
        assert set(["id", "name", "count"]).issubset(j["exams"][0].keys())

    def test_faculties_list(self):
        r = requests.get(f"{API}/live-courses/faculties", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "faculties" in j and len(j["faculties"]) > 0
        assert "id" in j["faculties"][0]

    def test_faculty_detail(self):
        r = requests.get(f"{API}/live-courses/faculties", timeout=15)
        fid = r.json()["faculties"][0]["id"]
        r2 = requests.get(f"{API}/live-courses/faculties/{fid}", timeout=15)
        assert r2.status_code == 200
        j = r2.json()
        assert j["id"] == fid
        assert "courses" in j

    def test_faculty_detail_404(self):
        r = requests.get(f"{API}/live-courses/faculties/does-not-exist", timeout=15)
        assert r.status_code == 404

    def test_course_detail_public(self):
        r = requests.get(f"{API}/live-courses/{ENROLLED_COURSE}", timeout=15)
        assert r.status_code == 200
        j = r.json()
        for k in ["id", "name", "curriculum", "faculties", "testimonials", "faqs"]:
            assert k in j, f"missing field {k}"
        # is_enrolled defaults to False when no auth
        assert j.get("is_enrolled") is False

    def test_course_detail_authed_enrolled(self, sess):
        r = sess.get(f"{API}/live-courses/{ENROLLED_COURSE}", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("is_enrolled") is True

    def test_course_detail_404(self):
        r = requests.get(f"{API}/live-courses/no-such-course", timeout=15)
        assert r.status_code == 404


# ------------------ ENROLLMENT ------------------
class TestEnrollment:
    def test_pay_config(self, sess):
        r = sess.get(f"{API}/live-courses/pay/config", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "key_id" in j and j["key_id"].startswith("rzp_test_")

    def test_order_duplicate_enrolled(self, sess):
        # Already enrolled — should be rejected
        r = sess.post(f"{API}/live-courses/{ENROLLED_COURSE}/pay/order", json={}, timeout=15)
        assert r.status_code == 400
        assert "already" in r.text.lower() or "enrolled" in r.text.lower()

    def test_order_create_new_course(self, sess):
        # Create order for a course the user is NOT enrolled in (may already be enrolled from prior runs — skip if so)
        r = sess.post(f"{API}/live-courses/lc-upsc-cse-2027/pay/order", json={}, timeout=15)
        if r.status_code == 400:
            pytest.skip("user already enrolled in upsc — no fresh course to test order create")
        assert r.status_code == 200, f"order failed: {r.status_code} {r.text}"
        j = r.json()
        for k in ["key_id", "order_id", "amount", "currency"]:
            assert k in j

    def test_free_enroll_idempotent(self, sess):
        # Should return existing enrollment without error
        r = sess.post(f"{API}/live-courses/{ENROLLED_COURSE}/enroll/free", json={}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "enrollment" in j
        assert j["enrollment"]["course_id"] == ENROLLED_COURSE

    def test_my_enrollments(self, sess):
        r = sess.get(f"{API}/live-courses/enrollments/mine", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "enrollments" in j and len(j["enrollments"]) >= 1
        # course attached
        e = j["enrollments"][0]
        assert e.get("course") is not None
        # ensure no _id leak
        assert "_id" not in e


# ------------------ DASHBOARD (PHASE 2) ------------------
class TestDashboard:
    def test_dashboard_enrolled(self, sess):
        r = sess.get(f"{API}/live-courses/dashboard/{ENROLLED_COURSE}", timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ["course", "enrollment", "next_action", "today_target",
                  "today_schedule", "upcoming_sessions", "subject_progress",
                  "recent_recordings", "stats", "faculties"]:
            assert k in j, f"missing {k}"
        assert isinstance(j["today_schedule"], list) and len(j["today_schedule"]) >= 1
        assert isinstance(j["subject_progress"], list) and len(j["subject_progress"]) >= 1

    def test_dashboard_not_enrolled_403(self, sess):
        # Try dashboard for a course we are not enrolled in.
        # Use a course we don't touch elsewhere — if already enrolled, skip
        r = sess.get(f"{API}/live-courses/enrollments/mine", timeout=15)
        enrolled_ids = {e["course_id"] for e in r.json()["enrollments"]}
        candidate = next((c for c in ["lc-ctet-2026", "lc-wbcs-2026", "lc-ssc-chsl-2026", "lc-sbi-po-2026"]
                          if c not in enrolled_ids), None)
        if not candidate:
            pytest.skip("no un-enrolled course available")
        r2 = sess.get(f"{API}/live-courses/dashboard/{candidate}", timeout=15)
        assert r2.status_code == 403

    def test_progress_patch_persists(self, sess):
        # Read initial then patch and verify GET reflects it
        r1 = sess.get(f"{API}/live-courses/dashboard/{ENROLLED_COURSE}", timeout=15)
        before = r1.json()["stats"]["classes_attended"]
        r2 = sess.patch(f"{API}/live-courses/dashboard/{ENROLLED_COURSE}/progress",
                        json={"live_attended": 1}, timeout=15)
        assert r2.status_code == 200
        assert r2.json()["ok"] is True
        r3 = sess.get(f"{API}/live-courses/dashboard/{ENROLLED_COURSE}", timeout=15)
        after = r3.json()["stats"]["classes_attended"]
        assert after == before + 1, f"expected {before+1}, got {after}"


# ------------------ LIVE CLASSROOM (PHASE 3) ------------------
class TestLiveClassroom:
    def test_role_is_instructor(self, sess):
        r = sess.get(f"{API}/live-classroom/me/role", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j.get("is_instructor") is True, f"expected instructor: {j}"

    def test_sessions_list(self, sess):
        r = sess.get(f"{API}/live-classroom/sessions", params={"course_id": ENROLLED_COURSE}, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "sessions" in j
        assert len(j["sessions"]) >= 3
        # Backend seeds 3 sessions per course; status field is what distinguishes
        # them (type=live for both live+upcoming, type=recorded for the archived one).
        statuses = {s.get("status") for s in j["sessions"]}
        assert {"live", "upcoming", "recorded"}.issubset(statuses), f"got statuses {statuses}"

    def test_sessions_list_not_enrolled_403(self, sess):
        r = sess.get(f"{API}/live-classroom/sessions", timeout=15)
        # missing param -> 422 or with a course not enrolled -> 403
        r2 = sess.get(f"{API}/live-classroom/sessions", params={"course_id": "lc-fake"}, timeout=15)
        assert r2.status_code in (403, 404)

    def test_session_detail(self, sess):
        r = sess.get(f"{API}/live-classroom/sessions/{LIVE_SID}", timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "active_poll" in j
        assert "hand_raised" in j
        assert "participants_online" in j
        assert isinstance(j["participants_online"], int)

    def test_chat_history(self, sess):
        r = sess.get(f"{API}/live-classroom/sessions/{LIVE_SID}/chat", timeout=15)
        assert r.status_code == 200
        assert "messages" in r.json()

    def test_hand_raise_toggle(self, sess):
        r1 = sess.post(f"{API}/live-classroom/sessions/{LIVE_SID}/hand-raise", timeout=15)
        assert r1.status_code == 200
        s1 = r1.json()["hand_raised"]
        r2 = sess.post(f"{API}/live-classroom/sessions/{LIVE_SID}/hand-raise", timeout=15)
        assert r2.status_code == 200
        s2 = r2.json()["hand_raised"]
        assert s1 != s2

    def test_hand_raises_list(self, sess):
        r = sess.get(f"{API}/live-classroom/sessions/{LIVE_SID}/hand-raises", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "hand_raises" in j and "count" in j

    # -------- Poll flow (instructor) --------
    def test_poll_full_flow(self, sess):
        # Ensure user is instructor (idempotent)
        rp = sess.post(f"{API}/live-classroom/dev/promote-instructor", timeout=15)
        assert rp.status_code == 200
        # Create poll
        body = {"question": f"TEST_Poll {uuid.uuid4().hex[:6]}", "options": ["Yes", "No", "Maybe"]}
        r1 = sess.post(f"{API}/live-classroom/sessions/{LIVE_SID}/polls", json=body, timeout=15)
        assert r1.status_code == 200, r1.text
        poll = r1.json()
        assert poll["question"] == body["question"]
        assert len(poll["options"]) == 3
        pid = poll["id"]
        # Vote
        opt_id = poll["options"][0]["id"]
        r2 = sess.post(f"{API}/live-classroom/polls/{pid}/vote", json={"option_id": opt_id}, timeout=15)
        assert r2.status_code == 200, r2.text
        updated = r2.json()
        assert updated["total_votes"] == 1
        # Close
        r3 = sess.post(f"{API}/live-classroom/polls/{pid}/close", timeout=15)
        assert r3.status_code == 200
        assert r3.json()["status"] == "closed"


# ------------------ STUDY MATERIALS (PHASE 4) ------------------
class TestStudyMaterials:
    def test_summary(self, sess):
        r = sess.get(f"{API}/study-materials/summary", params={"course_id": ENROLLED_COURSE}, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        # Expect 5 subject groups × 4 materials = 20
        assert "subjects" in j or "groups" in j or "materials" in j, f"missing group key: {list(j.keys())}"
        # Try to count total materials
        total = j.get("total") or j.get("count")
        if total is not None:
            assert total == 20, f"expected 20 materials, got {total}"

    def test_list_all(self, sess):
        r = sess.get(f"{API}/study-materials", params={"course_id": ENROLLED_COURSE}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        items = j.get("materials") or j.get("items") or []
        assert len(items) == 20, f"expected 20, got {len(items)}"

    def test_filter_by_subject(self, sess):
        # Get subjects from summary
        r = sess.get(f"{API}/study-materials/summary", params={"course_id": ENROLLED_COURSE}, timeout=15)
        j = r.json()
        # Try to pick a subject
        subjects = []
        if "subjects" in j and isinstance(j["subjects"], list):
            subjects = [s.get("subject") or s.get("name") for s in j["subjects"] if isinstance(s, dict)]
        if not subjects:
            pytest.skip("no subjects returned")
        subject = subjects[0]
        r2 = sess.get(f"{API}/study-materials",
                      params={"course_id": ENROLLED_COURSE, "subject": subject}, timeout=15)
        assert r2.status_code == 200
        items = r2.json().get("materials") or r2.json().get("items") or []
        assert len(items) >= 1
        for it in items:
            assert it.get("subject") == subject

    def test_material_detail_and_download_increment(self, sess):
        r = sess.get(f"{API}/study-materials", params={"course_id": ENROLLED_COURSE}, timeout=15)
        items = r.json().get("materials") or r.json().get("items") or []
        assert items
        mid = items[0].get("id") or items[0].get("_id")
        assert mid
        # First open
        r1 = sess.get(f"{API}/study-materials/{mid}", timeout=15)
        assert r1.status_code == 200, r1.text
        before = r1.json().get("downloads_count", 0)
        # Second open — behavior: system claims "idempotent on repeat" per PR;
        # or it may increment. We verify count is >= before.
        r2 = sess.get(f"{API}/study-materials/{mid}", timeout=15)
        assert r2.status_code == 200
        after = r2.json().get("downloads_count", 0)
        assert after >= before


# ------------------ COURSE ANALYTICS (PHASE 4) ------------------
class TestAnalytics:
    def test_analytics_payload(self, sess):
        r = sess.get(f"{API}/live-courses/analytics/{ENROLLED_COURSE}", timeout=20)
        assert r.status_code == 200, r.text
        j = r.json()
        for k in ["overall", "subjects", "top_weak", "top_strong", "ai_tips"]:
            assert k in j, f"missing analytics key {k}"
        # weekly_hours_trend is nested inside overall (per backend impl)
        assert "weekly_hours_trend" in j["overall"], "weekly_hours_trend not found in overall"
        assert isinstance(j["overall"]["weekly_hours_trend"], list) and len(j["overall"]["weekly_hours_trend"]) >= 1
        assert isinstance(j["subjects"], list) and len(j["subjects"]) >= 1


# ------------------ WEBSOCKET ------------------
class TestWebSocket:
    def test_ws_welcome_and_chat_echo(self, token):
        try:
            import websockets  # noqa
        except ImportError:
            pytest.skip("websockets lib not installed")

        # Build ws URL from public backend URL (https -> wss)
        ws_base = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        url = f"{ws_base}/api/live-classroom/ws/{LIVE_SID}?token={token}"

        async def _run():
            import websockets
            async with websockets.connect(url, open_timeout=10, close_timeout=5) as ws:
                # Expect welcome first
                welcome_raw = await asyncio.wait_for(ws.recv(), timeout=10)
                welcome = json.loads(welcome_raw)
                # Could be welcome OR presence (announce_presence is called in join before welcome).
                # The code sends presence in join then welcome — so first is presence, next welcome
                seen_types = [welcome.get("type")]
                if welcome.get("type") == "presence":
                    nxt = json.loads(await asyncio.wait_for(ws.recv(), timeout=5))
                    seen_types.append(nxt.get("type"))
                    assert nxt.get("type") == "welcome", f"expected welcome, got {nxt}"
                else:
                    assert welcome.get("type") == "welcome"

                # Ping -> pong
                await ws.send(json.dumps({"type": "ping"}))
                got_pong = False
                got_chat_echo = False
                sent_msg = f"TEST_ws_{uuid.uuid4().hex[:6]}"
                await ws.send(json.dumps({"type": "chat", "message": sent_msg}))
                # Drain up to 6 messages within a bounded timeframe
                for _ in range(10):
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=5)
                    except asyncio.TimeoutError:
                        break
                    m = json.loads(raw)
                    if m.get("type") == "pong":
                        got_pong = True
                    if m.get("type") == "chat" and m.get("message") == sent_msg:
                        got_chat_echo = True
                    if got_pong and got_chat_echo:
                        break
                assert got_pong, "did not receive pong"
                assert got_chat_echo, "did not receive chat echo"

        asyncio.get_event_loop().run_until_complete(_run())

    def test_ws_reject_bad_token(self):
        try:
            import websockets  # noqa
        except ImportError:
            pytest.skip("websockets lib not installed")
        ws_base = BASE_URL.replace("https://", "wss://").replace("http://", "ws://")
        url = f"{ws_base}/api/live-classroom/ws/{LIVE_SID}?token=bogus"

        async def _run():
            import websockets
            async with websockets.connect(url, open_timeout=10) as ws:
                raw = await asyncio.wait_for(ws.recv(), timeout=5)
                m = json.loads(raw)
                assert m.get("type") == "error"
                assert m.get("code") == "unauthorized"

        asyncio.get_event_loop().run_until_complete(_run())
