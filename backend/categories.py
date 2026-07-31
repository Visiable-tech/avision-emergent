"""Exam Category & Exam data model + seed + CRUD endpoints."""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import uuid

_db = None


def init_categories(db):
    global _db
    _db = db


SEED_CATEGORIES = [
    {
        "id": "banking", "slug": "banking", "name": "Banking",
        "description": "IBPS, SBI, RBI, NABARD, LIC & Insurance recruitment exams.",
        "icon": "cash-outline", "color": "#0B4DB8",
        "banner": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
        "status": "active", "display_order": 1,
        "exams": [
            {"id": "ibps-po", "name": "IBPS PO", "short": "PO"},
            {"id": "ibps-clerk", "name": "IBPS Clerk", "short": "Clerk"},
            {"id": "ibps-so", "name": "IBPS SO", "short": "SO"},
            {"id": "sbi-po", "name": "SBI PO", "short": "SBI PO"},
            {"id": "sbi-clerk", "name": "SBI Clerk", "short": "SBI"},
            {"id": "rbi-assistant", "name": "RBI Assistant", "short": "RBI"},
            {"id": "rbi-grade-b", "name": "RBI Grade B", "short": "Grade B"},
            {"id": "nabard", "name": "NABARD", "short": "NABARD"},
            {"id": "lic-aao", "name": "LIC AAO", "short": "LIC"},
        ],
    },
    {
        "id": "ssc", "slug": "ssc", "name": "SSC",
        "description": "SSC CGL, CHSL, MTS, CPO, GD Constable & more.",
        "icon": "briefcase-outline", "color": "#C68A2D",
        "banner": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80",
        "status": "active", "display_order": 2,
        "exams": [
            {"id": "ssc-cgl", "name": "SSC CGL", "short": "CGL"},
            {"id": "ssc-chsl", "name": "SSC CHSL", "short": "CHSL"},
            {"id": "ssc-mts", "name": "SSC MTS", "short": "MTS"},
            {"id": "ssc-gd", "name": "SSC GD", "short": "GD"},
            {"id": "ssc-cpo", "name": "SSC CPO", "short": "CPO"},
            {"id": "ssc-je", "name": "SSC JE", "short": "JE"},
            {"id": "delhi-police", "name": "Delhi Police", "short": "DP"},
        ],
    },
    {
        "id": "railway", "slug": "railway", "name": "Railway",
        "description": "RRB NTPC, Group D, JE, ALP, RPF & Technician.",
        "icon": "train-outline", "color": "#0B4DB8",
        "banner": "https://images.unsplash.com/photo-1474487548417-781cb71495f3?w=800&q=80",
        "status": "active", "display_order": 3,
        "exams": [
            {"id": "rrb-ntpc", "name": "RRB NTPC", "short": "NTPC"},
            {"id": "rrb-group-d", "name": "RRB Group D", "short": "Group D"},
            {"id": "rrb-je", "name": "RRB JE", "short": "JE"},
            {"id": "alp", "name": "ALP", "short": "ALP"},
            {"id": "technician", "name": "Technician", "short": "Tech"},
            {"id": "rpf", "name": "RPF", "short": "RPF"},
        ],
    },
    {
        "id": "insurance", "slug": "insurance", "name": "Insurance",
        "description": "LIC AAO, NIACL, UIIC, EPFO & insurance sector jobs.",
        "icon": "shield-checkmark-outline", "color": "#C68A2D",
        "banner": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80",
        "status": "active", "display_order": 4,
        "exams": [
            {"id": "niacl", "name": "NIACL", "short": "NIACL"},
            {"id": "uiic", "name": "UIIC", "short": "UIIC"},
            {"id": "epfo", "name": "EPFO", "short": "EPFO"},
            {"id": "lic-ado", "name": "LIC ADO", "short": "ADO"},
        ],
    },
    {
        "id": "defence", "slug": "defence", "name": "Defence",
        "description": "NDA, CDS, AFCAT, Agniveer, Coast Guard.",
        "icon": "airplane-outline", "color": "#0B4DB8",
        "banner": "https://images.unsplash.com/photo-1585094058929-076a5ea1e5c7?w=800&q=80",
        "status": "active", "display_order": 5,
        "exams": [
            {"id": "def-nda", "name": "NDA", "short": "NDA"},
            {"id": "def-cds", "name": "CDS", "short": "CDS"},
            {"id": "afcat", "name": "AFCAT", "short": "AFCAT"},
            {"id": "agniveer", "name": "Agniveer", "short": "Agniveer"},
            {"id": "coast-guard", "name": "Coast Guard", "short": "CG"},
        ],
    },
    {
        "id": "police", "slug": "police", "name": "Police",
        "description": "State Police, SI, Constable, Delhi Police.",
        "icon": "shield-outline", "color": "#C68A2D",
        "banner": "https://images.unsplash.com/photo-1591035897819-f4bdf739f446?w=800&q=80",
        "status": "active", "display_order": 6,
        "exams": [
            {"id": "delhi-police-si", "name": "Delhi Police SI", "short": "DP SI"},
            {"id": "up-police", "name": "UP Police", "short": "UPP"},
            {"id": "state-si", "name": "State SI", "short": "SI"},
            {"id": "state-constable", "name": "State Constable", "short": "Constable"},
        ],
    },
    {
        "id": "teaching", "slug": "teaching", "name": "Teaching",
        "description": "CTET, DSSSB, KVS, NVS, State TET & Super TET.",
        "icon": "school-outline", "color": "#0B4DB8",
        "banner": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
        "status": "active", "display_order": 7,
        "exams": [
            {"id": "ctet", "name": "CTET", "short": "CTET"},
            {"id": "dsssb", "name": "DSSSB", "short": "DSSSB"},
            {"id": "kvs", "name": "KVS", "short": "KVS"},
            {"id": "nvs", "name": "NVS", "short": "NVS"},
            {"id": "primary-tet", "name": "Primary TET", "short": "P-TET"},
            {"id": "wb-tet", "name": "WB TET", "short": "WB TET"},
        ],
    },
    {
        "id": "mba", "slug": "mba", "name": "MBA Entrance",
        "description": "CAT, MAT, XAT, CMAT, IPMAT, NMAT.",
        "icon": "bar-chart-outline", "color": "#C68A2D",
        "banner": "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80",
        "status": "active", "display_order": 8,
        "exams": [
            {"id": "cat", "name": "CAT", "short": "CAT"},
            {"id": "mat", "name": "MAT", "short": "MAT"},
            {"id": "xat", "name": "XAT", "short": "XAT"},
            {"id": "cmat", "name": "CMAT", "short": "CMAT"},
            {"id": "ipmat", "name": "IPMAT", "short": "IPMAT"},
            {"id": "nmat", "name": "NMAT", "short": "NMAT"},
        ],
    },
    {
        "id": "law", "slug": "law", "name": "Law Entrance",
        "description": "CLAT, AILET, SLAT, LSAT, MH CET Law.",
        "icon": "hammer-outline", "color": "#0B4DB8",
        "banner": "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&q=80",
        "status": "active", "display_order": 9,
        "exams": [
            {"id": "clat", "name": "CLAT", "short": "CLAT"},
            {"id": "ailet", "name": "AILET", "short": "AILET"},
            {"id": "slat", "name": "SLAT", "short": "SLAT"},
            {"id": "lsat", "name": "LSAT", "short": "LSAT"},
            {"id": "mh-cet-law", "name": "MH CET Law", "short": "MH-CET"},
        ],
    },
    {
        "id": "cuet", "slug": "cuet", "name": "CUET & CET",
        "description": "CUET UG, CUET PG, BBA & College Entrance.",
        "icon": "book-outline", "color": "#C68A2D",
        "banner": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&q=80",
        "status": "active", "display_order": 10,
        "exams": [
            {"id": "cuet-ug", "name": "CUET UG", "short": "CUET UG"},
            {"id": "cuet-pg", "name": "CUET PG", "short": "CUET PG"},
            {"id": "bba-entrance", "name": "BBA Entrance", "short": "BBA"},
            {"id": "npat", "name": "NPAT", "short": "NPAT"},
            {"id": "set", "name": "SET", "short": "SET"},
            {"id": "christ-entrance", "name": "Christ Entrance", "short": "Christ"},
        ],
    },
    {
        "id": "upsc", "slug": "upsc", "name": "UPSC",
        "description": "IAS, IPS, IFS, CDS, CAPF & other UPSC exams.",
        "icon": "shield-checkmark-outline", "color": "#0B4DB8",
        "banner": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80",
        "status": "active", "display_order": 11,
        "exams": [
            {"id": "upsc", "name": "UPSC CSE", "short": "UPSC"},
            {"id": "cds", "name": "CDS", "short": "CDS"},
            {"id": "capf", "name": "CAPF", "short": "CAPF"},
            {"id": "nda", "name": "NDA", "short": "NDA"},
        ],
    },
    {
        "id": "state-exams", "slug": "state-exams", "name": "State Exams",
        "description": "WBCS, WBPSC, BPSC, MPPSC, Haryana PSC & more.",
        "icon": "map-outline", "color": "#C68A2D",
        "banner": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800&q=80",
        "status": "active", "display_order": 12,
        "exams": [
            {"id": "wbcs", "name": "WBCS", "short": "WBCS"},
            {"id": "wbpsc", "name": "WBPSC", "short": "WBPSC"},
            {"id": "bpsc", "name": "BPSC", "short": "BPSC"},
            {"id": "mppsc", "name": "MPPSC", "short": "MPPSC"},
            {"id": "haryana-psc", "name": "Haryana PSC", "short": "HPSC"},
            {"id": "food-si", "name": "Food SI", "short": "Food SI"},
        ],
    },
]


# ---------------- Models ----------------
class ExamCategoryIn(BaseModel):
    id: Optional[str] = None
    name: str
    slug: str
    description: Optional[str] = ""
    icon: Optional[str] = "ellipse-outline"
    color: Optional[str] = "#0B4DB8"
    banner: Optional[str] = ""
    status: Optional[str] = "active"
    display_order: Optional[int] = 0


class ExamIn(BaseModel):
    id: Optional[str] = None
    category_id: str
    name: str
    slug: Optional[str] = None
    description: Optional[str] = ""
    status: Optional[str] = "active"
    display_order: Optional[int] = 0


# ---------------- Seed ----------------
async def seed_categories(db):
    global _db
    _db = db
    now = datetime.now(timezone.utc)
    for cat in SEED_CATEGORIES:
        cat_doc = {
            "id": cat["id"], "slug": cat["slug"], "name": cat["name"],
            "description": cat["description"], "icon": cat["icon"], "color": cat["color"],
            "banner": cat["banner"], "status": cat["status"], "display_order": cat["display_order"],
            "updated_at": now,
        }
        await db.exam_categories.update_one(
            {"id": cat["id"]},
            {"$set": cat_doc, "$setOnInsert": {"created_at": now}},
            upsert=True,
        )
        for i, e in enumerate(cat["exams"]):
            slug = e["id"]
            exam_doc = {
                "id": e["id"], "category_id": cat["id"], "name": e["name"], "slug": slug,
                "short": e.get("short", e["name"]),
                "status": "active", "display_order": i + 1,
                "updated_at": now,
            }
            await db.exams.update_one(
                {"id": e["id"], "category_id": cat["id"]},
                {"$set": exam_doc, "$setOnInsert": {"created_at": now}},
                upsert=True,
            )
    await db.exam_categories.create_index("id", unique=True)
    await db.exam_categories.create_index("slug", unique=True)
    await db.exams.create_index([("category_id", 1), ("display_order", 1)])
    await db.exams.create_index("id", unique=True)


async def get_categories_list(active_only: bool = True) -> List[dict]:
    q = {"status": "active"} if active_only else {}
    cats = await _db.exam_categories.find(q, {"_id": 0}).sort("display_order", 1).to_list(200)
    for cat in cats:
        exams = await _db.exams.find(
            {"category_id": cat["id"], "status": "active"}, {"_id": 0}
        ).sort("display_order", 1).to_list(200)
        cat["exams"] = exams
    return cats


async def category_exists(category_id: str) -> bool:
    doc = await _db.exam_categories.find_one({"id": category_id, "status": "active"}, {"_id": 0, "id": 1})
    return doc is not None


# ---------------- Public router ----------------
public_router = APIRouter(prefix="/api", tags=["categories"])


@public_router.get("/exam-categories/active")
async def list_active_categories(search: Optional[str] = None):
    cats = await get_categories_list(active_only=True)
    if search:
        s = search.lower().strip()
        cats = [c for c in cats if s in c["name"].lower() or s in (c.get("slug", "").lower())
                or any(s in (e.get("name", "").lower()) for e in c.get("exams", []))]
    # Add a subtitle showing top 3 exams
    for c in cats:
        top = [e["name"] for e in c.get("exams", [])[:3]]
        c["subtitle"] = ", ".join(top) if top else ""
    return {"categories": cats}


@public_router.get("/exam-categories/all")
async def list_all_categories():
    cats = await get_categories_list(active_only=False)
    return {"categories": cats}


@public_router.get("/exam-categories/{cid}")
async def category_detail(cid: str):
    doc = await _db.exam_categories.find_one({"id": cid}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Category not found")
    exams = await _db.exams.find({"category_id": cid, "status": "active"}, {"_id": 0}).sort("display_order", 1).to_list(200)
    doc["exams"] = exams
    return doc


@public_router.get("/exams-by-category/{cid}")
async def exams_by_category(cid: str):
    exams = await _db.exams.find({"category_id": cid, "status": "active"}, {"_id": 0}).sort("display_order", 1).to_list(200)
    return {"exams": exams}


# ---------------- Admin router (no auth for MVP; add role gate before production) ----------------
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])


def _slugify(text: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


@admin_router.post("/categories")
async def create_category(body: ExamCategoryIn):
    now = datetime.now(timezone.utc)
    cat_id = body.id or _slugify(body.name)
    doc = body.model_dump(exclude_none=True)
    doc.update({"id": cat_id, "slug": body.slug or _slugify(body.name), "created_at": now, "updated_at": now})
    try:
        await _db.exam_categories.insert_one(doc)
    except Exception:
        raise HTTPException(409, "Category id/slug already exists")
    return {"message": "created", "category": {k: v for k, v in doc.items() if k != "_id"}}


@admin_router.put("/categories/{cid}")
async def update_category(cid: str, body: ExamCategoryIn):
    upd = body.model_dump(exclude_none=True, exclude={"id"})
    upd["updated_at"] = datetime.now(timezone.utc)
    r = await _db.exam_categories.update_one({"id": cid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Category not found")
    return {"message": "updated"}


@admin_router.delete("/categories/{cid}")
async def delete_category(cid: str):
    r = await _db.exam_categories.delete_one({"id": cid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Category not found")
    await _db.exams.delete_many({"category_id": cid})
    return {"message": "deleted"}


@admin_router.post("/exams")
async def create_exam(body: ExamIn):
    if not await category_exists(body.category_id):
        raise HTTPException(400, "Parent category not found or inactive")
    now = datetime.now(timezone.utc)
    ex_id = body.id or _slugify(body.name)
    doc = body.model_dump(exclude_none=True)
    doc.update({"id": ex_id, "slug": body.slug or _slugify(body.name), "created_at": now, "updated_at": now})
    try:
        await _db.exams.insert_one(doc)
    except Exception:
        raise HTTPException(409, "Exam id/slug already exists")
    return {"message": "created", "exam": {k: v for k, v in doc.items() if k != "_id"}}


@admin_router.put("/exams/{eid}")
async def update_exam(eid: str, body: ExamIn):
    upd = body.model_dump(exclude_none=True, exclude={"id"})
    upd["updated_at"] = datetime.now(timezone.utc)
    r = await _db.exams.update_one({"id": eid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "Exam not found")
    return {"message": "updated"}


@admin_router.delete("/exams/{eid}")
async def delete_exam(eid: str):
    r = await _db.exams.delete_one({"id": eid})
    if r.deleted_count == 0:
        raise HTTPException(404, "Exam not found")
    return {"message": "deleted"}
