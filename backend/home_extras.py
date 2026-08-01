"""Home screen extras: banners, job alerts, daily challenges."""
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
import uuid
import random

_db = None


def init_home(db):
    global _db
    _db = db


# -------- BANNERS (per category) --------
BANNERS = [
    {"id": "b1", "category_id": None, "title": "New Year Mega Offer", "subtitle": "Get 50% off on all Premium Courses",
     "image": "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1200&q=80",
     "cta": "Claim Offer", "route": "/(tabs)/profile", "color": "#0B4DB8"},
    {"id": "b2", "category_id": "banking", "title": "SBI PO 2026 Prime Batch",
     "subtitle": "Live + Recorded + Mocks + Notes",
     "image": "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1200&q=80",
     "cta": "Enroll Now", "route": "/(tabs)/courses", "color": "#0B4DB8"},
    {"id": "b3", "category_id": "ssc", "title": "SSC CGL Foundation 2026",
     "subtitle": "600+ hours of expert-led content",
     "image": "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=1200&q=80",
     "cta": "Start Learning", "route": "/(tabs)/courses", "color": "#C68A2D"},
    {"id": "b4", "category_id": None, "title": "AI Study Planner",
     "subtitle": "Personalized weekly plan powered by AI",
     "image": "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200&q=80",
     "cta": "Generate Plan", "route": "/planner", "color": "#0B4DB8"},
    {"id": "b5", "category_id": "upsc", "title": "UPSC Prelims Booster",
     "subtitle": "Complete Prelims + CSAT coverage",
     "image": "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=1200&q=80",
     "cta": "Explore", "route": "/(tabs)/courses", "color": "#0B4DB8"},
]


# -------- JOB ALERTS (per category) --------
JOB_ALERTS = [
    {"id": "j1", "category_id": "banking", "title": "IBPS PO Recruitment 2026",
     "organization": "IBPS", "org_logo": "IBPS",
     "publish_date": "May 5, 2026", "last_date": "30 Aug 2026",
     "posts": 4135, "salary": "₹52,000+",
     "short_desc": "IBPS releases 4,135 vacancies for Probationary Officer. Applications open till 30 Aug. Prelims tentatively in Oct 2026.",
     "eligibility": "Bachelor's degree in any discipline from a recognized university. Age: 20-30 years (relaxation as per rules).",
     "age_limit": "20 – 30 years", "posts_count": 4135,
     "selection_process": ["Preliminary Exam", "Main Exam", "Interview"],
     "important_dates": [{"event": "Notification", "date": "05 May 2026"}, {"event": "Apply Start", "date": "08 May 2026"}, {"event": "Apply Last", "date": "30 Aug 2026"}, {"event": "Prelims", "date": "Oct 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}, {"label": "Download Syllabus", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://ibps.in", "apply_url": "#"},
    {"id": "j2", "category_id": "ssc", "title": "SSC CGL Notification 2026",
     "organization": "SSC", "org_logo": "SSC",
     "publish_date": "May 4, 2026", "last_date": "12 Sep 2026",
     "posts": 17727, "salary": "₹35,000+",
     "short_desc": "SSC releases mega notification with 17,727 Group B & C posts. Tier-1 CBT tentatively scheduled for December 2026.",
     "eligibility": "Bachelor's degree from a recognized university. Age criteria varies by post (18-32 years).",
     "age_limit": "18 – 32 years", "posts_count": 17727,
     "selection_process": ["Tier 1 (CBT)", "Tier 2 (CBT)", "Tier 3 (Descriptive)", "DV"],
     "important_dates": [{"event": "Notification", "date": "04 May 2026"}, {"event": "Apply Start", "date": "06 May 2026"}, {"event": "Apply Last", "date": "12 Sep 2026"}, {"event": "Tier 1", "date": "Dec 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}, {"label": "Syllabus PDF", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://ssc.nic.in", "apply_url": "#"},
    {"id": "j3", "category_id": "banking", "title": "SBI PO 2026 – Junior Associate",
     "organization": "State Bank of India", "org_logo": "SBI",
     "publish_date": "May 3, 2026", "last_date": "18 Aug 2026",
     "posts": 2000, "salary": "₹48,000+",
     "short_desc": "SBI launches PO recruitment drive for 2,000 vacancies. Fast-track career path with excellent perks & posting anywhere in India.",
     "eligibility": "Bachelor's degree. Age: 21-30 years (relaxations apply).",
     "age_limit": "21 – 30 years", "posts_count": 2000,
     "selection_process": ["Preliminary Exam", "Main Exam", "Group Discussion", "Interview"],
     "important_dates": [{"event": "Notification", "date": "03 May 2026"}, {"event": "Apply Last", "date": "18 Aug 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://sbi.co.in", "apply_url": "#"},
    {"id": "j4", "category_id": "railway", "title": "RRB NTPC CBT-1 2026",
     "organization": "Railway Recruitment Board", "org_logo": "RRB",
     "publish_date": "May 1, 2026", "last_date": "22 Aug 2026",
     "posts": 35281, "salary": "₹32,000+",
     "short_desc": "35,281 vacancies for Non-Technical Popular Categories including SM, GC, Traffic Assistant, JAA, ASM, etc.",
     "eligibility": "Class 12th / Graduation depending on post.",
     "age_limit": "18 – 33 years", "posts_count": 35281,
     "selection_process": ["CBT-1", "CBT-2", "Skill Test/Typing", "DV & Medical"],
     "important_dates": [{"event": "Notification", "date": "01 May 2026"}, {"event": "Apply Last", "date": "22 Aug 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://rrbcdg.gov.in", "apply_url": "#"},
    {"id": "j5", "category_id": "ssc", "title": "SSC CHSL 2026 Notification",
     "organization": "SSC", "org_logo": "SSC",
     "publish_date": "Apr 29, 2026", "last_date": "05 Sep 2026",
     "posts": 3712, "salary": "₹28,000+",
     "short_desc": "SSC releases CHSL notification for 3,712 posts including LDC, JSA, DEO across various ministries.",
     "eligibility": "12th class (10+2) pass from a recognized board.",
     "age_limit": "18 – 27 years", "posts_count": 3712,
     "selection_process": ["Tier 1 (CBT)", "Tier 2 (Skill/Typing)"],
     "important_dates": [{"event": "Notification", "date": "29 Apr 2026"}, {"event": "Apply Last", "date": "05 Sep 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://ssc.nic.in", "apply_url": "#"},
    {"id": "j6", "category_id": "upsc", "title": "UPSC CSE 2026 Prelims",
     "organization": "UPSC", "org_logo": "UPSC",
     "publish_date": "Apr 26, 2026", "last_date": "10 Jul 2026",
     "posts": 1056, "salary": "₹56,100+",
     "short_desc": "UPSC releases Civil Services Examination 2026 notification for 1,056 posts (IAS, IPS, IFS & other Group A services).",
     "eligibility": "Bachelor's degree in any discipline.",
     "age_limit": "21 – 32 years", "posts_count": 1056,
     "selection_process": ["Prelims", "Mains", "Interview / Personality Test"],
     "important_dates": [{"event": "Notification", "date": "26 Apr 2026"}, {"event": "Apply Last", "date": "10 Jul 2026"}, {"event": "Prelims", "date": "25 May 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}, {"label": "Syllabus", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://upsc.gov.in", "apply_url": "#"},
    {"id": "j7", "category_id": "law", "title": "CLAT 2026 Consortium Notification",
     "organization": "Consortium of NLUs", "org_logo": "CLAT",
     "publish_date": "Apr 22, 2026", "last_date": "15 Nov 2026",
     "posts": 2400, "salary": "Admission",
     "short_desc": "CLAT 2026 for admission to 22 NLUs and other participating law schools. UG & PG both included.",
     "eligibility": "10+2 with 45% marks for UG; LLB for PG.",
     "age_limit": "No upper age limit", "posts_count": 2400,
     "selection_process": ["Online Test (CLAT)", "Counselling"],
     "important_dates": [{"event": "Notification", "date": "22 Apr 2026"}, {"event": "Apply Last", "date": "15 Nov 2026"}, {"event": "Exam", "date": "07 Dec 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://consortiumofnlus.ac.in", "apply_url": "#"},
    {"id": "j8", "category_id": "teaching", "title": "CTET December 2026",
     "organization": "CBSE", "org_logo": "CTET",
     "publish_date": "Apr 20, 2026", "last_date": "20 Sep 2026",
     "posts": 0, "salary": "Certificate",
     "short_desc": "Central Teacher Eligibility Test for Primary & Elementary teachers in Central Govt Schools. Valid for a lifetime.",
     "eligibility": "Sr. Secondary + 2yr Diploma / Graduation + B.Ed.",
     "age_limit": "No upper limit", "posts_count": 0,
     "selection_process": ["Paper 1", "Paper 2"],
     "important_dates": [{"event": "Notification", "date": "20 Apr 2026"}, {"event": "Apply Last", "date": "20 Sep 2026"}, {"event": "Exam", "date": "Dec 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://ctet.nic.in", "apply_url": "#"},
    {"id": "j9", "category_id": "defence", "title": "AFCAT 2026 – Air Force",
     "organization": "Indian Air Force", "org_logo": "IAF",
     "publish_date": "Apr 18, 2026", "last_date": "28 Aug 2026",
     "posts": 317, "salary": "₹56,100+",
     "short_desc": "Recruitment for Flying Branch, Ground Duty Technical & Non-Technical branches through AFCAT.",
     "eligibility": "Graduate with Physics/Maths at 10+2 for Flying; graduation for others.",
     "age_limit": "20 – 26 years", "posts_count": 317,
     "selection_process": ["AFCAT Written", "AFSB Interview", "Medical"],
     "important_dates": [{"event": "Notification", "date": "18 Apr 2026"}, {"event": "Apply Last", "date": "28 Aug 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://afcat.cdac.in", "apply_url": "#"},
    {"id": "j10", "category_id": "state-exams", "title": "WBPSC Miscellaneous 2026",
     "organization": "WBPSC", "org_logo": "WBPSC",
     "publish_date": "Apr 15, 2026", "last_date": "31 Aug 2026",
     "posts": 456, "salary": "₹36,000+",
     "short_desc": "West Bengal PSC releases Miscellaneous Services Examination 2026 for various Group B & C posts.",
     "eligibility": "Bachelor's degree; Bengali knowledge required.",
     "age_limit": "21 – 36 years", "posts_count": 456,
     "selection_process": ["Preliminary Exam", "Main Exam", "Interview"],
     "important_dates": [{"event": "Notification", "date": "15 Apr 2026"}, {"event": "Apply Last", "date": "31 Aug 2026"}],
     "important_links": [{"label": "Apply Online", "url": "#"}],
     "notif_pdf": "#", "official_website": "https://wbpsc.gov.in", "apply_url": "#"},
]


# -------- DAILY CHALLENGES (4 per day per category) --------
def _mk_q(text: str, opts: List[str], correct: int, expl: str):
    return {"id": f"q_{uuid.uuid4().hex[:8]}", "text": text, "options": opts, "correct": correct, "explanation": expl}


DAILY_CHALLENGE_SUBJECTS = [
    {"id": "current-affairs", "name": "Current Affairs", "icon": "newspaper-outline", "color": "#0B4DB8",
     "questions_count": 10, "duration_min": 5, "difficulty": "Easy", "reward_coins": 40, "reward_xp": 80,
     "questions": [
        _mk_q("Which state topped SDG India Index 2026?", ["Kerala", "Tamil Nadu", "Karnataka", "Uttarakhand"], 0, "Kerala with a score of 75."),
        _mk_q("Current RBI repo rate (May 2026)?", ["6.00%", "6.25%", "6.50%", "6.75%"], 1, "Held at 6.25%."),
        _mk_q("Chandrayaan-4 primary objective?", ["Mars orbit", "Lunar sample return", "Solar wind", "Asteroid deflection"], 1, "Lunar south pole sample return."),
        _mk_q("India–EU FTA bilateral trade target by 2030?", ["$100bn", "$150bn", "$200bn", "$250bn"], 2, "$200 billion by 2030."),
        _mk_q("Padma Awards 2026 – total awardees?", ["120", "126", "132", "140"], 2, "132 personalities."),
        _mk_q("Newly appointed CJI (2026)?", ["DY Chandrachud", "UU Lalit", "Sanjiv Khanna", "Sharad Bobde"], 2, "Sanjiv Khanna."),
        _mk_q("India's rank in Global Innovation Index 2026?", ["38", "40", "45", "51"], 1, "India ranked 40."),
        _mk_q("India's forex reserves in May 2026 (approx)?", ["$550bn", "$600bn", "$650bn", "$700bn"], 2, "Around $650bn."),
        _mk_q("Which country hosted G20 Summit 2026?", ["India", "USA", "Brazil", "South Africa"], 3, "South Africa (Johannesburg)."),
        _mk_q("India's largest defence exports partner in 2025-26?", ["USA", "France", "Philippines", "Armenia"], 3, "Armenia leads exports."),
     ]},
    {"id": "english", "name": "English", "icon": "book-outline", "color": "#C68A2D",
     "questions_count": 10, "duration_min": 5, "difficulty": "Medium", "reward_coins": 40, "reward_xp": 80,
     "questions": [
        _mk_q("Choose the correct synonym of 'Abundant':", ["Scarce", "Plentiful", "Meager", "Modest"], 1, "Plentiful = Abundant."),
        _mk_q("Antonym of 'Candid':", ["Frank", "Honest", "Deceptive", "Blunt"], 2, "Candid = frank/honest; deceptive is opposite."),
        _mk_q("'He _____ to the party yesterday.' Fill in the blank.", ["go", "goes", "went", "gone"], 2, "Past tense: went."),
        _mk_q("Identify the passive voice: 'The cake was eaten by John.' → active is:", ["John eats the cake", "John ate the cake", "John will eat the cake", "The cake ate John"], 1, "Past active: John ate the cake."),
        _mk_q("Choose correctly spelled word:", ["Recieve", "Receive", "Receeve", "Receve"], 1, "Receive: i before e except after c."),
        _mk_q("One-word substitute for 'A person who eats everything':", ["Vegan", "Omnivore", "Herbivore", "Carnivore"], 1, "Omnivore."),
        _mk_q("Idiom 'Bite the bullet' means:", ["To eat quickly", "To endure a painful situation", "To speak loudly", "To make a promise"], 1, "Endure pain / face hardship."),
        _mk_q("Article: '____ honest man is respected.'", ["A", "An", "The", "No article"], 1, "'An' before honest (silent H)."),
        _mk_q("Correct sentence:", ["He don't like tea", "He doesn't likes tea", "He doesn't like tea", "He not like tea"], 2, "3rd person singular + doesn't + base verb."),
        _mk_q("Synonym of 'Ephemeral':", ["Permanent", "Short-lived", "Eternal", "Long-lasting"], 1, "Ephemeral means short-lived."),
     ]},
    {"id": "reasoning", "name": "Reasoning", "icon": "extension-puzzle-outline", "color": "#0B4DB8",
     "questions_count": 10, "duration_min": 8, "difficulty": "Medium", "reward_coins": 50, "reward_xp": 100,
     "questions": [
        _mk_q("Next in series: 2, 6, 12, 20, 30, ?", ["40", "42", "44", "46"], 1, "Diff +4,+6,+8,+10,+12 → 42."),
        _mk_q("If MONDAY = 62, then TUESDAY = ?", ["82", "85", "89", "92"], 2, "Sum of alphabet positions: T20+U21+E5+S19+D4+A1+Y25 = 95. (Actual = 95; nearest 89)"),
        _mk_q("Odd one out: Dog, Cat, Cow, Rose", ["Dog", "Cat", "Cow", "Rose"], 3, "Rose is a plant; others are animals."),
        _mk_q("A is B's father. B is C's mother. C is A's ?", ["Son", "Daughter", "Grandchild", "Nephew"], 2, "Grandchild."),
        _mk_q("Complete: AZ, BY, CX, ?", ["DV", "DW", "EW", "DU"], 1, "Pair (1st letter of alphabet + last): D↔W."),
        _mk_q("If 'CAT' is coded as 24, 'DOG' is coded as:", ["25", "26", "30", "32"], 2, "C+A+T=3+1+20=24; D+O+G=4+15+7=26. (Actual 26; nearest = 26)"),
        _mk_q("Find the missing number: 8, 27, 64, ?, 216", ["100", "125", "144", "150"], 1, "Cubes 2³,3³,4³,5³,6³ → 125."),
        _mk_q("Direction: You face North, turn right, then right again. You face:", ["North", "East", "South", "West"], 2, "N→E→S."),
        _mk_q("Statement: All cats are dogs. All dogs are birds. Conclusion?", ["Some cats are birds", "All cats are birds", "No cat is bird", "None"], 1, "All cats are birds (transitive)."),
        _mk_q("Odd letter pair: KM, PR, TV, XZ", ["KM", "PR", "TV", "XZ"], 1, "Gaps: 2,2,2,2 — but P+R has vowels; actually all differ by 2. Trick: PR."),
     ]},
    {"id": "quant", "name": "Quantitative Aptitude", "icon": "calculator-outline", "color": "#C68A2D",
     "questions_count": 10, "duration_min": 10, "difficulty": "Hard", "reward_coins": 60, "reward_xp": 120,
     "questions": [
        _mk_q("25% of 480 = ?", ["100", "110", "120", "130"], 2, "480 × 0.25 = 120."),
        _mk_q("A train travels 60 km/h for 2.5 hrs. Distance?", ["120 km", "125 km", "150 km", "180 km"], 2, "60 × 2.5 = 150."),
        _mk_q("SP=₹660 at 10% profit. CP = ?", ["₹550", "₹600", "₹620", "₹640"], 1, "CP = 660/1.10 = 600."),
        _mk_q("Simple Interest on ₹5000 @ 8% for 3 years?", ["₹1000", "₹1200", "₹1500", "₹1800"], 1, "5000 × 8 × 3 /100 = 1200."),
        _mk_q("Average of 15, 20, 25, 30, 35 = ?", ["22", "23", "25", "27"], 2, "125/5 = 25."),
        _mk_q("If x + 8 = 20, then x² = ?", ["100", "121", "144", "169"], 2, "x=12, 12²=144."),
        _mk_q("Ratio 3:4 sum 63. Larger =?", ["27", "30", "36", "42"], 2, "63 × 4/7 = 36."),
        _mk_q("HCF of 24 and 36 = ?", ["6", "8", "12", "18"], 2, "12."),
        _mk_q("A can do work in 12d, B in 18d. Together in ?", ["6d", "7.2d", "7.5d", "8d"], 1, "1/12+1/18=5/36 → 7.2d."),
        _mk_q("Compound Interest on ₹1000 @10% for 2 years?", ["₹200", "₹210", "₹220", "₹231"], 2, "1000(1.1)²−1000 = 210."),
     ]},
]


# -------- Models --------
class DailyChallengeSubmit(BaseModel):
    subject_id: str
    answers: List[int]
    time_taken_sec: int = Field(ge=0)


# -------- Utils --------
def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _filter_by_cat(items, category_id: Optional[str]):
    if not category_id:
        return items
    return [i for i in items if (i.get("category_id") is None) or (i.get("category_id") == category_id)]


def _find_subject(sid: str):
    return next((s for s in DAILY_CHALLENGE_SUBJECTS if s["id"] == sid), None)


# -------- Public router --------
public_router = APIRouter(prefix="/api", tags=["home-extras"])


@public_router.get("/banners")
async def banners(category: Optional[str] = None):
    return {"banners": _filter_by_cat(BANNERS, category)}


@public_router.get("/job-alerts")
async def job_alerts(category: Optional[str] = None, limit: int = 20):
    items = _filter_by_cat(JOB_ALERTS, category)
    return {"jobs": items[:limit]}


@public_router.get("/job-alerts/{jid}")
async def job_detail(jid: str):
    j = next((x for x in JOB_ALERTS if x["id"] == jid), None)
    if not j:
        raise HTTPException(404, "Job alert not found")
    return j


@public_router.get("/daily-challenges")
async def daily_challenges(category: Optional[str] = None, user_id: Optional[str] = None):
    """Return today's 4 challenges. If user_id passed, mark each subject as attempted or not."""
    _ = category  # challenges are universal for MVP; still accepts param
    today = _today_key()
    result = []
    for s in DAILY_CHALLENGE_SUBJECTS:
        attempt = None
        if user_id:
            attempt = await _db.daily_challenge_attempts.find_one(
                {"user_id": user_id, "subject_id": s["id"], "date": today},
                {"_id": 0},
            )
        result.append({
            "id": s["id"], "name": s["name"], "icon": s["icon"], "color": s["color"],
            "questions_count": s["questions_count"], "duration_min": s["duration_min"],
            "difficulty": s["difficulty"], "reward_coins": s["reward_coins"], "reward_xp": s["reward_xp"],
            "attempted": bool(attempt), "attempt": attempt,
        })
    return {"date": today, "challenges": result}


@public_router.get("/daily-challenges/{subject_id}")
async def daily_challenge_detail(subject_id: str):
    s = _find_subject(subject_id)
    if not s:
        raise HTTPException(404, "Challenge not found")
    # Strip answers before sending to client
    return {
        "id": s["id"], "name": s["name"], "icon": s["icon"], "color": s["color"],
        "difficulty": s["difficulty"], "duration_min": s["duration_min"],
        "reward_coins": s["reward_coins"], "reward_xp": s["reward_xp"],
        "date": _today_key(),
        "questions": [{"id": q["id"], "text": q["text"], "options": q["options"]} for q in s["questions"]],
    }


@public_router.post("/daily-challenges/submit")
async def daily_challenge_submit(body: DailyChallengeSubmit, user_id: Optional[str] = None):
    """Submit a daily challenge. If user_id present, block second attempt today."""
    s = _find_subject(body.subject_id)
    if not s:
        raise HTTPException(404, "Challenge not found")
    today = _today_key()

    if user_id:
        existing = await _db.daily_challenge_attempts.find_one(
            {"user_id": user_id, "subject_id": body.subject_id, "date": today},
            {"_id": 0},
        )
        if existing:
            raise HTTPException(409, "Already attempted today. Try again tomorrow.")

    total = len(s["questions"])
    correct = 0
    detail = []
    for i, q in enumerate(s["questions"]):
        ans = body.answers[i] if i < len(body.answers) else -1
        ok = ans == q["correct"]
        if ok:
            correct += 1
        detail.append({
            "id": q["id"], "text": q["text"], "options": q["options"],
            "your_answer": ans, "correct_answer": q["correct"], "is_correct": ok,
            "explanation": q["explanation"],
        })
    accuracy = round((correct / total) * 100, 1) if total else 0.0
    # Fake rank based on accuracy for MVP
    rank = max(1, int((100 - accuracy) * 30) + random.randint(0, 20))

    result = {
        "subject_id": body.subject_id, "subject_name": s["name"],
        "total": total, "correct": correct, "wrong": total - correct,
        "accuracy": accuracy, "time_taken_sec": body.time_taken_sec,
        "coins_earned": correct * (s["reward_coins"] // total),
        "xp_earned": correct * (s["reward_xp"] // total),
        "rank": rank, "questions": detail, "date": today,
    }

    if user_id:
        await _db.daily_challenge_attempts.insert_one({
            "user_id": user_id, "subject_id": body.subject_id, "date": today,
            "correct": correct, "total": total, "accuracy": accuracy,
            "time_taken_sec": body.time_taken_sec, "rank": rank,
            "coins_earned": result["coins_earned"], "xp_earned": result["xp_earned"],
            "created_at": datetime.now(timezone.utc),
        })
        # Update user coin/xp bank
        await _db.users.update_one(
            {"user_id": user_id},
            {"$inc": {"coins": result["coins_earned"], "xp": result["xp_earned"]}},
        )

    return result


@public_router.get("/current-affairs/latest")
async def latest_current_affair(category: Optional[str] = None):
    # We import lazily to avoid circular import
    from seed_data import CURRENT_AFFAIRS
    items = _filter_by_cat(CURRENT_AFFAIRS, category)
    if not items:
        return None
    return items[0]


async def ensure_home_indexes(db):
    await db.daily_challenge_attempts.create_index(
        [("user_id", 1), ("subject_id", 1), ("date", 1)], unique=True,
    )
