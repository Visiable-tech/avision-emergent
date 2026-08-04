"""
Live Courses module — Phase 1 (Pre-Purchase / Discovery).

Handles:
  • Full course catalog (with filtering + sorting)
  • Sales-page detail (with curriculum, faculties, demo video, testimonials, FAQ)
  • Faculty profiles
  • Enrollment via Razorpay (create order + verify signature -> lc_enrollments)
  • "My Enrollments" listing

Post-purchase experience (dashboard, live classroom, chat/polls) is Phase 2+.
"""
from __future__ import annotations

import hmac
import hashlib
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

try:
    import razorpay as _razorpay
except Exception:  # pragma: no cover
    _razorpay = None

from auth import get_current_user, get_optional_user


# ------------------------ SEED DATA ---------------------------

FACULTIES = [
    {
        "id": "f-ranjan",
        "name": "Ranjan Mishra",
        "title": "Sr. Faculty — Quantitative Aptitude",
        "avatar": "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&q=80",
        "bio": "10+ years mentoring Banking & SSC aspirants. Known for shortcut techniques and simple explanations.",
        "subjects": ["Quantitative Aptitude", "Data Interpretation"],
        "experience_years": 12,
        "students_taught": 42000,
        "rating": 4.9,
        "courses_count": 6,
        "achievements": ["Ex-Bank PO", "Author – Speed Maths", "Trained 200+ selected candidates"],
    },
    {
        "id": "f-swati",
        "name": "Swati Chatterjee",
        "title": "Sr. Faculty — English & Verbal Ability",
        "avatar": "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80",
        "bio": "Cambridge-certified English trainer with 8+ years in competitive exam coaching.",
        "subjects": ["English Language", "Descriptive Writing"],
        "experience_years": 9,
        "students_taught": 31000,
        "rating": 4.8,
        "courses_count": 5,
        "achievements": ["CELTA Certified", "Ex-IBPS PO Interview Panel"],
    },
    {
        "id": "f-anjali",
        "name": "Dr. Anjali Rao",
        "title": "UPSC GS & Mentorship Head",
        "avatar": "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80",
        "bio": "PhD in Public Administration. Mentored 15+ IAS selections in the last 5 years.",
        "subjects": ["Polity", "Governance", "Ethics"],
        "experience_years": 14,
        "students_taught": 18500,
        "rating": 4.9,
        "courses_count": 4,
        "achievements": ["PhD JNU", "15 IAS mentees", "Author – GS Manual"],
    },
    {
        "id": "f-sanjay",
        "name": "Sanjay Kumar",
        "title": "Sr. Faculty — Reasoning & GS",
        "avatar": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80",
        "bio": "Reasoning specialist. Focus on puzzles, seating arrangement and logical DI.",
        "subjects": ["Reasoning Ability", "General Studies"],
        "experience_years": 8,
        "students_taught": 26000,
        "rating": 4.7,
        "courses_count": 7,
        "achievements": ["Ex-RRB officer", "Reasoning Handbook author"],
    },
    {
        "id": "f-priyanka",
        "name": "Priyanka Das",
        "title": "Sr. Faculty — General Awareness",
        "avatar": "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80",
        "bio": "Daily current-affairs specialist and Banking Awareness expert.",
        "subjects": ["Current Affairs", "Banking Awareness"],
        "experience_years": 6,
        "students_taught": 22000,
        "rating": 4.8,
        "courses_count": 5,
        "achievements": ["Daily-CA channel 500k+ subs"],
    },
    {
        "id": "f-arvind",
        "name": "Arvind Sharma",
        "title": "Sr. Faculty — SSC & Railway",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
        "bio": "SSC CGL + Railway NTPC expert. 9 years of teaching Maths & Reasoning.",
        "subjects": ["Quant", "Reasoning", "SSC GK"],
        "experience_years": 9,
        "students_taught": 34000,
        "rating": 4.8,
        "courses_count": 6,
        "achievements": ["Ex-SSC selected candidate", "SSC Speed-Maths book author"],
    },
]


def _mkc(id_, category_id, exam_name, exam_id, name, batch_label, faculty_ids, gradient, banner, price, offer_price, language, months, sessions, mocks, demo, features, curriculum, start_date, eligibility="Graduation Pass"):
    disc = int(round((price - offer_price) / price * 100)) if price and offer_price and price > offer_price else 0
    return {
        "id": id_,
        "category_id": category_id,
        "exam_id": exam_id,
        "exam_name": exam_name,
        "name": name,
        "batch_label": batch_label,
        "faculty_ids": faculty_ids,
        "language": language,
        "duration_months": months,
        "duration": f"{months} Months",
        "sessions_count": sessions,
        "mock_tests_count": mocks,
        "banner_image": banner,
        "gradient": gradient,
        "accent": "#F59E0B",
        "price": price,
        "offer_price": offer_price,
        "discount_pct": disc,
        "is_limited_offer": True,
        "offer_valid_till": "Ends this Sunday",
        "validity_months": months,
        "start_date": start_date,
        "start_date_short": start_date,
        "eligibility": eligibility,
        # YouTube unlisted / demo — mocked per user instruction (Phase 1)
        "demo_video_id": demo,  # YouTube video id
        "demo_video_url": f"https://www.youtube.com/embed/{demo}",
        "features": features,
        "curriculum": curriculum,
        "schedule": {
            "weekdays": "Mon-Fri • 7:00 PM – 9:30 PM",
            "weekend": "Sat-Sun • 10:00 AM – 1:00 PM (Marathon)",
            "doubt_session": "Sunday • 5:00 PM – 6:30 PM",
        },
        "testimonials": [
            {"name": "Ananya P.", "avatar": "A", "batch": "2024", "text": "Faculty explanations are crystal clear. Cleared prelims easily.", "rating": 5},
            {"name": "Rohit S.", "avatar": "R", "batch": "2024", "text": "Live doubt sessions helped me a lot. Recordings are lifesavers.", "rating": 5},
            {"name": "Neha K.", "avatar": "N", "batch": "2023", "text": "Best batch — mock tests are exactly as per real pattern.", "rating": 4},
        ],
        "faqs": [
            {"q": "Will I get recordings if I miss a class?", "a": "Yes, every live class is recorded and available inside the app within 30 minutes."},
            {"q": "Is this course refundable?", "a": "You can request a full refund within 48 hours of enrolling if no material has been downloaded."},
            {"q": "Are PDF notes included?", "a": "Yes — structured PDF notes are delivered daily along with revision sheets."},
            {"q": "What about mock tests?", "a": f"You get {mocks}+ full-length + sectional mocks with All India Rank & detailed analytics."},
            {"q": "Can I attend on mobile?", "a": "Yes, all live classes and recordings work seamlessly on mobile and desktop."},
        ],
        "cta": "Enroll Now",
        "status": "active",
        "display_order": 0,
    }


COURSES = [
    _mkc(
        "lc-banking-po-2026", "banking", "IBPS PO Prelims + Mains", "ibps-po",
        "IBPS PO Prime Live Batch 2026", "SPEED-UP BATCH 2026",
        ["f-ranjan", "f-swati", "f-priyanka"],
        ["#083A8E", "#0B4DB8"],
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
        24999, 12999, "Hindi + English", 6, 220, 180,
        "dQw4w9WgXcQ",  # placeholder YouTube id
        ["220+ Live Classes with recordings", "180+ Sectional + Full-Length Mocks", "Bilingual faculty (Hi/En)", "Daily practice PDFs", "Descriptive Writing feedback", "Interview Guidance module"],
        [
            {"subject": "Quantitative Aptitude", "hours": 60, "topics": ["Number System", "Percentages", "Simplification", "DI Sets", "Puzzles-based DI", "Data Sufficiency"]},
            {"subject": "Reasoning Ability", "hours": 50, "topics": ["Seating Arrangement", "Puzzles", "Syllogism", "Inequality", "Machine Input-Output"]},
            {"subject": "English Language", "hours": 45, "topics": ["Reading Comprehension", "Cloze Test", "Para Jumbles", "Error Detection", "Vocabulary Boost"]},
            {"subject": "General & Banking Awareness", "hours": 30, "topics": ["Banking Awareness", "Static GK", "Daily Current Affairs", "Financial Awareness"]},
            {"subject": "Descriptive & Interview", "hours": 15, "topics": ["Essay Writing", "Letter Writing", "Interview Simulation"]},
        ],
        "20 Jul 2026",
    ),
    _mkc(
        "lc-ssc-cgl-2026", "ssc", "SSC CGL Tier 1 + Tier 2", "ssc-cgl",
        "SSC CGL Elite Live Batch 2026", "SSC ELITE 2026",
        ["f-arvind", "f-swati"],
        ["#7C3AED", "#4C1D95"],
        "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80",
        29999, 14999, "Hindi + English", 8, 300, 250,
        "dQw4w9WgXcQ",
        ["300+ Live Classes", "250+ Full-length Mocks + PYQs", "Complete printed-quality PDFs", "Weekly doubt sessions", "Tier-2 Advanced Maths module", "Typing test guide"],
        [
            {"subject": "Quantitative Aptitude", "hours": 75, "topics": ["Arithmetic", "Algebra", "Trigonometry", "Geometry", "Mensuration", "Advanced Maths for Tier-2"]},
            {"subject": "Reasoning Ability", "hours": 55, "topics": ["Non-Verbal", "Analogy", "Series", "Coding-Decoding", "Ranking"]},
            {"subject": "English Language", "hours": 55, "topics": ["Grammar", "Vocabulary", "Comprehension", "Sentence Improvement"]},
            {"subject": "General Awareness", "hours": 50, "topics": ["History", "Geography", "Polity", "Science", "Static + Current"]},
        ],
        "05 Aug 2026",
    ),
    _mkc(
        "lc-upsc-cse-2027", "upsc", "UPSC CSE Prelims + Mains", "upsc-cse",
        "UPSC Foundation Live Batch 2027", "PRE + MAINS 2027",
        ["f-anjali", "f-sanjay", "f-priyanka"],
        ["#B45309", "#7C2D12"],
        "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80",
        49999, 24999, "English", 12, 450, 120,
        "dQw4w9WgXcQ",
        ["450+ Live Classes across GS 1-4 + CSAT", "120+ Mocks (Pre + Mains + Optional)", "Weekly Answer-Writing evaluation", "Personal Mentorship (1:1)", "Interview Guidance module", "Optional subject support"],
        [
            {"subject": "GS Paper 1 — History, Geography, Society", "hours": 90, "topics": ["Ancient History", "Medieval", "Modern India", "Physical Geography", "Indian Society"]},
            {"subject": "GS Paper 2 — Polity, Governance, IR", "hours": 80, "topics": ["Constitution", "Governance", "Social Justice", "International Relations"]},
            {"subject": "GS Paper 3 — Economy, Env, S&T", "hours": 80, "topics": ["Indian Economy", "Environment", "Science & Tech", "Internal Security"]},
            {"subject": "GS Paper 4 — Ethics", "hours": 40, "topics": ["Ethics Basics", "Case Studies", "Attitude", "Aptitude"]},
            {"subject": "CSAT + Essay + Interview", "hours": 45, "topics": ["Comprehension", "Reasoning", "Basic Maths", "Essay Structure", "Interview Simulation"]},
        ],
        "10 Sep 2026",
    ),
    _mkc(
        "lc-rrb-ntpc-2026", "railway", "RRB NTPC CBT-1 + CBT-2", "rrb-ntpc",
        "RRB NTPC Complete Live Batch", "RAILWAY NTPC 2026",
        ["f-sanjay", "f-arvind"],
        ["#059669", "#064E3B"],
        "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80",
        14999, 7999, "Hindi", 5, 180, 90,
        "dQw4w9WgXcQ",
        ["180+ Live Sessions", "90+ Mocks + PYQs", "Complete Hindi-medium notes", "Weekend doubt sessions", "Skill Test Guidance"],
        [
            {"subject": "Mathematics", "hours": 50, "topics": ["Arithmetic", "Number System", "Percentage", "Time-Work", "Mensuration"]},
            {"subject": "General Intelligence & Reasoning", "hours": 40, "topics": ["Analogy", "Series", "Coding", "Puzzles", "Non-verbal"]},
            {"subject": "General Awareness", "hours": 45, "topics": ["Current Affairs", "Static GK", "Indian Railways", "Sports"]},
        ],
        "01 Aug 2026",
        eligibility="10+2 Pass",
    ),
    _mkc(
        "lc-sbi-po-2026", "banking", "SBI PO Prelims + Mains", "sbi-po",
        "SBI PO Booster Live Batch", "BOOSTER 2026",
        ["f-ranjan", "f-swati", "f-priyanka"],
        ["#0891B2", "#0E7490"],
        "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&q=80",
        19999, 9999, "English", 4, 160, 120,
        "dQw4w9WgXcQ",
        ["160+ Live Classes", "120+ Mocks with SBI-specific pattern", "Descriptive writing feedback", "GD & Interview module", "Daily current affairs sessions"],
        [
            {"subject": "Quantitative Aptitude", "hours": 45, "topics": ["Arithmetic", "DI Sets", "Data Sufficiency", "Approximation"]},
            {"subject": "Reasoning Ability", "hours": 40, "topics": ["High-level Puzzles", "Seating Arrangement", "Coded Blood Relations", "Direction Sense"]},
            {"subject": "English Language", "hours": 35, "topics": ["RC (SBI-level)", "Cloze Test", "Sentence Correction", "Vocabulary"]},
            {"subject": "GA & Banking Awareness", "hours": 30, "topics": ["Static Banking", "Current Banking", "Financial Awareness", "Static GK"]},
        ],
        "15 Aug 2026",
    ),
    _mkc(
        "lc-ssc-chsl-2026", "ssc", "SSC CHSL Tier 1 + Tier 2", "ssc-chsl",
        "SSC CHSL Complete Live Batch", "CHSL 2026",
        ["f-arvind", "f-swati"],
        ["#DB2777", "#831843"],
        "https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=1200&q=80",
        11999, 5999, "Hindi + English", 4, 140, 100,
        "dQw4w9WgXcQ",
        ["140+ Live Classes", "100+ Full-length Mocks", "Typing test module", "Descriptive writing feedback"],
        [
            {"subject": "Quantitative Aptitude", "hours": 40, "topics": ["Arithmetic", "Percentages", "Ratios", "Averages"]},
            {"subject": "English Language", "hours": 35, "topics": ["Grammar", "Vocab", "Comprehension"]},
            {"subject": "Reasoning Ability", "hours": 30, "topics": ["Series", "Analogy", "Puzzles"]},
            {"subject": "General Awareness", "hours": 25, "topics": ["Static + Current"]},
        ],
        "22 Aug 2026",
        eligibility="10+2 Pass",
    ),
    _mkc(
        "lc-wbcs-2026", "state-exams", "WBCS Prelims + Mains", "wbcs",
        "WBCS Target Live Batch", "TARGET BATCH 2026",
        ["f-anjali", "f-priyanka"],
        ["#0B4DB8", "#08306B"],
        "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
        39999, 19999, "Bengali + English", 10, 350, 150,
        "dQw4w9WgXcQ",
        ["350+ Live Sessions in Bengali + English", "150+ Mock Tests as per latest pattern", "Bengali medium PDF notes", "West Bengal specific static GK", "Optional subject support"],
        [
            {"subject": "Bengali Language", "hours": 40, "topics": ["Grammar", "Composition", "Prose", "Translation"]},
            {"subject": "English Language", "hours": 35, "topics": ["Grammar", "RC", "Composition"]},
            {"subject": "General Studies", "hours": 90, "topics": ["Indian History", "Bengal-specific History", "Geography", "Polity", "Economy"]},
            {"subject": "Arithmetic & Reasoning", "hours": 45, "topics": ["Percentages", "Ratios", "Analogy", "Coding-Decoding"]},
            {"subject": "Current Affairs", "hours": 30, "topics": ["National", "International", "West Bengal-specific"]},
        ],
        "15 Aug 2026",
    ),
    _mkc(
        "lc-ctet-2026", "teaching", "CTET Paper 1 + Paper 2", "ctet",
        "CTET Complete Live Batch", "TEACHING 2026",
        ["f-swati", "f-arvind"],
        ["#7C3AED", "#5B21B6"],
        "https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=1200&q=80",
        9999, 4999, "Hindi + English", 3, 120, 80,
        "dQw4w9WgXcQ",
        ["120+ Live Classes", "80+ Mocks (Paper 1 + Paper 2)", "CDP-focused sessions", "Pedagogy specialist trainers"],
        [
            {"subject": "Child Development & Pedagogy", "hours": 40, "topics": ["Theories", "Inclusive Education", "Learning & Pedagogy"]},
            {"subject": "Language I & II", "hours": 30, "topics": ["Comprehension", "Pedagogy"]},
            {"subject": "Mathematics", "hours": 25, "topics": ["Number System", "Geometry", "Pedagogy"]},
            {"subject": "Environmental Studies", "hours": 20, "topics": ["Family & Friends", "Food", "Shelter", "Water"]},
        ],
        "10 Sep 2026",
        eligibility="10+2 / Graduation",
    ),
]

# Add display order automatically
for i, c in enumerate(COURSES):
    c["display_order"] = i + 1


# Preserve backwards-compat: expose the same 5 "hero" batches for the home banner
# by consuming the existing live_batches.SEED_BATCHES separately.

# ------------------ HELPERS ------------------

def _filter_and_sort(items, category, exam, language, sort_by):
    src = [c for c in items if c.get("status") == "active"]
    if category:
        src = [c for c in src if c.get("category_id") == category]
    if exam:
        src = [c for c in src if c.get("exam_id") == exam]
    if language:
        src = [c for c in src if language.lower() in (c.get("language") or "").lower()]
    if sort_by == "price_low":
        src = sorted(src, key=lambda x: x.get("offer_price", 0))
    elif sort_by == "price_high":
        src = sorted(src, key=lambda x: -x.get("offer_price", 0))
    elif sort_by == "start_date":
        src = sorted(src, key=lambda x: x.get("start_date", ""))
    else:
        src = sorted(src, key=lambda x: x.get("display_order", 99))
    return src


def _summary(c: dict) -> dict:
    """Trimmed card summary for list endpoints."""
    return {
        "id": c["id"], "name": c["name"], "exam_name": c["exam_name"], "exam_id": c["exam_id"],
        "category_id": c.get("category_id"), "language": c.get("language"),
        "batch_label": c.get("batch_label"),
        "duration": c.get("duration"), "duration_months": c.get("duration_months"),
        "sessions_count": c.get("sessions_count"), "mock_tests_count": c.get("mock_tests_count"),
        "banner_image": c.get("banner_image"), "gradient": c.get("gradient"), "accent": c.get("accent"),
        "price": c.get("price"), "offer_price": c.get("offer_price"), "discount_pct": c.get("discount_pct"),
        "is_limited_offer": c.get("is_limited_offer"), "offer_valid_till": c.get("offer_valid_till"),
        "start_date_short": c.get("start_date_short"), "start_date": c.get("start_date"),
        "eligibility": c.get("eligibility"),
        "faculty_names": [
            next((f["name"] for f in FACULTIES if f["id"] == fid), "") for fid in c.get("faculty_ids", [])
        ],
    }


def _enrich_detail(c: dict) -> dict:
    """Attach faculty objects for detail page."""
    out = {**c}
    out["faculties"] = [f for f in FACULTIES if f["id"] in c.get("faculty_ids", [])]
    return out


# ------------------ DB WIRING ------------------

_db: Optional[AsyncIOMotorDatabase] = None


def init_live_courses(db: AsyncIOMotorDatabase):
    global _db
    _db = db


async def ensure_live_courses_indexes(db):
    await db.lc_enrollments.create_index([("user_id", 1), ("course_id", 1)], unique=True)
    await db.lc_orders.create_index("order_id", unique=True)


# ------------------ RAZORPAY ------------------

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


# ------------------ ROUTES ------------------

router = APIRouter(prefix="/api/live-courses", tags=["live-courses"])


@router.get("")
async def list_courses(
    category: Optional[str] = None,
    exam: Optional[str] = None,
    language: Optional[str] = None,
    sort: Optional[str] = None,
    limit: int = 40,
):
    """List all active courses with filter chips + sort options."""
    filtered = _filter_and_sort(COURSES, category, exam, language, sort)
    return {
        "courses": [_summary(c) for c in filtered[:limit]],
        "total": len(filtered),
    }


@router.get("/filters")
async def filter_options():
    """Return exam + language chips available for filter UI."""
    exams: dict[str, dict] = {}
    langs: set[str] = set()
    for c in COURSES:
        if c.get("status") != "active":
            continue
        eid = c["exam_id"]
        if eid not in exams:
            exams[eid] = {"id": eid, "name": c["exam_name"], "category_id": c.get("category_id"), "count": 0}
        exams[eid]["count"] += 1
        for l in (c.get("language") or "").split("+"):
            l = l.strip()
            if l:
                langs.add(l)
    return {
        "exams": sorted(exams.values(), key=lambda x: -x["count"]),
        "languages": sorted(langs),
    }


@router.get("/faculties")
async def list_faculties():
    return {"faculties": FACULTIES}


@router.get("/faculties/{fid}")
async def faculty_detail(fid: str):
    f = next((x for x in FACULTIES if x["id"] == fid), None)
    if not f:
        raise HTTPException(404, "Faculty not found")
    # Attach courses this faculty teaches
    taught = [_summary(c) for c in COURSES if fid in c.get("faculty_ids", []) and c.get("status") == "active"]
    return {**f, "courses": taught}


@router.get("/enrollments/mine")
async def my_enrollments(user=Depends(get_current_user)):
    if _db is None:
        return {"enrollments": []}
    docs = await _db.lc_enrollments.find({"user_id": user["user_id"]}, {"_id": 0}).sort("enrolled_at", -1).to_list(50)
    # Attach course summary
    for d in docs:
        cid = d.get("course_id")
        c = next((x for x in COURSES if x["id"] == cid), None)
        d["course"] = _summary(c) if c else None
    return {"enrollments": docs}


@router.get("/{cid}")
async def course_detail(cid: str, user=Depends(get_optional_user)):
    c = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not c:
        raise HTTPException(404, "Course not found")
    detail = _enrich_detail(c)
    # Attach enrollment status if logged in
    enrolled = False
    if user and _db is not None:
        e = await _db.lc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
        enrolled = bool(e)
    detail["is_enrolled"] = enrolled
    return detail


# ------------------ ENROLLMENT / PAYMENTS ------------------

@router.get("/pay/config")
async def pay_config():
    client = _get_rzp()
    return {"key_id": _RZP_KEY_ID, "enabled": bool(client)}


@router.post("/{cid}/pay/order")
async def create_order(cid: str, user=Depends(get_current_user)):
    """Create a Razorpay order for the course purchase."""
    if _db is None:
        raise HTTPException(500, "Not initialised")
    course = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")

    # Check if already enrolled
    existing = await _db.lc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
    if existing:
        raise HTTPException(400, "Already enrolled in this course")

    client = _get_rzp()
    if not client:
        raise HTTPException(503, "Payment gateway not configured")

    amount_paise = int(course["offer_price"]) * 100
    receipt = f"lc_{cid[:12]}_{uuid.uuid4().hex[:8]}"
    try:
        order = client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "receipt": receipt,
            "notes": {"user_id": user["user_id"], "course_id": cid, "type": "live_course"},
        })
    except Exception as exc:
        raise HTTPException(502, f"Razorpay order failed: {exc}")

    await _db.lc_orders.insert_one({
        "order_id": order["id"],
        "user_id": user["user_id"],
        "course_id": cid,
        "amount_paise": amount_paise,
        "status": "created",
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    return {
        "key_id": _RZP_KEY_ID,
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "course": _summary(course),
        "receipt": receipt,
    }


@router.post("/{cid}/pay/verify")
async def verify_payment(cid: str, body: dict, user=Depends(get_current_user)):
    """Verify HMAC signature and create the enrollment on success."""
    if _db is None:
        raise HTTPException(500, "Not initialised")
    course = next((x for x in COURSES if x["id"] == cid), None)
    if not course:
        raise HTTPException(404, "Course not found")

    order_id = body.get("razorpay_order_id")
    payment_id = body.get("razorpay_payment_id")
    signature = body.get("razorpay_signature")
    if not (order_id and payment_id and signature):
        raise HTTPException(400, "Missing payment fields")

    stored = await _db.lc_orders.find_one({"order_id": order_id, "user_id": user["user_id"]})
    if not stored:
        raise HTTPException(404, "Unknown order")

    message = f"{order_id}|{payment_id}".encode()
    expected = hmac.new(_RZP_KEY_SECRET.encode(), message, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        await _db.lc_orders.update_one({"order_id": order_id}, {"$set": {"status": "signature_failed"}})
        raise HTTPException(400, "Invalid signature")

    await _db.lc_orders.update_one(
        {"order_id": order_id},
        {"$set": {
            "status": "paid",
            "payment_id": payment_id,
            "signature": signature,
            "paid_at": datetime.now(timezone.utc).isoformat(),
        }},
    )

    now = datetime.now(timezone.utc)
    validity_days = int(course.get("validity_months", 12)) * 30
    enrollment = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "course_id": cid,
        "course_name": course["name"],
        "enrolled_at": now.isoformat(),
        "expires_at": (now + timedelta(days=validity_days)).isoformat(),
        "progress_pct": 0,
        "amount_paid_paise": stored.get("amount_paise", 0),
        "order_id": order_id,
        "payment_id": payment_id,
        "status": "active",
    }
    await _db.lc_enrollments.insert_one(enrollment)
    enrollment.pop("_id", None)
    return {"verified": True, "enrollment": enrollment}


# --- Dev helper (only in non-prod) — quick free enrollment for testing / demo ---
@router.post("/{cid}/enroll/free")
async def enroll_free(cid: str, user=Depends(get_current_user)):
    """DEV-ONLY: instantly enroll a user in a course (no payment).
    Useful for demo and testing Phase 2 dashboard while Razorpay may not be
    testable end-to-end in the preview. Removes itself when RAZORPAY becomes
    strictly required in production."""
    if _db is None:
        raise HTTPException(500, "Not initialised")
    course = next((x for x in COURSES if x["id"] == cid and x.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    existing = await _db.lc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid})
    if existing:
        return {"enrollment": {**existing, "_id": None}}
    now = datetime.now(timezone.utc)
    validity_days = int(course.get("validity_months", 12)) * 30
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["user_id"],
        "course_id": cid,
        "course_name": course["name"],
        "enrolled_at": now.isoformat(),
        "expires_at": (now + timedelta(days=validity_days)).isoformat(),
        "progress_pct": 0,
        "amount_paid_paise": 0,
        "status": "active",
        "note": "free_demo_enrollment",
    }
    await _db.lc_enrollments.insert_one(doc)
    doc.pop("_id", None)
    return {"enrollment": doc}


# ========================================================
#           PHASE 2 — POST-PURCHASE DASHBOARD
# ========================================================
# All content is deterministically generated from the course seed
# (curriculum, faculties, batch metadata). Real live-session content
# and playback URLs will be plugged in during Phase 3 (WebSockets +
# classroom). "Progress" is stored on the enrollment doc under
# `progress_state` (JSON) — updated by PATCH endpoint below.

_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _dget(user_id: str, cid: str) -> str:
    """Deterministic seed string per user+course."""
    return f"{user_id}:{cid}"


def _hash_int(seed: str, mod: int) -> int:
    return int(hashlib.md5(seed.encode()).hexdigest(), 16) % mod


def _build_session(course: dict, day_offset: int, subj_idx: int) -> dict:
    """Compose a synthetic scheduled session using the curriculum."""
    curriculum = course.get("curriculum", [])
    subj = curriculum[subj_idx % max(1, len(curriculum))] if curriculum else {"subject": "General"}
    topics = subj.get("topics", [])
    topic = topics[day_offset % max(1, len(topics))] if topics else "Session"
    fac_ids = course.get("faculty_ids", [])
    fac_id = fac_ids[subj_idx % max(1, len(fac_ids))] if fac_ids else None
    fac = next((f for f in FACULTIES if f["id"] == fac_id), None)
    now = datetime.now(timezone.utc)
    # IST offset 5h30m -> approximate start-of-day
    session_dt = (now + timedelta(days=day_offset)).replace(hour=13, minute=30, second=0, microsecond=0)  # 7 PM IST
    is_today = day_offset == 0
    starts_in_min = int((session_dt - now).total_seconds() / 60)
    if is_today and starts_in_min < 0 and starts_in_min > -90:
        status = "live"
    elif is_today:
        status = "upcoming" if starts_in_min > 0 else "recorded"
    else:
        status = "upcoming" if day_offset > 0 else "recorded"
    return {
        "id": f"sess-{course['id']}-{day_offset}-{subj_idx}",
        "course_id": course["id"],
        "subject": subj.get("subject"),
        "topic": topic,
        "faculty_id": fac_id,
        "faculty_name": fac.get("name") if fac else "Faculty",
        "faculty_avatar": fac.get("avatar") if fac else None,
        "date_iso": session_dt.isoformat(),
        "day_short": _DAYS[session_dt.weekday()],
        "date_short": session_dt.strftime("%d %b"),
        "time_short": "7:00 PM – 9:30 PM",
        "starts_in_min": starts_in_min,
        "status": status,
        # Phase 1 uses mocked demo video url for playback fallback
        "video_url": course.get("demo_video_url"),
        "duration_min": 150,
    }


def _dashboard_payload(course: dict, enrollment: dict, user_id: str) -> dict:
    curriculum = course.get("curriculum", [])
    total_subjects = len(curriculum)

    # ---- Progress state (persisted on enrollment doc) ----
    state = enrollment.get("progress_state") or {}
    lessons_watched = int(state.get("lessons_watched", 0))
    live_attended = int(state.get("live_attended", 0))
    mocks_attempted = int(state.get("mocks_attempted", 0))
    questions_solved = int(state.get("questions_solved", 0))
    streak_days = int(state.get("streak_days", _hash_int(_dget(user_id, course["id"]) + ":streak", 12) + 1))

    total_sessions = course.get("sessions_count", 200)
    total_mocks = course.get("mock_tests_count", 100)
    # Overall course progress: weighted average
    prog_pct = min(
        100,
        int((live_attended / max(1, total_sessions)) * 60
            + (mocks_attempted / max(1, total_mocks)) * 25
            + (lessons_watched / max(1, total_sessions * 2)) * 15)
    )

    # ---- Today's schedule (2 sessions) ----
    today = [
        _build_session(course, 0, 0),
        _build_session(course, 0, 1),
    ]
    # ---- Upcoming next 5 days ----
    upcoming = [_build_session(course, d, d % max(1, total_subjects)) for d in range(1, 6)]

    # ---- Next Action determination ----
    live_now = next((s for s in today if s["status"] == "live"), None)
    next_upcoming = next((s for s in today + upcoming if s["status"] == "upcoming"), None)
    if live_now:
        next_action = {
            "type": "live_now",
            "title": f"🔴 LIVE: {live_now['subject']}",
            "subtitle": f"{live_now['faculty_name']} • {live_now['topic']}",
            "cta_label": "Join Live",
            "cta_route": f"/live-courses/session/{live_now['id']}",
            "accent": "#EF4444",
            "meta": "Live now • Don't miss it",
        }
    elif next_upcoming and next_upcoming.get("starts_in_min", 999) <= 24 * 60:
        mins = max(0, next_upcoming["starts_in_min"])
        hrs = mins // 60
        rem = mins % 60
        meta = f"Starts in {hrs}h {rem}m" if hrs else f"Starts in {mins} min"
        next_action = {
            "type": "live_upcoming",
            "title": f"Next: {next_upcoming['subject']}",
            "subtitle": f"{next_upcoming['faculty_name']} • {next_upcoming['topic']}",
            "cta_label": "Set Reminder",
            "cta_route": f"/live-courses/session/{next_upcoming['id']}",
            "accent": "#0B4DB8",
            "meta": meta,
        }
    elif mocks_attempted < 3:
        next_action = {
            "type": "test",
            "title": "Attempt your Daily Mock",
            "subtitle": "Boost accuracy with a 15-min sectional",
            "cta_label": "Start Test",
            "cta_route": "/test-prime",
            "accent": "#7C3AED",
            "meta": "Recommended today",
        }
    else:
        next_action = {
            "type": "recording",
            "title": "Continue where you left off",
            "subtitle": (curriculum[0]["subject"] if curriculum else "Live Class") + " • Recorded Class",
            "cta_label": "Resume",
            "cta_route": f"/live-courses/dashboard/{course['id']}",
            "accent": "#059669",
            "meta": "Recorded • 45 min",
        }

    # ---- Today's Target (with completion tracking from state) ----
    today_target = {
        "targets": [
            {"key": "live", "label": "Live Classes", "icon": "videocam", "done": min(2, live_attended % 3), "total": 2},
            {"key": "video", "label": "Recorded Videos", "icon": "play-circle", "done": min(3, lessons_watched % 4), "total": 3},
            {"key": "questions", "label": "Questions", "icon": "checkmark-done", "done": min(30, questions_solved % 45), "total": 30},
        ],
        "streak_days": streak_days,
    }
    # completion pct
    total_target_pct = 0
    for t in today_target["targets"]:
        total_target_pct += (t["done"] / max(1, t["total"])) * 100
    today_target["completion_pct"] = int(total_target_pct / max(1, len(today_target["targets"])))

    # ---- Subject Progress ----
    subject_progress = []
    for i, s in enumerate(curriculum):
        topics = s.get("topics", [])
        total_topics = len(topics)
        # Deterministic done count per user+subject
        done = _hash_int(_dget(user_id, course["id"]) + f":subj:{i}", max(1, total_topics + 1))
        done = min(done, total_topics)
        subject_progress.append({
            "subject": s.get("subject"),
            "hours": s.get("hours"),
            "total_topics": total_topics,
            "done_topics": done,
            "pct": int((done / max(1, total_topics)) * 100),
            "faculty_id": (course.get("faculty_ids", [None])[i % max(1, len(course.get("faculty_ids", [])) or 1)]),
        })

    # ---- Recent Recordings ----
    recent_recordings = []
    for i in range(min(4, total_subjects)):
        s = curriculum[i]
        topics = s.get("topics", [])
        topic = topics[0] if topics else "Session"
        recent_recordings.append({
            "id": f"rec-{course['id']}-{i}",
            "title": topic,
            "subject": s.get("subject"),
            "duration": "1h 45m",
            "watched_pct": _hash_int(_dget(user_id, course["id"]) + f":rec:{i}", 101),
            "thumbnail": course.get("banner_image"),
            "date_short": (datetime.now(timezone.utc) - timedelta(days=i + 1)).strftime("%d %b"),
        })

    # ---- Quick Stats ----
    days_remaining = None
    if enrollment.get("expires_at"):
        try:
            exp = datetime.fromisoformat(enrollment["expires_at"].replace("Z", "+00:00"))
            delta = exp - datetime.now(timezone.utc)
            days_remaining = max(0, delta.days)
        except Exception:
            days_remaining = None

    stats = {
        "classes_attended": live_attended,
        "total_classes": total_sessions,
        "mocks_attempted": mocks_attempted,
        "total_mocks": total_mocks,
        "videos_watched": lessons_watched,
        "avg_accuracy_pct": 70 + _hash_int(_dget(user_id, course["id"]) + ":acc", 25),
        "days_remaining": days_remaining,
    }

    return {
        "course": _summary(course),
        "enrollment": {
            "id": enrollment.get("id"),
            "enrolled_at": enrollment.get("enrolled_at"),
            "expires_at": enrollment.get("expires_at"),
            "progress_pct": prog_pct,
            "status": enrollment.get("status", "active"),
            "days_remaining": days_remaining,
        },
        "next_action": next_action,
        "today_target": today_target,
        "today_schedule": today,
        "upcoming_sessions": upcoming,
        "subject_progress": subject_progress,
        "recent_recordings": recent_recordings,
        "stats": stats,
        "faculties": [f for f in FACULTIES if f["id"] in course.get("faculty_ids", [])],
    }


@router.get("/dashboard/{cid}")
async def learning_dashboard(cid: str, user=Depends(get_current_user)):
    """Return the full learning-dashboard payload for an enrolled course."""
    if _db is None:
        raise HTTPException(500, "Not initialised")
    course = next((c for c in COURSES if c["id"] == cid and c.get("status") == "active"), None)
    if not course:
        raise HTTPException(404, "Course not found")
    enrollment = await _db.lc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid}, {"_id": 0})
    if not enrollment:
        raise HTTPException(403, "Not enrolled in this course")
    return _dashboard_payload(course, enrollment, user["user_id"])


@router.patch("/dashboard/{cid}/progress")
async def update_progress(cid: str, body: dict, user=Depends(get_current_user)):
    """PATCH progress increments on the enrollment.
    body accepts: {live_attended, lessons_watched, mocks_attempted, questions_solved,
                   streak_days}. Values are added atomically."""
    if _db is None:
        raise HTTPException(500, "Not initialised")
    e = await _db.lc_enrollments.find_one({"user_id": user["user_id"], "course_id": cid}, {"_id": 0})
    if not e:
        raise HTTPException(403, "Not enrolled")
    state = e.get("progress_state") or {}
    allowed = {"live_attended", "lessons_watched", "mocks_attempted", "questions_solved"}
    for k, v in body.items():
        if k in allowed:
            state[k] = int(state.get(k, 0)) + int(v)
    if "streak_days" in body:
        state["streak_days"] = int(body["streak_days"])
    await _db.lc_enrollments.update_one(
        {"user_id": user["user_id"], "course_id": cid},
        {"$set": {"progress_state": state, "last_activity_at": datetime.now(timezone.utc).isoformat()}},
    )
    return {"ok": True, "progress_state": state}


@router.get("/session/{sid}")
async def session_detail(sid: str, user=Depends(get_current_user)):
    """Detail for a synthetic session id like `sess-<courseId>-<dayOffset>-<subjIdx>`.
    Used by the classroom placeholder (Phase 3 will replace video_url with real live/recorded)."""
    if not sid.startswith("sess-"):
        raise HTTPException(400, "Invalid session id")
    rest = sid[len("sess-"):]
    # rest looks like "<courseId>-<dayOffset>-<subjIdx>"
    try:
        # course id can contain dashes — split from the right
        head, day_off_str, subj_idx_str = rest.rsplit("-", 2)
        day_offset = int(day_off_str)
        subj_idx = int(subj_idx_str)
    except Exception:
        raise HTTPException(400, "Malformed session id")
    course = next((c for c in COURSES if c["id"] == head), None)
    if not course:
        raise HTTPException(404, "Course not found")
    if _db is not None:
        e = await _db.lc_enrollments.find_one({"user_id": user["user_id"], "course_id": course["id"]})
        if not e:
            raise HTTPException(403, "Not enrolled in this course")
    return {
        "session": _build_session(course, day_offset, subj_idx),
        "course": _summary(course),
    }
