"""AVISION ONE — Super Admin CMS Suite
=====================================
Single-source backend for every admin module. All content lives in the
common Mongo database, is auth-guarded by the unified admin role check
(from `foundation.get_admin_user`), and is exposed as read-only public
APIs for the Student App + future Website (respecting `visibility` flags).

MODULES SHIPPED
---------------
Academic:            exam_categories, exams, subjects, chapters, lessons
Learning content:    question_bank, study_material, current_affairs,
                     digital_notes, previous_papers
Content mgmt:        cms_web_pages, cms_app_pages, banners_home,
                     banners_promo, notifications, testimonials,
                     results, faqs
Organisation:        franchises, centres_enhanced
Reports (readonly):  students, product_sales, revenue, orders_report,
                     payments_report, course_performance, test_performance,
                     engagement, learning_progress, centre_wise,
                     franchise_wise

DESIGN
------
Every admin module is exposed at:
    GET    /api/admin/cms/{entity}              list w/ q/limit/skip filters
    POST   /api/admin/cms/{entity}              create
    GET    /api/admin/cms/{entity}/{id}         detail
    PATCH  /api/admin/cms/{entity}/{id}         update
    DELETE /api/admin/cms/{entity}/{id}         delete

Public / app / website endpoints:
    GET    /api/cms/{entity}?client=app|website
    GET    /api/cms/{entity}/{id}
Visibility respects `visibility.{app,website}` if the entity has that shape
otherwise defaults to public.

REPORTS
-------
GET /api/admin/reports/{report_slug}?range=today|7d|30d|all
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Any

from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from foundation import get_admin_user
from auth import get_optional_user


router = APIRouter(prefix="/api", tags=["cms"])
admin_router = APIRouter(prefix="/api/admin", tags=["cms-admin"])

_db: Optional[AsyncIOMotorDatabase] = None


def init_cms(db: AsyncIOMotorDatabase):
    global _db
    _db = db


# =========================================================================
# Entity registry
# =========================================================================
# Each entity maps to a Mongo collection + a set of allowed fields for
# create/update.  `public` controls whether the entity is exposed under
# /api/cms/{entity} (read-only) for the App/Website.
# `search_fields` list is used for the ?q=... substring filter.
# `visibility_gated` = whether we filter by visibility.{app,website} in
# public reads.

ENTITY_REGISTRY: dict[str, dict] = {
    # --------------------- ACADEMIC ---------------------
    "exam_categories_cms": {
        "collection": "cms_exam_categories",
        "public": True,
        "search_fields": ["name", "slug"],
        "visibility_gated": True,
        "default_visibility": {"app": True, "website": True},
        "fields": ["name", "slug", "description", "icon", "color", "banner_image",
                   "display_order", "seo", "visibility", "active"],
        "required": ["name"],
    },
    "exams_cms": {
        "collection": "cms_exams",
        "public": True,
        "search_fields": ["name", "slug", "category_id"],
        "visibility_gated": True,
        "fields": ["name", "slug", "category_id", "banner_image", "description",
                   "eligibility", "important_dates", "exam_pattern", "syllabus",
                   "seo", "visibility", "display_order", "active"],
        "required": ["name", "category_id"],
    },
    "subjects": {
        "collection": "cms_subjects",
        "public": True,
        "search_fields": ["name", "code"],
        "fields": ["name", "code", "icon", "color", "description",
                   "exam_ids", "display_order", "active"],
        "required": ["name"],
    },
    "chapters": {
        "collection": "cms_chapters",
        "public": True,
        "search_fields": ["name", "subject_id"],
        "fields": ["name", "subject_id", "description", "display_order",
                   "difficulty", "estimated_hours", "active"],
        "required": ["name", "subject_id"],
    },
    "lessons": {
        "collection": "cms_lessons",
        "public": True,
        "search_fields": ["title", "chapter_id"],
        "fields": ["title", "chapter_id", "subject_id", "type",
                   "content", "video_url", "pdf_url", "duration_min",
                   "display_order", "is_free", "active"],
        "required": ["title", "chapter_id"],
    },

    # --------------------- LEARNING CONTENT ---------------------
    "question_bank": {
        "collection": "cms_question_bank",
        "public": False,  # answers are sensitive — surfaced via test-prime engine
        "search_fields": ["text", "subject", "topic"],
        "fields": ["text", "options", "correct", "explanation",
                   "subject", "topic", "difficulty", "exam_ids",
                   "language", "marks", "negative_marks", "active"],
        "required": ["text", "options"],
    },
    "study_material_v2": {
        "collection": "cms_study_material",
        "public": True,
        "search_fields": ["title", "subject", "type"],
        "visibility_gated": True,
        "fields": ["title", "description", "type", "subject_id",
                   "exam_ids", "product_ids", "url", "pdf_url",
                   "thumbnail", "duration_min", "language",
                   "visibility", "display_order", "is_free", "active"],
        "required": ["title", "type"],
    },
    "current_affairs": {
        "collection": "cms_current_affairs",
        "public": True,
        "search_fields": ["title", "category", "tags"],
        "visibility_gated": True,
        "fields": ["title", "slug", "summary", "content", "category",
                   "tags", "banner_image", "published_at", "author",
                   "language", "exam_ids", "seo", "visibility",
                   "display_order", "active"],
        "required": ["title"],
    },
    "digital_notes": {
        "collection": "cms_digital_notes",
        "public": True,
        "search_fields": ["title", "subject_id"],
        "fields": ["title", "subject_id", "chapter_id", "exam_ids",
                   "pdf_url", "content_md", "language", "author",
                   "is_free", "product_ids", "display_order", "active"],
        "required": ["title"],
    },
    "previous_papers": {
        "collection": "cms_previous_papers",
        "public": True,
        "search_fields": ["title", "exam_id", "year"],
        "fields": ["title", "exam_id", "year", "shift", "pdf_url",
                   "answer_key_url", "solution_pdf_url", "duration_min",
                   "total_marks", "questions_count", "language",
                   "is_free", "display_order", "active"],
        "required": ["title", "exam_id"],
    },

    # --------------------- CONTENT MANAGEMENT ---------------------
    "cms_web_pages": {
        "collection": "cms_web_pages",
        "public": True,
        "search_fields": ["title", "slug"],
        "fields": ["slug", "title", "blocks", "seo", "template",
                   "published", "language", "display_order", "active"],
        "required": ["slug", "title"],
        "public_query_key": "slug",
    },
    "cms_app_pages": {
        "collection": "cms_app_pages",
        "public": True,
        "search_fields": ["title", "slug"],
        "fields": ["slug", "title", "blocks", "template", "published",
                   "language", "display_order", "active"],
        "required": ["slug", "title"],
        "public_query_key": "slug",
    },
    "banners_home": {
        "collection": "cms_banners_home",
        "public": True,
        "search_fields": ["title"],
        "visibility_gated": True,
        "fields": ["title", "subtitle", "image", "gradient", "cta_label",
                   "cta_url", "position", "start_at", "end_at",
                   "visibility", "display_order", "active"],
        "required": ["title", "image"],
    },
    "banners_promo": {
        "collection": "cms_banners_promo",
        "public": True,
        "search_fields": ["title"],
        "visibility_gated": True,
        "fields": ["title", "subtitle", "image", "cta_label", "cta_url",
                   "kind", "target_audience", "start_at", "end_at",
                   "visibility", "display_order", "active"],
        "required": ["title", "image"],
    },
    "notifications": {
        "collection": "cms_notifications",
        "public": True,
        "search_fields": ["title", "kind"],
        "fields": ["title", "body", "kind", "audience", "target_url",
                   "banner_image", "icon", "send_push", "sent_at",
                   "read_by", "display_order", "active"],
        "required": ["title"],
    },
    "testimonials": {
        "collection": "cms_testimonials",
        "public": True,
        "search_fields": ["name", "exam_id"],
        "visibility_gated": True,
        "fields": ["name", "photo", "exam_id", "exam_name", "rank",
                   "year", "quote", "video_url", "language",
                   "visibility", "display_order", "active"],
        "required": ["name", "quote"],
    },
    "results": {
        "collection": "cms_results",
        "public": True,
        "search_fields": ["name", "exam_id"],
        "visibility_gated": True,
        "fields": ["name", "photo", "exam_id", "exam_name", "rank",
                   "year", "post", "batch", "centre_id",
                   "visibility", "display_order", "active"],
        "required": ["name"],
    },
    "faqs": {
        "collection": "cms_faqs",
        "public": True,
        "search_fields": ["question", "section"],
        "visibility_gated": True,
        "fields": ["question", "answer", "section", "product_id",
                   "language", "visibility", "display_order", "active"],
        "required": ["question", "answer"],
    },

    # --------------------- ORGANISATION ---------------------
    "franchises": {
        "collection": "cms_franchises",
        "public": True,
        "search_fields": ["name", "city", "state", "franchisee_name"],
        "fields": ["name", "code", "franchisee_name", "franchisee_email",
                   "franchisee_phone", "city", "state", "pincode",
                   "address", "gst", "commission_pct", "revenue_share_pct",
                   "started_at", "ended_at", "status", "notes", "active"],
        "required": ["name"],
    },
    "centres_v2": {
        "collection": "cms_centres",
        "public": True,
        "search_fields": ["name", "city", "state"],
        "fields": ["name", "code", "type", "franchise_id",
                   "city", "state", "pincode", "address", "phone",
                   "manager_name", "manager_email", "seats", "opened_at",
                   "status", "notes", "active"],
        "required": ["name"],
    },
}


# =========================================================================
# Helpers
# =========================================================================
def _entity(name: str) -> dict:
    ent = ENTITY_REGISTRY.get(name)
    if not ent:
        raise HTTPException(404, f"Unknown entity '{name}'")
    return ent


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _slugify(txt: str) -> str:
    return (
        (txt or "").lower()
        .replace(" ", "-").replace("&", "and").replace(",", "").replace("'", "")
        .replace("(", "").replace(")", "").replace(".", "").replace("/", "-")
    )


def _clean(doc: dict) -> dict:
    """Strip Mongo internal + normalize timestamps for JSON output."""
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def _apply_visibility(entity_cfg: dict, filt: dict, client: str) -> dict:
    if not entity_cfg.get("visibility_gated"):
        return filt
    c = (client or "app").lower()
    if c in ("app", "website"):
        filt[f"visibility.{c}"] = True
    return filt


async def _list_entity(entity_name: str, q: Optional[str], limit: int, skip: int,
                       admin: bool = True, client: str = "app",
                       extra_filter: Optional[dict] = None) -> dict:
    cfg = _entity(entity_name)
    coll = _db[cfg["collection"]]
    filt: dict = extra_filter.copy() if extra_filter else {}
    if not admin:
        filt["active"] = True
        _apply_visibility(cfg, filt, client)
    if q:
        or_clauses = [{f: {"$regex": q, "$options": "i"}} for f in cfg.get("search_fields", [])]
        if or_clauses:
            filt["$or"] = or_clauses
    total = await coll.count_documents(filt)
    docs = await coll.find(filt, {"_id": 0}).sort(
        [("display_order", 1), ("created_at", -1)]
    ).skip(skip).limit(limit).to_list(limit)
    return {"items": docs, "total": total, "limit": limit, "skip": skip}


async def _create_entity(entity_name: str, body: dict, created_by: str) -> dict:
    cfg = _entity(entity_name)
    for req in cfg.get("required", []):
        if req not in body or body[req] in (None, "", []):
            raise HTTPException(400, f"'{req}' is required")

    allowed = set(cfg["fields"])
    doc = {k: v for k, v in body.items() if k in allowed}

    # Default id + slug
    doc["id"] = body.get("id") or f"{entity_name[:3]}-{uuid.uuid4().hex[:12]}"

    # Default slug if applicable
    if "slug" in cfg["fields"] and not doc.get("slug"):
        title = doc.get("title") or doc.get("name") or doc["id"]
        doc["slug"] = _slugify(title)

    # Defaults
    if "visibility" in cfg["fields"] and "visibility" not in doc:
        doc["visibility"] = cfg.get("default_visibility") or {"app": True, "website": True}
    if "active" in cfg["fields"] and "active" not in doc:
        doc["active"] = True
    if "display_order" in cfg["fields"] and "display_order" not in doc:
        doc["display_order"] = 0

    doc["created_at"] = _now()
    doc["updated_at"] = _now()
    doc["created_by"] = created_by

    coll = _db[cfg["collection"]]
    existing = await coll.find_one({"id": doc["id"]})
    if existing:
        raise HTTPException(409, f"id '{doc['id']}' already exists")
    if "slug" in doc:
        slug_exists = await coll.find_one({"slug": doc["slug"]})
        if slug_exists:
            doc["slug"] = f"{doc['slug']}-{uuid.uuid4().hex[:4]}"

    await coll.insert_one(doc)
    return _clean(doc)


async def _update_entity(entity_name: str, item_id: str, body: dict) -> dict:
    cfg = _entity(entity_name)
    allowed = set(cfg["fields"])
    patch = {k: v for k, v in body.items() if k in allowed}
    if not patch:
        raise HTTPException(400, "Nothing to update")
    patch["updated_at"] = _now()
    coll = _db[cfg["collection"]]
    res = await coll.update_one({"id": item_id}, {"$set": patch})
    if not res.matched_count:
        raise HTTPException(404, "Item not found")
    doc = await coll.find_one({"id": item_id}, {"_id": 0})
    return _clean(doc)


async def _delete_entity(entity_name: str, item_id: str) -> dict:
    cfg = _entity(entity_name)
    coll = _db[cfg["collection"]]
    res = await coll.delete_one({"id": item_id})
    if not res.deleted_count:
        raise HTTPException(404, "Item not found")
    return {"ok": True, "deleted": item_id}


async def _get_entity(entity_name: str, item_id: str, admin: bool = True,
                      client: str = "app") -> dict:
    cfg = _entity(entity_name)
    coll = _db[cfg["collection"]]
    # Admin always looks up by canonical id; public reads may use a friendly
    # slug (e.g. /api/cms/cms_web_pages/home).
    lookup_key = "id" if admin else cfg.get("public_query_key", "id")
    filt = {lookup_key: item_id}
    if not admin:
        filt["active"] = True
        _apply_visibility(cfg, filt, client)
    doc = await coll.find_one(filt, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Item not found")
    return _clean(doc)


# =========================================================================
# ADMIN routes — generic CRUD across every registered entity
# =========================================================================
@admin_router.get("/cms/entities")
async def list_entities(user=Depends(get_admin_user)):
    out = []
    for name, cfg in ENTITY_REGISTRY.items():
        try:
            n = await _db[cfg["collection"]].estimated_document_count()
        except Exception:
            n = 0
        out.append({
            "entity": name,
            "collection": cfg["collection"],
            "count": int(n),
            "public": cfg.get("public", False),
            "fields": cfg.get("fields", []),
            "required": cfg.get("required", []),
            "search_fields": cfg.get("search_fields", []),
            "visibility_gated": bool(cfg.get("visibility_gated")),
        })
    return {"entities": sorted(out, key=lambda e: e["entity"])}


@admin_router.get("/cms/{entity}")
async def admin_list(entity: str, q: Optional[str] = None,
                     limit: int = 50, skip: int = 0,
                     user=Depends(get_admin_user)):
    return await _list_entity(entity, q, limit, skip, admin=True)


@admin_router.post("/cms/{entity}")
async def admin_create(entity: str, body: dict, user=Depends(get_admin_user)):
    return await _create_entity(entity, body, user["user_id"])


@admin_router.get("/cms/{entity}/{item_id}")
async def admin_get(entity: str, item_id: str, user=Depends(get_admin_user)):
    return await _get_entity(entity, item_id, admin=True)


@admin_router.patch("/cms/{entity}/{item_id}")
async def admin_update(entity: str, item_id: str, body: dict,
                       user=Depends(get_admin_user)):
    return await _update_entity(entity, item_id, body)


@admin_router.delete("/cms/{entity}/{item_id}")
async def admin_delete(entity: str, item_id: str, user=Depends(get_admin_user)):
    return await _delete_entity(entity, item_id)


# =========================================================================
# PUBLIC routes — read-only for App / Website
# =========================================================================
@router.get("/cms/{entity}")
async def public_list(entity: str, q: Optional[str] = None,
                      limit: int = 50, skip: int = 0,
                      client: str = Query("app", description="app|website")):
    cfg = _entity(entity)
    if not cfg.get("public"):
        raise HTTPException(404, "Entity is not publicly exposed")
    return await _list_entity(entity, q, limit, skip, admin=False, client=client)


@router.get("/cms/{entity}/{item_id}")
async def public_get(entity: str, item_id: str,
                     client: str = Query("app", description="app|website")):
    cfg = _entity(entity)
    if not cfg.get("public"):
        raise HTTPException(404, "Entity is not publicly exposed")
    return await _get_entity(entity, item_id, admin=False, client=client)


# =========================================================================
# REPORTS — read-only analytics
# =========================================================================
def _range_bounds(rng: str) -> tuple[Optional[datetime], datetime]:
    now = datetime.now(timezone.utc)
    if rng == "today":
        return (now.replace(hour=0, minute=0, second=0, microsecond=0), now)
    if rng == "7d":
        return (now - timedelta(days=7), now)
    if rng == "30d":
        return (now - timedelta(days=30), now)
    return (None, now)


REPORT_LIST = [
    {"slug": "students", "label": "Student Reports"},
    {"slug": "product_sales", "label": "Product Sales"},
    {"slug": "revenue", "label": "Revenue"},
    {"slug": "orders_report", "label": "Orders"},
    {"slug": "payments_report", "label": "Payment Reports"},
    {"slug": "course_performance", "label": "Course Performance"},
    {"slug": "test_performance", "label": "Test Performance"},
    {"slug": "engagement", "label": "Student Engagement"},
    {"slug": "learning_progress", "label": "Learning Progress"},
    {"slug": "centre_wise", "label": "Centre-wise Reports"},
    {"slug": "franchise_wise", "label": "Franchise-wise Reports"},
]


@admin_router.get("/reports")
async def reports_index(user=Depends(get_admin_user)):
    return {"reports": REPORT_LIST}


@admin_router.get("/reports/{slug}")
async def report(slug: str, range: str = "30d", user=Depends(get_admin_user)):
    start, end = _range_bounds(range)
    start_iso = start.isoformat() if start else None
    end_iso = end.isoformat()

    if slug == "students":
        total = await _db.users.count_documents({})
        new_range = await _db.users.count_documents(
            {"created_at": {"$gte": start_iso, "$lte": end_iso}}
        ) if start_iso else total
        active = await _db.users.count_documents({"active": True})
        by_cat = []
        async for row in _db.users.aggregate([
            {"$group": {"_id": "$category_id", "n": {"$sum": 1}}},
            {"$sort": {"n": -1}},
        ]):
            by_cat.append({"category_id": row["_id"] or "unknown", "count": row["n"]})
        return {"slug": slug, "range": range, "kpis": [
            {"label": "Total students", "value": total},
            {"label": "New in range", "value": new_range},
            {"label": "Active students", "value": active},
        ], "breakdown": by_cat}

    if slug == "product_sales":
        pipeline = [
            {"$match": {"status": "paid"}},
            {"$unwind": "$items"},
            {"$group": {"_id": "$items.product_id", "units": {"$sum": 1},
                        "revenue": {"$sum": "$total"}}},
            {"$sort": {"units": -1}},
            {"$limit": 50},
        ]
        if start_iso:
            pipeline[0]["$match"]["created_at"] = {"$gte": start_iso, "$lte": end_iso}
        rows = []
        async for r in _db.orders.aggregate(pipeline):
            p = await _db.products.find_one({"id": r["_id"]}, {"_id": 0, "name": 1, "type": 1})
            rows.append({
                "product_id": r["_id"],
                "name": (p or {}).get("name") or r["_id"],
                "type": (p or {}).get("type"),
                "units": r["units"], "revenue": r["revenue"],
            })
        return {"slug": slug, "range": range, "rows": rows}

    if slug == "revenue":
        pipeline = [
            {"$match": {"status": "paid"}},
            {"$group": {"_id": None, "sum": {"$sum": "$total"},
                        "count": {"$sum": 1}}},
        ]
        by_channel = []
        if start_iso:
            pipeline[0]["$match"]["created_at"] = {"$gte": start_iso, "$lte": end_iso}
        total = 0
        count = 0
        async for r in _db.orders.aggregate(pipeline):
            total = int(r["sum"] or 0)
            count = int(r["count"] or 0)
        ch_pipe = [
            {"$match": {"status": "paid"}},
            {"$group": {"_id": "$channel", "sum": {"$sum": "$total"},
                        "count": {"$sum": 1}}},
        ]
        if start_iso:
            ch_pipe[0]["$match"]["created_at"] = {"$gte": start_iso, "$lte": end_iso}
        async for r in _db.orders.aggregate(ch_pipe):
            by_channel.append({"channel": r["_id"] or "unknown",
                               "revenue": r["sum"], "count": r["count"]})
        return {"slug": slug, "range": range, "kpis": [
            {"label": "Revenue (₹)", "value": total},
            {"label": "Paid orders", "value": count},
            {"label": "Avg order (₹)", "value": int(total / count) if count else 0},
        ], "by_channel": by_channel}

    if slug == "orders_report":
        by_status = []
        pipe = [{"$group": {"_id": "$status", "n": {"$sum": 1}}}]
        if start_iso:
            pipe = [{"$match": {"created_at": {"$gte": start_iso, "$lte": end_iso}}}] + pipe
        async for r in _db.orders.aggregate(pipe):
            by_status.append({"status": r["_id"] or "unknown", "count": r["n"]})
        total = sum(x["count"] for x in by_status)
        return {"slug": slug, "range": range, "kpis": [
            {"label": "Total orders", "value": total},
        ], "by_status": by_status}

    if slug == "payments_report":
        by_gateway = []
        pipe = [{"$group": {"_id": "$gateway", "n": {"$sum": 1},
                            "sum": {"$sum": "$amount_paise"}}}]
        if start_iso:
            pipe = [{"$match": {"paid_at": {"$gte": start_iso, "$lte": end_iso}}}] + pipe
        async for r in _db.payments.aggregate(pipe):
            by_gateway.append({"gateway": r["_id"] or "unknown", "count": r["n"],
                               "amount_inr": int((r["sum"] or 0) / 100)})
        total = sum(x["count"] for x in by_gateway)
        rev = sum(x["amount_inr"] for x in by_gateway)
        return {"slug": slug, "range": range, "kpis": [
            {"label": "Total payments", "value": total},
            {"label": "Total collected (₹)", "value": rev},
        ], "by_gateway": by_gateway}

    if slug == "course_performance":
        # #enrolled + avg progress by product (courses only)
        rows = []
        products = await _db.products.find(
            {"type": {"$in": ["live_course", "video_course"]}, "active": True},
            {"_id": 0, "id": 1, "name": 1, "type": 1},
        ).to_list(200)
        for p in products:
            n = await _db.entitlements.count_documents(
                {"product_id": p["id"], "active": True}
            )
            avg = 0
            if p["type"] == "video_course":
                pipe = [
                    {"$match": {"course_id": p["id"]}},
                    {"$group": {"_id": None, "avg": {"$avg": "$watched_pct"}}},
                ]
                async for r in _db.vc_progress.aggregate(pipe):
                    avg = int(r["avg"] or 0)
            rows.append({
                "product_id": p["id"], "name": p["name"], "type": p["type"],
                "enrolled": n, "avg_progress_pct": avg,
            })
        rows.sort(key=lambda x: -x["enrolled"])
        return {"slug": slug, "range": range, "rows": rows[:50]}

    if slug == "test_performance":
        pipe = [
            {"$group": {"_id": "$test_id", "attempts": {"$sum": 1},
                        "avg_score": {"$avg": "$score"}}},
            {"$sort": {"attempts": -1}},
            {"$limit": 50},
        ]
        rows = []
        async for r in _db.tp_attempts.aggregate(pipe):
            rows.append({
                "test_id": r["_id"], "attempts": r["attempts"],
                "avg_score": round(r["avg_score"] or 0, 2),
            })
        return {"slug": slug, "range": range, "rows": rows}

    if slug == "engagement":
        total_users = await _db.users.count_documents({"active": True})
        active_7d = await _db.vc_progress.distinct(
            "user_id",
            {"last_watched_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()}},
        )
        active_30d = await _db.vc_progress.distinct(
            "user_id",
            {"last_watched_at": {"$gte": (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()}},
        )
        ai_msgs = await _db.ai_messages.estimated_document_count()
        return {"slug": slug, "range": range, "kpis": [
            {"label": "Active users (7d)", "value": len(active_7d)},
            {"label": "Active users (30d)", "value": len(active_30d)},
            {"label": "AI doubt msgs", "value": ai_msgs},
            {"label": "Total students", "value": total_users},
        ]}

    if slug == "learning_progress":
        pipe = [
            {"$group": {"_id": "$user_id",
                        "watched_seconds": {"$sum": "$watch_seconds"},
                        "lectures": {"$sum": 1}}},
            {"$sort": {"watched_seconds": -1}},
            {"$limit": 30},
        ]
        rows = []
        async for r in _db.vc_progress.aggregate(pipe):
            u = await _db.users.find_one(
                {"user_id": r["_id"]},
                {"_id": 0, "name": 1, "email": 1, "avision_id": 1},
            ) or {}
            rows.append({
                "user_id": r["_id"], "name": u.get("name") or "—",
                "avision_id": u.get("avision_id"),
                "lectures": r["lectures"],
                "watch_hours": round((r["watched_seconds"] or 0) / 3600.0, 2),
            })
        return {"slug": slug, "range": range, "rows": rows}

    if slug == "centre_wise":
        rows = []
        async for c in _db.cms_centres.find({}, {"_id": 0, "id": 1, "name": 1, "city": 1}):
            n = await _db.users.count_documents({"centre_id": c["id"]})
            paid = 0
            async for r in _db.orders.aggregate([
                {"$match": {"centre_id": c["id"], "status": "paid"}},
                {"$group": {"_id": None, "sum": {"$sum": "$total"}}},
            ]):
                paid = int(r["sum"] or 0)
            rows.append({"centre_id": c["id"], "name": c["name"],
                         "city": c.get("city"), "students": n, "revenue_inr": paid})
        # fallback for legacy centres collection
        if not rows:
            async for c in _db.centres.find({}, {"_id": 0, "id": 1, "name": 1, "city": 1}):
                n = await _db.users.count_documents({"centre_id": c["id"]})
                rows.append({"centre_id": c["id"], "name": c["name"],
                             "city": c.get("city"), "students": n, "revenue_inr": 0})
        rows.sort(key=lambda x: -x["students"])
        return {"slug": slug, "range": range, "rows": rows}

    if slug == "franchise_wise":
        rows = []
        async for fr in _db.cms_franchises.find({}, {"_id": 0}):
            n_centres = await _db.cms_centres.count_documents({"franchise_id": fr["id"]})
            rows.append({
                "franchise_id": fr["id"], "name": fr["name"],
                "city": fr.get("city"), "state": fr.get("state"),
                "centres": n_centres, "status": fr.get("status", "active"),
            })
        rows.sort(key=lambda x: -x["centres"])
        return {"slug": slug, "range": range, "rows": rows}

    raise HTTPException(404, f"Unknown report '{slug}'")


# =========================================================================
# Indexes + optional seeding for demo/discoverability
# =========================================================================
async def ensure_cms_indexes(db: AsyncIOMotorDatabase):
    for cfg in ENTITY_REGISTRY.values():
        coll = db[cfg["collection"]]
        await coll.create_index("id", unique=True)
        if "slug" in cfg["fields"]:
            await coll.create_index("slug")


async def seed_cms_starter(db: AsyncIOMotorDatabase):
    """Seed a handful of demo docs so admin UI has non-empty starting data
    and the Website+App integration is proven end-to-end.
    Idempotent — only inserts on empty collection."""
    async def _seed(entity_name: str, docs: list[dict]):
        cfg = ENTITY_REGISTRY[entity_name]
        coll = db[cfg["collection"]]
        n = await coll.estimated_document_count()
        if n > 0:
            return
        now = _now()
        for i, d in enumerate(docs):
            d.setdefault("id", f"{entity_name[:3]}-seed-{i+1:03d}")
            if "slug" in cfg["fields"] and "slug" not in d:
                d["slug"] = _slugify(d.get("title") or d.get("name") or d["id"])
            if "visibility" in cfg["fields"] and "visibility" not in d:
                d["visibility"] = {"app": True, "website": True}
            if "active" in cfg["fields"] and "active" not in d:
                d["active"] = True
            d.setdefault("created_at", now)
            d.setdefault("updated_at", now)
            d.setdefault("display_order", i)
        await coll.insert_many(docs)

    # Homepage banners
    await _seed("banners_home", [
        {"title": "Banking Complete Pack", "subtitle": "Video + Test + Live",
         "image": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200",
         "gradient": ["#0B4DB8", "#0EA5E9"], "cta_label": "Explore",
         "cta_url": "/video-courses"},
        {"title": "Ace SSC CGL 2026", "subtitle": "New batch starting soon",
         "image": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200",
         "gradient": ["#7C3AED", "#A855F7"], "cta_label": "Join Live",
         "cta_url": "/live-courses"},
    ])

    # Testimonials
    await _seed("testimonials", [
        {"name": "Riya Sen", "exam_id": "sbi-po", "exam_name": "SBI PO 2025",
         "rank": 42, "year": 2025,
         "quote": "Avision's mock series was the single biggest factor in my selection.",
         "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"},
        {"name": "Aditya Kumar", "exam_id": "ssc-cgl", "exam_name": "SSC CGL 2025",
         "rank": 18, "year": 2025,
         "quote": "Faculty is unmatched. The bilingual switch inside tests was gold.",
         "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"},
    ])

    # Results
    await _seed("results", [
        {"name": "Riya Sen", "exam_id": "sbi-po", "exam_name": "SBI PO 2025",
         "rank": 42, "year": 2025, "post": "Probationary Officer",
         "photo": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400"},
        {"name": "Aditya Kumar", "exam_id": "ssc-cgl", "exam_name": "SSC CGL 2025",
         "rank": 18, "year": 2025, "post": "Assistant Section Officer",
         "photo": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"},
    ])

    # FAQs
    await _seed("faqs", [
        {"question": "How do I enrol in a course?",
         "answer": "Open the course page → tap Enroll → complete payment. Access is instant.",
         "section": "general"},
        {"question": "Is Test Prime included in a video course?",
         "answer": "Not by default. Buy the Complete Pack bundle to unlock both.",
         "section": "test-prime"},
    ])

    # Notifications
    await _seed("notifications", [
        {"title": "New batch: Banking PO 2026", "body": "Live batch starts Nov 25.",
         "kind": "batch_launch", "audience": "banking", "target_url": "/live-courses",
         "banner_image": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200"},
    ])

    # Current Affairs
    await _seed("current_affairs", [
        {"title": "Union Budget 2026 — Key Highlights for Banking Aspirants",
         "summary": "Fiscal deficit target, PSB recap, and 5 new schemes.",
         "category": "economy", "tags": ["budget", "banking"],
         "banner_image": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200",
         "published_at": _now(), "author": "Avision Editorial", "language": "en"},
    ])

    # Franchises (starter)
    await _seed("franchises", [
        {"name": "Avision Howrah", "code": "AVN-HWH",
         "franchisee_name": "S. Roy", "city": "Howrah", "state": "WB",
         "status": "active", "commission_pct": 15, "revenue_share_pct": 30},
        {"name": "Avision Kolkata Salt Lake", "code": "AVN-KOL-SL",
         "franchisee_name": "N. Dey", "city": "Kolkata", "state": "WB",
         "status": "active", "commission_pct": 15, "revenue_share_pct": 35},
    ])

    # Centres v2
    await _seed("centres_v2", [
        {"name": "Avision Kolkata HQ", "code": "AVN-KOL", "type": "own",
         "city": "Kolkata", "state": "WB", "seats": 250, "status": "active"},
        {"name": "Avision Howrah Branch", "code": "AVN-HWH-1", "type": "franchise",
         "city": "Howrah", "state": "WB", "seats": 120, "status": "active"},
    ])

    # Web CMS starter
    await _seed("cms_web_pages", [
        {"slug": "home", "title": "Avision Institute — Ace Your Exam",
         "blocks": [{"type": "hero", "props": {"headline": "Learn. Practice. Crack.",
                                              "cta": "Explore Courses"}}],
         "seo": {"title": "Avision Institute", "desc": "India's premier coaching platform"},
         "published": True, "language": "en"},
        {"slug": "about", "title": "About Us",
         "blocks": [{"type": "text", "props": {"content": "Avision Institute is..."}}],
         "seo": {"title": "About Avision", "desc": "Our story"},
         "published": True, "language": "en"},
    ])

    # App CMS starter
    await _seed("cms_app_pages", [
        {"slug": "home", "title": "Home Screen",
         "blocks": [{"type": "banner_slider", "props": {"limit": 5}},
                    {"type": "quick_access"},
                    {"type": "trending_tests", "props": {"limit": 6}},
                    {"type": "current_affairs", "props": {"limit": 3}},
                    {"type": "daily_challenge"},
                    {"type": "job_alerts", "props": {"limit": 4}}],
         "template": "home_v2", "published": True},
    ])

    # Promo banners
    await _seed("banners_promo", [
        {"title": "Diwali Sale — Flat 40% off",
         "subtitle": "Use code AVISION40 at checkout",
         "image": "https://images.unsplash.com/photo-1607082349566-187342175e2f?w=1200",
         "cta_label": "Shop Now", "cta_url": "/video-courses",
         "kind": "sale"},
    ])
