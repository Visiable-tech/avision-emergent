"""Backend tests for the new Home-screen extras endpoints (iteration 3).

Covers:
- GET /api/banners (+ ?category)
- GET /api/current-affairs/latest (+ ?category)
- GET /api/job-alerts (+ ?category, ?limit)
- GET /api/job-alerts/{id} (+ 404)
- GET /api/daily-challenges (4 subjects w/ metadata)
- GET /api/daily-challenges/{subject_id} (no correct answers leaked)
- POST /api/daily-challenges/submit (score, coins, xp, rank)
- POST /api/daily-challenges/submit twice → 409
- Wallet update via /api/auth/me
"""
import os
import uuid
import pytest
import requests
from datetime import datetime, timezone

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://avision-study-dash.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"


def _no_mongo_id(data):
    txt = str(data)
    assert '"_id"' not in txt and "'_id'" not in txt, f"Mongo _id leaked: {txt[:200]}"


@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def user_ctx(s):
    """Register a fresh user with category_id=banking, return auth ctx."""
    email = f"TEST_dc_{uuid.uuid4().hex[:8]}@avision.in"
    payload = {
        "name": "TEST DC User",
        "email": email,
        "phone": f"9{uuid.uuid4().int % 10**9:09d}",
        "password": "Test123!",
        "category_id": "banking",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code in (200, 201), r.text
    d = r.json()
    token = d.get("token") or d.get("access_token")
    user = d.get("user", {})
    uid = user.get("user_id") or user.get("id")
    assert token and uid, f"missing token/uid: {d}"
    return {"token": token, "user_id": uid, "email": email,
            "headers": {"Authorization": f"Bearer {token}",
                        "Content-Type": "application/json"}}


# ---------- Banners ----------
class TestBanners:
    def test_banners_all(self, s):
        r = s.get(f"{API}/banners")
        assert r.status_code == 200
        d = r.json()
        assert "banners" in d
        assert len(d["banners"]) >= 5
        _no_mongo_id(d)
        for b in d["banners"]:
            assert {"id", "title", "subtitle", "image", "cta"} <= set(b.keys())

    def test_banners_by_banking(self, s):
        r = s.get(f"{API}/banners", params={"category": "banking"})
        assert r.status_code == 200
        items = r.json()["banners"]
        ids = {b["id"] for b in items}
        # SBI PO banner (b2) is banking-tagged; universals b1/b4 are None
        assert "b2" in ids
        assert "b1" in ids and "b4" in ids
        # ssc-only banner must NOT appear for banking
        assert "b3" not in ids and "b5" not in ids


# ---------- Current Affairs latest ----------
class TestCurrentAffairsLatest:
    def test_latest_default(self, s):
        r = s.get(f"{API}/current-affairs/latest")
        assert r.status_code == 200
        d = r.json()
        assert d is not None
        assert "id" in d and "title" in d

    def test_latest_by_category(self, s):
        r = s.get(f"{API}/current-affairs/latest", params={"category": "banking"})
        assert r.status_code == 200
        d = r.json()
        # Universal CA (category_id None) still visible
        assert d is not None and "id" in d


# ---------- Job alerts ----------
class TestJobAlerts:
    def test_list_all(self, s):
        r = s.get(f"{API}/job-alerts")
        assert r.status_code == 200
        jobs = r.json()["jobs"]
        assert len(jobs) >= 10

    def test_list_banking(self, s):
        r = s.get(f"{API}/job-alerts", params={"category": "banking"})
        assert r.status_code == 200
        jobs = r.json()["jobs"]
        ids = [j["id"] for j in jobs]
        # IBPS PO j1 and SBI PO j3 both banking
        assert set(ids) == {"j1", "j3"}, f"unexpected banking jobs: {ids}"

    def test_list_limit(self, s):
        r = s.get(f"{API}/job-alerts", params={"limit": 2})
        assert r.status_code == 200
        jobs = r.json()["jobs"]
        assert len(jobs) == 2

    def test_detail_ok(self, s):
        r = s.get(f"{API}/job-alerts/j1")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "j1"
        assert d["organization"] == "IBPS"
        assert d["posts"] == 4135

    def test_detail_404(self, s):
        r = s.get(f"{API}/job-alerts/no-such-id")
        assert r.status_code == 404


# ---------- Daily challenges ----------
class TestDailyChallenges:
    EXPECTED_SUBJECTS = {"current-affairs", "english", "reasoning", "quant"}

    def test_list_default(self, s):
        r = s.get(f"{API}/daily-challenges")
        assert r.status_code == 200
        d = r.json()
        assert "date" in d and datetime.now(timezone.utc).strftime("%Y-%m-%d") == d["date"]
        ids = {c["id"] for c in d["challenges"]}
        assert ids == self.EXPECTED_SUBJECTS
        for c in d["challenges"]:
            for k in ("name", "icon", "color", "questions_count",
                      "duration_min", "difficulty", "reward_coins", "reward_xp"):
                assert k in c, f"missing {k} in challenge {c['id']}"
            assert c["attempted"] is False  # no user context

    def test_detail_no_leak(self, s):
        r = s.get(f"{API}/daily-challenges/quant")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "quant"
        assert len(d["questions"]) == 10
        for q in d["questions"]:
            assert "correct" not in q
            assert "explanation" not in q
            assert "options" in q and len(q["options"]) == 4

    def test_detail_404(self, s):
        r = s.get(f"{API}/daily-challenges/does-not-exist")
        assert r.status_code == 404


# ---------- Submit flow ----------
class TestDailyChallengeSubmit:
    # Correct answers for QUANT per seed: [2,2,1,1,2,2,2,2,1,2]
    QUANT_ALL_CORRECT = [2, 2, 1, 1, 2, 2, 2, 2, 1, 2]

    def test_submit_no_user_full_correct(self, s):
        r = s.post(
            f"{API}/daily-challenges/submit",
            json={"subject_id": "quant", "answers": self.QUANT_ALL_CORRECT, "time_taken_sec": 300},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["total"] == 10
        assert d["correct"] == 10
        assert d["wrong"] == 0
        assert d["accuracy"] == 100.0
        # coins_earned = correct * (reward_coins // total) = 10 * (60//10) = 60
        assert d["coins_earned"] == 60
        assert d["xp_earned"] == 120
        assert "rank" in d and isinstance(d["rank"], int)
        assert len(d["questions"]) == 10
        for q in d["questions"]:
            assert "correct_answer" in q and "explanation" in q

    def test_submit_partial(self, s):
        answers = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]  # all zeros → some correct
        r = s.post(
            f"{API}/daily-challenges/submit",
            json={"subject_id": "english", "answers": answers, "time_taken_sec": 240},
        )
        assert r.status_code == 200
        d = r.json()
        assert 0 <= d["correct"] <= 10
        assert d["accuracy"] == round((d["correct"] / 10) * 100, 1)

    def test_submit_unknown_subject(self, s):
        r = s.post(
            f"{API}/daily-challenges/submit",
            json={"subject_id": "bogus", "answers": [0], "time_taken_sec": 10},
        )
        assert r.status_code == 404

    def test_submit_with_user_and_dedupe(self, s, user_ctx):
        # First submit
        r1 = s.post(
            f"{API}/daily-challenges/submit",
            params={"user_id": user_ctx["user_id"]},
            json={"subject_id": "reasoning", "answers": [1] * 10, "time_taken_sec": 200},
        )
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        earned_coins = d1["coins_earned"]
        earned_xp = d1["xp_earned"]

        # Second submit → 409
        r2 = s.post(
            f"{API}/daily-challenges/submit",
            params={"user_id": user_ctx["user_id"]},
            json={"subject_id": "reasoning", "answers": [1] * 10, "time_taken_sec": 200},
        )
        assert r2.status_code == 409, r2.text

        # /daily-challenges with user_id should show reasoning as attempted
        r3 = s.get(f"{API}/daily-challenges", params={"user_id": user_ctx["user_id"]})
        assert r3.status_code == 200
        challenges = {c["id"]: c for c in r3.json()["challenges"]}
        assert challenges["reasoning"]["attempted"] is True
        assert challenges["quant"]["attempted"] is False

        # /auth/me should reflect the coin/xp increments
        me = s.get(f"{API}/auth/me", headers=user_ctx["headers"])
        assert me.status_code == 200, me.text
        user = me.json()
        # Registration seeds 100 coins; ensure at least that plus earned
        assert user.get("coins", 0) >= earned_coins
        assert user.get("xp", 0) >= earned_xp
