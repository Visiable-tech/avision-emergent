"""Video Courses (Phase 1) — backend regression suite.

Covers:
  - Categories with counts
  - Catalog filter by category + sort
  - Course detail (public + authed is_enrolled)
  - Coupon validation (AVISION25, invalid)
  - Free enroll (idempotent) + my enrollments + continue-learning
  - Razorpay pay/config + create order (unenrolled) + reject if enrolled
"""
import os
import uuid
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

# Courses expected in seed (from video_courses.py)
BANKING_COURSES = {"vc-banking-2026", "vc-ibps-po-2026", "vc-sbi-po-2026"}
SSC_COURSES = {"vc-ssc-cgl-2026"}
FREE_ENROLL_COURSE = "vc-banking-2026"  # will be enrolled during test
UNENROLLED_FRESH = "vc-lic-aao-2026"  # for order-creation test (may already be enrolled after prior runs)


# ---- fixtures ----
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


# ---- categories ----
class TestCategories:
    def test_list_categories(self):
        r = requests.get(f"{API}/video-courses/categories", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "categories" in j
        cats = j["categories"]
        assert len(cats) == 6, f"expected 6 categories, got {len(cats)}"
        ids = {c["id"] for c in cats}
        assert ids == {"banking", "ssc", "railway", "insurance", "clat", "ipm"}
        for c in cats:
            assert "count" in c and isinstance(c["count"], int)
        # banking should have 3 courses
        by_id = {c["id"]: c for c in cats}
        assert by_id["banking"]["count"] == 3
        assert by_id["ssc"]["count"] == 1


# ---- catalog ----
class TestCatalog:
    def test_list_banking(self):
        r = requests.get(f"{API}/video-courses", params={"category": "banking"}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["total"] == 3
        ids = {c["id"] for c in j["courses"]}
        assert ids == BANKING_COURSES
        assert j["category"]["id"] == "banking"

    def test_list_ssc(self):
        r = requests.get(f"{API}/video-courses", params={"category": "ssc"}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["total"] == 1
        assert j["courses"][0]["id"] == "vc-ssc-cgl-2026"

    def test_sort_price_low(self):
        r = requests.get(f"{API}/video-courses", params={"sort": "price_low"}, timeout=15)
        assert r.status_code == 200
        prices = [c["offer_price"] for c in r.json()["courses"]]
        assert prices == sorted(prices), f"not sorted: {prices}"

    def test_sort_price_high(self):
        r = requests.get(f"{API}/video-courses", params={"sort": "price_high"}, timeout=15)
        assert r.status_code == 200
        prices = [c["offer_price"] for c in r.json()["courses"]]
        assert prices == sorted(prices, reverse=True)


# ---- course detail ----
class TestCourseDetail:
    def test_detail_public(self):
        r = requests.get(f"{API}/video-courses/vc-banking-2026", timeout=15)
        assert r.status_code == 200
        j = r.json()
        # essential fields
        for k in ["id", "name", "category_id", "exam_name", "features", "curriculum",
                  "faculty_images", "price", "offer_price", "discount_pct"]:
            assert k in j, f"missing {k}"
        assert j["id"] == "vc-banking-2026"
        assert len(j["features"]) == 8, f"expected 8 features, got {len(j['features'])}"
        # curriculum: subjects → chapters → lectures
        assert isinstance(j["curriculum"], list) and len(j["curriculum"]) >= 3
        sub0 = j["curriculum"][0]
        assert "chapters" in sub0 and len(sub0["chapters"]) > 0
        ch0 = sub0["chapters"][0]
        assert "lectures" in ch0
        # is_enrolled False when unauthenticated
        assert j.get("is_enrolled") is False

    def test_detail_authed_is_enrolled_boolean(self, sess):
        r = sess.get(f"{API}/video-courses/vc-banking-2026", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "is_enrolled" in j and isinstance(j["is_enrolled"], bool)

    def test_detail_404(self):
        r = requests.get(f"{API}/video-courses/does-not-exist", timeout=15)
        assert r.status_code == 404


# ---- coupons ----
class TestCoupons:
    def test_avision25_capped(self, sess):
        r = sess.post(f"{API}/video-courses/coupons/validate",
                      json={"code": "AVISION25", "price": 1499}, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["code"] == "AVISION25"
        assert j["discount_pct"] == 25
        # 25% of 1499 = 374; less than max 1000 so discount = 374
        assert j["discount_inr"] == 374
        assert j["final_price"] == 1499 - 374

    def test_avision25_hits_cap(self, sess):
        # 25% of 5000 = 1250, but max_discount_inr is 1000
        r = sess.post(f"{API}/video-courses/coupons/validate",
                      json={"code": "AVISION25", "price": 5000}, timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["discount_inr"] == 1000
        assert j["final_price"] == 4000

    def test_invalid_coupon(self, sess):
        r = sess.post(f"{API}/video-courses/coupons/validate",
                      json={"code": "NOPE_BAD", "price": 1000}, timeout=15)
        assert r.status_code == 404

    def test_coupon_auth_required(self):
        r = requests.post(f"{API}/video-courses/coupons/validate",
                          json={"code": "AVISION25", "price": 1499}, timeout=15)
        # requires auth (401 or 403)
        assert r.status_code in (401, 403)


# ---- free enroll + my + continue ----
class TestEnrollment:
    def test_free_enroll_creates_or_returns(self, sess):
        r = sess.post(f"{API}/video-courses/{FREE_ENROLL_COURSE}/enroll/free", timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert "enrollment" in j
        e = j["enrollment"]
        assert e["course_id"] == FREE_ENROLL_COURSE
        assert "_id" not in e
        for k in ["progress_pct", "videos_watched", "id", "enrolled_at"]:
            assert k in e

    def test_free_enroll_idempotent(self, sess):
        r1 = sess.post(f"{API}/video-courses/{FREE_ENROLL_COURSE}/enroll/free", timeout=15)
        r2 = sess.post(f"{API}/video-courses/{FREE_ENROLL_COURSE}/enroll/free", timeout=15)
        assert r1.status_code == 200 and r2.status_code == 200
        # Both should reference same course, no duplicate creation
        assert r1.json()["enrollment"]["course_id"] == FREE_ENROLL_COURSE
        assert r2.json()["enrollment"]["course_id"] == FREE_ENROLL_COURSE

    def test_my_enrollments(self, sess):
        r = sess.get(f"{API}/video-courses/enrollments/mine", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "enrollments" in j
        assert len(j["enrollments"]) >= 1
        e = next((x for x in j["enrollments"] if x["course_id"] == FREE_ENROLL_COURSE), None)
        assert e is not None
        assert "progress_pct" in e and "videos_watched" in e
        assert e.get("course") is not None
        assert "_id" not in e

    def test_continue_learning(self, sess):
        r = sess.get(f"{API}/video-courses/continue-learning", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "enrollment" in j
        assert j["enrollment"] is not None
        assert j.get("course") is not None
        assert j["course"]["id"] == j["enrollment"]["course_id"]

    def test_detail_shows_enrolled_true(self, sess):
        r = sess.get(f"{API}/video-courses/{FREE_ENROLL_COURSE}", timeout=15)
        assert r.status_code == 200
        assert r.json().get("is_enrolled") is True


# ---- razorpay pay ----
class TestPay:
    def test_pay_config(self):
        r = requests.get(f"{API}/video-courses/pay/config", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert "key_id" in j and "enabled" in j

    def test_order_rejected_when_enrolled(self, sess):
        # We enrolled in FREE_ENROLL_COURSE earlier, so order should fail 400
        r = sess.post(f"{API}/video-courses/{FREE_ENROLL_COURSE}/pay/order", json={}, timeout=15)
        assert r.status_code == 400
        assert "already" in r.text.lower() or "enrolled" in r.text.lower()

    def test_order_create_with_coupon(self, sess):
        # Try to create order for a course likely not enrolled
        # If already enrolled from prior runs, skip
        r = sess.post(f"{API}/video-courses/{UNENROLLED_FRESH}/pay/order",
                      json={"coupon_code": "AVISION25"}, timeout=15)
        if r.status_code == 400:
            pytest.skip(f"already enrolled in {UNENROLLED_FRESH}")
        # If Razorpay not configured, expect 503
        if r.status_code == 503:
            pytest.skip("Razorpay not configured")
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text}"
        j = r.json()
        for k in ["key_id", "order_id", "amount", "currency", "final_price", "discount_inr"]:
            assert k in j
        # LIC AAO offer_price=1499. AVISION25 -> min(25%=374, cap 1000) = 374
        # final_price should be 1499-374 = 1125
        assert j["discount_inr"] == 374
        assert j["final_price"] == 1125
        assert j["amount"] == 1125 * 100

    def test_order_404_bad_course(self, sess):
        r = sess.post(f"{API}/video-courses/vc-not-real/pay/order", json={}, timeout=15)
        assert r.status_code == 404
