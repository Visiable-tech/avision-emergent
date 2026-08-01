"""Videos & Reels: short educational/motivational reels."""
from typing import Optional
from fastapi import APIRouter, HTTPException


SEED_REELS = [
    {
        "id": "r1",
        "title": "Discipline over motivation – 3 min booster",
        "brand": "Avision Prep",
        "category_id": None,
        "duration_sec": 47,
        "views": 12500,
        "likes": 890,
        "thumbnail": "https://images.unsplash.com/photo-1541746972996-4e0b0f43e02a?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    },
    {
        "id": "r2",
        "title": "SSC GK – Mughal Empire in 60 seconds",
        "brand": "History Hacks",
        "category_id": "ssc",
        "duration_sec": 62,
        "views": 8320,
        "likes": 621,
        "thumbnail": "https://images.unsplash.com/photo-1533158326339-7f3cf2404354?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    },
    {
        "id": "r3",
        "title": "Banking PO – Simplify DI in 20 sec",
        "brand": "Quant Ninja",
        "category_id": "banking",
        "duration_sec": 38,
        "views": 15200,
        "likes": 1104,
        "thumbnail": "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    },
    {
        "id": "r4",
        "title": "UPSC Answer Writing – Framework",
        "brand": "Mains Booster",
        "category_id": "upsc",
        "duration_sec": 55,
        "views": 21400,
        "likes": 1980,
        "thumbnail": "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    },
    {
        "id": "r5",
        "title": "Railway RRB – Physics Shortcut",
        "brand": "STEM Sprint",
        "category_id": "railway",
        "duration_sec": 41,
        "views": 6890,
        "likes": 452,
        "thumbnail": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    },
    {
        "id": "r6",
        "title": "English Vocab Reel – 5 GRE-level words",
        "brand": "Word Lab",
        "category_id": None,
        "duration_sec": 50,
        "views": 9800,
        "likes": 715,
        "thumbnail": "https://images.unsplash.com/photo-1519791883288-dc8bd696e667?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    },
    {
        "id": "r7",
        "title": "Daily Current Affairs – 60 sec wrap",
        "brand": "Avision News",
        "category_id": None,
        "duration_sec": 60,
        "views": 34500,
        "likes": 2810,
        "thumbnail": "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80",
        "video_url": "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    },
]


def _filter_cat(items, cid: Optional[str]):
    if not cid:
        return items
    return [i for i in items if (i.get("category_id") is None) or i.get("category_id") == cid]


router = APIRouter(prefix="/api/reels", tags=["reels"])


@router.get("")
async def list_reels(category: Optional[str] = None, limit: int = 20):
    items = _filter_cat(SEED_REELS, category)[:limit]
    return {"reels": items}


@router.get("/{rid}")
async def reel_detail(rid: str):
    r = next((x for x in SEED_REELS if x["id"] == rid), None)
    if not r:
        raise HTTPException(404, "Reel not found")
    return r
