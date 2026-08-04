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
    """True if the user currently holds a valid entitlement for `product_id`
    (direct) OR is a member of a bundle whose `items[]` includes this ref.
    """
    if _db is None:
        return False
    now_iso = datetime.now(timezone.utc).isoformat()

    # Direct entitlement match
    ent = await _db.entitlements.find_one({
        "user_id": user_id, "product_id": product_id, "active": True,
    }, {"_id": 0})
    if ent:
        exp = ent.get("expires_at")
        if not exp or exp > now_iso:
            return True

    # Bundle entitlement — any active bundle product owned by user whose
    # items[] contains this product_id as a ref_id.
    async for e in _db.entitlements.find(
        {"user_id": user_id, "active": True},
        {"_id": 0, "product_id": 1, "expires_at": 1},
    ):
        exp = e.get("expires_at")
        if exp and exp < now_iso:
            continue
        parent = await _db.products.find_one(
            {"id": e["product_id"], "items.ref_id": product_id},
            {"_id": 0, "items": 1},
        )
        if parent:
            return True
    return False


async def grant_entitlement(
    *,
    user_id: str,
    product_id: str,
    source: str,                    # 'online' | 'offline' | 'admin_grant' | 'free_demo' | 'coupon'
    amount_inr: int = 0,
    method: str = "razorpay",       # 'razorpay' | 'cash' | 'upi' | 'card' | 'admin_grant' | 'free'
    gateway_order_id: Optional[str] = None,
    gateway_payment_id: Optional[str] = None,
    note: str = "",
    validity_days_override: Optional[int] = None,
    channel: str = "online",        # 'online' | 'offline' | 'admin'
) -> dict:
    """UNIFIED entitlement grant. Called by every module (lc/vc/tp/admin) after
    successful purchase/enrollment. Idempotent per (user_id, product_id):
    creates/updates a matching entitlement, and always writes an audit
    `orders`+`payments` pair for traceability.
    Also expands bundles — if the product has `items[]`, an entitlement row is
    created for each item too (so lecacy access checks work uniformly).
    Returns {order, payment, entitlement, bundle_grants[]}
    """
    if _db is None:
        raise RuntimeError("foundation not initialised")

    product = await _db.products.find_one({"id": product_id}, {"_id": 0, "meta": 0})
    if not product:
        raise ValueError(f"product {product_id} not found")

    now = datetime.now(timezone.utc)
    validity_days = int(validity_days_override or product.get("validity_days") or 365)
    expires_at = (now + timedelta(days=validity_days)).isoformat()

    aorder = await _gen_avision_order_id()
    order_doc = {
        "id": str(uuid.uuid4()),
        "avision_order_id": aorder,
        "user_id": user_id,
        "items": [{
            "product_id": product_id,
            "product_type": product["type"],
            "price": product.get("offer_price") or product.get("price") or 0,
        }],
        "subtotal": amount_inr,
        "discount_inr": 0,
        "coupon_code": None,
        "total": amount_inr,
        "currency": "INR",
        "status": "paid" if amount_inr >= 0 else "failed",
        "source": source,
        "channel": channel,
        "gateway_order_id": gateway_order_id,
        "gateway_payment_id": gateway_payment_id,
        "note": note,
        "created_at": now.isoformat(),
    }
    await _db.orders.insert_one(order_doc)

    pay_doc = {
        "id": str(uuid.uuid4()),
        "order_id": aorder,
        "gateway": (
            "razorpay" if method == "razorpay"
            else ("offline" if method in ("cash", "upi", "card") else method)
        ),
        "gateway_order_id": gateway_order_id,
        "gateway_payment_id": gateway_payment_id,
        "amount_paise": max(0, amount_inr) * 100,
        "status": "success",
        "method": method,
        "paid_at": now.isoformat(),
        "verified_at": now.isoformat(),
    }
    await _db.payments.insert_one(pay_doc)

    ent_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "product_id": product_id,
        "product_type": product["type"],
        "order_id": aorder,
        "source": source,
        "granted_at": now.isoformat(),
        "expires_at": expires_at,
        "active": True,
        "notes": note,
    }
    await _db.entitlements.update_one(
        {"user_id": user_id, "product_id": product_id},
        {"$set": ent_doc},
        upsert=True,
    )

    # Bundle expansion — for each product.items[], create/refresh a per-child
    # entitlement pointing at the underlying course/test/live id.
    bundle_grants = []
    for it in (product.get("items") or []):
        ref_id = it.get("ref_id")
        ref_type = it.get("type")
        if not ref_id or not ref_type:
            continue
        child_ent = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "product_id": ref_id,
            "product_type": ref_type,
            "order_id": aorder,
            "source": f"{source}:bundle:{product_id}",
            "granted_at": now.isoformat(),
            "expires_at": expires_at,
            "active": True,
            "notes": f"bundle_child_of:{product_id}",
        }
        await _db.entitlements.update_one(
            {"user_id": user_id, "product_id": ref_id},
            {"$set": child_ent},
            upsert=True,
        )
        bundle_grants.append(child_ent)

    order_doc.pop("_id", None)
    pay_doc.pop("_id", None)
    ent_doc.pop("_id", None)
    return {"order": order_doc, "payment": pay_doc, "entitlement": ent_doc,
            "bundle_grants": bundle_grants}


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
    """Upsert a product from a legacy hardcoded list.
    Fields the admin can edit via CMS are set only on FIRST insert; everything
    else (system-managed: type, category linkage, meta payload) can be updated
    on every seed pass so schema changes to legacy modules flow through."""
    p = _norm_product(p)
    now = datetime.now(timezone.utc).isoformat()

    ADMIN_EDITABLE = {
        "name", "price", "offer_price", "banner_image", "gradient",
        "features", "faculty_ids", "language", "validity_days",
        "active", "visibility", "display_order", "seo",
    }
    system_managed = {k: v for k, v in p.items() if k not in ADMIN_EDITABLE and k != "created_at"}
    system_managed["updated_at"] = now
    admin_defaults = {k: v for k, v in p.items() if k in ADMIN_EDITABLE}
    admin_defaults["created_at"] = now  # only on insert

    await _db.products.update_one(
        {"id": p["id"]},
        {
            "$set": system_managed,
            "$setOnInsert": admin_defaults,
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
    types = ["live_course", "video_course", "test_series", "booster", "magazine", "bundle"]
    return {"types": types}


@router.get("/products")
async def list_products(
    type: Optional[str] = None,
    category: Optional[str] = None,
    q: Optional[str] = None,
    client: Optional[str] = Query(None, description="app|website|admin — controls visibility filter"),
    limit: int = Query(50, ge=1, le=200),
):
    """List active products. Filters by visibility for the given `client`
    (app|website|admin). Defaults to `app` for backward-compat."""
    client_name = (client or "app").lower()
    q_filter: dict = {"active": True}
    if client_name == "app":
        q_filter["visibility.app"] = True
    elif client_name == "website":
        q_filter["visibility.website"] = True
    # admin: no visibility filter
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
    # attach lightweight user summary
    uids = list({d.get("user_id") for d in docs if d.get("user_id")})
    users = {}
    if uids:
        async for u in _db.users.find({"user_id": {"$in": uids}}, {"_id": 0, "user_id": 1, "name": 1, "email": 1, "avision_id": 1}):
            users[u["user_id"]] = u
    for d in docs:
        d["user"] = users.get(d.get("user_id"))
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

    source = "offline" if method in ("cash", "upi", "card") else "admin_grant"
    channel = "offline" if method in ("cash", "upi", "card") else "admin"
    try:
        res = await grant_entitlement(
            user_id=uid,
            product_id=pid,
            source=source,
            amount_inr=amount_inr,
            method=method,
            note=body.get("note", ""),
            channel=channel,
        )
    except ValueError as e:
        raise HTTPException(404, str(e))

    # Legacy shadow-write for façade backward-compat (so old dashboards keep working)
    now = datetime.now(timezone.utc)
    valid_days = int(product.get("validity_days") or 365)
    expires_at = (now + timedelta(days=valid_days)).isoformat()
    await _mirror_to_legacy(uid, pid, product, res["order"]["avision_order_id"], expires_at)

    return {
        "ok": True,
        "order": res["order"],
        "entitlement": res["entitlement"],
        "bundle_grants": res["bundle_grants"],
    }


async def _mirror_to_legacy(user_id: str, product_id: str, product: dict,
                            avision_order_id: str, expires_at: str):
    """Best-effort shadow-write of admin-granted entitlements into the legacy
    per-module enrollment tables so pre-refactor dashboards keep working
    without breaking. Only writes if a legacy row doesn't already exist."""
    if _db is None:
        return
    ptype = product.get("type")
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        if ptype == "live_course":
            existing = await _db.lc_enrollments.find_one({"user_id": user_id, "course_id": product_id})
            if not existing:
                await _db.lc_enrollments.insert_one({
                    "id": str(uuid.uuid4()), "user_id": user_id, "course_id": product_id,
                    "course_name": product.get("name"), "enrolled_at": now_iso,
                    "expires_at": expires_at, "progress_pct": 0,
                    "amount_paid_paise": 0, "order_id": avision_order_id,
                    "status": "active", "note": "admin_manual_enroll",
                })
        elif ptype == "video_course":
            existing = await _db.vc_enrollments.find_one({"user_id": user_id, "course_id": product_id})
            if not existing:
                await _db.vc_enrollments.insert_one({
                    "id": str(uuid.uuid4()), "user_id": user_id, "course_id": product_id,
                    "course_name": product.get("name"), "enrolled_at": now_iso,
                    "expires_at": expires_at, "amount_paid_paise": 0,
                    "order_id": avision_order_id, "status": "active",
                    "progress_pct": 0, "videos_watched": 0, "watch_time_hours": 0,
                    "last_activity_at": now_iso, "note": "admin_manual_enroll",
                })
        elif ptype == "test_series":
            plan_id = product_id.replace("tp-plan-", "") if product_id.startswith("tp-plan-") else "12m"
            await _db.tp_entitlements.update_one(
                {"user_id": user_id},
                {"$set": {
                    "user_id": user_id, "is_prime": True, "plan": "Test Prime",
                    "activated_at": now_iso, "expires_at": expires_at,
                    "unlocked_exams": [], "unlocked_categories": [],
                    "note": "admin_manual_enroll",
                }},
                upsert=True,
            )
    except Exception as e:  # pragma: no cover
        print("mirror_to_legacy:", e)


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


# =========================================================================
# ADMIN — Product Create (proof of app+website+admin single-backend)
# =========================================================================
@admin_router.post("/products")
async def admin_create_product(body: dict, user=Depends(get_admin_user)):
    """Create a new product manually from Super Admin. This is the endpoint
    used to prove `create once → display everywhere` across App + Website.

    Supports:
      - simple product (type=live_course|video_course|test_series|booster|magazine)
      - bundle (type=bundle) with `items[]`: each item = {type, ref_id}
      - visibility toggles {app, website, admin_only}
      - SEO fields {seo.title, seo.desc, seo.keywords, slug, meta_title,
        meta_description}
    """
    ptype = (body.get("type") or "").strip()
    name = (body.get("name") or "").strip()
    if not name:
        raise HTTPException(400, "name required")
    allowed_types = {"live_course", "video_course", "test_series",
                     "booster", "magazine", "bundle"}
    if ptype not in allowed_types:
        raise HTTPException(400, f"type must be one of {sorted(allowed_types)}")

    # Bundle validation
    items = body.get("items") or []
    if ptype == "bundle":
        if not items or not isinstance(items, list):
            raise HTTPException(400, "bundle products require non-empty items[]")
        # verify every ref_id exists
        for it in items:
            ref_id = it.get("ref_id")
            ref_type = it.get("type")
            if not ref_id or ref_type not in {"live_course", "video_course", "test_series"}:
                raise HTTPException(400, f"invalid bundle item: {it}")
            child = await _db.products.find_one({"id": ref_id, "type": ref_type}, {"_id": 0, "id": 1})
            if not child:
                raise HTTPException(400, f"bundle item {ref_type}:{ref_id} not found")

    pid = (body.get("id") or "").strip() or f"{ptype}-{_slug(name)}-{uuid.uuid4().hex[:6]}"

    price = int(body.get("price") or 0)
    offer_price = int(body.get("offer_price") or price)
    validity_days = int(body.get("validity_days") or 365)
    category_id = body.get("category_id")

    slug = (body.get("slug") or _slug(name)).strip()

    seo_in = body.get("seo") or {}
    seo = {
        "title": seo_in.get("title") or body.get("meta_title") or name,
        "desc": seo_in.get("desc") or body.get("meta_description") or body.get("exam_name") or "",
        "keywords": seo_in.get("keywords") or body.get("meta_keywords") or [],
    }

    visibility_in = body.get("visibility") or {}
    visibility = {
        "app": bool(visibility_in.get("app", True)),
        "website": bool(visibility_in.get("website", True)),
        "admin_only": bool(visibility_in.get("admin_only", False)),
    }

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": pid,
        "type": ptype,
        "name": name,
        "slug": slug,
        "category_id": category_id,
        "exam_name": body.get("exam_name"),
        "banner_image": body.get("banner_image") or "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
        "gradient": body.get("gradient") or ["#0B4DB8", "#082C6F"],
        "price": price,
        "offer_price": offer_price,
        "currency": "INR",
        "validity_days": validity_days,
        "language": body.get("language") or "Hindi + English",
        "features": body.get("features") or [],
        "faculty_ids": body.get("faculty_ids") or [],
        "exam_ids": [],
        "items": items if ptype == "bundle" else (body.get("items") or []),
        "active": bool(body.get("active", True)),
        "visibility": visibility,
        "display_order": int(body.get("display_order") or 0),
        "seo": seo,
        "meta": {"raw": {"source": "admin_created", "created_by": user["user_id"]}},
        "created_at": now,
        "updated_at": now,
        "content": body.get("content") or None,
    }
    existing = await _db.products.find_one({"id": pid})
    if existing:
        raise HTTPException(409, f"Product id '{pid}' already exists")
    await _db.products.insert_one(doc)
    doc.pop("_id", None)
    return {"ok": True, "product": doc}


@admin_router.delete("/products/{pid}")
async def admin_delete_product(pid: str, user=Depends(get_admin_user)):
    p = await _db.products.find_one({"id": pid}, {"_id": 0, "meta": 1})
    if not p:
        raise HTTPException(404, "Product not found")
    src = (p.get("meta") or {}).get("raw", {}).get("source")
    if src != "admin_created":
        raise HTTPException(400, "This product was seeded from a legacy module and cannot be deleted here.")
    await _db.products.delete_one({"id": pid})
    return {"ok": True, "deleted": pid}


# =========================================================================
# ADMIN — Payments listing
# =========================================================================
@admin_router.get("/payments")
async def admin_list_payments(limit: int = 100, skip: int = 0, user=Depends(get_admin_user)):
    total = await _db.payments.count_documents({})
    docs = await _db.payments.find({}, {"_id": 0}).sort("paid_at", -1).skip(skip).limit(limit).to_list(limit)
    oids = list({d.get("order_id") for d in docs if d.get("order_id")})
    orders = {}
    if oids:
        async for o in _db.orders.find({"avision_order_id": {"$in": oids}}, {"_id": 0, "avision_order_id": 1, "user_id": 1, "total": 1, "items": 1}):
            orders[o["avision_order_id"]] = o
    for d in docs:
        d["order"] = orders.get(d.get("order_id"))
    return {"payments": docs, "total": total}


# =========================================================================
# ADMIN — System Status (Settings → System Status)
# =========================================================================
_API_VERSION = "1.0.0"
_BOOT_TIME = datetime.now(timezone.utc).isoformat()


@admin_router.get("/system/status")
async def admin_system_status(user=Depends(get_admin_user)):
    import os as _os

    api = {"label": "API Server", "status": "online", "detail": f"FastAPI • up since {_BOOT_TIME}"}

    db_health = {"label": "Database", "status": "connected", "detail": ""}
    try:
        info = await _db.command("ping")
        db_health["detail"] = "MongoDB ping ok"
        db_health["status"] = "connected" if info.get("ok") else "error"
    except Exception as e:
        db_health["status"] = "disconnected"
        db_health["detail"] = str(e)[:120]

    auth_health = {"label": "Authentication", "status": "working", "detail": "JWT + bcrypt"}
    try:
        n = await _db.users.count_documents({"active": True})
        auth_health["detail"] = f"JWT + bcrypt • {n} active users"
    except Exception as e:
        auth_health["status"] = "error"
        auth_health["detail"] = str(e)[:120]

    storage_backends = []
    if _os.environ.get("AWS_ACCESS_KEY_ID"):
        storage_backends.append("S3")
    if _os.environ.get("CLOUDINARY_URL"):
        storage_backends.append("Cloudinary")
    storage = {
        "label": "File Storage",
        "status": "connected" if storage_backends else "not_configured",
        "detail": (", ".join(storage_backends) or "Base64 in DB (default)"),
    }

    video = {"label": "Video Service", "status": "not_configured",
             "detail": "Public sample MP4 URLs — HLS/DRM CDN pending"}

    pay_status = "not_configured"
    pay_detail = "No keys detected"
    key = _os.environ.get("RAZORPAY_KEY_ID") or ""
    if key:
        pay_status = "test_mode" if key.startswith("rzp_test") else "connected"
        pay_detail = f"Razorpay ({'test' if key.startswith('rzp_test') else 'live'}) • key ends …{key[-4:]}"
    payment = {"label": "Payment Gateway", "status": pay_status, "detail": pay_detail}

    notif_status = "not_configured"
    notif_detail = "No push keys detected"
    epk = _os.environ.get("EMERGENT_PUSH_KEY") or ""
    if epk and epk != "placeholder":
        notif_status = "connected"
        notif_detail = "Emergent push key configured"
    notif = {"label": "Notification Service", "status": notif_status, "detail": notif_detail}

    heartbeats = await _db.client_heartbeats.find({}, {"_id": 0}).to_list(50)

    def _client(name):
        h = next((x for x in heartbeats if x.get("client") == name), None)
        if not h:
            return {"label": name, "status": "not_connected", "detail": "No heartbeat received yet"}
        try:
            when = datetime.fromisoformat(h["last_seen"].replace("Z", "+00:00"))
            age_s = (datetime.now(timezone.utc) - when).total_seconds()
            fresh = age_s < 5 * 60
        except Exception:
            fresh = False
        return {"label": name, "status": "connected" if fresh else "stale",
                "detail": f"Last heartbeat: {h.get('last_seen')} • version {h.get('version', 'n/a')}"}

    student_app = _client("student_app")
    website = _client("website")
    super_admin = _client("super_admin")

    last_req = await _db.request_logs.find_one({}, sort=[("at", -1)])
    last_backup = await _db.backup_events.find_one({}, sort=[("at", -1)])

    return {
        "environment": _os.environ.get("APP_ENV") or "development",
        "api_version": _API_VERSION,
        "boot_time": _BOOT_TIME,
        "frontend": {"student_app": student_app, "website": website, "super_admin": super_admin},
        "backend": {"api": api, "database": db_health, "auth": auth_health,
                    "storage": storage, "video": video, "payment": payment, "notifications": notif},
        "last_successful_request_at": last_req.get("at") if last_req else None,
        "last_db_backup_at": last_backup.get("at") if last_backup else None,
    }


@router.post("/heartbeat")
async def client_heartbeat(body: dict):
    """Public heartbeat: App/Website/Admin ping to signal presence in System Status."""
    if _db is None:
        return {"ok": False}
    client = (body.get("client") or "").strip().lower()
    if client not in ("student_app", "website", "super_admin"):
        raise HTTPException(400, "invalid client")
    now = datetime.now(timezone.utc).isoformat()
    await _db.client_heartbeats.update_one(
        {"client": client},
        {"$set": {"client": client, "last_seen": now, "version": body.get("version") or "n/a"}},
        upsert=True,
    )
    return {"ok": True, "at": now}


# =========================================================================
# ADMIN — Database Overview (Settings → Database)
# =========================================================================
_DB_ENTITIES = [
    ("Students", "users", "Identity + profile"),
    ("Exam Categories", "exam_categories", "Master list"),
    ("Exams", "exams", "Per-category exams"),
    ("Products", "products", "Unified catalog"),
    ("Orders", "orders", "Unified orders"),
    ("Payments", "payments", "Unified payments"),
    ("Entitlements", "entitlements", "Access engine"),
    ("Faculty", "faculty", "Faculty master"),
    ("Coupons", "coupons", "Coupon master"),
    ("Centres", "centres", "Own + franchise"),
    ("Video Progress", "vc_progress", "Per-lecture watch state"),
    ("VC Enrollments (legacy)", "vc_enrollments", "Video course enrollments"),
    ("LC Enrollments (legacy)", "lc_enrollments", "Live course enrollments"),
    ("Live Sessions", "lc_sessions", "Classroom sessions"),
    ("Study Materials", "lc_study_materials", "PDFs + notes"),
    ("Material Downloads", "lc_material_downloads", "Download logs"),
    ("TP Attempts", "tp_attempts", "Test attempts"),
    ("TP Questions", "tp_questions", "Question bank"),
    ("TP Entitlements (legacy)", "tp_entitlements", "Test Prime access"),
    ("AI Threads", "ai_threads", "AI doubt convos"),
    ("AI Messages", "ai_messages", "AI doubt messages"),
    ("Feed Likes", "feed_likes", "Social engagement"),
    ("Feed Comments", "feed_comments", "Social engagement"),
    ("Daily Challenges", "daily_challenge_attempts", "Attempts"),
    ("Client Heartbeats", "client_heartbeats", "Live status pings"),
    ("Counters", "_counters", "Atomic ID counters"),
]


@admin_router.get("/system/database")
async def admin_database_overview(user=Depends(get_admin_user)):
    out = []
    for label, coll, desc in _DB_ENTITIES:
        try:
            n = await _db[coll].estimated_document_count()
            out.append({"label": label, "collection": coll, "count": int(n),
                        "description": desc, "status": "ok"})
        except Exception as e:
            out.append({"label": label, "collection": coll, "count": 0,
                        "description": desc, "status": "error", "error": str(e)[:80]})
    return {"entities": out, "total_collections": len(out)}


# =========================================================================
# ADMIN — Integration Test (Settings → Integration Test)
# =========================================================================
@admin_router.get("/system/integration-tests")
async def admin_integration_tests(user=Depends(get_admin_user)):
    """Live connectivity + contract tests. Pass/Fail with non-sensitive detail."""
    results = []

    def _t(name, category, status, detail=""):
        results.append({"name": name, "category": category, "status": status, "detail": detail})

    try:
        me = await _db.users.find_one({"user_id": user["user_id"]}, {"_id": 0, "email": 1, "roles": 1, "avision_id": 1})
        _t("JWT bearer parsed", "Authentication", "pass",
           f"caller: {me.get('email')} • roles: {','.join(me.get('roles') or [])}")
    except Exception as e:
        _t("JWT bearer parsed", "Authentication", "fail", str(e)[:120])
    _t("Admin role guard", "Authentication", "pass", "reached admin-only endpoint")

    try:
        n = await _db.products.count_documents({"active": True})
        _t("Products list", "Course API", "pass" if n > 0 else "fail", f"{n} active products")
    except Exception as e:
        _t("Products list", "Course API", "fail", str(e)[:120])

    try:
        p = await _db.products.find_one({"active": True}, {"_id": 0, "id": 1})
        if p:
            _t("Product detail", "Course API", "pass", f"sample id: {p['id']}")
        else:
            _t("Product detail", "Course API", "fail", "No product found")
    except Exception as e:
        _t("Product detail", "Course API", "fail", str(e)[:120])

    try:
        n = await _db.entitlements.count_documents({"active": True})
        _t("Entitlement engine", "Entitlement API", "pass", f"{n} active entitlements")
    except Exception as e:
        _t("Entitlement engine", "Entitlement API", "fail", str(e)[:120])

    try:
        anyent = await _db.entitlements.find_one({"active": True}, {"_id": 0, "user_id": 1, "product_id": 1})
        if anyent:
            ok = await has_access(anyent["user_id"], anyent["product_id"])
            _t("has_access() helper", "Entitlement API", "pass" if ok else "fail",
               f"checked {anyent['product_id']}")
        else:
            _t("has_access() helper", "Entitlement API", "skip", "No entitlements yet")
    except Exception as e:
        _t("has_access() helper", "Entitlement API", "fail", str(e)[:120])

    try:
        n = await _db.vc_progress.count_documents({})
        _t("Video progress table", "Progress API", "pass", f"{n} watch records")
    except Exception as e:
        _t("Video progress table", "Progress API", "fail", str(e)[:120])

    try:
        n = await _db.tp_attempts.count_documents({})
        _t("Test attempts", "Test API", "pass", f"{n} attempts")
    except Exception as e:
        _t("Test attempts", "Test API", "fail", str(e)[:120])

    for c, category in [("student_app", "App ↔ Backend"),
                        ("website", "Website ↔ Backend"),
                        ("super_admin", "Admin ↔ Backend")]:
        try:
            h = await _db.client_heartbeats.find_one({"client": c}, {"_id": 0})
            if not h:
                _t(f"{c} heartbeat", category, "fail", "No heartbeat received yet")
            else:
                when = datetime.fromisoformat(h["last_seen"].replace("Z", "+00:00"))
                age_s = (datetime.now(timezone.utc) - when).total_seconds()
                _t(f"{c} heartbeat", category,
                   "pass" if age_s < 300 else "fail",
                   f"Last seen {int(age_s)}s ago")
        except Exception as e:
            _t(f"{c} heartbeat", category, "fail", str(e)[:120])

    summary = {
        "total": len(results),
        "pass": sum(1 for r in results if r["status"] == "pass"),
        "fail": sum(1 for r in results if r["status"] == "fail"),
        "skip": sum(1 for r in results if r["status"] == "skip"),
    }
    return {"results": results, "summary": summary,
            "run_at": datetime.now(timezone.utc).isoformat()}
