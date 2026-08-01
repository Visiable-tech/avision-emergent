"""Iteration 4: feed endpoint + home extras sanity for restructured screens."""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


# ---- Feed ----
class TestFeed:
    def test_feed_all(self, s):
        r = s.get(f"{API}/feed")
        assert r.status_code == 200, r.text
        data = r.json()
        assert "posts" in data
        posts = data["posts"]
        assert len(posts) >= 5
        for p in posts:
            assert "id" in p and "type" in p and "title" in p
            assert "likes" in p and isinstance(p["likes"], int)
            assert "comments" in p and isinstance(p["comments"], int)
            assert "liked" in p and isinstance(p["liked"], bool)
        assert '"_id"' not in r.text

    def test_feed_banking(self, s):
        r = s.get(f"{API}/feed", params={"category": "banking"})
        assert r.status_code == 200
        posts = r.json()["posts"]
        ids = {p["id"] for p in posts}
        # fp2 is banking, fp1/fp4/fp6 universal (category_id None). Not: fp3 (ssc), fp5 (upsc).
        assert "fp2" in ids
        assert "fp1" in ids
        assert "fp3" not in ids and "fp5" not in ids

    def test_feed_with_user_id(self, s):
        r = s.get(f"{API}/feed", params={"user_id": "nonexistent-user"})
        assert r.status_code == 200
        posts = r.json()["posts"]
        for p in posts:
            assert p["liked"] is False


# ---- Banners / Jobs / Daily challenges (sanity for restructured home) ----
class TestBannersJobsDC:
    def test_banners_banking(self, s):
        r = s.get(f"{API}/banners", params={"category": "banking"})
        assert r.status_code == 200
        ids = {b["id"] for b in r.json()["banners"]}
        assert {"b1", "b2", "b4"} <= ids
        assert "b3" not in ids and "b5" not in ids

    def test_job_alerts_banking_shape(self, s):
        r = s.get(f"{API}/job-alerts", params={"category": "banking", "limit": 10})
        assert r.status_code == 200
        jobs = r.json()["jobs"]
        assert len(jobs) >= 1
        required = {"id", "title", "organization", "org_logo",
                    "publish_date", "last_date"}
        for j in jobs:
            missing = required - set(j.keys())
            assert not missing, f"job {j.get('id')} missing {missing}"
            assert ("posts_count" in j) or ("posts" in j)

    def test_job_detail_full_shape(self, s):
        r = s.get(f"{API}/job-alerts/j1")
        assert r.status_code == 200
        j = r.json()
        required = {"important_dates", "selection_process", "important_links",
                    "eligibility", "age_limit", "salary", "official_website"}
        missing = required - set(j.keys())
        assert not missing, f"detail missing keys: {missing}"
        assert isinstance(j["important_dates"], list) and len(j["important_dates"]) >= 1
        assert isinstance(j["selection_process"], list) and len(j["selection_process"]) >= 1
        assert isinstance(j["important_links"], list)

    def test_daily_challenges_shape(self, s):
        r = s.get(f"{API}/daily-challenges", params={"category": "banking", "user_id": "u_test"})
        assert r.status_code == 200
        d = r.json()
        assert len(d["challenges"]) == 4
        for c in d["challenges"]:
            for k in ("attempted", "reward_coins", "icon", "color"):
                assert k in c, f"missing {k} in {c['id']}"
            assert isinstance(c["attempted"], bool)
