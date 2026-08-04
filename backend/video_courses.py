"""
Video Courses module — Phase 1 (Discovery / Purchase).

Video-on-demand recorded courses. Similar structure to Live Courses but
without live sessions — pure video library with chapter-wise organization.

Endpoints:
  GET  /api/video-courses                     — catalog (filter by category)
  GET  /api/video-courses/categories          — top exam categories with counts
  GET  /api/video-courses/{cid}               — course detail (sales) + curriculum
  POST /api/video-courses/{cid}/pay/order     — Razorpay order
  POST /api/video-courses/{cid}/pay/verify    — verify + create enrollment
  POST /api/video-courses/{cid}/enroll/free   — DEV helper (no payment)
  POST /api/video-courses/coupons/validate    — validate + return discount %
  GET  /api/video-courses/enrollments/mine    — my enrolled video courses
  GET  /api/video-courses/continue-learning   — last-watched course (for banner)
"""
from __future__ import annotations

import hashlib
import hmac
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

try:
    import razorpay as _razorpay
except Exception:
    _razorpay = None

from auth import get_current_user, get_optional_user
try:
    import foundation as _foundation
except Exception:  # pragma: no cover
    _foundation = None


router = APIRouter(prefix="/api/video-courses", tags=["video-courses"])
_db: Optional[AsyncIOMotorDatabase] = None


def init_video_courses(db: AsyncIOMotorDatabase):
    global _db
    _db = db


async def ensure_video_courses_indexes(db):
    await db.vc_enrollments.create_index([("user_id", 1), ("course_id", 1)], unique=True)
    await db.vc_orders.create_index("order_id", unique=True)
    await db.vc_coupons.create_index("code", unique=True)
    await db.vc_progress.create_index(
        [("user_id", 1), ("course_id", 1), ("lecture_id", 1)], unique=True
    )
    await db.vc_progress.create_index([("user_id", 1), ("course_id", 1), ("last_watched_at", -1)])


# --------------------- SEED DATA ---------------------------

CATEGORIES = [
    {"id": "banking", "name": "Banking", "icon": "cash", "color": "#0B4DB8", "banner": "Banking Complete Video Courses", "banner_sub": "Prepare for IBPS PO, SBI PO, RRB, RBI & Other Banking Exams"},
    {"id": "ssc", "name": "SSC", "icon": "school", "color": "#7C3AED", "banner": "SSC Complete Video Courses", "banner_sub": "Prepare for SSC CGL, CHSL, MTS, CPO & other SSC exams"},
    {"id": "railway", "name": "Railway", "icon": "train", "color": "#059669", "banner": "Railway Video Courses", "banner_sub": "RRB NTPC, Group D, JE & other Railway exams"},
    {"id": "insurance", "name": "Insurance", "icon": "shield-checkmark", "color": "#F59E0B", "banner": "Insurance Exam Courses", "banner_sub": "LIC AAO, NIACL, UIIC & other Insurance exams"},
    {"id": "clat", "name": "CLAT", "icon": "hammer", "color": "#EF4444", "banner": "CLAT Video Courses", "banner_sub": "Common Law Admission Test preparation"},
    {"id": "ipm", "name": "IPM", "icon": "trending-up", "color": "#0891B2", "banner": "IPM Video Courses", "banner_sub": "IIM Indore Integrated Programme in Management"},
]


def _mkc(id_, name, category_id, exam_name, banner, faculty_urls, sub_count, video_count, price, offer_price, months, ratings, students):
    disc = int(round((price - offer_price) / price * 100)) if price and offer_price and price > offer_price else 0
    return {
        "id": id_,
        "name": name,
        "category_id": category_id,
        "exam_name": exam_name,
        "banner_image": banner,
        "gradient": ["#083A8E", "#0B4DB8"],
        "faculty_images": faculty_urls,
        "subject_count": sub_count,
        "video_count": video_count,
        "practice_qs_count": {"banking": 15000, "ssc": 20000, "railway": 12000, "insurance": 10000, "clat": 8000, "ipm": 5000}.get(category_id, 10000),
        "price": price,
        "offer_price": offer_price,
        "discount_pct": disc,
        "validity_months": months,
        "language": "Hindi + English",
        "rating": ratings,
        "students": students,
        "features": [
            {"icon": "play-circle", "label": f"{video_count}+", "sub": "HD Videos"},
            {"icon": "help-circle", "label": "15,000+", "sub": "Practice Qs"},
            {"icon": "document-text", "label": "Notes", "sub": "Study Material"},
            {"icon": "trophy", "label": "Full Length", "sub": "Tests"},
            {"icon": "newspaper", "label": "PYQ", "sub": "Papers"},
            {"icon": "flame", "label": "Daily", "sub": "Current Affairs"},
            {"icon": "reader", "label": "Digital", "sub": "Notes"},
            {"icon": "school", "label": "Exam", "sub": "Strategy"},
        ],
        "curriculum": _seed_curriculum(category_id),
        "status": "active",
    }


def _seed_curriculum(category_id: str):
    """Return a list of subjects with chapter tree."""
    if category_id in ("banking", "insurance"):
        return [
            _mk_subject("Quantitative Aptitude", "quant", 120, 86, [
                _mk_chapter("Number System", 12, [
                    ("Introduction to Number System", "12:35", True),
                    ("Types of Numbers", "16:20", False),
                    ("Divisibility Rules", "20:10", False),
                    ("Important Questions", "17:30", False),
                    ("Practice Set 1", "22:00", False),
                    ("Practice Set 2", "18:45", False),
                ]),
                _mk_chapter("Simplification", 10, [
                    ("BODMAS Rules", "15:30", False),
                    ("Approximation Techniques", "18:20", False),
                    ("Speed Calculations", "20:10", False),
                ]),
                _mk_chapter("Percentage", 8, []),
                _mk_chapter("Profit & Loss", 8, []),
                _mk_chapter("Ratio & Proportion", 8, []),
                _mk_chapter("Average", 6, []),
            ]),
            _mk_subject("Reasoning", "reasoning", 110, 78, [
                _mk_chapter("Syllogism", 10, []),
                _mk_chapter("Puzzles & Seating", 15, []),
                _mk_chapter("Inequality", 8, []),
            ]),
            _mk_subject("English", "english", 100, 72, [
                _mk_chapter("Grammar Basics", 12, []),
                _mk_chapter("Reading Comprehension", 10, []),
                _mk_chapter("Vocabulary", 8, []),
            ]),
            _mk_subject("General Awareness", "ga", 150, 90, [
                _mk_chapter("Banking Awareness", 20, []),
                _mk_chapter("Current Affairs", 40, []),
                _mk_chapter("Static GK", 15, []),
            ]),
            _mk_subject("Computer", "computer", 60, 45, [
                _mk_chapter("Computer Fundamentals", 8, []),
                _mk_chapter("MS Office", 10, []),
                _mk_chapter("Internet Basics", 6, []),
            ]),
        ]
    else:
        return [
            _mk_subject("Quantitative Aptitude", "quant", 100, 75, [
                _mk_chapter("Arithmetic", 15, [
                    ("Introduction", "12:35", True),
                    ("Percentages", "20:00", False),
                ]),
                _mk_chapter("Algebra", 10, []),
                _mk_chapter("Geometry", 8, []),
            ]),
            _mk_subject("Reasoning", "reasoning", 90, 68, [
                _mk_chapter("Verbal Reasoning", 10, []),
                _mk_chapter("Non-Verbal", 8, []),
            ]),
            _mk_subject("English", "english", 80, 60, [
                _mk_chapter("Grammar", 10, []),
                _mk_chapter("Comprehension", 8, []),
            ]),
            _mk_subject("General Studies", "gs", 120, 85, [
                _mk_chapter("History", 15, []),
                _mk_chapter("Geography", 12, []),
                _mk_chapter("Polity", 10, []),
            ]),
        ]


def _mk_subject(name, key, chapters_count, hours, chapters):
    return {
        "subject": name,
        "key": key,
        "total_chapters": chapters_count,
        "total_hours": hours,
        "total_videos": sum(c.get("video_count", 0) for c in chapters) or (chapters_count * 8),
        "chapters": chapters,
    }


# Public MP4 test streams — Google's official sample bucket. Rotated per lecture index.
_SAMPLE_VIDEOS = [
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerMeltdowns.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutbackOnStreetAndDirt.mp4",
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
]

_LECTURE_POSTER = "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"


def _slug(txt: str) -> str:
    return (
        txt.lower()
        .replace(" ", "-").replace("&", "and").replace(",", "").replace("'", "")
        .replace("(", "").replace(")", "").replace(".", "").replace("/", "-")
    )


def _mk_chapter(name, video_count, lectures):
    """Chapter with lectures. If lectures list empty, auto-generate placeholder
    lectures so every chapter has playable content."""
    ch_id = f"ch-{_slug(name)}"
    if not lectures and video_count > 0:
        cap = min(int(video_count), 6)
        lectures = []
        for i in range(cap):
            title_variants = [
                f"{name} — Introduction",
                f"{name} — Concept Basics",
                f"{name} — Solved Examples",
                f"{name} — Practice Set",
                f"{name} — Advanced Problems",
                f"{name} — Speed Tricks",
            ]
            title = title_variants[i] if i < len(title_variants) else f"{name} — Class {i + 1}"
            duration = f"{12 + (i * 3) % 20}:{(i * 17) % 60:02d}"
            lectures.append((title, duration, i == 0))
    return {
        "id": ch_id,
        "name": name,
        "video_count": video_count,
        "lectures": [
            {
                "id": f"{ch_id}--lec-{i}",
                "title": t,
                "duration": d,
                "is_free": free,
                # Rotate video URLs so every lecture is playable
                "video_url": _SAMPLE_VIDEOS[(hash(ch_id) + i) % len(_SAMPLE_VIDEOS)],
                "poster": _LECTURE_POSTER,
            }
            for i, (t, d, free) in enumerate(lectures)
        ],
    }


COURSES = [
    _mkc("vc-banking-2026", "Banking Complete Video Course 2026", "banking",
         "For IBPS PO | Clerk | SBI | RRB | RBI",
         "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80",
             "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
             "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80",
         ],
         5, 600, 4999, 1499, 12, 4.8, 5000),
    _mkc("vc-ibps-po-2026", "IBPS PO Complete Video Course 2026", "banking",
         "For IBPS PO Prelims + Mains",
         "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80",
             "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
             "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80",
         ],
         4, 450, 4999, 1999, 12, 4.7, 3000),
    _mkc("vc-sbi-po-2026", "SBI PO Complete Video Course 2026", "banking",
         "For SBI PO Prelims + Mains",
         "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
             "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
             "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
         ],
         4, 400, 3999, 1199, 12, 4.7, 2500),
    _mkc("vc-ssc-cgl-2026", "SSC CGL Complete Video Course", "ssc",
         "For SSC CGL Tier 1 + Tier 2",
         "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80",
             "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
         ],
         5, 550, 3999, 1799, 12, 4.7, 4200),
    _mkc("vc-rrb-ntpc-2026", "RRB NTPC Complete Video Course", "railway",
         "For RRB NTPC CBT 1 + CBT 2",
         "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&q=80",
             "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80",
         ],
         4, 400, 2999, 999, 12, 4.6, 3100),
    _mkc("vc-lic-aao-2026", "LIC AAO Complete Video Course", "insurance",
         "For LIC AAO Prelims + Mains",
         "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&q=80",
             "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&q=80",
         ],
         5, 480, 3999, 1499, 12, 4.7, 2200),
    _mkc("vc-clat-2026", "CLAT Complete Video Course", "clat",
         "For CLAT UG entrance",
         "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&q=80",
         ],
         5, 320, 4999, 2499, 12, 4.6, 1500),
    _mkc("vc-ipm-2026", "IPM IIM Indore Video Course", "ipm",
         "For IIM Indore IPM entrance",
         "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
         [
             "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80",
         ],
         4, 280, 5999, 2999, 12, 4.7, 800),
]


COUPONS = [
    {"code": "AVISION25", "discount_pct": 25, "max_discount_inr": 1000, "expires_at": None, "active": True, "desc": "Extra 25% off (max ₹1000)"},
    {"code": "FIRST50", "discount_pct": 50, "max_discount_inr": 500, "expires_at": None, "active": True, "desc": "First-time users • 50% off (max ₹500)"},
    {"code": "STUDENT15", "discount_pct": 15, "max_discount_inr": 300, "expires_at": None, "active": True, "desc": "Students-only 15% off"},
]


# --------------------- HELPERS ---------------------------

def _summary(c: dict) -> dict:
    return {
        "id": c["id"], "name": c["name"], "category_id": c["category_id"], "exam_name": c["exam_name"],
        "banner_image": c["banner_image"], "gradient": c.get("gradient"),
        "faculty_images": c.get("faculty_images", []),
        "video_count": c.get("video_count"),
        "practice_qs_count": c.get("practice_qs_count"),
        "subject_count": c.get("subject_count"),
        "price": c["price"], "offer_price": c["offer_price"], "discount_pct": c["discount_pct"],
        "language": c["language"], "rating": c["rating"], "students": c["students"],
        "validity_months": c.get("validity_months"),
    }


# --------------------- ROUTES ---------------------------

@router.get("/categories")
async def list_categories():
    counts = {c["id"]: 0 for c in CATEGORIES}
    for co in COURSES:
        if co["category_id"] in counts:
            counts[co["category_id"]] += 1
    return {"categories": [{**c, "count": counts.get(c["id"], 0)} for c in CATEGORIES]}


@router.get("")
async def list_courses(category: Optional[str] = None, sort: Optional[str] = None):
    src = [c for c in COURSES if c.get("status") == "active"]
    if category:
        src = [c for c in src if c.get("category_id") == category]
    if sort == "price_low":
        src = sorted(src, key=lambda x: x["offer_price"])
    elif sort == "price_high":
        src = sorted(src, key=lambda x: -x["offer_price"])
    elif sort == "rating":
        src = sorted(src, key=lambda x: -x.get("rating", 0))
    elif sort == "popularity":
        src = sorted(src, key=lambda x: -x.get("students", 0))
    # Banner data per category
    category_meta = next((c for c in CATEGORIES if c["id"] == category), None) if category else None
    return {
        "courses": [_summary(c) for c in src],
        "total": len(src),
        "category": category_meta,
    }


@router.get("/continue-learning")
async def continue_learning(user=Depends(get_current_user)):
    if _db is None:
        return {"enrollment": None}
    e = await _db.vc_enrollments.find_one(
        {"user_id": user["user_id"]}, {"_id": 0}, sort=[("last_activity_at", -1)]
    )
    if not e:
        e = await _db.vc_enrollments.find_one({"user_id": user["user_id"]}, {"_id": 0}, sort=[("enrolled_at", -1)])
    if not e:
        return {"enrollment": None}
    course = next((c for c in COURSES if c["id"] == e.get("course_id")), None)
    return {"enrollment": e, "course": _summary(course) if course else None}


@router.get("/enrollments/mine")
async def my_enrollments(user=Depends(get_current_user)):
    if _db is None:
        return {"enrollments": []}
    docs = await _db.vc_enrollments.find({"user_id": user["user_id"]}, {"_id": 0}).sort("enrolled_at", -1).to_list(50)
    for d in docs:
        c = next((x for x in COURSES if x["id"] == d.get("course_id")), None)
        d["course"] = _summary(c) if c else None
    return {"enrollments": docs}


@router.get("/{cid}")
async def course_detail(cid: str, user=Depends(get_optional_user)):
    c = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not c:
        raise HTTPException(404, "Course not found")
    detail = {**c}
    if user and _db is not None:
        e = await _db.vc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
        detail["is_enrolled"] = bool(e)
    else:
        detail["is_enrolled"] = False
    return detail


# ------------------ Coupons ------------------

@router.post("/coupons/validate")
async def validate_coupon(body: dict, user=Depends(get_current_user)):
    code = (body.get("code") or "").strip().upper()
    price = int(body.get("price", 0))
    if not code:
        raise HTTPException(400, "Coupon code required")
    coupon = next((c for c in COUPONS if c["code"] == code and c["active"]), None)
    if not coupon:
        raise HTTPException(404, "Invalid coupon")
    disc = int((price * coupon["discount_pct"]) / 100)
    if coupon.get("max_discount_inr"):
        disc = min(disc, coupon["max_discount_inr"])
    return {
        "code": code,
        "discount_pct": coupon["discount_pct"],
        "discount_inr": disc,
        "final_price": max(0, price - disc),
        "desc": coupon.get("desc"),
    }


# ------------------ Razorpay ------------------

_RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "")
_RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "")
_rzp_client = None


def _get_rzp():
    global _rzp_client, _RZP_KEY_ID, _RZP_KEY_SECRET
    if _rzp_client is not None:
        return _rzp_client
    _RZP_KEY_ID = os.environ.get("RAZORPAY_KEY_ID", "") or _RZP_KEY_ID
    _RZP_KEY_SECRET = os.environ.get("RAZORPAY_KEY_SECRET", "") or _RZP_KEY_SECRET
    if _razorpay and _RZP_KEY_ID and _RZP_KEY_SECRET:
        _rzp_client = _razorpay.Client(auth=(_RZP_KEY_ID, _RZP_KEY_SECRET))
    return _rzp_client


@router.get("/pay/config")
async def pay_config():
    client = _get_rzp()
    return {"key_id": _RZP_KEY_ID, "enabled": bool(client)}


@router.post("/{cid}/pay/order")
async def create_order(cid: str, body: dict = None, user=Depends(get_current_user)):
    body = body or {}
    course = next((c for c in COURSES if c["id"] == cid and c.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    existing = await _db.vc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
    if existing:
        raise HTTPException(400, "Already enrolled")
    client = _get_rzp()
    if not client:
        raise HTTPException(503, "Payment gateway not configured")

    # Apply coupon if provided
    final_price = int(course["offer_price"])
    coupon_code = (body.get("coupon_code") or "").strip().upper()
    discount_inr = 0
    if coupon_code:
        coupon = next((c for c in COUPONS if c["code"] == coupon_code and c["active"]), None)
        if coupon:
            discount_inr = min(int((final_price * coupon["discount_pct"]) / 100),
                               coupon.get("max_discount_inr") or 999999)
            final_price = max(0, final_price - discount_inr)

    amount_paise = final_price * 100
    receipt = f"vc_{cid[:12]}_{uuid.uuid4().hex[:8]}"
    order = client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {"user_id": user["user_id"], "course_id": cid, "type": "video_course", "coupon": coupon_code},
    })
    await _db.vc_orders.insert_one({
        "order_id": order["id"], "user_id": user["user_id"], "course_id": cid,
        "amount_paise": amount_paise, "final_price": final_price,
        "coupon_code": coupon_code, "discount_inr": discount_inr,
        "status": "created", "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {
        "key_id": _RZP_KEY_ID, "order_id": order["id"], "amount": amount_paise,
        "currency": "INR", "final_price": final_price, "discount_inr": discount_inr,
        "course": _summary(course), "receipt": receipt,
    }


@router.post("/{cid}/pay/verify")
async def verify_payment(cid: str, body: dict, user=Depends(get_current_user)):
    course = next((c for c in COURSES if c["id"] == cid), None)
    if not course:
        raise HTTPException(404, "Course not found")
    order_id = body.get("razorpay_order_id")
    payment_id = body.get("razorpay_payment_id")
    signature = body.get("razorpay_signature")
    if not (order_id and payment_id and signature):
        raise HTTPException(400, "Missing payment fields")
    stored = await _db.vc_orders.find_one({"order_id": order_id, "user_id": user["user_id"]})
    if not stored:
        raise HTTPException(404, "Unknown order")
    message = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(_RZP_KEY_SECRET.encode(), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid signature")
    await _db.vc_orders.update_one({"order_id": order_id}, {"$set": {
        "status": "paid", "payment_id": payment_id, "paid_at": datetime.now(timezone.utc).isoformat(),
    }})
    return await _create_enrollment(user, course, stored.get("final_price"), stored.get("discount_inr"), order_id, payment_id)


@router.post("/{cid}/enroll/free")
async def enroll_free(cid: str, user=Depends(get_current_user)):
    """DEV-only free enroll for demo purposes."""
    course = next((c for c in COURSES if c["id"] == cid and c.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    existing = await _db.vc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
    if existing:
        existing.pop("_id", None)
        return {"enrollment": existing}
    return await _create_enrollment(user, course, 0, 0, None, None, note="free_demo")


async def _create_enrollment(user, course, final_price, discount_inr, order_id, payment_id, note=""):
    now = datetime.now(timezone.utc)
    validity_days = int(course.get("validity_months", 12)) * 30
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "course_id": course["id"],
        "course_name": course["name"],
        "enrolled_at": now.isoformat(),
        "expires_at": (now + timedelta(days=validity_days)).isoformat(),
        "amount_paid_paise": int(final_price or 0) * 100,
        "discount_inr": int(discount_inr or 0),
        "order_id": order_id,
        "payment_id": payment_id,
        "status": "active",
        "progress_pct": 0,
        "videos_watched": 0,
        "questions_practiced": 0,
        "tests_attempted": 0,
        "watch_time_hours": 0,
        "streak_days": 0,
        "last_activity_at": now.isoformat(),
        "note": note,
    }
    await _db.vc_enrollments.insert_one(doc)
    doc.pop("_id", None)

    # ---- AVISION ONE unified entitlement grant ----
    if _foundation is not None:
        try:
            await _foundation.grant_entitlement(
                user_id=user["user_id"], product_id=course["id"],
                source="online" if order_id else "free_demo",
                amount_inr=int(final_price or 0),
                method="razorpay" if order_id else "free",
                gateway_order_id=order_id, gateway_payment_id=payment_id,
                note=note or "vc_create_enrollment",
                validity_days_override=validity_days,
                channel="online",
            )
        except Exception as e:  # pragma: no cover
            print("vc._create_enrollment grant_entitlement:", e)
    return {"verified": bool(order_id), "enrollment": doc}


async def _get_enrollment_or_403(user, cid):
    enr = await _db.vc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid}, {"_id": 0})
    if enr:
        return enr
    # Fallback to unified entitlement (e.g. admin manual enroll / bundle unlock)
    if _foundation is not None:
        try:
            ok = await _foundation.has_access(user["user_id"], cid)
        except Exception:
            ok = False
        if ok:
            course = next((x for x in COURSES if x["id"] == cid), None)
            if course:
                validity_days = int(course.get("validity_months", 12)) * 30
                now = datetime.now(timezone.utc)
                synth = {
                    "id": str(uuid.uuid4()),
                    "user_id": user["user_id"], "course_id": cid,
                    "course_name": course.get("name"),
                    "enrolled_at": now.isoformat(),
                    "expires_at": (now + timedelta(days=validity_days)).isoformat(),
                    "amount_paid_paise": 0, "order_id": None, "payment_id": None,
                    "status": "active", "progress_pct": 0, "videos_watched": 0,
                    "questions_practiced": 0, "tests_attempted": 0,
                    "watch_time_hours": 0, "streak_days": 0,
                    "last_activity_at": now.isoformat(), "note": "entitlement_synth",
                }
                await _db.vc_enrollments.update_one(
                    {"user_id": user["user_id"], "course_id": cid},
                    {"$setOnInsert": synth},
                    upsert=True,
                )
                return synth
    raise HTTPException(403, "Not enrolled in this course")


# =========================================================================
# PROGRESS + ANALYTICS  (Phase 2 & 3)
# =========================================================================

def _flatten_lectures(course: dict) -> list[dict]:
    """Return a flat list of every lecture with subject/chapter linkage."""
    out = []
    for sub in course.get("curriculum", []) or []:
        for ch in sub.get("chapters", []) or []:
            for lec in ch.get("lectures", []) or []:
                out.append({
                    "subject": sub.get("subject"),
                    "subject_key": sub.get("key"),
                    "chapter_id": ch.get("id"),
                    "chapter_name": ch.get("name"),
                    "lecture_id": lec.get("id"),
                    "title": lec.get("title"),
                    "duration": lec.get("duration"),
                    "duration_sec": _duration_to_sec(lec.get("duration")),
                    "video_url": lec.get("video_url"),
                    "poster": lec.get("poster"),
                    "is_free": bool(lec.get("is_free")),
                })
    return out


def _duration_to_sec(dur: str) -> int:
    """`12:35` -> 755"""
    if not dur:
        return 0
    try:
        parts = [int(x) for x in dur.split(":")]
        if len(parts) == 2:
            return parts[0] * 60 + parts[1]
        if len(parts) == 3:
            return parts[0] * 3600 + parts[1] * 60 + parts[2]
    except Exception:
        pass
    return 0


async def _recompute_enrollment_stats(user_id: str, course: dict):
    """Rebuild aggregate fields on the enrollment doc from vc_progress."""
    cid = course["id"]
    lecs = _flatten_lectures(course)
    total_lecs = len(lecs) or 1
    total_sec = sum(l.get("duration_sec", 0) for l in lecs) or 1

    cur = _db.vc_progress.find({"user_id": user_id, "course_id": cid}, {"_id": 0})
    watched_completed = 0
    watch_seconds_total = 0
    lecture_pct_sum = 0
    last_activity = None
    async for p in cur:
        wsec = int(p.get("watch_seconds") or 0)
        wpct = min(100, int(p.get("watched_pct") or 0))
        watch_seconds_total += wsec
        lecture_pct_sum += wpct
        if p.get("completed"):
            watched_completed += 1
        lw = p.get("last_watched_at")
        if lw and (not last_activity or lw > last_activity):
            last_activity = lw

    # Weighted course progress = avg watched_pct across all lectures
    progress_pct = int(round(lecture_pct_sum / total_lecs)) if total_lecs else 0
    watch_time_hours = round(watch_seconds_total / 3600.0, 2)

    now_iso = datetime.now(timezone.utc).isoformat()
    await _db.vc_enrollments.update_one(
        {"user_id": user_id, "course_id": cid},
        {"$set": {
            "progress_pct": min(100, progress_pct),
            "videos_watched": watched_completed,
            "watch_time_hours": watch_time_hours,
            "last_activity_at": last_activity or now_iso,
        }},
    )


@router.post("/{cid}/progress")
async def upsert_progress(cid: str, body: dict, user=Depends(get_current_user)):
    course = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    await _get_enrollment_or_403(user, cid)

    lecture_id = (body.get("lecture_id") or "").strip()
    if not lecture_id:
        raise HTTPException(400, "lecture_id required")

    # Find the lecture in this course to attach subject/chapter linkage
    lecs = _flatten_lectures(course)
    lec = next((l for l in lecs if l["lecture_id"] == lecture_id), None)
    if not lec:
        raise HTTPException(404, "Lecture not found in course")

    watched_pct = body.get("watched_pct")
    last_pos = body.get("last_pos_seconds")
    watch_delta = int(body.get("watch_seconds_delta") or 0)
    completed = body.get("completed")

    now_iso = datetime.now(timezone.utc).isoformat()
    existing = await _db.vc_progress.find_one(
        {"user_id": user["user_id"], "course_id": cid, "lecture_id": lecture_id},
        {"_id": 0},
    )
    if existing:
        set_fields = {"last_watched_at": now_iso}
        if watched_pct is not None:
            set_fields["watched_pct"] = max(int(watched_pct), int(existing.get("watched_pct") or 0))
        if last_pos is not None:
            set_fields["last_pos_seconds"] = int(last_pos)
        if completed is not None:
            set_fields["completed"] = bool(completed) or bool(existing.get("completed"))
            if set_fields["completed"]:
                set_fields["watched_pct"] = 100
        inc = {"watch_seconds": max(0, watch_delta)}
        await _db.vc_progress.update_one(
            {"user_id": user["user_id"], "course_id": cid, "lecture_id": lecture_id},
            {"$set": set_fields, "$inc": inc},
        )
    else:
        doc = {
            "id": str(uuid.uuid4()),
            "user_id": user["user_id"],
            "course_id": cid,
            "lecture_id": lecture_id,
            "subject_key": lec["subject_key"],
            "chapter_id": lec["chapter_id"],
            "watched_pct": int(watched_pct or 0),
            "last_pos_seconds": int(last_pos or 0),
            "watch_seconds": max(0, watch_delta),
            "completed": bool(completed) or int(watched_pct or 0) >= 100,
            "first_watched_at": now_iso,
            "last_watched_at": now_iso,
        }
        if doc["completed"]:
            doc["watched_pct"] = 100
        await _db.vc_progress.insert_one(doc)

    await _recompute_enrollment_stats(user["user_id"], course)
    enr = await _db.vc_enrollments.find_one(
        {"user_id": user["user_id"], "course_id": cid}, {"_id": 0}
    )
    return {"ok": True, "enrollment": enr}


@router.get("/{cid}/progress")
async def get_progress(cid: str, user=Depends(get_current_user)):
    course = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    enr = await _get_enrollment_or_403(user, cid)

    docs = await _db.vc_progress.find(
        {"user_id": user["user_id"], "course_id": cid}, {"_id": 0}
    ).to_list(2000)
    progress_map = {d["lecture_id"]: d for d in docs}

    # Subject-wise breakdown
    lecs = _flatten_lectures(course)
    subj_stats: dict = {}
    for l in lecs:
        skey = l["subject_key"] or "misc"
        s = subj_stats.setdefault(skey, {
            "subject": l["subject"],
            "subject_key": skey,
            "total": 0, "completed": 0, "watched_seconds": 0,
        })
        s["total"] += 1
        p = progress_map.get(l["lecture_id"])
        if p:
            if p.get("completed") or (p.get("watched_pct") or 0) >= 90:
                s["completed"] += 1
            s["watched_seconds"] += int(p.get("watch_seconds") or 0)

    for s in subj_stats.values():
        s["pct"] = int(round(s["completed"] * 100 / max(1, s["total"])))
        s["watched_hours"] = round(s["watched_seconds"] / 3600.0, 2)

    # Last-watched lecture (for Continue button)
    last_lec = None
    last_watched = None
    for d in docs:
        lw = d.get("last_watched_at")
        if lw and (not last_watched or lw > last_watched):
            last_watched = lw
            last_lec = d

    resume = None
    if last_lec:
        lec_meta = next((l for l in lecs if l["lecture_id"] == last_lec["lecture_id"]), None)
        if lec_meta:
            resume = {
                **lec_meta,
                "last_pos_seconds": last_lec.get("last_pos_seconds", 0),
                "watched_pct": last_lec.get("watched_pct", 0),
                "completed": last_lec.get("completed", False),
            }

    if not resume and lecs:
        # No progress yet — default resume = first lecture
        resume = {**lecs[0], "last_pos_seconds": 0, "watched_pct": 0, "completed": False}

    return {
        "enrollment": enr,
        "course": _summary(course),
        "curriculum": course.get("curriculum", []),
        "progress": progress_map,
        "subject_stats": list(subj_stats.values()),
        "resume": resume,
        "total_lectures": len(lecs),
        "completed_lectures": sum(1 for d in docs if d.get("completed") or (d.get("watched_pct") or 0) >= 90),
    }


@router.get("/{cid}/analytics")
async def get_analytics(cid: str, user=Depends(get_current_user)):
    course = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    enr = await _get_enrollment_or_403(user, cid)

    lecs = _flatten_lectures(course)
    total_lecs = len(lecs)
    total_sec = sum(l.get("duration_sec", 0) for l in lecs)

    # 7-day watch histogram
    from collections import defaultdict
    today = datetime.now(timezone.utc).date()
    week_buckets = { (today - timedelta(days=i)).isoformat(): 0 for i in range(6, -1, -1) }

    cur = _db.vc_progress.find({"user_id": user["user_id"], "course_id": cid}, {"_id": 0})
    total_watch_sec = 0
    completed = 0
    streak_days_set = set()
    async for p in cur:
        wsec = int(p.get("watch_seconds") or 0)
        total_watch_sec += wsec
        if p.get("completed") or (p.get("watched_pct") or 0) >= 90:
            completed += 1
        lw = p.get("last_watched_at")
        if lw:
            try:
                d = lw[:10]  # YYYY-MM-DD
                streak_days_set.add(d)
                if d in week_buckets:
                    week_buckets[d] += wsec
            except Exception:
                pass

    # Compute streak (consecutive days ending today)
    streak = 0
    cursor = today
    while cursor.isoformat() in streak_days_set:
        streak += 1
        cursor = cursor - timedelta(days=1)

    return {
        "enrollment": enr,
        "totals": {
            "total_lectures": total_lecs,
            "completed_lectures": completed,
            "completion_pct": int(round(completed * 100 / max(1, total_lecs))),
            "total_watch_seconds": total_watch_sec,
            "total_watch_hours": round(total_watch_sec / 3600.0, 2),
            "course_total_seconds": total_sec,
            "course_total_hours": round(total_sec / 3600.0, 2),
            "streak_days": streak,
        },
        "week": [
            {"date": d, "seconds": s, "minutes": round(s / 60.0, 1)}
            for d, s in sorted(week_buckets.items())
        ],
    }


@router.get("/{cid}/lecture/{lec_id}")
async def lecture_detail(cid: str, lec_id: str, user=Depends(get_current_user)):
    """Return lecture playback details + prev/next linkage.
    Free lectures playable without enrollment; else requires enrollment."""
    course = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    lecs = _flatten_lectures(course)
    idx = next((i for i, l in enumerate(lecs) if l["lecture_id"] == lec_id), -1)
    if idx < 0:
        raise HTTPException(404, "Lecture not found")
    lec = lecs[idx]

    enrolled = False
    if _db is not None:
        enr = await _db.vc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
        enrolled = bool(enr)

    if not lec["is_free"] and not enrolled:
        raise HTTPException(403, "Enroll to watch this lecture")

    # Existing progress
    prog = None
    if enrolled:
        prog = await _db.vc_progress.find_one(
            {"user_id": user["user_id"], "course_id": cid, "lecture_id": lec_id},
            {"_id": 0},
        )

    return {
        "course": _summary(course),
        "lecture": lec,
        "prev": lecs[idx - 1] if idx > 0 else None,
        "next": lecs[idx + 1] if idx < len(lecs) - 1 else None,
        "progress": prog or {"watched_pct": 0, "last_pos_seconds": 0, "completed": False},
        "index": idx + 1,
        "total": len(lecs),
    }
