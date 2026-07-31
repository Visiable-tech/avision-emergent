"""Tests for auth flow (register, login, me, logout, forgot/reset, update-course) + regression on existing endpoints.

Uses public EXPO_PUBLIC_BACKEND_URL for realistic tests. Dynamic emails avoid dup conflict.
"""
import os
import time
import uuid
import pytest
import requests
from pathlib import Path
from dotenv import load_dotenv

# Load frontend .env to fetch backend URL
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


# ---------------- Content sanity ----------------
class TestActiveCourses:
    def test_active_courses(self, sess):
        r = sess.get(f"{API}/courses/active", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "courses" in data
        assert len(data["courses"]) == 6
        for c in data["courses"]:
            assert set(["id", "title", "subject", "instructor"]).issubset(c.keys())
            assert "chapters" not in c  # trimmed


# ---------------- Registration ----------------
class TestRegister:
    def test_register_success(self, sess):
        email = _email()
        r = sess.post(f"{API}/auth/register", json={
            "name": "Test Student",
            "email": email,
            "password": "Passw0rd!",
            "phone": "9876543210",
            "course_id": VALID_COURSE,
        }, timeout=15)
        assert r.status_code == 201, r.text
        j = r.json()
        assert "access_token" in j
        assert j["token_type"] == "bearer"
        u = j["user"]
        assert u["email"] == email
        assert u["course_id"] == VALID_COURSE
        assert u["coins"] == 100
        assert "referral_code" in u and u["referral_code"]
        assert "password_hash" not in u
        assert "_id" not in u

    def test_register_invalid_course(self, sess):
        r = sess.post(f"{API}/auth/register", json={
            "name": "Bad Course",
            "email": _email(),
            "password": "Passw0rd!",
            "phone": "9876543210",
            "course_id": "nonexistent-course",
        }, timeout=15)
        assert r.status_code == 400, r.text

    def test_register_duplicate_email(self, sess):
        email = _email()
        payload = {
            "name": "Dup User",
            "email": email,
            "password": "Passw0rd!",
            "phone": "9876543210",
            "course_id": VALID_COURSE,
        }
        r1 = sess.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r1.status_code == 201
        r2 = sess.post(f"{API}/auth/register", json=payload, timeout=15)
        assert r2.status_code == 409, r2.text

    @pytest.mark.parametrize("phone", ["12345", "5876543210", "98765432", "abcdefghij"])
    def test_register_invalid_phone(self, sess, phone):
        r = sess.post(f"{API}/auth/register", json={
            "name": "Bad Phone",
            "email": _email(),
            "password": "Passw0rd!",
            "phone": phone,
            "course_id": VALID_COURSE,
        }, timeout=15)
        assert r.status_code == 422, f"phone={phone}: {r.status_code} {r.text}"


# ---------------- Login / me / logout ----------------
@pytest.fixture(scope="module")
def registered_user(sess):
    email = _email()
    password = "MyPass123!"
    r = sess.post(f"{API}/auth/register", json={
        "name": "Auth Flow",
        "email": email,
        "password": password,
        "phone": "9123456780",
        "course_id": VALID_COURSE,
    }, timeout=15)
    assert r.status_code == 201, r.text
    j = r.json()
    return {"email": email, "password": password, "token": j["access_token"], "user": j["user"]}


class TestLoginMeLogout:
    def test_login_success(self, sess, registered_user):
        r = sess.post(f"{API}/auth/login", json={
            "email": registered_user["email"],
            "password": registered_user["password"],
        }, timeout=15)
        assert r.status_code == 200, r.text
        j = r.json()
        assert j["access_token"]
        assert j["user"]["email"] == registered_user["email"]
        assert "password_hash" not in j["user"]
        assert "_id" not in j["user"]

    def test_login_wrong_password(self, sess, registered_user):
        r = sess.post(f"{API}/auth/login", json={
            "email": registered_user["email"],
            "password": "wrong-password",
        }, timeout=15)
        assert r.status_code == 401

    def test_me_with_token(self, sess, registered_user):
        r = sess.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {registered_user['token']}"}, timeout=15)
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == registered_user["email"]
        assert "password_hash" not in u
        assert "_id" not in u

    def test_me_without_token(self, sess):
        r = sess.get(f"{API}/auth/me", timeout=15)
        assert r.status_code == 401

    def test_logout_revokes(self, sess):
        # register a fresh user to safely revoke its token
        email = _email()
        password = "Xyz12345!"
        rr = sess.post(f"{API}/auth/register", json={
            "name": "Logout User", "email": email, "password": password,
            "phone": "9998887777", "course_id": VALID_COURSE,
        }, timeout=15)
        assert rr.status_code == 201
        token = rr.json()["access_token"]
        r = sess.post(f"{API}/auth/logout", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r.status_code == 200
        r2 = sess.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
        assert r2.status_code == 401


class TestRateLimit:
    def test_lockout_after_5_failed(self, sess):
        email = _email()
        password = "Correct1!"
        sess.post(f"{API}/auth/register", json={
            "name": "Lock Me", "email": email, "password": password,
            "phone": "9876500000", "course_id": VALID_COURSE,
        }, timeout=15).raise_for_status()
        # 5 wrong attempts
        for i in range(5):
            r = sess.post(f"{API}/auth/login", json={"email": email, "password": "wrong"}, timeout=15)
            assert r.status_code == 401, f"attempt {i} -> {r.status_code}"
        r6 = sess.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
        assert r6.status_code == 429, f"expected 429 after 5 fails, got {r6.status_code} {r6.text}"


# ---------------- Forgot / Reset ----------------
class TestPasswordReset:
    def test_full_reset_flow(self, sess):
        email = _email()
        old_pw = "OldPass1!"
        new_pw = "NewPass9$"
        sess.post(f"{API}/auth/register", json={
            "name": "Reset Me", "email": email, "password": old_pw,
            "phone": "9812345670", "course_id": VALID_COURSE,
        }, timeout=15).raise_for_status()

        fp = sess.post(f"{API}/auth/forgot-password", json={"email": email}, timeout=15)
        assert fp.status_code == 200
        token = fp.json().get("mock_reset_token")
        assert token, fp.text

        rp = sess.post(f"{API}/auth/reset-password", json={"token": token, "new_password": new_pw}, timeout=15)
        assert rp.status_code == 200

        # Login with new password
        li = sess.post(f"{API}/auth/login", json={"email": email, "password": new_pw}, timeout=15)
        assert li.status_code == 200

        # Old password should fail
        li2 = sess.post(f"{API}/auth/login", json={"email": email, "password": old_pw}, timeout=15)
        assert li2.status_code == 401

    def test_invalid_reset_token(self, sess):
        r = sess.post(f"{API}/auth/reset-password", json={"token": "invalid-token-xyz", "new_password": "AnyPass1!"}, timeout=15)
        assert r.status_code == 400

    def test_forgot_password_unknown_email(self, sess):
        # Non-enumeration: returns 200 but no mock_reset_token
        r = sess.post(f"{API}/auth/forgot-password", json={"email": "nobody-xyz@nowhere.in"}, timeout=15)
        assert r.status_code == 200
        assert "mock_reset_token" not in r.json()


# ---------------- Update course ----------------
class TestUpdateCourse:
    def test_update_course_authenticated(self, sess, registered_user):
        r = sess.post(f"{API}/auth/update-course",
                      json={"course_id": "banking-po-2026"},
                      headers={"Authorization": f"Bearer {registered_user['token']}"}, timeout=15)
        assert r.status_code == 200
        # verify via /me
        me = sess.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {registered_user['token']}"}, timeout=15)
        assert me.status_code == 200
        assert me.json()["course_id"] == "banking-po-2026"

    def test_update_course_unauth(self, sess):
        r = sess.post(f"{API}/auth/update-course", json={"course_id": "banking-po-2026"}, timeout=15)
        assert r.status_code == 401

    def test_update_course_invalid(self, sess, registered_user):
        r = sess.post(f"{API}/auth/update-course",
                      json={"course_id": "bogus"},
                      headers={"Authorization": f"Bearer {registered_user['token']}"}, timeout=15)
        assert r.status_code == 400


# ---------------- Existing endpoints regression ----------------
class TestExistingEndpoints:
    @pytest.mark.parametrize("path", [
        "/greeting", "/exam-categories", "/daily-quiz",
        "/current-affairs", "/leaderboard", "/profile", "/performance",
        "/mock-tests", "/courses", "/live-classes",
    ])
    def test_endpoint_ok(self, sess, path):
        r = sess.get(f"{API}{path}", timeout=15)
        assert r.status_code == 200, f"{path} -> {r.status_code}"
        assert "_id" not in r.text  # no leak

    def test_exam_detail(self, sess):
        r = sess.get(f"{API}/exams/ibps-po", timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "IBPS PO"

    def test_quiz_submit(self, sess):
        r = sess.post(f"{API}/quiz/submit", json={
            "quiz_id": "quiz-2026-05-08",
            "answers": [0, 1, 1, 2, 1],
        }, timeout=15)
        assert r.status_code == 200
        assert r.json()["correct"] == 5

    def test_greeting_with_token(self, sess, registered_user):
        r = sess.get(f"{API}/greeting", headers={"Authorization": f"Bearer {registered_user['token']}"}, timeout=15)
        assert r.status_code == 200
        # user name is "Auth Flow" -> first name Auth
        j = r.json()
        assert "name" in j and j["name"] in ("Auth", "Auth Flow")
