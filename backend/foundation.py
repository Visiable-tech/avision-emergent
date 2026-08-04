"""
AVISION ONE — Foundation Phase 1a
==================================
Non-breaking unified data layer that sits alongside the existing per-module
routers. Introduces:

Collections
-----------
* `products`      — unified catalog (live_course | video_course | test_series |
                    booster | magazine). Idempotently seeded from the
                    hardcoded lists in the legacy modules.
* `faculty`       — Faculty Master. Seeded from live_courses.FACULTIES.
* `coupons`       — Coupon Master. Seeded from video_courses.COUPONS.
* `orders`        — Unified order table (new orders will land here; legacy
                    tables still writable during the transition).
* `payments`      — Unified payment records.
* `entitlements`  — Unified access engine. Backfilled from lc_enrollments,
                    vc_enrollments and tp_entitlements.
* `centres`       — Own / franchise centres for student attribution.
* `_counters`     — Atomic counters for `avision_id`, `avision_order_id`.

User doc extensions (backfilled at startup)
-------------------------------------------
* `avision_id`         AV<YY>-<6-digit-sequential>
* `roles[]`            [`student`] by default. `test@avision.com` → +`admin`.
* `centre_id`          null
* `admission_source`   `app_online` by default
* `counsellor_id`      null
* `active`             True

Routes
------
Public   `/api/products`, `/api/products/{id}`, `/api/products/types`,
         `/api/entitlements/mine`, `/api/faculty`, `/api/faculty/{id}`
Admin    `/api/admin/*` — role-guarded (roles[] contains "admin").
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import get_current_user, get_optional_user


router = APIRouter(prefix="/api", tags=["foundation"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])

_db: Optional[AsyncIOMotorDatabase] = None


def init_foundation(db: AsyncIOMotorDatabase):
    global _db
    _db = db


# =========================================================================
# Indexes
# =========================================================================
async def ensure_foundation_indexes(db: AsyncIOMotorDatabase):
    await db.products.create_index("id", unique=True)
    await db.products.create_index("type")
    await db.products.create_index("category_id")
    await db.products.create_index("active")
    await db.products.create_index("slug")
    await db.faculty.create_index("id", unique=True)
    await db.coupons.create_index("code", unique=True)
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("avision_order_id", unique=True)
    await db.orders.create_index("user_id")
    await db.payments.create_index("id", unique=True)
    await db.payments.create_index("order_id")
    await db.entitlements.create_index(
        [("user_id", 1), ("product_id", 1)], unique=True
    )
    await db.entitlements.create_index("expires_at")
    await db.centres.create_index("id", unique=True)
    await db["_counters"].create_index("key", unique=True)
    await db.users.create_index("avision_id", sparse=True)


# =========================================================================
# Atomic counters
# =========================================================================
async def _next_seq(key: str) -> int:
    doc = await _db["_counters"].find_one_and_update(
        {"key": key},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True,
    )
    return int(doc.get("value", 1))


async def _gen_avision_id() -> str:
    yy = datetime.now(timezone.utc).strftime("%y")
    n = await _next_seq(f"avision_id_{yy}")
    return f"AV{yy}-{n:06d}"


async def _gen_avision_order_id() -> str:
    yy = datetime.now(timezone.utc).strftime("%y")
    n = await _next_seq(f"avision_order_{yy}")
    return f"AV-ORD-{yy}-{n:06d}"


# =========================================================================
# Access helpers
# =========================================================================
async def has_access(user_id: str, product_id: str) -> bool:
    if _db is None:
        return False
    ent = await _db.entitlements.find_one({
        "user_id": user_id, "product_id": product_id, "active": True,
    }, {"_id": 0})
    if not ent:
        return False
    exp = ent.get("expires_at")
    if exp and exp < datetime.now(timezone.utc).isoformat():
        return False
    return True


async def get_admin_user(user: dict = Depends(get_current_user)) -> dict:
    if "admin" not in (user.get("roles") or []):
        raise HTTPException(403, "Admin access required")
    return user


# =========================================================================
# User doc backfill
# =========================================================================
ADMIN_EMAILS_SEED = {"test@avision.com", "admin@avision.com"}


async def backfill_users():
    """Add avision_id + roles + defaults to every existing user (idempotent)."""
    if _db is None:
        return
    cur = _db.users.find({}, {"_id": 0, "user_id": 1, "email": 1, "avision_id": 1, "roles": 1})
    async for u in cur:
        updates = {}
        if not u.get("avision_id"):
            updates["avision_id"] = await _gen_avision_id()
        if not u.get("roles"):
            roles = ["student"]
            if (u.get("email") or "").lower() in ADMIN_EMAILS_SEED:
                roles.append("admin")
            updates["roles"] = roles

        set_defaults = {
            "centre_id": None,
            "admission_source": "app_online",
            "counsellor_id": None,
            "active": True,
        }
        if updates:
            await _db.users.update_one(
                {"user_id": u["user_id"]},
                {"$set": updates, "$setOnInsert": set_defaults},
            )
        # Also ensure defaults exist on already-migrated users (idempotent)
        await _db.users.update_one(
            {"user_id": u["user_id"], "active": {"$exists": False}},
            {"$set": set_defaults},
        )


# =========================================================================
# Product migration from legacy hardcoded lists
# =========================================================================
def _slug(txt: str) -> str:
    return (
        (txt or "").lower()
        .replace(" ", "-").replace("&", "and").replace(",", "").replace("'", "")
        .replace("(", "").replace(")", "").replace(".", "").replace("/", "-")
    )


def _norm_product(p: dict) -> dict:
    """Ensure every product doc has the same top-level shape."""
    now = datetime.now(timezone.utc).isoformat()
    p.setdefault("created_at", now)
    p.setdefault("updated_at", now)
    p.setdefault("currency", "INR")
    p.setdefault("active", True)
    p.setdefault("visibility", {"app": True, "website": True, "admin_only": False})
    p.setdefault("display_order", 0)
    p.setdefault("meta", {})
    p.setdefault("faculty_ids", [])
    p.setdefault("exam_ids", [])
    p.setdefault("seo", {"title": p.get("name"), "desc": p.get("exam_name") or p.get("subject") or ""})
    if not p.get("slug"):
        p["slug"] = _slug(p.get("id") or p.get("name") or "product")
    return p


async def _upsert_product(p: dict):
    p = _norm_product(p)
    p_set = {k: v for k, v in p.items() if k != "created_at"}
    p_set["updated_at"] = datetime.now(timezone.utc).isoformat()
    await _db.products.update_one(
        {"id": p["id"]},
        {
            "$set": p_set,
            "$setOnInsert": {"created_at": p.get("created_at") or datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )


async def seed_products():
    """Idempotent — copies legacy hardcoded lists into `products`. Kept lax on
    schema differences: we shove type-specific extras into `meta` so the
    original per-module APIs can keep serving their tailored payloads."""
    if _db is None:
        return

    # ---- Live Courses ----
    try:
        from live_courses import COURSES as LC_COURSES
        for c in LC_COURSES:
            p = {
                "id": c["id"],
                "type": "live_course",
                "name": c["name"],
                "category_id": c.get("category_id"),
                "exam_name": c.get("exam_name"),
                "banner_image": c.get("banner_image"),
                "gradient": c.get("gradient"),
                "price": c.get("price"),
                "offer_price": c.get("offer_price"),
                "validity_days": int(c.get("months", 6)) * 30,
                "language": c.get("language"),
                "faculty_ids": c.get("faculty_ids") or [],
                "features": c.get("features") or [],
                "active": c.get("status") == "active",
                "display_order": c.get("display_order", 0),
                "meta": {"raw": c},   # keep the whole legacy payload for façades
            }
            await _upsert_product(p)
    except Exception as e:  # pragma: no cover
        print("seed_products live_courses:", e)

    # ---- Video Courses ----
    try:
        from video_courses import COURSES as VC_COURSES
        for c in VC_COURSES:
            p = {
                "id": c["id"],
                "type": "video_course",
                "name": c["name"],
                "category_id": c.get("category_id"),
                "exam_name": c.get("exam_name"),
                "banner_image": c.get("banner_image"),
                "gradient": c.get("gradient"),
                "price": c.get("price"),
                "offer_price": c.get("offer_price"),
                "validity_days": int(c.get("validity_months", 12)) * 30,
                "language": c.get("language"),
                "faculty_ids": [],
                "features": c.get("features") or [],
                "active": c.get("status") == "active",
                "meta": {"raw": c},
            }
            await _upsert_product(p)
    except Exception as e:  # pragma: no cover
        print("seed_products video_courses:", e)

    # ---- Test Prime plans ----
    try:
        from test_prime import TP_PLANS
        for pl in TP_PLANS:
            p = {
                "id": f"tp-plan-{pl.get('id')}",
                "type": "test_series",
                "name": pl.get("name") or f"Test Prime {pl.get('id')}",
                "category_id": None,
                "banner_image": pl.get("banner"),
                "price": pl.get("price"),
                "offer_price": pl.get("offer_price") or pl.get("price"),
                "validity_days": int(pl.get("validity_months", 12)) * 30,
                "features": pl.get("features") or [],
                "active": True,
                "meta": {"raw": pl},
            }
            await _upsert_product(p)
    except Exception as e:  # pragma: no cover
        print("seed_products test_prime:", e)

    # ---- Magazine / Booster ----
    try:
        from magazine_booster import BOOSTER_PACKS
        for b in BOOSTER_PACKS:
            p = {
                "id": b.get("id"),
                "type": "booster",
                "name": b.get("name") or b.get("title") or f"Booster {b.get('id')}",
                "category_id": b.get("category_id"),
                "banner_image": b.get("banner") or b.get("image"),
                "price": b.get("price"),
                "offer_price": b.get("offer_price") or b.get("price"),
                "validity_days": 365,
                "features": b.get("features") or [],
                "active": True,
                "meta": {"raw": b},
            }
            await _upsert_product(p)
    except Exception as e:  # pragma: no cover
        print("seed_products boosters:", e)

    try:
        from magazine_booster import MAGAZINE_ISSUES
        for m in MAGAZINE_ISSUES:
            p = {
                "id": m.get("id"),
                "type": "magazine",
                "name": m.get("title") or f"Magazine {m.get('id')}",
                "category_id": None,
                "banner_image": m.get("cover") or m.get("banner"),
                "price": m.get("price") or 0,
                "offer_price": m.get("offer_price") or m.get("price") or 0,
                "validity_days": 365,
                "active": True,
                "meta": {"raw": m},
            }
            await _upsert_product(p)
    except Exception as e:  # pragma: no cover
        print("seed_products magazines:", e)


async def seed_faculty():
    if _db is None:
        return
    try:
        from live_courses import FACULTIES
    except Exception:
        FACULTIES = []
    for f in FACULTIES:
        doc = {
            **f,
            "visibility": {"app": True, "website": True},
            "active": True,
            "courses_assigned": f.get("courses_assigned") or [],
        }
        doc.setdefault("designation", f.get("role") or "Faculty")
        doc.setdefault("subject", f.get("subject") or "")
        doc.setdefault("experience_years", int(f.get("experience", "0").split(" ")[0]) if isinstance(f.get("experience"), str) else f.get("experience_years") or 0)
        doc.setdefault("bio", f.get("bio") or "")
        await _db.faculty.update_one({"id": f["id"]}, {"$set": doc}, upsert=True)


async def seed_coupons():
    if _db is None:
        return
    try:
        from video_courses import COUPONS
    except Exception:
        COUPONS = []
    for c in COUPONS:
        doc = {
            "id": c.get("id") or str(uuid.uuid4()),
            "code": c["code"],
            "discount_pct": c["discount_pct"],
            "max_discount_inr": c.get("max_discount_inr"),
            "applies_to_types": c.get("applies_to_types") or ["video_course", "live_course"],
            "applies_to_products": [],
            "valid_from": None,
            "valid_until": c.get("expires_at"),
            "usage_limit": c.get("usage_limit"),
            "used_count": c.get("used_count", 0),
            "active": bool(c.get("active", True)),
            "desc": c.get("desc"),
        }
        await _db.coupons.update_one({"code": c["code"]}, {"$set": doc}, upsert=True)


# =========================================================================
# Entitlements backfill
# =========================================================================
async def backfill_entitlements():
    if _db is None:
        return
    total = 0

    async def _upsert(user_id, product_id, product_type, source, order_id, granted, expires, active=True, note=""):
        nonlocal total
        await _db.entitlements.update_one(
            {"user_id": user_id, "product_id": product_id},
            {"$setOnInsert": {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "product_id": product_id,
                "product_type": product_type,
                "source": source,
                "order_id": order_id,
                "granted_at": granted,
                "expires_at": expires,
                "active": active,
                "notes": note,
            }},
            upsert=True,
        )
        total += 1

    # Live Course enrollments
    async for e in _db.lc_enrollments.find({}, {"_id": 0}):
        await _upsert(
            e["user_id"], e["course_id"], "live_course",
            "online" if e.get("order_id") else "free_demo",
            e.get("order_id"),
            e.get("enrolled_at") or datetime.now(timezone.utc).isoformat(),
            e.get("expires_at"),
            e.get("status", "active") == "active",
            "backfill:lc_enrollments",
        )

    # Video Course enrollments
    async for e in _db.vc_enrollments.find({}, {"_id": 0}):
        await _upsert(
            e["user_id"], e["course_id"], "video_course",
            "online" if e.get("order_id") else "free_demo",
            e.get("order_id"),
            e.get("enrolled_at") or datetime.now(timezone.utc).isoformat(),
            e.get("expires_at"),
            e.get("status", "active") == "active",
            "backfill:vc_enrollments",
        )

    # Test Prime entitlements
    async for e in _db.tp_entitlements.find({}, {"_id": 0}):
        plan_id = e.get("plan_id") or e.get("plan")
        pid = f"tp-plan-{plan_id}" if plan_id else "tp-plan-basic"
        await _upsert(
            e["user_id"], pid, "test_series",
            "online",
            e.get("order_id"),
            e.get("activated_at") or datetime.now(timezone.utc).isoformat(),
            e.get("expires_at"),
            True,
            "backfill:tp_entitlements",
        )
    return total


# =========================================================================
# PUBLIC ROUTES
# =========================================================================
@router.get("/products/types")
async def product_types():
    types = ["live_course", "video_course", "test_series", "booster", "magazine"]
    return {"types": types}


@router.get("/products")
async def list_products(
    type: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
):
    q_filter: dict = {"active": True, "visibility.app": True}
    if type:
        q_filter["type"] = type
    if category:
        q_filter["category_id"] = category
    if q:
        q_filter["name"] = {"$regex": q, "$options": "i"}
    cursor = _db.products.find(q_filter, {"_id": 0, "meta": 0}).sort("display_order", 1).limit(limit)
    items = await cursor.to_list(limit)
    return {"products": items, "total": len(items)}


@router.get("/products/{pid}")
async def product_detail(pid: str, user=Depends(get_optional_user)):
    p = await _db.products.find_one({"id": pid}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    access = False
    if user:
        access = await has_access(user["user_id"], pid)
    p["access"] = access
    return p


@router.get("/entitlements/mine")
async def my_entitlements(user=Depends(get_current_user)):
    docs = await _db.entitlements.find(
        {"user_id": user["user_id"], "active": True}, {"_id": 0}
    ).sort("granted_at", -1).to_list(200)
    # Attach lightweight product summary
    ids = [d["product_id"] for d in docs]
    products = {}
    if ids:
        async for p in _db.products.find({"id": {"$in": ids}}, {"_id": 0, "meta": 0}):
            products[p["id"]] = p
    for d in docs:
        d["product"] = products.get(d["product_id"])
    return {"entitlements": docs}


@router.get("/faculty")
async def list_faculty():
    docs = await _db.faculty.find({"active": True, "visibility.app": True}, {"_id": 0}).to_list(200)
    return {"faculty": docs}


@router.get("/faculty/{fid}")
async def faculty_detail(fid: str):
    f = await _db.faculty.find_one({"id": fid}, {"_id": 0})
    if not f:
        raise HTTPException(404, "Faculty not found")
    # attach linked products
    prods = await _db.products.find(
        {"faculty_ids": fid, "active": True}, {"_id": 0, "meta": 0}
    ).to_list(50)
    f["products"] = prods
    return f


# =========================================================================
# ADMIN ROUTES
# =========================================================================
@admin_router.get("/dashboard")
async def admin_dashboard(user=Depends(get_admin_user)):
    stats = {
        "users": await _db.users.count_documents({}),
        "active_users": await _db.users.count_documents({"active": True}),
        "products": await _db.products.count_documents({}),
        "active_products": await _db.products.count_documents({"active": True}),
        "entitlements": await _db.entitlements.count_documents({"active": True}),
        "orders": await _db.orders.count_documents({}),
        "faculty": await _db.faculty.count_documents({"active": True}),
        "centres": await _db.centres.count_documents({}),
    }
    by_type = {}
    async for row in _db.products.aggregate([
        {"$group": {"_id": "$type", "n": {"$sum": 1}}}
    ]):
        by_type[row["_id"]] = row["n"]
    stats["products_by_type"] = by_type
    return {"stats": stats, "admin": {"user_id": user["user_id"], "email": user.get("email")}}


@admin_router.get("/students")
async def admin_students(q: Optional[str] = None, limit: int = 50, skip: int = 0, user=Depends(get_admin_user)):
    q_filter = {}
    if q:
        q_filter["$or"] = [
            {"email": {"$regex": q, "$options": "i"}},
            {"name": {"$regex": q, "$options": "i"}},
            {"avision_id": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}},
        ]
    total = await _db.users.count_documents(q_filter)
    docs = await _db.users.find(
        q_filter,
        {"_id": 0, "password_hash": 0, "failed_login_attempts": 0, "lock_until": 0},
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"students": docs, "total": total, "limit": limit, "skip": skip}


@admin_router.get("/students/{user_id}")
async def admin_student_detail(user_id: str, user=Depends(get_admin_user)):
    u = await _db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(404, "Student not found")
    ents = await _db.entitlements.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("granted_at", -1).to_list(200)
    ids = [e["product_id"] for e in ents]
    products = {}
    if ids:
        async for p in _db.products.find({"id": {"$in": ids}}, {"_id": 0, "meta": 0}):
            products[p["id"]] = p
    for e in ents:
        e["product"] = products.get(e["product_id"])
    return {"student": u, "entitlements": ents}


@admin_router.get("/products")
async def admin_list_products(
    type: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 100, skip: int = 0,
    user=Depends(get_admin_user),
):
    qq: dict = {}
    if type:
        qq["type"] = type
    if q:
        qq["name"] = {"$regex": q, "$options": "i"}
    total = await _db.products.count_documents(qq)
    docs = await _db.products.find(qq, {"_id": 0, "meta": 0}).sort("display_order", 1).skip(skip).limit(limit).to_list(limit)
    return {"products": docs, "total": total, "limit": limit, "skip": skip}


@admin_router.patch("/products/{pid}")
async def admin_update_product(pid: str, body: dict, user=Depends(get_admin_user)):
    allowed = {"name", "price", "offer_price", "active", "visibility", "display_order",
               "banner_image", "features", "faculty_ids", "category_id", "language",
               "validity_days"}
    patch = {k: v for k, v in body.items() if k in allowed}
    if not patch:
        raise HTTPException(400, "Nothing to update")
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await _db.products.update_one({"id": pid}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Product not found")
    p = await _db.products.find_one({"id": pid}, {"_id": 0})
    return {"ok": True, "product": p}


@admin_router.get("/orders")
async def admin_list_orders(limit: int = 50, skip: int = 0, user=Depends(get_admin_user)):
    total = await _db.orders.count_documents({})
    docs = await _db.orders.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"orders": docs, "total": total}


@admin_router.get("/entitlements")
async def admin_list_entitlements(
    user_id: Optional[str] = None,
    product_id: Optional[str] = None,
    limit: int = 100, skip: int = 0,
    user=Depends(get_admin_user),
):
    q: dict = {}
    if user_id:
        q["user_id"] = user_id
    if product_id:
        q["product_id"] = product_id
    total = await _db.entitlements.count_documents(q)
    docs = await _db.entitlements.find(q, {"_id": 0}).sort("granted_at", -1).skip(skip).limit(limit).to_list(limit)
    return {"entitlements": docs, "total": total}


@admin_router.post("/enroll")
async def admin_manual_enroll(body: dict, user=Depends(get_admin_user)):
    """Offline / manual enrollment.
    Body: {user_id, product_id, amount_inr, method: cash|upi|card|admin_grant,
           centre_id?, counsellor_id?, note?}
    """
    uid = body.get("user_id")
    pid = body.get("product_id")
    method = (body.get("method") or "admin_grant").lower()
    amount_inr = int(body.get("amount_inr") or 0)
    if not uid or not pid:
        raise HTTPException(400, "user_id and product_id required")

    student = await _db.users.find_one({"user_id": uid}, {"_id": 0})
    if not student:
        raise HTTPException(404, "Student not found")
    product = await _db.products.find_one({"id": pid}, {"_id": 0, "meta": 0})
    if not product:
        raise HTTPException(404, "Product not found")

    now = datetime.now(timezone.utc)
    valid_days = int(product.get("validity_days") or 365)
    aorder = await _gen_avision_order_id()
    order_doc = {
        "id": str(uuid.uuid4()),
        "avision_order_id": aorder,
        "user_id": uid,
        "items": [{"product_id": pid, "product_type": product["type"],
                   "price": product.get("offer_price") or product.get("price") or 0}],
        "subtotal": amount_inr,
        "discount_inr": 0,
        "coupon_code": None,
        "total": amount_inr,
        "currency": "INR",
        "status": "paid" if amount_inr >= 0 else "failed",
        "source": "admin",
        "channel": "offline" if method in ("cash", "upi", "card") else "admin",
        "centre_id": body.get("centre_id"),
        "counsellor_id": body.get("counsellor_id"),
        "note": body.get("note", ""),
        "created_at": now.isoformat(),
        "created_by": user["user_id"],
    }
    await _db.orders.insert_one(order_doc)

    pay_doc = {
        "id": str(uuid.uuid4()),
        "order_id": aorder,
        "gateway": "offline" if method in ("cash", "upi", "card") else "admin_grant",
        "gateway_order_id": None,
        "gateway_payment_id": None,
        "amount_paise": amount_inr * 100,
        "status": "success" if amount_inr >= 0 else "failed",
        "method": method,
        "paid_at": now.isoformat(),
        "verified_at": now.isoformat(),
    }
    await _db.payments.insert_one(pay_doc)

    ent_doc = {
        "id": str(uuid.uuid4()),
        "user_id": uid,
        "product_id": pid,
        "product_type": product["type"],
        "order_id": aorder,
        "source": "offline" if method in ("cash", "upi", "card") else "admin_grant",
        "granted_at": now.isoformat(),
        "expires_at": (now + timedelta(days=valid_days)).isoformat(),
        "active": True,
        "notes": body.get("note", ""),
    }
    await _db.entitlements.update_one(
        {"user_id": uid, "product_id": pid},
        {"$set": ent_doc},
        upsert=True,
    )
    order_doc.pop("_id", None)
    ent_doc.pop("_id", None)
    return {"ok": True, "order": order_doc, "entitlement": ent_doc}


@admin_router.get("/faculty")
async def admin_list_faculty(user=Depends(get_admin_user)):
    docs = await _db.faculty.find({}, {"_id": 0}).to_list(500)
    return {"faculty": docs}


@admin_router.get("/coupons")
async def admin_list_coupons(user=Depends(get_admin_user)):
    docs = await _db.coupons.find({}, {"_id": 0}).to_list(500)
    return {"coupons": docs}


@admin_router.get("/centres")
async def admin_list_centres(user=Depends(get_admin_user)):
    docs = await _db.centres.find({}, {"_id": 0}).to_list(500)
    return {"centres": docs}


@admin_router.post("/centres")
async def admin_create_centre(body: dict, user=Depends(get_admin_user)):
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "Centre name required")
    doc = {
        "id": str(uuid.uuid4()),
        "name": name,
        "type": body.get("type", "own"),
        "city": body.get("city"),
        "state": body.get("state"),
        "active": True,
        "admin_user_ids": body.get("admin_user_ids") or [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.centres.insert_one(doc)
    doc.pop("_id", None)
    return doc


@admin_router.post("/students/{user_id}/roles")
async def admin_set_roles(user_id: str, body: dict, user=Depends(get_admin_user)):
    roles = body.get("roles")
    if not isinstance(roles, list):
        raise HTTPException(400, "roles must be a list")
    # Prevent self-demote of last admin
    if user_id == user["user_id"] and "admin" not in roles:
        remaining_admins = await _db.users.count_documents({"roles": "admin", "user_id": {"$ne": user_id}})
        if remaining_admins == 0:
            raise HTTPException(400, "Cannot demote yourself — you're the only admin.")
    res = await _db.users.update_one({"user_id": user_id}, {"$set": {"roles": roles}})
    if not res.matched_count:
        raise HTTPException(404, "Student not found")
    return {"ok": True, "user_id": user_id, "roles": roles}
