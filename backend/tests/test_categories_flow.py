"""Tests for iteration 3 – Exam Category based architecture.

Covers:
  - /api/exam-categories/active (list, filters, subtitle)
  - /api/exam-categories/{id}
  - /api/auth/register with category_id
  - Backward compat with course_id
  - /api/auth/update-category, /api/auth/update-language
  - Category-filtered content endpoints (courses, mock-tests, live-classes)
  - Admin CRUD for categories & exams
"""
import os
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
API = f"{BASE_URL}/api"

VALID_COURSE = "ssc-cgl-complete"


def _email():
    return f"qa+{uuid.uuid4().hex[:10]}@avision.in"


@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------------- Exam Categories public ----------------
class TestExamCategoriesPublic:
    def test_active_categories_returns_12(self, sess):
        r = sess.get(f"{API}/exam-categories/active", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "categories" in data
        assert len(data["categories"]) == 12, f"expected 12 got {len(data['categories'])}"
        # Every category must have subtitle and exams
        for c in data["categories"]:
            assert "subtitle" in c, f"missing subtitle in {c.get('id')}"
            assert isinstance(c["subtitle"], str)
            assert "exams" in c and isinstance(c["exams"], list)
            assert "_id" not in c
            for e in c["exams"]:
                assert "_id" not in e

    def test_search_law(self, sess):
        r = sess.get(f"{API}/exam-categories/active", params={"search": "law"}, timeout=15)
        assert r.status_code == 200
        cats = r.json()["categories"]
        # 'Law Entrance' at minimum should be there
        names = [c["name"] for c in cats]
        assert "Law Entrance" in names, names
        # ensure filter is applied (fewer than 12)
        assert len(cats) < 12, f"filter did not reduce set: {names}"

    def test_search_bank_matches_banking(self, sess):
        r = sess.get(f"{API}/exam-categories/active", params={"search": "bank"}, timeout=15)
        assert r.status_code == 200
        names = [c["name"] for c in r.json()["categories"]]
        assert "Banking" in names

    def test_category_detail(self, sess):
        r = sess.get(f"{API}/exam-categories/law", timeout=15)
        assert r.status_code == 200
        j = r.json()
        assert j["id"] == "law"
        assert j["name"] == "Law Entrance"
        assert isinstance(j.get("exams"), list) and len(j["exams"]) > 0
        assert "_id" not in j  # no leaked Mongo _id (top-level)

    def test_category_detail_404(self, sess):
        r = sess.get(f"{API}/exam-categories/nonexistent-cat", timeout=15)
        assert r.status_code == 404


# ---------------- Register with category_id ----------------
class TestRegisterCategory:
    def test_register_with_category_id(self, sess):
        email = _email()
        r = sess.post(f"{API}/auth/register", json={
            "name": "Cat User", "email": email, "password": "Passw0rd!",
            "phone": "9876543210", "category_id": "banking",
        }, timeout=15)
        assert r.status_code == 201, r.text
        j = r.json()
        u = j["user"]
        assert u["email"] == email
        assert u["category_id"] == "banking"
        assert u.get("course_id") in (None, "")
        assert "password_hash" not in u and "_id" not in u

    def test_register_backward_compat_course_id(self, sess):
        r = sess.post(f"{API}/auth/register", json={
            "name": "Legacy", "email": _email(), "password": "Passw0rd!",
            "phone": "9876543210", "course_id": VALID_COURSE,
        }, timeout=15)
        assert r.status_code == 201, r.text
        assert r.json()["user"]["course_id"] == VALID_COURSE

    def test_register_neither_category_nor_course(self, sess):
        r = sess.post(f"{API}/auth/register", json={
            "name": "Nothing", "email": _email(), "password": "Passw0rd!",
            "phone": "9876543210",
        }, timeout=15)
        assert r.status_code == 400, r.text

    def test_register_invalid_category(self, sess):
        r = sess.post(f"{API}/auth/register", json={
            "name": "Bad Cat", "email": _email(), "password": "Passw0rd!",
            "phone": "9876543210", "category_id": "not-a-real-cat",
        }, timeout=15)
        assert r.status_code == 400, r.text


# ---------------- Update category / language ----------------
@pytest.fixture(scope="module")
def cat_user(sess):
    email = _email()
    password = "Passw0rd!"
    r = sess.post(f"{API}/auth/register", json={
        "name": "Cat Auth", "email": email, "password": password,
        "phone": "9876543211", "category_id": "ssc",
    }, timeout=15)
    assert r.status_code == 201, r.text
    return {"email": email, "token": r.json()["access_token"]}


class TestUpdateCategoryLanguage:
    def test_update_category_auth_required(self, sess):
        r = sess.post(f"{API}/auth/update-category", json={"category_id": "banking"}, timeout=15)
        assert r.status_code == 401

    def test_update_category_success(self, sess, cat_user):
        r = sess.post(
            f"{API}/auth/update-category",
            json={"category_id": "law", "selected_exam_id": "clat"},
            headers={"Authorization": f"Bearer {cat_user['token']}"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # verify via /me
        me = sess.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {cat_user['token']}"}, timeout=15)
        assert me.status_code == 200
        u = me.json()
        assert u["category_id"] == "law"
        assert u["selected_exam_id"] == "clat"

    def test_update_category_invalid(self, sess, cat_user):
        r = sess.post(
            f"{API}/auth/update-category", json={"category_id": "does-not-exist"},
            headers={"Authorization": f"Bearer {cat_user['token']}"}, timeout=15,
        )
        assert r.status_code == 400

    @pytest.mark.parametrize("lang", ["en", "hi", "bn"])
    def test_update_language_valid(self, sess, cat_user, lang):
        r = sess.post(
            f"{API}/auth/update-language", json={"language": lang},
            headers={"Authorization": f"Bearer {cat_user['token']}"}, timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["language"] == lang

    def test_update_language_invalid(self, sess, cat_user):
        r = sess.post(
            f"{API}/auth/update-language", json={"language": "fr"},
            headers={"Authorization": f"Bearer {cat_user['token']}"}, timeout=15,
        )
        assert r.status_code == 400

    def test_update_language_auth_required(self, sess):
        r = sess.post(f"{API}/auth/update-language", json={"language": "hi"}, timeout=15)
        assert r.status_code == 401


# ---------------- Category-filtered content ----------------
class TestCategoryFilteredContent:
    def test_courses_filter_banking(self, sess):
        r = sess.get(f"{API}/courses", params={"category": "banking"}, timeout=15)
        assert r.status_code == 200
        courses = r.json()["courses"]
        assert len(courses) >= 1
        for c in courses:
            assert c.get("category_id") == "banking", c

    def test_live_classes_filter_ssc(self, sess):
        r = sess.get(f"{API}/live-classes", params={"category": "ssc"}, timeout=15)
        assert r.status_code == 200
        classes = r.json()["classes"]
        assert len(classes) >= 1
        for cls in classes:
            assert cls.get("category_id") == "ssc"

    def test_mock_tests_filter_law(self, sess):
        r = sess.get(f"{API}/mock-tests", params={"category": "law"}, timeout=15)
        assert r.status_code == 200
        tests = r.json()["tests"]
        # law is tagged on mt4
        assert len(tests) >= 1
        for t in tests:
            assert t.get("category_id") == "law", t

    def test_courses_no_filter_returns_all(self, sess):
        r = sess.get(f"{API}/courses", timeout=15)
        assert r.status_code == 200
        assert len(r.json()["courses"]) >= 6


# ---------------- Admin CRUD ----------------
class TestAdminCategoryCRUD:
    _created_cat = None
    _created_exam = None

    def test_create_category(self, sess):
        cid = f"test-cat-{uuid.uuid4().hex[:6]}"
        r = sess.post(f"{API}/admin/categories", json={
            "id": cid, "slug": cid, "name": f"TEST_{cid}",
            "description": "test cat", "display_order": 999, "status": "active",
        }, timeout=15)
        assert r.status_code == 200, r.text
        TestAdminCategoryCRUD._created_cat = cid

    def test_update_category(self, sess):
        cid = TestAdminCategoryCRUD._created_cat
        assert cid, "no cat created"
        r = sess.put(f"{API}/admin/categories/{cid}", json={
            "name": "TEST_updated", "slug": cid, "display_order": 998, "status": "active",
        }, timeout=15)
        assert r.status_code == 200, r.text
        # Verify via detail
        d = sess.get(f"{API}/exam-categories/{cid}", timeout=15)
        assert d.status_code == 200
        assert d.json()["name"] == "TEST_updated"

    def test_create_exam_valid_category(self, sess):
        cid = TestAdminCategoryCRUD._created_cat
        eid = f"test-exam-{uuid.uuid4().hex[:6]}"
        r = sess.post(f"{API}/admin/exams", json={
            "id": eid, "category_id": cid, "name": f"TEST_{eid}",
        }, timeout=15)
        assert r.status_code == 200, r.text
        TestAdminCategoryCRUD._created_exam = eid

    def test_create_exam_invalid_category(self, sess):
        r = sess.post(f"{API}/admin/exams", json={
            "id": f"bad-{uuid.uuid4().hex[:6]}",
            "category_id": "no-such-cat", "name": "TEST_bad",
        }, timeout=15)
        assert r.status_code == 400, r.text

    def test_update_exam(self, sess):
        eid = TestAdminCategoryCRUD._created_exam
        cid = TestAdminCategoryCRUD._created_cat
        r = sess.put(f"{API}/admin/exams/{eid}", json={
            "category_id": cid, "name": "TEST_exam_updated",
        }, timeout=15)
        assert r.status_code == 200, r.text

    def test_delete_exam(self, sess):
        eid = TestAdminCategoryCRUD._created_exam
        r = sess.delete(f"{API}/admin/exams/{eid}", timeout=15)
        assert r.status_code == 200
        # Verify deleted -> repeat should 404
        r2 = sess.delete(f"{API}/admin/exams/{eid}", timeout=15)
        assert r2.status_code == 404

    def test_delete_category_cascade(self, sess):
        cid = TestAdminCategoryCRUD._created_cat
        r = sess.delete(f"{API}/admin/categories/{cid}", timeout=15)
        assert r.status_code == 200
        # verify gone
        d = sess.get(f"{API}/exam-categories/{cid}", timeout=15)
        assert d.status_code == 404

    def test_update_nonexistent_category(self, sess):
        r = sess.put(f"{API}/admin/categories/no-such-cat-xyz", json={
            "name": "x", "slug": "x",
        }, timeout=15)
        assert r.status_code == 404
