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


router = APIRouter(prefix="/api/video-courses", tags=["video-courses"])
_db: Optional[AsyncIOMotorDatabase] = None


def init_video_courses(db: AsyncIOMotorDatabase):
    global _db
    _db = db


async def ensure_video_courses_indexes(db):
    await db.vc_enrollments.create_index([("user_id", 1), ("course_id", 1)], unique=True)
    await db.vc_orders.create_index("order_id", unique=True)
    await db.vc_coupons.create_index("code", unique=True)


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


def _mk_chapter(name, video_count, lectures):
    return {
        "id": f"ch-{name.lower().replace(' ', '-').replace('&','and')}",
        "name": name,
        "video_count": video_count,
        "lectures": [
            {"title": t, "duration": d, "is_free": free, "id": f"lec-{i}"}
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
    return {"verified": bool(order_id), "enrollment": doc}
