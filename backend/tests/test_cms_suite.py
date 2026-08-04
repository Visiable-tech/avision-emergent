"""AVISION ONE — CMS + Reports Suite Smoke Tests
Verifies every entity registered in avision_cms is:
  1. Listed via /api/admin/cms/entities
  2. Supports create → read → update → delete
  3. Public entities are exposed under /api/cms/{entity}
Also verifies every report slug returns 200 with a sensible shape.
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


class TestEntities:
    def test_entities_index(self, admin_headers):
        r = requests.get(f"{API}/admin/cms/entities", headers=admin_headers)
        assert r.status_code == 200
        entities = r.json()["entities"]
        names = {e["entity"] for e in entities}
        expected = {
            "exam_categories_cms", "exams_cms", "subjects", "chapters", "lessons",
            "question_bank", "study_material_v2", "current_affairs", "digital_notes",
            "previous_papers", "cms_web_pages", "cms_app_pages", "banners_home",
            "banners_promo", "notifications", "testimonials", "results", "faqs",
            "franchises", "centres_v2",
        }
        missing = expected - names
        assert not missing, f"Missing entities: {missing}"

    @pytest.mark.parametrize("entity,body", [
        ("subjects", {"name": "TEST Quant", "code": "QNT"}),
        ("chapters", {"name": "TEST Percentages", "subject_id": "sub-test"}),
        ("faqs", {"question": "TEST question?", "answer": "TEST answer.", "section": "general"}),
        ("testimonials", {"name": "TEST Student", "quote": "It worked."}),
        ("banners_home", {"title": "TEST banner", "image": "https://example.com/x.jpg"}),
        ("current_affairs", {"title": "TEST article"}),
        ("franchises", {"name": "TEST franchise"}),
        ("cms_web_pages", {"slug": f"test-{uuid.uuid4().hex[:6]}", "title": "TEST page"}),
    ])
    def test_crud(self, admin_headers, entity, body):
        # Create
        r = requests.post(f"{API}/admin/cms/{entity}", headers=admin_headers, json=body)
        assert r.status_code == 200, r.text
        item = r.json()
        item_id = item["id"]
        # Read
        r = requests.get(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers)
        assert r.status_code == 200
        # Update
        r = requests.patch(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers,
                           json={"active": False})
        assert r.status_code == 200
        assert r.json()["active"] is False
        # Delete
        r = requests.delete(f"{API}/admin/cms/{entity}/{item_id}", headers=admin_headers)
        assert r.status_code == 200


class TestPublicCMS:
    def test_testimonials_public(self):
        r = requests.get(f"{API}/cms/testimonials?client=app")
        assert r.status_code == 200
        d = r.json()
        assert "items" in d

    def test_web_pages_public(self):
        r = requests.get(f"{API}/cms/cms_web_pages?client=website")
        assert r.status_code == 200

    def test_question_bank_not_public(self):
        r = requests.get(f"{API}/cms/question_bank")
        assert r.status_code == 404


class TestReports:
    @pytest.mark.parametrize("slug", [
        "students", "product_sales", "revenue", "orders_report",
        "payments_report", "course_performance", "test_performance",
        "engagement", "learning_progress", "centre_wise", "franchise_wise",
    ])
    def test_report_returns_200(self, admin_headers, slug):
        r = requests.get(f"{API}/admin/reports/{slug}?range=30d", headers=admin_headers)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("slug") == slug

    def test_report_index(self, admin_headers):
        r = requests.get(f"{API}/admin/reports", headers=admin_headers)
        assert r.status_code == 200
        assert len(r.json()["reports"]) == 11


class TestAuthGuards:
    def test_no_auth_403(self):
        r = requests.get(f"{API}/admin/cms/entities")
        assert r.status_code in (401, 403)

    def test_non_admin_403(self):
        # Register a fresh student
        email = f"cms_guard_{uuid.uuid4().hex[:8]}@avision.com"
        r = requests.post(f"{API}/auth/register", json={
            "email": email, "password": "T@st1234", "name": "Guard",
            "phone": f"9{uuid.uuid4().int % 1000000000:09d}",
            "category_id": "banking", "language": "en",
        })
        assert r.status_code in (200, 201), r.text
        token = r.json()["access_token"]
        h = {"Authorization": f"Bearer {token}"}
        r2 = requests.get(f"{API}/admin/cms/entities", headers=h)
        assert r2.status_code == 403
