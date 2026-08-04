"""AVISION ONE — Phase 1 Golden Path Acceptance Test
=====================================================

End-to-end verification of the Common Backend architecture:
  1. Bootstrap: admin login (test@avision.com / Test@123)
  2. Create Test Student (fresh registration)
  3. Create Test Course (as a Product via admin panel)
  4. Create Test Product BUNDLE that includes Course + Test-Prime plan
  5. Manual Enroll student → verify unified entitlement + bundle children
  6. Legacy access check: student can load LC dashboard for a seeded course
  7. Product visibility filter (app vs website)
  8. Payment security: unified orders + payments audit rows present
  9. Website heartbeat NOT connected (proves system status honesty)
 10. Progress sync: student can post progress after synth enrollment

Run with:
  cd /app/backend && python -m pytest tests/test_golden_path.py -v -s
Or standalone:
  cd /app/backend && python tests/test_golden_path.py
"""
import os
import uuid
import json
import asyncio
import httpx

BASE = os.environ.get("GOLDEN_PATH_BASE", "http://localhost:8001")

ADMIN_EMAIL = "test@avision.com"
ADMIN_PASSWORD = "Test@123"

# --------------------------------------------------------------------------
_report_rows: list[dict] = []


def _row(check: str, expected: str, got: str, status: str, evidence: str = ""):
    _report_rows.append({
        "check": check, "expected": expected, "got": got,
        "status": status, "evidence": evidence,
    })


async def _login(client: httpx.AsyncClient, email: str, password: str) -> str:
    r = await client.post(f"{BASE}/api/auth/login", json={"email": email, "password": password})
    r.raise_for_status()
    return r.json()["access_token"]


async def _register(client: httpx.AsyncClient, email: str, password: str, name: str) -> dict:
    r = await client.post(
        f"{BASE}/api/auth/register",
        json={"email": email, "password": password, "name": name,
              "phone": f"9{uuid.uuid4().int % 1000000000:09d}",
              "category_id": "banking", "language": "en"},
    )
    r.raise_for_status()
    return r.json()


async def run() -> dict:
    async with httpx.AsyncClient(timeout=30) as client:
        # ---------------- 1) Admin bootstrap ----------------
        try:
            admin_token = await _login(client, ADMIN_EMAIL, ADMIN_PASSWORD)
            r = await client.get(f"{BASE}/api/admin/dashboard",
                                 headers={"Authorization": f"Bearer {admin_token}"})
            r.raise_for_status()
            _row("Admin auth", "200 OK on /api/admin/dashboard",
                 f"{r.status_code} — {list(r.json().get('stats', {}).keys())[:4]}",
                 "PASS")
        except Exception as e:
            _row("Admin auth", "200 OK", str(e)[:120], "FAIL")
            return _finalize()

        A = {"Authorization": f"Bearer {admin_token}"}

        # ---------------- 2) Create Test Student ----------------
        suffix = uuid.uuid4().hex[:8]
        student_email = f"goldenpath_{suffix}@avision.com"
        student_password = "GoldenPath@2026"
        try:
            reg = await _register(client, student_email, student_password, "Golden Path Student")
            student_token = reg["access_token"]
            student_user = reg["user"]
            student_uid = student_user["user_id"]
            _row("Create student",
                 "New user with avision_id + roles=[student]",
                 f"avision_id={student_user.get('avision_id')} roles={student_user.get('roles')}",
                 "PASS")
        except Exception as e:
            _row("Create student", "201/200 on register", str(e)[:120], "FAIL")
            return _finalize()

        S = {"Authorization": f"Bearer {student_token}"}

        # ---------------- 3) Create Test Course (as Product) ----------------
        course_id = f"gp-course-{suffix}"
        try:
            r = await client.post(f"{BASE}/api/admin/products", headers=A, json={
                "id": course_id,
                "type": "video_course",
                "name": f"Golden Path Test Course {suffix}",
                "price": 999, "offer_price": 499,
                "validity_days": 180, "category_id": "banking",
                "exam_name": "Banking PO",
                "seo": {
                    "title": "Golden Path Test Course — Banking",
                    "desc": "Comprehensive banking prep",
                    "keywords": ["banking", "po", "golden-path"],
                },
                "visibility": {"app": True, "website": True, "admin_only": False},
            })
            r.raise_for_status()
            prod = r.json()["product"]
            _row("Create product (Course)",
                 "Product row w/ slug+seo+visibility",
                 f"id={prod['id']} slug={prod.get('slug')} seo={bool(prod.get('seo'))}",
                 "PASS")
        except Exception as e:
            _row("Create product (Course)", "201", str(e)[:200], "FAIL")

        # ---------------- 4) Create BUNDLE Product ----------------
        bundle_id = f"gp-bundle-{suffix}"
        try:
            r = await client.post(f"{BASE}/api/admin/products", headers=A, json={
                "id": bundle_id,
                "type": "bundle",
                "name": f"Golden Path Complete Pack {suffix}",
                "price": 1499, "offer_price": 799,
                "validity_days": 365,
                "items": [
                    {"type": "video_course", "ref_id": course_id},
                    {"type": "test_series", "ref_id": "tp-plan-12m"},
                ],
                "seo": {"title": "Complete Pack", "desc": "Course + Test Prime"},
                "visibility": {"app": True, "website": True, "admin_only": False},
            })
            r.raise_for_status()
            bundle = r.json()["product"]
            _row("Create bundle product",
                 "Bundle w/ items[2] (course+test)",
                 f"id={bundle['id']} items={len(bundle.get('items', []))}",
                 "PASS")
        except Exception as e:
            _row("Create bundle product", "201", str(e)[:200], "FAIL")

        # ---------------- 5) Manual Enroll → Bundle unlocks all items ----------------
        try:
            r = await client.post(f"{BASE}/api/admin/enroll", headers=A, json={
                "user_id": student_uid, "product_id": bundle_id,
                "amount_inr": 799, "method": "cash", "note": "golden_path_test",
            })
            r.raise_for_status()
            data = r.json()
            bundle_grants = data.get("bundle_grants", [])
            _row("Manual enroll (bundle)",
                 "Order + 1 primary entitlement + 2 bundle child entitlements",
                 f"order={data['order']['avision_order_id']} "
                 f"primary_ent={data['entitlement']['product_id']} "
                 f"children={[g['product_id'] for g in bundle_grants]}",
                 "PASS" if len(bundle_grants) == 2 else "FAIL")
        except Exception as e:
            _row("Manual enroll (bundle)", "200", str(e)[:200], "FAIL")

        # ---------------- 6) Student can list their entitlements ----------------
        try:
            r = await client.get(f"{BASE}/api/entitlements/mine", headers=S)
            r.raise_for_status()
            ents = r.json()["entitlements"]
            pids = {e["product_id"] for e in ents}
            expected_ids = {bundle_id, course_id, "tp-plan-12m"}
            missing = expected_ids - pids
            _row("Entitlements /mine",
                 "Student sees bundle + course + tp-plan-12m",
                 f"got={sorted(pids)} missing={sorted(missing)}",
                 "PASS" if not missing else "FAIL")
        except Exception as e:
            _row("Entitlements /mine", "200", str(e)[:200], "FAIL")

        # ---------------- 7) Legacy LC access via unified entitlement ----------------
        # First give admin manual-enroll of a seeded live_course; verify LC dashboard opens
        try:
            r = await client.post(f"{BASE}/api/admin/enroll", headers=A, json={
                "user_id": student_uid, "product_id": "lc-banking-po-2026",
                "amount_inr": 0, "method": "admin_grant", "note": "golden_path_lc",
            })
            r.raise_for_status()
            # Now student tries to open the LC dashboard
            r2 = await client.get(f"{BASE}/api/live-courses/dashboard/lc-banking-po-2026",
                                  headers=S)
            _row("LC dashboard unlocks via entitlement",
                 "200 after admin manual enroll",
                 f"{r2.status_code}",
                 "PASS" if r2.status_code == 200 else "FAIL")
        except Exception as e:
            _row("LC dashboard unlocks via entitlement", "200", str(e)[:200], "FAIL")

        # ---------------- 8) Test-Prime unlock via bundle ----------------
        try:
            r = await client.get(f"{BASE}/api/test-prime/entitlement?user_id={student_uid}")
            r.raise_for_status()
            e = r.json()
            _row("TP is_prime via bundle unlock",
                 "is_prime=True after bundle enroll",
                 f"is_prime={e.get('is_prime')} plan={e.get('plan')}",
                 "PASS" if e.get("is_prime") else "FAIL")
        except Exception as ex:
            _row("TP is_prime via bundle unlock", "is_prime=True", str(ex)[:200], "FAIL")

        # ---------------- 9) Product visibility filter ----------------
        try:
            # Hide from website only
            r = await client.patch(f"{BASE}/api/admin/products/{course_id}", headers=A, json={
                "visibility": {"app": True, "website": False, "admin_only": False},
            })
            r.raise_for_status()
            r_app = await client.get(f"{BASE}/api/products?client=app&type=video_course&limit=200")
            r_web = await client.get(f"{BASE}/api/products?client=website&type=video_course&limit=200")
            app_ids = {p["id"] for p in r_app.json()["products"]}
            web_ids = {p["id"] for p in r_web.json()["products"]}
            visible_app = course_id in app_ids
            hidden_web = course_id not in web_ids
            _row("Product visibility (app/website split)",
                 "Product visible on app, hidden from website after toggle",
                 f"visible_app={visible_app} hidden_web={hidden_web}",
                 "PASS" if visible_app and hidden_web else "FAIL")
        except Exception as e:
            _row("Product visibility (app/website split)", "toggle works",
                 str(e)[:200], "FAIL")

        # ---------------- 10) Payment security: signature required ----------------
        try:
            # POST /pay/verify without proper razorpay signature should reject
            r = await client.post(f"{BASE}/api/live-courses/lc-banking-po-2026/pay/verify",
                                  headers=S, json={
                                      "razorpay_order_id": "order_fake",
                                      "razorpay_payment_id": "pay_fake",
                                      "razorpay_signature": "deadbeef",
                                  })
            _row("Server-side payment signature required",
                 "400/404 (never grants entitlement w/o valid signature)",
                 f"{r.status_code}",
                 "PASS" if r.status_code in (400, 404) else "FAIL")
        except Exception as e:
            _row("Server-side payment signature required", "reject", str(e)[:200], "FAIL")

        # ---------------- 11) Unified orders + payments audit rows ----------------
        try:
            r = await client.get(f"{BASE}/api/admin/orders?limit=10", headers=A)
            r.raise_for_status()
            orders = r.json()["orders"]
            my_orders = [o for o in orders if o.get("user_id") == student_uid]
            r2 = await client.get(f"{BASE}/api/admin/payments?limit=200", headers=A)
            r2.raise_for_status()
            payments = r2.json()["payments"]
            # Match by our order ids
            our_order_ids = {o["avision_order_id"] for o in my_orders}
            our_payments = [p for p in payments if p.get("order_id") in our_order_ids]
            _row("Unified orders+payments audit trail",
                 "≥2 orders + ≥2 payments for our student",
                 f"orders={len(my_orders)} payments={len(our_payments)}",
                 "PASS" if len(my_orders) >= 2 and len(our_payments) >= 2 else "FAIL")
        except Exception as e:
            _row("Unified orders+payments audit trail", "OK", str(e)[:200], "FAIL")

        # ---------------- 12) System status honesty (website not connected) ----------------
        try:
            r = await client.get(f"{BASE}/api/admin/system/status", headers=A)
            r.raise_for_status()
            st = r.json()
            website = st.get("frontend", {}).get("website", {})
            _row("System status honesty",
                 "website=not_connected (not yet built)",
                 f"status={website.get('status')}",
                 "PASS" if website.get("status") in ("not_connected", "stale") else "FAIL")
        except Exception as e:
            _row("System status honesty", "OK", str(e)[:200], "FAIL")

        # ---------------- 13) VC progress sync via unified entitlement ----------------
        try:
            # Manual-enroll into a seeded video course
            r = await client.post(f"{BASE}/api/admin/enroll", headers=A, json={
                "user_id": student_uid, "product_id": "vc-banking-2026",
                "amount_inr": 0, "method": "admin_grant", "note": "golden_path_vc",
            })
            # Student loads VC progress endpoint, which triggers synth enrollment
            r2 = await client.get(f"{BASE}/api/video-courses/vc-banking-2026/progress",
                                  headers=S)
            code = r2.status_code
            _row("VC progress via unified entitlement",
                 "200 after admin manual enroll",
                 f"{code}",
                 "PASS" if code == 200 else "FAIL")
        except Exception as e:
            _row("VC progress via unified entitlement", "200", str(e)[:200], "FAIL")

        # ---------------- 14) Cleanup ----------------
        try:
            r = await client.delete(f"{BASE}/api/admin/products/{bundle_id}", headers=A)
            r2 = await client.delete(f"{BASE}/api/admin/products/{course_id}", headers=A)
            _row("Cleanup admin-created test products",
                 "204/200 on delete",
                 f"bundle={r.status_code} course={r2.status_code}",
                 "PASS" if r.status_code < 400 and r2.status_code < 400 else "PARTIAL")
        except Exception as e:
            _row("Cleanup admin-created test products", "OK", str(e)[:120], "PARTIAL")

    return _finalize()


def _finalize() -> dict:
    passed = sum(1 for r in _report_rows if r["status"] == "PASS")
    failed = sum(1 for r in _report_rows if r["status"] == "FAIL")
    total = len(_report_rows)
    return {
        "rows": _report_rows,
        "summary": {"total": total, "pass": passed, "fail": failed,
                    "overall": "PASS" if failed == 0 else "FAIL"},
    }


def _print_report(report: dict):
    print("\n" + "=" * 78)
    print("AVISION ONE — PHASE 1 FINAL ACCEPTANCE REPORT")
    print("=" * 78)
    print(f"{'#':>3}  {'Check':<40} {'Status':<8} {'Evidence'}")
    print("-" * 78)
    for i, r in enumerate(report["rows"], 1):
        ev = r["evidence"][:60]
        print(f"{i:>3}. {r['check']:<40} {r['status']:<8} {ev}")
    s = report["summary"]
    print("-" * 78)
    print(f"TOTAL: {s['total']}   PASS: {s['pass']}   FAIL: {s['fail']}   OVERALL: {s['overall']}")
    print("=" * 78 + "\n")


def test_golden_path_acceptance():
    report = asyncio.run(run())
    _print_report(report)
    # Persist report json for the acceptance markdown
    out = "/app/memory/AVISION_ONE_PHASE1_ACCEPTANCE_report.json"
    with open(out, "w") as f:
        json.dump(report, f, indent=2)
    print(f"Report saved -> {out}")
    assert report["summary"]["overall"] == "PASS", (
        f"Golden path FAILED. See report at {out}. "
        f"{report['summary']['fail']} check(s) failed."
    )


if __name__ == "__main__":
    report = asyncio.run(run())
    _print_report(report)
    with open("/app/memory/AVISION_ONE_PHASE1_ACCEPTANCE_report.json", "w") as f:
        json.dump(report, f, indent=2)
    import sys
    sys.exit(0 if report["summary"]["overall"] == "PASS" else 1)
