"""Feed module: image posts + likes + comments."""
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, Field
import uuid

_db = None


def init_feed(db):
    global _db
    _db = db


SEED_POSTS = [
    {
        "id": "fp1", "category_id": None, "type": "motivation",
        "title": "Consistency beats intensity",
        "description": "Study smart every day. 3 focused hours daily > 12 hours once a week. Trust the process, embrace the grind. Your dream job is closer than you think.",
        "image": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80",
        "tags": ["motivation", "consistency"],
        "admin_name": "Team Avision", "admin_avatar": "A",
        "publish_date": "May 8, 2026",
    },
    {
        "id": "fp2", "category_id": "banking", "type": "tip",
        "title": "IBPS PO – Quant Sectional Strategy",
        "description": "Start with DI (14 mins), then Arithmetic (10 mins), then Data Sufficiency (7 mins), finish with Approximation & Number Series (4 mins). Skip anything above 45 seconds/question and revisit at end.",
        "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80",
        "tags": ["ibps-po", "quant", "strategy"],
        "admin_name": "Rohan Verma", "admin_avatar": "R",
        "publish_date": "May 7, 2026",
    },
    {
        "id": "fp3", "category_id": "ssc", "type": "infographic",
        "title": "SSC CGL 2026 – Complete Exam Pattern",
        "description": "Tier 1 (Objective, 60 min, 200 marks) → Tier 2 (Objective + Descriptive, 2hr 15min) → Tier 3 (Skill Test) → DV. Save & share!",
        "image": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=800&q=80",
        "tags": ["ssc-cgl", "pattern", "infographic"],
        "admin_name": "SSC Team", "admin_avatar": "S",
        "publish_date": "May 6, 2026",
    },
    {
        "id": "fp4", "category_id": None, "type": "current-affairs",
        "title": "RBI keeps repo rate at 6.25% – 3rd consecutive hold",
        "description": "Monetary Policy Committee decision on May 7, 2026. Reverse repo unchanged. Inflation forecast 4.5% for FY27. GDP growth projection 7.2%.",
        "image": "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800&q=80",
        "tags": ["rbi", "monetary-policy", "current-affairs"],
        "admin_name": "Avision News", "admin_avatar": "N",
        "publish_date": "May 7, 2026",
    },
    {
        "id": "fp5", "category_id": "upsc", "type": "tip",
        "title": "UPSC Mains – Answer Writing Framework",
        "description": "1. Introduce with a definition/quote/data (2 lines). 2. Body with 3 dimensions + diagrams. 3. Conclusion with a way-forward. Keep to word limit strictly.",
        "image": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&q=80",
        "tags": ["upsc", "mains", "answer-writing"],
        "admin_name": "Dr. Anjali Rao", "admin_avatar": "A",
        "publish_date": "May 5, 2026",
    },
    {
        "id": "fp6", "category_id": None, "type": "notice",
        "title": "New Feature – AI Study Planner is Live",
        "description": "Get a fully personalized weekly plan powered by Claude Sonnet 4.5. Just pick your exam, hours per day, and target date. Try it now from Profile → AI Study Planner.",
        "image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&q=80",
        "tags": ["feature", "ai-planner"],
        "admin_name": "Team Avision", "admin_avatar": "A",
        "publish_date": "May 4, 2026",
    },
]


class CreateCommentIn(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    parent_id: Optional[str] = None


def _filter_cat(items, cid):
    if not cid:
        return items
    return [i for i in items if (i.get("category_id") is None) or i.get("category_id") == cid]


async def _like_count(post_id: str) -> int:
    return await _db.feed_likes.count_documents({"post_id": post_id})


async def _comment_count(post_id: str) -> int:
    return await _db.feed_comments.count_documents({"post_id": post_id})


async def _liked_by(post_id: str, user_id: Optional[str]) -> bool:
    if not user_id:
        return False
    d = await _db.feed_likes.find_one({"post_id": post_id, "user_id": user_id}, {"_id": 0})
    return bool(d)


router = APIRouter(prefix="/api/feed", tags=["feed"])


@router.get("")
async def list_posts(category: Optional[str] = None, user_id: Optional[str] = None, limit: int = 30):
    posts = _filter_cat(SEED_POSTS, category)[:limit]
    result = []
    for p in posts:
        result.append({
            **p,
            "likes": await _like_count(p["id"]),
            "comments": await _comment_count(p["id"]),
            "liked": await _liked_by(p["id"], user_id),
        })
    return {"posts": result}


@router.get("/{post_id}")
async def post_detail(post_id: str, user_id: Optional[str] = None):
    p = next((x for x in SEED_POSTS if x["id"] == post_id), None)
    if not p:
        raise HTTPException(404, "Post not found")
    return {
        **p,
        "likes": await _like_count(post_id),
        "comments": await _comment_count(post_id),
        "liked": await _liked_by(post_id, user_id),
    }


@router.post("/{post_id}/like")
async def toggle_like(post_id: str, user_id: str):
    exists = await _db.feed_likes.find_one({"post_id": post_id, "user_id": user_id}, {"_id": 0})
    if exists:
        await _db.feed_likes.delete_one({"post_id": post_id, "user_id": user_id})
        liked = False
    else:
        await _db.feed_likes.insert_one({
            "id": str(uuid.uuid4()), "post_id": post_id, "user_id": user_id,
            "created_at": datetime.now(timezone.utc),
        })
        liked = True
    return {"liked": liked, "likes": await _like_count(post_id)}


@router.get("/{post_id}/comments")
async def list_comments(post_id: str):
    docs = await _db.feed_comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).to_list(200)
    return {"comments": docs}


@router.post("/{post_id}/comments")
async def add_comment(post_id: str, body: CreateCommentIn, user_id: str, user_name: Optional[str] = "Student"):
    doc = {
        "id": str(uuid.uuid4()), "post_id": post_id, "user_id": user_id,
        "user_name": user_name or "Student", "text": body.text,
        "parent_id": body.parent_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await _db.feed_comments.insert_one(dict(doc))
    return doc


@router.delete("/{post_id}/comments/{cid}")
async def delete_comment(post_id: str, cid: str, user_id: str):
    r = await _db.feed_comments.delete_one({"id": cid, "post_id": post_id, "user_id": user_id})
    if r.deleted_count == 0:
        raise HTTPException(404, "Comment not found or not yours")
    return {"message": "deleted"}


async def ensure_feed_indexes(db):
    await db.feed_likes.create_index([("post_id", 1), ("user_id", 1)], unique=True)
    await db.feed_comments.create_index([("post_id", 1), ("created_at", -1)])
