"""Live Batches: full course-batch promotional banners shown on Home."""
from typing import Optional
from fastapi import APIRouter, HTTPException


SEED_BATCHES = [
    {
        "id": "lb1",
        "batch_label": "TARGET BATCH 2026",
        "name": "WBCS Live Batch",
        "exam_name": "WBCS Group A, B, C, D",
        "faculty": "By Avision Institute",
        "faculty_logo": "AVISION",
        "category_id": "state-exams",
        "language": "Bengali + English",
        "duration": "10 Months",
        "start_date": "15 August 2026",
        "start_date_short": "15 Aug '26",
        "sessions_count": 150,
        "mock_tests_count": 100,
        "features": [
            "150+ Live Interactive Sessions",
            "100+ Mock Tests as per latest pattern",
            "Daily Classes & Assignments",
            "Specially Designed 'Smart Notes'",
            "Topic-wise Practice & Model Questions",
            "PDF Notes + Recorded Videos",
        ],
        "banner_image": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
        "gradient": ["#0B4DB8", "#08306B"],
        "accent": "#EF4444",
        "price": 39999,
        "offer_price": 19999,
        "discount_pct": 50,
        "is_limited_offer": True,
        "offer_valid_till": "Limited Time Only!",
        "eligibility": "Age 30 & Below",
        "cta": "Enroll Now",
        "display_order": 1,
        "status": "active",
    },
    {
        "id": "lb2",
        "batch_label": "SPEED-UP BATCH 2026",
        "name": "IBPS PO Prime Batch",
        "exam_name": "IBPS PO Pre + Mains",
        "faculty": "By Ranjan Sir & Team",
        "faculty_logo": "AVISION",
        "category_id": "banking",
        "language": "Hindi + English",
        "duration": "6 Months",
        "start_date": "20 July 2026",
        "start_date_short": "20 Jul '26",
        "sessions_count": 220,
        "mock_tests_count": 180,
        "features": [
            "220+ Live Classes with recorded backup",
            "180+ Sectional & Full-length Mocks",
            "Bilingual Faculty",
            "Daily Practice PDFs",
            "Doubt-solving Sessions",
            "Interview Guidance",
        ],
        "banner_image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
        "gradient": ["#083A8E", "#0B4DB8"],
        "accent": "#F59E0B",
        "price": 24999,
        "offer_price": 12999,
        "discount_pct": 48,
        "is_limited_offer": True,
        "offer_valid_till": "Ends This Sunday",
        "eligibility": "For All Graduates",
        "cta": "Enroll Now",
        "display_order": 2,
        "status": "active",
    },
    {
        "id": "lb3",
        "batch_label": "SSC ELITE BATCH 2026",
        "name": "SSC CGL Live Batch",
        "exam_name": "SSC CGL Tier 1 + Tier 2",
        "faculty": "By Team Avision",
        "faculty_logo": "AVISION",
        "category_id": "ssc",
        "language": "Hindi + English",
        "duration": "8 Months",
        "start_date": "05 August 2026",
        "start_date_short": "05 Aug '26",
        "sessions_count": 300,
        "mock_tests_count": 250,
        "features": [
            "300+ Live Classes",
            "250+ Full-length Mocks + PYQs",
            "Complete Study Material",
            "Weekly Doubt Sessions",
            "Answer-writing Practice",
        ],
        "banner_image": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80",
        "gradient": ["#7C3AED", "#4C1D95"],
        "accent": "#F59E0B",
        "price": 29999,
        "offer_price": 14999,
        "discount_pct": 50,
        "is_limited_offer": False,
        "offer_valid_till": None,
        "eligibility": "Graduation Pass",
        "cta": "Enroll Now",
        "display_order": 3,
        "status": "active",
    },
    {
        "id": "lb4",
        "batch_label": "PRE + MAINS 2026",
        "name": "UPSC Foundation Batch",
        "exam_name": "UPSC CSE Prelims + Mains",
        "faculty": "By Dr. Anjali Rao & Panel",
        "faculty_logo": "AVISION",
        "category_id": "upsc",
        "language": "English",
        "duration": "12 Months",
        "start_date": "10 September 2026",
        "start_date_short": "10 Sep '26",
        "sessions_count": 450,
        "mock_tests_count": 120,
        "features": [
            "450+ Live Classes",
            "GS + CSAT + Optional",
            "120+ Mocks with detailed analysis",
            "Answer-writing evaluation",
            "Personal Mentorship",
        ],
        "banner_image": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80",
        "gradient": ["#B45309", "#7C2D12"],
        "accent": "#FCD34D",
        "price": 49999,
        "offer_price": 24999,
        "discount_pct": 50,
        "is_limited_offer": True,
        "offer_valid_till": "Founding-batch pricing",
        "eligibility": "Graduation Pass",
        "cta": "Enroll Now",
        "display_order": 4,
        "status": "active",
    },
    {
        "id": "lb5",
        "batch_label": "RAILWAY NTPC 2026",
        "name": "RRB NTPC Complete Batch",
        "exam_name": "RRB NTPC CBT-1 + CBT-2",
        "faculty": "By Sanjay Sir & Team",
        "faculty_logo": "AVISION",
        "category_id": "railway",
        "language": "Hindi",
        "duration": "5 Months",
        "start_date": "01 August 2026",
        "start_date_short": "01 Aug '26",
        "sessions_count": 180,
        "mock_tests_count": 90,
        "features": [
            "180+ Live Sessions",
            "90+ Mocks + Previous Year Papers",
            "Complete Notes PDF",
            "Weekend Doubt Session",
        ],
        "banner_image": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&q=80",
        "gradient": ["#059669", "#064E3B"],
        "accent": "#FBBF24",
        "price": 14999,
        "offer_price": 7999,
        "discount_pct": 47,
        "is_limited_offer": True,
        "offer_valid_till": "Last 2 Days!",
        "eligibility": "10+2 Pass",
        "cta": "Enroll Now",
        "display_order": 5,
        "status": "active",
    },
]


def _filter_cat(items, cid: Optional[str]):
    if not cid:
        return items
    return [i for i in items if i.get("category_id") == cid]


router = APIRouter(prefix="/api/live-batches", tags=["live-batches"])


@router.get("")
async def list_batches(category: Optional[str] = None, limit: int = 20):
    items = [i for i in SEED_BATCHES if i.get("status") == "active"]
    filtered = _filter_cat(items, category) if category else items
    # If category filter kills all results, fall back to universal batches
    if not filtered:
        filtered = items
    filtered = sorted(filtered, key=lambda x: x.get("display_order", 99))
    return {"batches": filtered[:limit]}


@router.get("/{bid}")
async def batch_detail(bid: str):
    b = next((x for x in SEED_BATCHES if x["id"] == bid), None)
    if not b:
        raise HTTPException(404, "Live batch not found")
    return b
