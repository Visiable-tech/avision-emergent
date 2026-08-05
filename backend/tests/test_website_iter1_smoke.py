"""
AVISION ONE Website (Next.js on :3001) smoke tests + backend spot checks.
Iteration 1 verification against review request.
"""
import os
import re
import pytest
import requests

WEBSITE_BASE = "http://localhost:3001"
BACKEND_BASE = os.environ.get("BACKEND_URL", "http://localhost:8001").rstrip("/")

# ---- routing smoke ----------------------------------------------------------
ROUTES_200 = [
    "/", "/exams", "/courses", "/live-courses", "/current-affairs",
    "/testimonials", "/results", "/faqs", "/centres", "/franchise",
    "/contact", "/sitemap.xml", "/robots.txt", "/about",
    "/courses/vc-ibps-po-2026", "/live-courses/lc-banking-po-2026",
]


@pytest.mark.parametrize("path", ROUTES_200)
def test_route_returns_200(path):
    r = requests.get(f"{WEBSITE_BASE}{path}", timeout=30)
    assert r.status_code == 200, f"{path} -> {r.status_code}"


def test_nonexistent_returns_404():
    r = requests.get(f"{WEBSITE_BASE}/nonexistent-path", timeout=30)
    assert r.status_code == 404


# ---- home page content ------------------------------------------------------
def test_home_hero_matches_first_banner():
    r = requests.get(f"{WEBSITE_BASE}/", timeout=30)
    html = r.text
    banners = requests.get(f"{BACKEND_BASE}/api/cms/banners_home", timeout=15).json()
    expected_title = banners["items"][0]["title"]
    assert f"<h1>{expected_title}</h1>" in html or expected_title in html


def test_home_has_at_least_six_video_courses():
    html = requests.get(f"{WEBSITE_BASE}/", timeout=30).text
    ids = set(re.findall(r"vc-[a-z0-9-]+", html))
    assert len(ids) >= 6, f"only {len(ids)} video course ids found on home"


def test_home_has_at_least_three_live_batches_with_live_badge():
    html = requests.get(f"{WEBSITE_BASE}/", timeout=30).text
    ids = set(re.findall(r"lc-[a-z0-9-]+", html))
    assert len(ids) >= 3, f"only {len(ids)} live course ids found on home"
    assert re.search(r">\s*Live\s*<", html), "no 'Live' badge markup on home"


def test_home_shows_seeded_students():
    html = requests.get(f"{WEBSITE_BASE}/", timeout=30).text
    assert "Riya Sen" in html
    assert "Aditya Kumar" in html


# ---- course detail SEO ------------------------------------------------------
def test_course_detail_seo_matches_product():
    html = requests.get(f"{WEBSITE_BASE}/courses/vc-ibps-po-2026", timeout=30).text
    p = requests.get(f"{BACKEND_BASE}/api/products/vc-ibps-po-2026?client=website", timeout=15).json()
    seo_title = p["seo"]["title"]
    seo_desc = p["seo"]["desc"]
    assert seo_title in html
    m = re.search(r'<meta name="description" content="([^"]+)"', html)
    assert m and m.group(1) == seo_desc


# ---- sitemap ----------------------------------------------------------------
def test_sitemap_static_urls():
    xml = requests.get(f"{WEBSITE_BASE}/sitemap.xml", timeout=30).text
    for path in ["/", "/exams", "/courses", "/current-affairs"]:
        assert path in xml, f"sitemap missing {path}"


def test_sitemap_includes_product_detail():
    # As per review request: sitemap must include /courses/vc-ibps-po-2026
    xml = requests.get(f"{WEBSITE_BASE}/sitemap.xml", timeout=30).text
    assert "/courses/vc-ibps-po-2026" in xml, "sitemap missing product detail URL"


def test_sitemap_includes_current_affairs_slug():
    xml = requests.get(f"{WEBSITE_BASE}/sitemap.xml", timeout=30).text
    # at least one current-affairs/<slug|id>
    assert re.search(r"/current-affairs/[^<\s]+", xml)


# ---- about (dynamic CMS fallback) -------------------------------------------
def test_about_page_uses_cms():
    html = requests.get(f"{WEBSITE_BASE}/about", timeout=30).text
    page = requests.get(f"{BACKEND_BASE}/api/cms/cms_web_pages/about", timeout=15).json()
    assert page["title"] in html
    assert page["seo"]["title"] in html


# ---- contact form -----------------------------------------------------------
def test_contact_form_fields_present():
    html = requests.get(f"{WEBSITE_BASE}/contact", timeout=30).text
    assert 'name="name"' in html
    assert 'name="email"' in html
    assert 'name="phone"' in html
    assert 'name="message"' in html
    assert 'action="mailto:' in html


# ---- backend spot checks ----------------------------------------------------
def test_heartbeat_accepts_website_client():
    r = requests.post(f"{BACKEND_BASE}/api/heartbeat",
                      json={"client": "website", "version": "0.1.0"}, timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") is True


def _admin_token():
    r = requests.post(f"{BACKEND_BASE}/api/auth/login",
                      json={"email": "test@avision.com", "password": "Test@123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_system_status_website_connected_after_heartbeat():
    # ensure a fresh heartbeat before checking
    requests.post(f"{BACKEND_BASE}/api/heartbeat",
                  json={"client": "website", "version": "0.1.0"}, timeout=15)
    tok = _admin_token()
    r = requests.get(f"{BACKEND_BASE}/api/admin/system/status",
                     headers={"Authorization": f"Bearer {tok}"}, timeout=15)
    assert r.status_code == 200, r.text
    site = r.json().get("frontend", {}).get("website", {})
    assert site.get("status") == "connected", site
