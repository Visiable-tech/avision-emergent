"""Video Courses Phase 2 (Post-Purchase Dashboard) + Phase 3 (Player + Progress + Analytics).

Covers:
  - Course detail: every chapter has >=1 lecture with video_url populated
  - GET /{cid}/lecture/{lec_id}: prev/next linkage + progress default
  - POST /{cid}/progress: upsert watched_pct + cumulative watch_seconds_delta
  - POST /{cid}/progress with completed=true: force watched_pct=100 + increment videos_watched
  - GET /{cid}/progress: resume, curriculum, progress map, subject_stats, totals
  - GET /{cid}/analytics: totals + 7-day week histogram
  - Progress endpoints require enrollment (403)
"""
import os
from pathlib import Path

import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@avision.com"
TEST_PASSWORD = "Test@123"

CID = "vc-banking-2026"
LEC_ID = "ch-number-system--lec-0"


@pytest.fixture(scope="session")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": TEST_EMAIL, "password": TEST_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def sess(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session", autouse=True)
def _ensure_enrolled(sess):
    """Ensure test user is enrolled in vc-banking-2026 before running progress tests."""
    r = sess.post(f"{API}/video-courses/{CID}/enroll/free", timeout=15)
    assert r.status_code == 200
    return r.json()


# ---- Curriculum enrichment ----
class TestCurriculumEnriched:
    def test_every_chapter_has_lectures_with_video_url(self):
        r = requests.get(f"{API}/video-courses/{CID}", timeout=15)
        assert r.status_code == 200
        j = r.json()
        curriculum = j.get("curriculum") or []
        assert len(curriculum) >= 3
        empty_chapters = []
        no_video_lectures = []
        for sub in curriculum:
            for ch in sub.get("chapters", []) or []:
                lecs = ch.get("lectures", []) or []
                if ch.get("video_count", 0) > 0 and len(lecs) == 0:
                    empty_chapters.append(f"{sub.get('subject')}/{ch.get('name')}")
                for lec in lecs:
                    if not lec.get("video_url"):
                        no_video_lectures.append(lec.get("id"))
        assert not empty_chapters, f"Chapters with no lectures despite video_count>0: {empty_chapters}"
        assert not no_video_lectures, f"Lectures missing video_url: {no_video_lectures}"


# ---- Lecture detail ----
class TestLectureDetail:
    def test_lecture_detail_first_lecture(self, sess):
        r = sess.get(f"{API}/video-courses/{CID}/lecture/{LEC_ID}", timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        # _flatten_lectures returns dicts with `lecture_id` (not `id`)
        assert j["lecture"]["lecture_id"] == LEC_ID
        assert j["lecture"]["video_url"]
        assert j["prev"] is None
        assert j["next"] is not None
        assert j["next"]["lecture_id"]  # linkage
        assert "progress" in j
        # default progress values
        assert j["progress"]["watched_pct"] in (0, None) or isinstance(j["progress"]["watched_pct"], int)
        assert "index" in j and "total" in j
        assert j["index"] == 1

    def test_lecture_404_for_unknown(self, sess):
        r = sess.get(f"{API}/video-courses/{CID}/lecture/does-not-exist", timeout=15)
        assert r.status_code == 404


# ---- Progress upsert ----
class TestProgressUpsert:
    def test_first_progress_upsert(self, sess):
        payload = {
            "lecture_id": LEC_ID,
            "watched_pct": 45,
            "last_pos_seconds": 337,
            "watch_seconds_delta": 337,
        }
        r = sess.post(f"{API}/video-courses/{CID}/progress", json=payload, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["ok"] is True
        enr = j["enrollment"]
        assert enr["course_id"] == CID
        # watch_time_hours should be > 0 now (337s = 0.09h)
        assert enr["watch_time_hours"] >= 0.09
        assert enr["progress_pct"] >= 0
        # Verify persistence via GET
        r2 = sess.get(f"{API}/video-courses/{CID}/progress", timeout=15)
        assert r2.status_code == 200
        j2 = r2.json()
        rec = j2["progress"].get(LEC_ID)
        assert rec is not None
        assert rec["watched_pct"] >= 45
        assert rec["last_pos_seconds"] == 337
        assert rec["watch_seconds"] >= 337

    def test_cumulative_watch_seconds(self, sess):
        # Baseline watch_seconds
        r0 = sess.get(f"{API}/video-courses/{CID}/progress", timeout=15)
        baseline = r0.json()["progress"].get(LEC_ID, {}).get("watch_seconds", 0)
        # Send another delta
        payload = {
            "lecture_id": LEC_ID,
            "watched_pct": 55,
            "last_pos_seconds": 500,
            "watch_seconds_delta": 200,
        }
        r = sess.post(f"{API}/video-courses/{CID}/progress", json=payload, timeout=15)
        assert r.status_code == 200
        r2 = sess.get(f"{API}/video-courses/{CID}/progress", timeout=15)
        rec = r2.json()["progress"][LEC_ID]
        # Should have increased by 200
        assert rec["watch_seconds"] == baseline + 200, f"expected {baseline+200}, got {rec['watch_seconds']}"
        # watched_pct should not decrease
        assert rec["watched_pct"] >= 55

    def test_mark_completed(self, sess):
        payload = {"lecture_id": LEC_ID, "completed": True}
        r = sess.post(f"{API}/video-courses/{CID}/progress", json=payload, timeout=15)
        assert r.status_code == 200
        enr = r.json()["enrollment"]
        assert enr["videos_watched"] >= 1
        # Verify record shows completed + watched_pct=100
        r2 = sess.get(f"{API}/video-courses/{CID}/progress", timeout=15)
        rec = r2.json()["progress"][LEC_ID]
        assert rec["completed"] is True
        assert rec["watched_pct"] == 100


# ---- GET progress overview ----
class TestProgressGet:
    def test_progress_overview_shape(self, sess):
        # Ensure at least one lecture is completed for this test (independent of order)
        sess.post(f"{API}/video-courses/{CID}/progress",
                  json={"lecture_id": LEC_ID, "completed": True}, timeout=15)
        r = sess.get(f"{API}/video-courses/{CID}/progress", timeout=15)
        assert r.status_code == 200
        j = r.json()
        for k in ["resume", "curriculum", "progress", "subject_stats", "total_lectures", "completed_lectures", "enrollment"]:
            assert k in j, f"missing key {k}"
        assert j["resume"] is not None
        assert j["resume"]["lecture_id"]
        assert isinstance(j["curriculum"], list) and len(j["curriculum"]) >= 3
        assert isinstance(j["subject_stats"], list) and len(j["subject_stats"]) >= 1
        assert j["total_lectures"] > 0
        assert j["completed_lectures"] >= 1

    def test_progress_forbidden_without_enrollment(self, sess):
        # Use a course we're likely not enrolled in
        r = sess.get(f"{API}/video-courses/vc-clat-2026/progress", timeout=15)
        # If already enrolled from earlier test runs, this could be 200
        if r.status_code == 200:
            pytest.skip("already enrolled in vc-clat-2026 from prior runs")
        assert r.status_code == 403


# ---- Analytics ----
class TestAnalytics:
    def test_analytics_shape(self, sess):
        r = sess.get(f"{API}/video-courses/{CID}/analytics", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "totals" in j and "week" in j
        t = j["totals"]
        for k in ["total_lectures", "completed_lectures", "completion_pct", "total_watch_hours", "streak_days"]:
            assert k in t
        assert t["total_lectures"] > 0
        assert t["completed_lectures"] >= 1
        assert isinstance(j["week"], list)
        assert len(j["week"]) == 7
        for row in j["week"]:
            assert "date" in row and "seconds" in row and "minutes" in row
