"""Exam Info: syllabus, pattern, cut-offs, dates per exam / category."""
from typing import Optional
from fastapi import APIRouter, HTTPException


# Each exam entry attached to a category_id
SEED_EXAMS_INFO = [
    # --- Banking ---
    {
        "id": "ibps-po", "category_id": "banking",
        "name": "IBPS PO", "full_name": "IBPS Probationary Officer",
        "conducting_body": "IBPS", "mode": "Online CBT", "language": "English + Hindi",
        "exam_level": "National",
        "eligibility": "Bachelor's degree in any discipline. Age 20-30 years.",
        "salary": "₹52,000+", "posts": 4135,
        "syllabus": {
            "Prelims": ["English Language (30Q)", "Quantitative Aptitude (35Q)", "Reasoning Ability (35Q)"],
            "Mains": ["Reasoning + Computer (60Q)", "General Awareness (40Q)", "English (35Q)", "Quantitative Aptitude (35Q)", "Descriptive (Letter + Essay)"],
        },
        "pattern": [
            {"stage": "Prelims", "questions": 100, "marks": 100, "duration": "60 min"},
            {"stage": "Mains", "questions": 155, "marks": 200, "duration": "3 hr"},
            {"stage": "Interview", "questions": 0, "marks": 100, "duration": "—"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 55.75, "mains": 78.5},
            {"cat": "OBC", "prelims": 51.25, "mains": 73.5},
            {"cat": "SC", "prelims": 45.5, "mains": 68.0},
        ],
        "important_dates": [
            {"event": "Notification", "date": "05 May 2026"},
            {"event": "Apply Online", "date": "08 May – 30 Aug 2026"},
            {"event": "Prelims", "date": "Oct 2026 (tentative)"},
            {"event": "Mains", "date": "Nov 2026"},
        ],
    },
    {
        "id": "sbi-po", "category_id": "banking",
        "name": "SBI PO", "full_name": "SBI Probationary Officer",
        "conducting_body": "State Bank of India", "mode": "Online CBT", "language": "English + Hindi",
        "exam_level": "National",
        "eligibility": "Bachelor's degree. Age 21-30 years.",
        "salary": "₹48,000+", "posts": 2000,
        "syllabus": {
            "Prelims": ["English Language", "Quantitative Aptitude", "Reasoning Ability"],
            "Mains": ["Reasoning + Computer", "Data Interpretation & Analysis", "General/Banking Awareness", "English", "Descriptive Test"],
            "Phase III": ["Group Exercise", "Personal Interview"],
        },
        "pattern": [
            {"stage": "Prelims", "questions": 100, "marks": 100, "duration": "60 min"},
            {"stage": "Mains", "questions": 157, "marks": 250, "duration": "3 hr 30 min"},
            {"stage": "GE + PI", "questions": 0, "marks": 50, "duration": "—"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 58.25, "mains": 82.5},
            {"cat": "OBC", "prelims": 54.0, "mains": 78.0},
        ],
        "important_dates": [
            {"event": "Notification", "date": "03 May 2026"},
            {"event": "Apply Last", "date": "18 Aug 2026"},
        ],
    },
    # --- SSC ---
    {
        "id": "ssc-cgl", "category_id": "ssc",
        "name": "SSC CGL", "full_name": "Staff Selection Commission – CGL",
        "conducting_body": "SSC", "mode": "Online CBT + Descriptive", "language": "English + Hindi",
        "exam_level": "National",
        "eligibility": "Bachelor's degree. Age 18-32 years (varies by post).",
        "salary": "₹35,000+", "posts": 17727,
        "syllabus": {
            "Tier 1": ["General Intelligence & Reasoning", "General Awareness", "Quantitative Aptitude", "English Comprehension"],
            "Tier 2": ["Mathematical Abilities", "Reasoning", "English", "General Awareness", "Computer Knowledge", "DEST/Statistics"],
        },
        "pattern": [
            {"stage": "Tier 1", "questions": 100, "marks": 200, "duration": "60 min"},
            {"stage": "Tier 2", "questions": 150, "marks": 450, "duration": "2 hr 15 min"},
            {"stage": "Tier 3 (Skill Test)", "questions": 0, "marks": 0, "duration": "Qualifying"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 135.25, "mains": 480.5},
            {"cat": "OBC", "prelims": 128.5, "mains": 465.0},
        ],
        "important_dates": [
            {"event": "Notification", "date": "04 May 2026"},
            {"event": "Apply Last", "date": "12 Sep 2026"},
            {"event": "Tier 1", "date": "Dec 2026"},
        ],
    },
    {
        "id": "ssc-chsl", "category_id": "ssc",
        "name": "SSC CHSL", "full_name": "Combined Higher Secondary Level",
        "conducting_body": "SSC", "mode": "Online CBT", "language": "English + Hindi",
        "exam_level": "National",
        "eligibility": "10+2 pass. Age 18-27 years.",
        "salary": "₹28,000+", "posts": 3712,
        "syllabus": {
            "Tier 1": ["English", "General Intelligence", "Quantitative Aptitude", "General Awareness"],
            "Tier 2": ["Section I: Math + Reasoning", "Section II: English + GA", "Section III: Computer + Skill Test"],
        },
        "pattern": [
            {"stage": "Tier 1", "questions": 100, "marks": 200, "duration": "60 min"},
            {"stage": "Tier 2", "questions": 135, "marks": 405, "duration": "2 hr 15 min"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 148.25, "mains": 175.0},
        ],
        "important_dates": [
            {"event": "Notification", "date": "29 Apr 2026"},
            {"event": "Apply Last", "date": "05 Sep 2026"},
        ],
    },
    # --- UPSC ---
    {
        "id": "upsc-cse", "category_id": "upsc",
        "name": "UPSC CSE", "full_name": "UPSC Civil Services Examination",
        "conducting_body": "UPSC", "mode": "Offline (OMR + Written)", "language": "English + Hindi",
        "exam_level": "National",
        "eligibility": "Bachelor's degree. Age 21-32 years.",
        "salary": "₹56,100+", "posts": 1056,
        "syllabus": {
            "Prelims": ["GS Paper I (100Q, 200M)", "CSAT Paper II (80Q, 200M)"],
            "Mains": ["Essay", "GS I-IV (250M each)", "Optional Paper I & II"],
            "Interview": ["Personality Test (275M)"],
        },
        "pattern": [
            {"stage": "Prelims", "questions": 180, "marks": 400, "duration": "4 hr (2x2)"},
            {"stage": "Mains", "questions": 0, "marks": 1750, "duration": "27 hr (9 papers)"},
            {"stage": "Interview", "questions": 0, "marks": 275, "duration": "~30 min"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 88.22, "mains": 748},
            {"cat": "OBC", "prelims": 85.5, "mains": 741},
        ],
        "important_dates": [
            {"event": "Notification", "date": "26 Apr 2026"},
            {"event": "Apply Last", "date": "10 Jul 2026"},
            {"event": "Prelims", "date": "25 May 2026"},
        ],
    },
    # --- Railway ---
    {
        "id": "rrb-ntpc", "category_id": "railway",
        "name": "RRB NTPC", "full_name": "Non-Technical Popular Categories",
        "conducting_body": "Railway Recruitment Board", "mode": "Online CBT", "language": "English + Hindi + Regional",
        "exam_level": "National",
        "eligibility": "12th / Graduation depending on post. Age 18-33 years.",
        "salary": "₹32,000+", "posts": 35281,
        "syllabus": {
            "CBT-1": ["General Awareness", "Mathematics", "General Intelligence & Reasoning"],
            "CBT-2": ["General Awareness", "Mathematics", "Reasoning"],
        },
        "pattern": [
            {"stage": "CBT-1", "questions": 100, "marks": 100, "duration": "90 min"},
            {"stage": "CBT-2", "questions": 120, "marks": 120, "duration": "90 min"},
            {"stage": "Skill Test / Typing", "questions": 0, "marks": 0, "duration": "Qualifying"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 77.5, "mains": 82.4},
        ],
        "important_dates": [
            {"event": "Notification", "date": "01 May 2026"},
            {"event": "Apply Last", "date": "22 Aug 2026"},
        ],
    },
    # --- State-Exams ---
    {
        "id": "wbcs", "category_id": "state-exams",
        "name": "WBCS", "full_name": "West Bengal Civil Service",
        "conducting_body": "WBPSC", "mode": "Offline", "language": "English + Bengali",
        "exam_level": "State",
        "eligibility": "Bachelor's degree. Age 21-36 years.",
        "salary": "₹56,100+", "posts": 456,
        "syllabus": {
            "Prelims": ["General Studies (200M, 25 min)", "8 subjects to choose"],
            "Mains": ["6 Compulsory Papers + 2 Optional Papers"],
            "Personality Test": ["200 Marks"],
        },
        "pattern": [
            {"stage": "Prelims", "questions": 200, "marks": 200, "duration": "2 hr 30 min"},
            {"stage": "Mains", "questions": 0, "marks": 1600, "duration": "3 hr each"},
            {"stage": "Interview", "questions": 0, "marks": 200, "duration": "—"},
        ],
        "cutoff_prev_year": [
            {"cat": "General", "prelims": 132, "mains": 728},
        ],
        "important_dates": [
            {"event": "Notification", "date": "15 Apr 2026"},
            {"event": "Apply Last", "date": "31 Aug 2026"},
        ],
    },
]


router = APIRouter(prefix="/api/exam-info", tags=["exam-info"])


@router.get("")
async def list_exam_info(category: Optional[str] = None):
    items = [x for x in SEED_EXAMS_INFO if not category or x.get("category_id") == category]
    if not items:
        items = SEED_EXAMS_INFO[:3]
    return {"exams": items}


@router.get("/{eid}")
async def exam_info_detail(eid: str):
    x = next((e for e in SEED_EXAMS_INFO if e["id"] == eid), None)
    if not x:
        raise HTTPException(404, "Exam not found")
    return x
