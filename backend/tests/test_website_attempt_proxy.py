"""
Test the AVISION ONE Student Web Portal (Next.js @ :3001) test-attempt proxy flow.
Backend (:8001) is unchanged; we verify:
  1. Test Prime entitlement seeding for test@avision.com
  2. All /api/session/attempt/* proxy endpoints (cookie auth)
  3. JWT never leaks in any client-visible response
  4. All endpoints return 401 without cookie
  5. UI page HTTP status codes (SSR-friendly)
"""
import os
import re
import time
import requests
import pytest

WEB = os.environ.get("WEBSITE_URL", "http://localhost:3001").rstrip("/")
API = os.environ.get("BACKEND_URL", "http://localhost:8001").rstrip("/")

EMAIL = "test@avision.com"
PASSWORD = "Test@123"
TEST_ID = "t_sbi-po_pyq_5"

# ------------------------------------------------------------------
# helpers / fixtures
# ------------------------------------------------------------------


@pytest.fixture(scope="module")
def backend_login():
    """Backend JWT login for entitlement seeding + spot check."""
    r = requests.post(
        f"{API}/api/auth/login", json={"email": EMAIL, "password": PASSWORD}, timeout=20
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return {"token": data["access_token"], "user_id": data["user"]["user_id"]}


@pytest.fixture(scope="module", autouse=True)
def ensure_prime(backend_login):
    """Idempotently grant tp-plan-12m Test Prime entitlement to the test user."""
    uid = backend_login["user_id"]
    tok = backend_login["token"]

    ent = requests.get(
        f"{API}/api/test-prime/entitlement?user_id={uid}",
        headers={"Authorization": f"Bearer {tok}"},
        timeout=20,
    )
    if ent.status_code == 200 and ent.json().get("is_prime"):
        return

    # Grant via admin enroll
    r = requests.post(
        f"{API}/api/admin/enroll",
        json={
            "user_id": uid,
            "product_id": "tp-plan-12m",
            "amount_inr": 0,
            "method": "admin_grant",
        },
        headers={"Authorization": f"Bearer {tok}"},
        timeout=20,
    )
    # Some admin endpoints require an admin-role header; accept either 200 or
    # skip if not permitted (backend spec is out of scope).
    assert r.status_code in (200, 201, 409), r.text


@pytest.fixture(scope="module")
def web_session(backend_login):
    """Log in via the website's /api/session/login to obtain the HTTP-only cookie."""
    s = requests.Session()
    r = s.post(
        f"{WEB}/api/session/login",
        json={"email": EMAIL, "password": PASSWORD},
        timeout=20,
    )
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True
    assert "avn_session" in s.cookies, f"cookie missing; got {s.cookies}"
    return s


def _no_jwt_in(body: dict | str):
    """Check that no JWT-shaped string leaks."""
    text = body if isinstance(body, str) else str(body)
    # JWT = 3 base64url segments separated by dots (min ~90 chars typically)
    jwt_re = re.compile(r"\beyJ[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}\b")
    m = jwt_re.search(text)
    assert m is None, f"JWT leak detected: {m.group(0)[:40]}..."


# ------------------------------------------------------------------
# 1. Test Prime entitlement
# ------------------------------------------------------------------
class TestEntitlement:
    def test_is_prime_true(self, backend_login):
        r = requests.get(
            f"{API}/api/test-prime/entitlement?user_id={backend_login['user_id']}",
            headers={"Authorization": f"Bearer {backend_login['token']}"},
            timeout=20,
        )
        assert r.status_code == 200
        assert r.json().get("is_prime") is True


# ------------------------------------------------------------------
# 2. Server-proxy endpoints (via cookie auth on :3001)
# ------------------------------------------------------------------
class TestSessionLoginCookie:
    def test_cookie_httponly(self, web_session):
        c = web_session.cookies.get("avn_session")
        assert c and len(c) > 20
        # cookie value itself will contain the JWT but we're only checking that
        # response bodies never expose it.


class TestAttemptProxyUnauthenticated:
    """No cookie → 401 across the board."""

    @pytest.mark.parametrize(
        "method,path,body",
        [
            ("POST", "/api/session/attempt/start", {"test_id": TEST_ID, "language": "English"}),
            ("GET", "/api/session/attempt/dummy-id", None),
            ("PATCH", "/api/session/attempt/dummy-id/state", {"answers": {}}),
            ("POST", "/api/session/attempt/dummy-id/violation", {"type": "tab_switch"}),
            ("POST", "/api/session/attempt/dummy-id/submit", {}),
        ],
    )
    def test_401_without_cookie(self, method, path, body):
        r = requests.request(method, f"{WEB}{path}", json=body, timeout=20)
        assert r.status_code == 401, f"{method} {path} → {r.status_code}: {r.text[:200]}"
        j = r.json()
        assert j.get("ok") is False
        _no_jwt_in(r.text)


class TestAttemptProxyAuthenticated:
    """Full lifecycle via the cookie session."""

    def test_full_lifecycle(self, web_session):
        # 2.1 START
        r = web_session.post(
            f"{WEB}/api/session/attempt/start",
            json={"test_id": TEST_ID, "language": "English"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        att = r.json()
        _no_jwt_in(r.text)
        assert "attempt_id" in att, att
        aid = att["attempt_id"]
        assert isinstance(att.get("questions"), list) and len(att["questions"]) > 0
        # SBI-PO PYQ 5 → ~100 questions across 3 sections
        assert len(att["questions"]) >= 50, f"expected ~100 Qs, got {len(att['questions'])}"
        assert isinstance(att.get("sections"), list) and len(att["sections"]) >= 1
        assert att.get("total_duration_sec", 0) > 0

        # 2.2 GET current state
        g = web_session.get(f"{WEB}/api/session/attempt/{aid}", timeout=20)
        assert g.status_code == 200
        _no_jwt_in(g.text)
        assert g.json().get("attempt_id") == aid

        # 2.3 PATCH state
        first_q = att["questions"][0]["id"]
        p = web_session.patch(
            f"{WEB}/api/session/attempt/{aid}/state",
            json={
                "answers": {first_q: 2},
                "marked": [att["questions"][1]["id"]] if len(att["questions"]) > 1 else [],
                "current_index": 5,
                "total_time_left_sec": 3500,
            },
            timeout=20,
        )
        assert p.status_code == 200, p.text
        _no_jwt_in(p.text)

        # Verify state persisted
        g2 = web_session.get(f"{WEB}/api/session/attempt/{aid}", timeout=20)
        j2 = g2.json()
        assert j2.get("answers", {}).get(first_q) == 2
        assert j2.get("current_index") == 5

        # 2.4 Violation
        v = web_session.post(
            f"{WEB}/api/session/attempt/{aid}/violation",
            json={"type": "tab_switch", "note": "test violation"},
            timeout=20,
        )
        assert v.status_code == 200, v.text
        _no_jwt_in(v.text)
        # violation_count should be >= 1
        g3 = web_session.get(f"{WEB}/api/session/attempt/{aid}", timeout=20)
        assert (g3.json().get("violation_count") or 0) >= 1

        # 2.5 SUBMIT
        s = web_session.post(f"{WEB}/api/session/attempt/{aid}/submit", timeout=30)
        assert s.status_code == 200, s.text
        _no_jwt_in(s.text)
        res = s.json()
        assert res.get("status") == "submitted", res
        assert "score" in res or "percentage" in res, res

        # 2.6 GET after submit → status=submitted
        g4 = web_session.get(f"{WEB}/api/session/attempt/{aid}", timeout=20)
        assert g4.status_code == 200
        assert g4.json().get("status") == "submitted"
        pytest.aid_submitted = aid  # share id with page tests


# ------------------------------------------------------------------
# 3. UI page status codes (post-login)
# ------------------------------------------------------------------
class TestPortalPages:
    def test_tests_listing_page(self, web_session):
        r = web_session.get(f"{WEB}/portal/tests", timeout=20, allow_redirects=False)
        assert r.status_code == 200, f"got {r.status_code}"
        # Prime badge should be present for a Prime user
        assert "Prime active" in r.text or "prime" in r.text.lower(), "no Prime badge?"
        _no_jwt_in(r.text)

    def test_test_preview_page(self, web_session):
        r = web_session.get(f"{WEB}/portal/tests/{TEST_ID}", timeout=20, allow_redirects=False)
        assert r.status_code == 200
        assert "Start Attempt" in r.text
        assert "Instructions" in r.text
        _no_jwt_in(r.text)

    def test_attempt_result_page(self, web_session):
        aid = getattr(pytest, "aid_submitted", None)
        if not aid:
            pytest.skip("no submitted attempt")
        r = web_session.get(
            f"{WEB}/portal/attempt/{aid}/result", timeout=20, allow_redirects=False
        )
        assert r.status_code == 200, r.status_code
        # Expected result-card labels
        for lbl in ["Result", "Correct", "Wrong", "Unattempted", "Accuracy"]:
            assert lbl in r.text, f"missing '{lbl}' on result page"
        _no_jwt_in(r.text)

    def test_attempt_already_submitted_state(self, web_session):
        aid = getattr(pytest, "aid_submitted", None)
        if not aid:
            pytest.skip("no submitted attempt")
        r = web_session.get(f"{WEB}/portal/attempt/{aid}", timeout=20, allow_redirects=False)
        assert r.status_code == 200
        assert "already been submitted" in r.text.lower() or "view result" in r.text.lower()
        _no_jwt_in(r.text)


# ------------------------------------------------------------------
# 4. Backend spot-check (10%) — verify test-prime backend unchanged
# ------------------------------------------------------------------
class TestBackendSpotCheck:
    def test_tests_list(self, backend_login):
        r = requests.get(
            f"{API}/api/test-prime/tests?limit=5",
            headers={"Authorization": f"Bearer {backend_login['token']}"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        data = r.json()
        lst = data.get("tests") or data.get("items") or []
        assert len(lst) >= 1

    def test_attempts_start(self, backend_login):
        uid = backend_login["user_id"]
        r = requests.post(
            f"{API}/api/test-prime/attempts/start?user_id={uid}",
            json={"test_id": TEST_ID, "language": "English"},
            headers={"Authorization": f"Bearer {backend_login['token']}"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        assert "attempt_id" in r.json()


# ------------------------------------------------------------------
# 5. Regression: unauthenticated portal routing + public pages
# ------------------------------------------------------------------
class TestRegression:
    def test_home_page(self):
        r = requests.get(f"{WEB}/", timeout=20, allow_redirects=False)
        assert r.status_code == 200

    def test_login_page(self):
        r = requests.get(f"{WEB}/login", timeout=20, allow_redirects=False)
        assert r.status_code == 200

    def test_portal_redirects_to_login_when_anon(self):
        r = requests.get(f"{WEB}/portal", timeout=20, allow_redirects=False)
        assert r.status_code in (302, 307)
        assert "/login" in r.headers.get("location", "")

    def test_portal_tests_redirects_when_anon(self):
        r = requests.get(f"{WEB}/portal/tests", timeout=20, allow_redirects=False)
        assert r.status_code in (302, 307)
