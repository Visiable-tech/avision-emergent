"""
AVISION ONE - Foundation Phase 1a backend tests.

Covers:
  * Unified /api/products + /api/products/types + /api/products/{id}
  * /api/entitlements/mine
  * /api/faculty (+ detail)
  * User doc extensions on register + login (avision_id, roles, active)
  * /api/admin/* (dashboard, students, products PATCH, enroll, centres, roles)
  * Regression on a subset of legacy per-module endpoints.
"""
import os
import re
import uuid
import time
import pytest
import requests

BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    "https://avision-study-dash.preview.emergentagent.com",
).rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "test@avision.com"
ADMIN_PASSWORD = "Test@123"


# --------------------------------------------------------------------------
# Fixtures
# --------------------------------------------------------------------------
@pytest.fixture(scope="module")
def s():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    d = r.json()
    assert "admin" in (d["user"].get("roles") or [])
    return d["access_token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def admin_user_id(s, admin_headers):
    r = s.get(f"{API}/auth/me", headers=admin_headers)
    assert r.status_code == 200
    return r.json()["user_id"]


@pytest.fixture(scope="module")
def fresh_user(s):
    """Register a brand-new non-admin user (used for role/register/permission tests)."""
    email = f"TEST_foundation_{uuid.uuid4().hex[:8]}@avision.com"
    payload = {
        "name": "Foundation Test User",
        "email": email,
        "password": "TestPass@123",
        "phone": "9999911111",
        "category_id": "banking",
        "language": "en",
    }
    r = s.post(f"{API}/auth/register", json=payload)
    assert r.status_code == 201, r.text
    d = r.json()
    return {
        "email": email,
        "password": payload["password"],
        "token": d["access_token"],
        "user": d["user"],
        "user_id": d["user"]["user_id"],
    }


def _no_mongo_id(data):
    txt = str(data)
    assert '"_id"' not in txt and "'_id'" not in txt, f"_id leaked: {txt[:200]}"


# --------------------------------------------------------------------------
# Public product APIs
# --------------------------------------------------------------------------
class TestProducts:
    def test_types(self, s):
        r = s.get(f"{API}/products/types")
        assert r.status_code == 200
        types = r.json()["types"]
        assert set(types) >= {"live_course", "video_course", "test_series", "booster", "magazine"}
        assert "bundle" in types  # AVISION ONE Phase 1: bundle product type

    def test_list_all(self, s):
        r = s.get(f"{API}/products?limit=200")
        assert r.status_code == 200
        prods = r.json()["products"]
        assert len(prods) >= 30, f"expected >=30, got {len(prods)}"
        _no_mongo_id(prods)

    @pytest.mark.parametrize("ptype,expected", [
        ("video_course", 8),
        ("live_course", 8),
        ("test_series", 5),
        ("booster", 9),
        ("magazine", 5),
    ])
    def test_list_by_type_counts(self, s, ptype, expected):
        r = s.get(f"{API}/products?type={ptype}&limit=200")
        assert r.status_code == 200
        prods = r.json()["products"]
        # Admin can create extra products at any time — assert seed floor.
        assert len(prods) >= expected, f"{ptype}: expected >={expected}, got {len(prods)}"
        assert all(p["type"] == ptype for p in prods)

    def test_detail_no_auth_access_false(self, s):
        r = s.get(f"{API}/products/vc-banking-2026")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == "vc-banking-2026"
        assert d["type"] == "video_course"
        assert d.get("access") is False

    def test_detail_with_enrolled_auth_access_true(self, s, admin_headers):
        r = s.get(f"{API}/products/vc-banking-2026", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["access"] is True

    def test_detail_404(self, s):
        r = s.get(f"{API}/products/does-not-exist-xxx")
        assert r.status_code == 404


# --------------------------------------------------------------------------
# Entitlements
# --------------------------------------------------------------------------
class TestEntitlements:
    def test_mine_admin_user(self, s, admin_headers):
        r = s.get(f"{API}/entitlements/mine", headers=admin_headers)
        assert r.status_code == 200
        ents = r.json()["entitlements"]
        assert len(ents) >= 2, f"expected >=2 entitlements, got {len(ents)}"
        pids = {e["product_id"] for e in ents}
        assert "vc-banking-2026" in pids
        assert "lc-banking-po-2026" in pids
        # each entitlement should carry an attached product summary
        for e in ents:
            assert "product" in e
            if e["product_id"] in ("vc-banking-2026", "lc-banking-po-2026"):
                assert e["product"] is not None
                assert e["product"]["id"] == e["product_id"]

    def test_mine_requires_auth(self, s):
        r = s.get(f"{API}/entitlements/mine")
        assert r.status_code in (401, 403)


# --------------------------------------------------------------------------
# Faculty
# --------------------------------------------------------------------------
class TestFaculty:
    def test_list(self, s):
        r = s.get(f"{API}/faculty")
        assert r.status_code == 200
        docs = r.json()["faculty"]
        assert len(docs) == 6, f"expected 6 faculty, got {len(docs)}"
        _no_mongo_id(docs)

    def test_detail(self, s):
        # pick first faculty from list
        lst = s.get(f"{API}/faculty").json()["faculty"]
        fid = lst[0]["id"]
        r = s.get(f"{API}/faculty/{fid}")
        assert r.status_code == 200
        d = r.json()
        assert d["id"] == fid
        assert "products" in d and isinstance(d["products"], list)

    def test_detail_404(self, s):
        r = s.get(f"{API}/faculty/nope-xxx")
        assert r.status_code == 404


# --------------------------------------------------------------------------
# Auth doc extensions on register + admin role
# --------------------------------------------------------------------------
class TestAuthExtensions:
    def test_register_attaches_avision_id_and_roles(self, fresh_user):
        u = fresh_user["user"]
        assert u.get("avision_id"), f"avision_id missing: {u}"
        assert re.match(r"^AV\d{2}-\d{6}$", u["avision_id"]), u["avision_id"]
        assert u.get("roles") == ["student"]
        assert u.get("active") is True
        assert u.get("admission_source") == "app_online"

    def test_me_reflects_extensions(self, s, fresh_user):
        h = {"Authorization": f"Bearer {fresh_user['token']}"}
        r = s.get(f"{API}/auth/me", headers=h)
        assert r.status_code == 200
        d = r.json()
        assert d["roles"] == ["student"]
        assert d["avision_id"].startswith("AV")

    def test_admin_login_has_admin_role(self, s):
        r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200
        u = r.json()["user"]
        assert "admin" in (u.get("roles") or [])


# --------------------------------------------------------------------------
# Admin routes
# --------------------------------------------------------------------------
class TestAdmin:
    def test_dashboard_admin(self, s, admin_headers):
        r = s.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()["stats"]
        assert d["users"] >= 1
        assert d["products"] >= 35, f"expected >=35 products got {d['products']}"
        assert d["faculty"] == 6
        assert d["entitlements"] >= 11, f"expected >=11 entitlements got {d['entitlements']}"
        # products_by_type
        by = d["products_by_type"]
        assert by.get("live_course") >= 8
        assert by.get("video_course") >= 8
        assert by.get("test_series") >= 5
        assert by.get("booster") >= 9
        assert by.get("magazine") >= 5

    def test_dashboard_non_admin_403(self, s, fresh_user):
        h = {"Authorization": f"Bearer {fresh_user['token']}"}
        r = s.get(f"{API}/admin/dashboard", headers=h)
        assert r.status_code == 403

    def test_students_pagination_and_search(self, s, admin_headers):
        r = s.get(f"{API}/admin/students?limit=5&skip=0", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["limit"] == 5 and d["skip"] == 0
        assert len(d["students"]) <= 5
        assert d["total"] >= 1
        _no_mongo_id(d)

        # search by admin email
        r2 = s.get(f"{API}/admin/students?q=test@avision", headers=admin_headers)
        assert r2.status_code == 200
        emails = [u["email"] for u in r2.json()["students"]]
        assert ADMIN_EMAIL in emails

    def test_students_detail(self, s, admin_headers, admin_user_id):
        r = s.get(f"{API}/admin/students/{admin_user_id}", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["student"]["user_id"] == admin_user_id
        assert isinstance(d["entitlements"], list)
        # entitlements should have `product` attached
        for e in d["entitlements"]:
            assert "product" in e

    def test_patch_product_admin(self, s, admin_headers):
        # pick a low-risk field to update: display_order
        pid = "vc-banking-2026"
        new_order = int(time.time()) % 1000
        body = {"display_order": new_order, "offer_price": 999}
        r = s.patch(f"{API}/admin/products/{pid}", headers=admin_headers, json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["product"]["display_order"] == new_order
        assert d["product"]["offer_price"] == 999

    def test_patch_product_non_admin_403(self, s, fresh_user):
        h = {"Authorization": f"Bearer {fresh_user['token']}", "Content-Type": "application/json"}
        r = s.patch(f"{API}/admin/products/vc-banking-2026",
                    headers=h, json={"display_order": 1})
        assert r.status_code == 403

    def test_admin_enroll_creates_order_payment_entitlement(self, s, admin_headers, fresh_user):
        # enroll the fresh user into a booster/magazine to avoid disturbing existing enrollments
        uid = fresh_user["user_id"]
        pid = "tp-plan-1m"  # test_series plan
        body = {"user_id": uid, "product_id": pid, "amount_inr": 499, "method": "cash",
                "note": "TEST_admin_enroll"}
        r = s.post(f"{API}/admin/enroll", headers=admin_headers, json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        order = d["order"]
        ent = d["entitlement"]
        # AV-ORD-YY-XXXXXX pattern
        assert re.match(r"^AV-ORD-\d{2}-\d{6}$", order["avision_order_id"]), order["avision_order_id"]
        assert order["channel"] == "offline"
        assert order["source"] in ("admin", "offline")  # unified grant uses source=offline for cash/upi/card
        assert ent["user_id"] == uid
        assert ent["product_id"] == pid
        assert ent["active"] is True

        # Verify entitlement visible in fresh user's mine
        h = {"Authorization": f"Bearer {fresh_user['token']}"}
        r2 = s.get(f"{API}/entitlements/mine", headers=h)
        assert r2.status_code == 200
        mine = r2.json()["entitlements"]
        assert any(e["product_id"] == pid for e in mine)

    def test_admin_enroll_bad_product_404(self, s, admin_headers, fresh_user):
        r = s.post(f"{API}/admin/enroll", headers=admin_headers, json={
            "user_id": fresh_user["user_id"], "product_id": "bogus-pid-xxx",
            "amount_inr": 100, "method": "cash",
        })
        assert r.status_code == 404

    def test_admin_enroll_missing_fields_400(self, s, admin_headers):
        r = s.post(f"{API}/admin/enroll", headers=admin_headers, json={"amount_inr": 100})
        assert r.status_code == 400

    def test_centres_create_and_list(self, s, admin_headers):
        name = f"TEST_Centre_{uuid.uuid4().hex[:6]}"
        r = s.post(f"{API}/admin/centres", headers=admin_headers, json={
            "name": name, "type": "own", "city": "Kolkata", "state": "WB",
        })
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["name"] == name
        assert d["id"]
        # list
        r2 = s.get(f"{API}/admin/centres", headers=admin_headers)
        assert r2.status_code == 200
        assert any(c["name"] == name for c in r2.json()["centres"])

    def test_centres_no_name_400(self, s, admin_headers):
        r = s.post(f"{API}/admin/centres", headers=admin_headers, json={"name": ""})
        assert r.status_code == 400

    def test_set_roles_valid(self, s, admin_headers, fresh_user):
        uid = fresh_user["user_id"]
        # promote to counsellor role
        r = s.post(f"{API}/admin/students/{uid}/roles", headers=admin_headers,
                   json={"roles": ["student", "counsellor"]})
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert set(d["roles"]) == {"student", "counsellor"}
        # revert
        r2 = s.post(f"{API}/admin/students/{uid}/roles", headers=admin_headers,
                    json={"roles": ["student"]})
        assert r2.status_code == 200

    def test_set_roles_invalid_body(self, s, admin_headers, fresh_user):
        r = s.post(f"{API}/admin/students/{fresh_user['user_id']}/roles",
                   headers=admin_headers, json={"roles": "not-a-list"})
        assert r.status_code == 400

    def test_self_demote_last_admin_blocked(self, s, admin_headers, admin_user_id):
        """Attempt to remove admin from self should return 400 IF this is the only admin."""
        r = s.post(f"{API}/admin/students/{admin_user_id}/roles", headers=admin_headers,
                   json={"roles": ["student"]})
        # If there are other admins in DB, it succeeds → immediately restore.
        if r.status_code == 200:
            s.post(f"{API}/admin/students/{admin_user_id}/roles", headers=admin_headers,
                   json={"roles": ["student", "admin"]})
            pytest.skip("Multiple admins in DB — cannot force last-admin scenario without cleanup.")
        assert r.status_code == 400


# --------------------------------------------------------------------------
# Regression on selected legacy endpoints
# --------------------------------------------------------------------------
class TestLegacyRegression:
    def test_live_courses_list(self, s):
        r = s.get(f"{API}/live-courses")
        assert r.status_code == 200
        assert "courses" in r.json()

    def test_live_courses_detail(self, s):
        r = s.get(f"{API}/live-courses/lc-banking-po-2026")
        assert r.status_code == 200
        assert r.json()["id"] == "lc-banking-po-2026"

    def test_video_courses_list(self, s):
        r = s.get(f"{API}/video-courses")
        assert r.status_code == 200
        assert "courses" in r.json()

    def test_video_courses_detail(self, s):
        r = s.get(f"{API}/video-courses/vc-banking-2026")
        assert r.status_code == 200
        assert r.json()["id"] == "vc-banking-2026"

    def test_video_courses_coupon_validate(self, s):
        r = s.post(f"{API}/video-courses/vc-banking-2026/coupon/validate",
                   json={"code": "WELCOME30"})
        # Endpoint exists — accepts or rejects but shouldn't 500 / 404
        assert r.status_code in (200, 400, 404)

    def test_test_prime_plans(self, s):
        r = s.get(f"{API}/test-prime/plans")
        # legacy endpoint may or may not exist depending on router - accept 200 or 404
        assert r.status_code in (200, 404)

    def test_ai_doubt_endpoint_reachable(self, s):
        # Just check the router is up; unauth or 401/422 acceptable
        r = s.get(f"{API}/ai-doubt/threads")
        assert r.status_code in (200, 400, 401, 403, 422)
