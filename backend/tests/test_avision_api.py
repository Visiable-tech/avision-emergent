"""Backend tests for Avision Institute API."""
import os
import re
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://avision-study-dash.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def _no_mongo_id(data):
    """Assert no `_id` (MongoDB ObjectId) is leaked in any response."""
    txt = str(data)
    assert '"_id"' not in txt and "'_id'" not in txt, f"MongoDB _id leaked: {txt[:200]}"


# ---------- Content endpoints ----------
class TestContent:
    def test_root(self, s):
        r = s.get(f"{API}/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"

    def test_greeting(self, s):
        r = s.get(f"{API}/greeting")
        assert r.status_code == 200
        d = r.json()
        for k in ("greeting", "name", "streak", "coins", "xp"):
            assert k in d
        assert d["greeting"] in ("Good Morning", "Good Afternoon", "Good Evening")
        _no_mongo_id(d)

    def test_quick_access(self, s):
        r = s.get(f"{API}/quick-access")
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 10
        for it in items:
            assert {"id", "label", "icon"} <= set(it.keys())
        _no_mongo_id(items)

    def test_exam_categories(self, s):
        r = s.get(f"{API}/exam-categories")
        assert r.status_code == 200
        cats = r.json()["categories"]
        assert len(cats) >= 8
        assert any(c["id"] == "banking" for c in cats)
        for c in cats:
            assert "exams" in c and len(c["exams"]) > 0
        _no_mongo_id(cats)

    def test_exam_detail_known(self, s):
        r = s.get(f"{API}/exams/ibps-po")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "ibps-po"
        assert d["name"] == "IBPS PO"
        for k in ("overview", "eligibility", "syllabus", "cutoffs", "roadmap", "faqs"):
            assert k in d
        _no_mongo_id(d)

    def test_exam_detail_unknown_id_uses_default(self, s):
        r = s.get(f"{API}/exams/some-random")
        # Backend uses default template even for unknown -> should be 200
        assert r.status_code == 200
        assert r.json()["id"] == "some-random"

    def test_courses(self, s):
        r = s.get(f"{API}/courses")
        assert r.status_code == 200
        courses = r.json()["courses"]
        assert len(courses) >= 4
        # `chapters` must be stripped
        assert all("chapters" not in c for c in courses)
        _no_mongo_id(courses)

    def test_course_detail(self, s):
        r = s.get(f"{API}/courses/ssc-cgl-complete")
        assert r.status_code == 200
        c = r.json()
        assert c["id"] == "ssc-cgl-complete"
        assert isinstance(c["chapters"], list) and len(c["chapters"]) > 0

    def test_course_detail_404(self, s):
        r = s.get(f"{API}/courses/does-not-exist")
        assert r.status_code == 404

    def test_live_classes(self, s):
        r = s.get(f"{API}/live-classes")
        assert r.status_code == 200
        cls = r.json()["classes"]
        assert len(cls) >= 3
        assert any(c["status"] == "live" for c in cls)

    def test_current_affairs(self, s):
        r = s.get(f"{API}/current-affairs")
        assert r.status_code == 200
        arts = r.json()["articles"]
        assert len(arts) >= 5

    def test_current_affairs_detail(self, s):
        r = s.get(f"{API}/current-affairs/ca1")
        assert r.status_code == 200
        assert r.json()["id"] == "ca1"

    def test_mock_tests(self, s):
        r = s.get(f"{API}/mock-tests")
        assert r.status_code == 200
        tests = r.json()["tests"]
        assert len(tests) >= 4

    def test_leaderboard(self, s):
        r = s.get(f"{API}/leaderboard")
        assert r.status_code == 200
        users = r.json()["users"]
        assert len(users) >= 5
        assert any(u.get("is_me") for u in users)

    def test_profile(self, s):
        r = s.get(f"{API}/profile")
        assert r.status_code == 200
        p = r.json()
        for k in ("name", "email", "coins", "xp", "streak", "badges", "stats"):
            assert k in p
        _no_mongo_id(p)

    def test_performance(self, s):
        r = s.get(f"{API}/performance")
        assert r.status_code == 200
        p = r.json()
        for k in ("weekly_hours", "accuracy_trend", "subject_strength",
                  "weak_areas", "strong_areas", "completion", "ai_suggestions"):
            assert k in p
        assert len(p["weekly_hours"]) == 7


# ---------- Quiz flow ----------
class TestQuiz:
    def test_daily_quiz_no_correct_leaked(self, s):
        r = s.get(f"{API}/daily-quiz")
        assert r.status_code == 200
        q = r.json()
        assert q["id"] == "quiz-2026-05-08"
        assert len(q["questions"]) == 5
        for qq in q["questions"]:
            # `correct` MUST NOT be exposed to client
            assert "correct" not in qq
            assert "explanation" not in qq
            assert "options" in qq and len(qq["options"]) == 4

    def test_quiz_submit_all_correct(self, s):
        # Correct answers per seed_data: [0, 1, 1, 2, 1]
        payload = {"quiz_id": "quiz-2026-05-08", "answers": [0, 1, 1, 2, 1]}
        r = s.post(f"{API}/quiz/submit", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == 5
        assert d["correct"] == 5
        assert d["wrong"] == 0
        assert d["accuracy"] == 100.0
        assert d["coins_earned"] == 50
        assert d["xp_earned"] == 100
        assert d["score"] == 5 * 4 - 0
        assert len(d["questions"]) == 5
        assert all(q["is_correct"] for q in d["questions"])

    def test_quiz_submit_partial(self, s):
        # 2 correct, 3 wrong
        payload = {"quiz_id": "quiz-2026-05-08", "answers": [0, 1, 0, 0, 0]}
        r = s.post(f"{API}/quiz/submit", json=payload)
        assert r.status_code == 200
        d = r.json()
        assert d["correct"] == 2
        assert d["wrong"] == 3
        assert d["accuracy"] == 40.0
        assert d["coins_earned"] == 20
        assert d["xp_earned"] == 40
        assert d["score"] == 2 * 4 - 3
        # Review data present
        for q in d["questions"]:
            assert "explanation" in q
            assert "correct_answer" in q
            assert "your_answer" in q

    def test_quiz_submit_invalid_id(self, s):
        r = s.post(f"{API}/quiz/submit",
                   json={"quiz_id": "bogus", "answers": [0, 0, 0, 0, 0]})
        assert r.status_code == 404


# ---------- AI endpoints ----------
class TestAI:
    session_id = f"TEST_pytest_{uuid.uuid4()}"

    def test_ai_reset_initial(self, s):
        r = s.post(f"{API}/ai/reset/{self.session_id}")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_ai_chat(self, s):
        r = s.post(f"{API}/ai/chat", json={
            "session_id": self.session_id,
            "message": "In one sentence, what is SSC CGL?",
            "mode": "tutor",
        }, timeout=90)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["session_id"] == self.session_id
        assert isinstance(d["reply"], str) and len(d["reply"]) > 5
        assert "timestamp" in d

    def test_ai_history_after_chat(self, s):
        r = s.get(f"{API}/ai/history/{self.session_id}")
        assert r.status_code == 200
        msgs = r.json()["messages"]
        # At least one user + one assistant message from previous test
        assert len(msgs) >= 2
        roles = [m["role"] for m in msgs]
        assert "user" in roles and "assistant" in roles
        _no_mongo_id(msgs)

    def test_ai_reset_clears(self, s):
        r = s.post(f"{API}/ai/reset/{self.session_id}")
        assert r.status_code == 200
        r2 = s.get(f"{API}/ai/history/{self.session_id}")
        assert r2.status_code == 200
        assert r2.json()["messages"] == []

    def test_study_planner(self, s):
        r = s.post(f"{API}/study-planner", json={
            "exam": "SSC CGL",
            "hours_per_day": 4,
            "weak_subjects": ["Data Interpretation"],
            "target_date": "2026-09-01",
        }, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["plan"], str) and len(d["plan"]) > 50
        assert "generated_at" in d
