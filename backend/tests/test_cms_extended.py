"""Extended CMS coverage — CRUD for the 12 entities not already covered by
test_cms_suite.py, plus website vs. app visibility filter and regression
checks for /api/admin/dashboard and /api/entitlements/mine.
"""
import os
import uuid
import pytest
import requests

BASE = os.environ.get("TEST_BASE", "http://localhost:8001")
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def admin_headers():
    r = requests.post(f"{API}/auth/login",
                      json={"email": "test@avision.com", "password": "Test@123"})
    r.raise_for_status()
    return {"Authorization": f"Bearer {r.json()['access_token']}",
            "Content-Type": "application/json"}


# 12 entities NOT covered by test_cms_suite.py CRUD parametrize
EXTENDED_CRUD = [
    ("exam_categories_cms", {"name": "TEST Banking Cat"}),
    ("exams_cms", {"name": "TEST Exam", "category_id": "cat-x"}),
    ("lessons", {"title": "TEST Lesson", "chapter_id": "ch-x"}),
    ("question_bank", {"text": "TEST Q?", "options": ["A", "B", "C", "D"], "correct": 0}),
    ("study_material_v2", {"title": "TEST SM", "type": "pdf"}),
    ("digital_notes", {"title": "TEST Note"}),
    ("previous_papers", {"title": "TEST PYP", "exam_id": "exm-x"}),
    ("cms_app_pages", {"slug": f"test-app-{uuid.uuid4().hex[:6]}", "title": "TEST App Page"}),
    ("banners_promo", {"title": "TEST Promo", "image": "https://example.com/x.jpg"}),
    ("notifications", {"title": "TEST Notification"}),
    ("results", {"name": "TEST Topper"}),
    ("centres_v2", {"name": "TEST Centre"}),
]


class TestExtendedCRUD:
    @pytest.mark.parametrize("entity,body", EXTENDED_CRUD)
    def test_crud_full_cycle(self, admin_headers, entity, body):
        r = requests.post(f"{API}/admin/cms/{entity}", headers=admin_headers, json=body)
        assert r.status_code == 200, f"create failed {entity}: {r.text}"
        item = r.json()
        assert "id" in item
        item_id = item["id"]

        # List should include our item
        r = requests.get(f"{API}/admin/cms/{entity}?limit=200", headers=admin_headers)
        assert r.status_code == 200
        ids = {i["id"] for i in r.json()["items"]}
        assert item_id in ids, f"{entity}: created item not in list"

        # GET detail
        r = requests.get(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers)
        assert r.status_code == 200
        assert r.json()["id"] == item_id

        # PATCH — `active` is the only field present on all 20 entities
        r = requests.patch(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers,
                           json={"active": False})
        assert r.status_code == 200
        assert r.json().get("active") is False

        # DELETE
        r = requests.delete(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers)
        assert r.status_code == 200

        # 404 after delete
        r = requests.get(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers)
        assert r.status_code == 404


class TestVisibilityFilter:
    """Public API must respect visibility.{app,website} flags."""

    def test_website_only_hidden_from_app(self, admin_headers):
        # Create a testimonial visible ONLY on website
        body = {
            "name": f"TEST Web-Only {uuid.uuid4().hex[:6]}",
            "quote": "Website-only quote",
            "visibility": {"app": False, "website": True},
        }
        r = requests.post(f"{API}/admin/cms/testimonials", headers=admin_headers, json=body)
        assert r.status_code == 200, r.text
        tid = r.json()["id"]

        try:
            # Public list on client=website -> should include
            r_web = requests.get(f"{API}/cms/testimonials?client=website&limit=200")
            assert r_web.status_code == 200
            web_ids = {i["id"] for i in r_web.json()["items"]}
            assert tid in web_ids, "Website-only testimonial missing from ?client=website"

            # Public list on client=app -> must exclude
            r_app = requests.get(f"{API}/cms/testimonials?client=app&limit=200")
            assert r_app.status_code == 200
            app_ids = {i["id"] for i in r_app.json()["items"]}
            assert tid not in app_ids, "Website-only testimonial leaked into ?client=app"

            # GET detail via ?client=app should 404
            r_detail = requests.get(f"{API}/cms/testimonials/{tid}?client=app")
            assert r_detail.status_code == 404
        finally:
            requests.delete(f"{API}/admin/cms/testimonials/{tid}", headers=admin_headers)

    def test_inactive_hidden_from_public(self, admin_headers):
        body = {"name": f"TEST Inactive {uuid.uuid4().hex[:6]}", "quote": "hidden",
                "active": False}
        r = requests.post(f"{API}/admin/cms/testimonials", headers=admin_headers, json=body)
        assert r.status_code == 200
        tid = r.json()["id"]
        try:
            r_pub = requests.get(f"{API}/cms/testimonials?client=app&limit=200")
            pub_ids = {i["id"] for i in r_pub.json()["items"]}
            assert tid not in pub_ids, "inactive testimonial leaked to public"

            # But admin still sees it
            r_adm = requests.get(f"{API}/admin/cms/testimonials?limit=200",
                                 headers=admin_headers)
            adm_ids = {i["id"] for i in r_adm.json()["items"]}
            assert tid in adm_ids
        finally:
            requests.delete(f"{API}/admin/cms/testimonials/{tid}", headers=admin_headers)


class TestFoundationRegression:
    def test_admin_dashboard_ok(self, admin_headers):
        r = requests.get(f"{API}/admin/dashboard", headers=admin_headers)
        assert r.status_code == 200
        d = r.json()
        assert "stats" in d

    def test_entitlements_mine_ok(self, admin_headers):
        r = requests.get(f"{API}/entitlements/mine", headers=admin_headers)
        assert r.status_code == 200
        assert "entitlements" in r.json()

    def test_reports_all_range_ok(self, admin_headers):
        # Full-history range (?range=all) exercises the else branch of _range_bounds
        for slug in ("students", "revenue", "orders_report", "payments_report"):
            r = requests.get(f"{API}/admin/reports/{slug}?range=all",
                             headers=admin_headers)
            assert r.status_code == 200, f"{slug}: {r.text}"
            assert r.json()["slug"] == slug


class TestValidation:
    def test_missing_required_returns_400(self, admin_headers):
        # subjects require "name"
        r = requests.post(f"{API}/admin/cms/subjects", headers=admin_headers, json={})
        assert r.status_code == 400

    def test_unknown_entity_404(self, admin_headers):
        r = requests.get(f"{API}/admin/cms/does_not_exist", headers=admin_headers)
        assert r.status_code == 404

    def test_unknown_report_404(self, admin_headers):
        r = requests.get(f"{API}/admin/reports/nope", headers=admin_headers)
        assert r.status_code == 404
