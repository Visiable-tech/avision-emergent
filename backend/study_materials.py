"""
Study Materials module — Phase 4.

Handles PDF handouts, notes, formula sheets and PYQ collections tied to each
Live Course subject. Materials are auto-seeded from the course curriculum
and downloads are tracked per user.

Endpoints:
  GET  /api/study-materials/summary?course_id=  — grouped by subject (with counts)
  GET  /api/study-materials?course_id=&subject=&type=
  GET  /api/study-materials/{mid}               — fetches + increments download counter
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import get_current_user
from live_courses import COURSES


router = APIRouter(prefix="/api/study-materials", tags=["study-materials"])

_db: Optional[AsyncIOMotorDatabase] = None


def init_study_materials(db: AsyncIOMotorDatabase):
    global _db
    _db = db


async def ensure_study_materials_indexes(db):
    await db.lc_study_materials.create_index("id", unique=True)
    await db.lc_study_materials.create_index([("course_id", 1), ("subject", 1), ("type", 1)])
    await db.lc_material_downloads.create_index([("user_id", 1), ("material_id", 1)], unique=True)


# Type -> icon (client uses this key)
TYPE_META = {
    "pdf": {"label": "Class Notes", "icon": "document-text", "color": "#EF4444"},
    "handout": {"label": "Handout", "icon": "reader", "color": "#0B4DB8"},
    "formula": {"label": "Formula Sheet", "icon": "calculator", "color": "#7C3AED"},
    "pyq": {"label": "Previous Year Qs", "icon": "trophy", "color": "#F59E0B"},
    "practice": {"label": "Practice Sheet", "icon": "clipboard", "color": "#059669"},
    "revision": {"label": "Revision Notes", "icon": "sparkles", "color": "#DB2777"},
}


# Placeholder public PDFs (freely-hosted samples) — replace with real Avision-hosted
# PDFs when available. These are chosen for their small size so downloads/preview
# work reliably from any device.
SAMPLE_PDFS = [
    "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    "https://africau.edu/images/default/sample.pdf",
    "https://www.orimi.com/pdf-test.pdf",
]


async def _seed_materials_for_course(course: dict):
    """Idempotently seed materials for every subject × type combination."""
    if _db is None:
        return
    existing = await _db.lc_study_materials.count_documents({"course_id": course["id"]})
    curriculum = course.get("curriculum", [])
    expected = len(curriculum) * 4  # 4 material types per subject
    if existing >= expected:
        return
    now = datetime.now(timezone.utc).isoformat()
    docs = []
    for si, subj in enumerate(curriculum):
        topics = subj.get("topics", [])
        first_topic = topics[0] if topics else subj.get("subject")
        for ti, (tkey, tmeta) in enumerate(list(TYPE_META.items())[:4]):
            mat_id = f"mat-{course['id']}-{si}-{tkey}"
            existing_doc = await _db.lc_study_materials.find_one({"id": mat_id}, {"_id": 0})
            if existing_doc:
                continue
            docs.append({
                "id": mat_id,
                "course_id": course["id"],
                "subject": subj.get("subject"),
                "topic": first_topic,
                "title": f"{tmeta['label']} — {first_topic}",
                "type": tkey,
                "type_label": tmeta["label"],
                "icon": tmeta["icon"],
                "color": tmeta["color"],
                "url": SAMPLE_PDFS[(si + ti) % len(SAMPLE_PDFS)],
                "file_size_kb": 250 + ((si * 37 + ti * 13) % 900),
                "page_count": 8 + ((si * 5 + ti * 3) % 42),
                "language": course.get("language", "English"),
                "uploaded_at": now,
                "downloads_count": (si * 11 + ti * 7) % 350,
                "is_free_preview": ti == 0,   # first type is always previewable
            })
    if docs:
        try:
            await _db.lc_study_materials.insert_many(docs, ordered=False)
        except Exception:
            pass


async def seed_all_materials():
    for c in COURSES:
        if c.get("status") == "active":
            await _seed_materials_for_course(c)


async def _assert_enrolled(user_id: str, course_id: str):
    if _db is None:
        raise HTTPException(500, "Not initialised")
    e = await _db.lc_enrollments.find_one({"user_id": user_id, "course_id": course_id})
    if not e:
        raise HTTPException(403, "Not enrolled in this course")


@router.get("/summary")
async def summary(course_id: str, user=Depends(get_current_user)):
    """Return materials grouped by subject."""
    await _assert_enrolled(user["user_id"], course_id)
    course = next((c for c in COURSES if c["id"] == course_id), None)
    if course:
        await _seed_materials_for_course(course)
    cur = _db.lc_study_materials.find({"course_id": course_id}, {"_id": 0}).sort("subject", 1)
    items = await cur.to_list(500)
    # Group by subject
    grouped: dict[str, dict] = {}
    total_size_kb = 0
    for it in items:
        subj = it["subject"]
        if subj not in grouped:
            grouped[subj] = {"subject": subj, "materials": [], "count": 0, "size_kb": 0, "types": set()}
        grouped[subj]["materials"].append(it)
        grouped[subj]["count"] += 1
        grouped[subj]["size_kb"] += int(it.get("file_size_kb", 0))
        grouped[subj]["types"].add(it["type"])
        total_size_kb += int(it.get("file_size_kb", 0))
    for g in grouped.values():
        g["types"] = sorted(g["types"])
    # Include download counts per user for progress
    user_downloads = _db.lc_material_downloads.find({"user_id": user["user_id"]}, {"_id": 0, "material_id": 1})
    dl_ids = {d["material_id"] async for d in user_downloads}
    for g in grouped.values():
        g["downloaded_count"] = sum(1 for m in g["materials"] if m["id"] in dl_ids)
    return {
        "subjects": list(grouped.values()),
        "total_materials": len(items),
        "total_size_kb": total_size_kb,
        "downloaded_count": sum(1 for it in items if it["id"] in dl_ids),
    }


@router.get("")
async def list_materials(
    course_id: str,
    subject: Optional[str] = None,
    type: Optional[str] = None,
    user=Depends(get_current_user),
):
    await _assert_enrolled(user["user_id"], course_id)
    q: dict = {"course_id": course_id}
    if subject:
        q["subject"] = subject
    if type:
        q["type"] = type
    cur = _db.lc_study_materials.find(q, {"_id": 0}).sort("subject", 1)
    items = await cur.to_list(500)
    dl_ids = set()
    async for d in _db.lc_material_downloads.find({"user_id": user["user_id"]}, {"_id": 0, "material_id": 1}):
        dl_ids.add(d["material_id"])
    for it in items:
        it["is_downloaded"] = it["id"] in dl_ids
    return {"materials": items, "total": len(items)}


@router.get("/{mid}")
async def material_detail(mid: str, user=Depends(get_current_user)):
    if _db is None:
        raise HTTPException(500, "Not initialised")
    mat = await _db.lc_study_materials.find_one({"id": mid}, {"_id": 0})
    if not mat:
        raise HTTPException(404, "Material not found")
    await _assert_enrolled(user["user_id"], mat["course_id"])
    # Track download (idempotent per user)
    now = datetime.now(timezone.utc).isoformat()
    result = await _db.lc_material_downloads.update_one(
        {"user_id": user["user_id"], "material_id": mid},
        {"$set": {"last_opened_at": now}, "$setOnInsert": {"downloaded_at": now}},
        upsert=True,
    )
    if result.upserted_id:
        await _db.lc_study_materials.update_one({"id": mid}, {"$inc": {"downloads_count": 1}})
        mat["downloads_count"] = mat.get("downloads_count", 0) + 1
    mat["is_downloaded"] = True
    return mat
