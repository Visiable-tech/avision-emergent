from fastapi import FastAPI, APIRouter, HTTPException, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone

from emergentintegrations.llm.chat import LlmChat, UserMessage

from seed_data import (
    EXAM_CATEGORIES,
    default_exam_detail,
    QUICK_ACCESS,
    COURSES,
    LIVE_CLASSES,
    CURRENT_AFFAIRS,
    DAILY_QUIZ,
    LEADERBOARD,
    PROFILE,
    MOCK_TESTS,
)
from auth import init_auth, make_router, ensure_indexes, get_optional_user, get_current_user

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

app = FastAPI(title="Avision Institute API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Wire auth
init_auth(db)


def _get_courses():
    return COURSES


auth_router = make_router(_get_courses)
app.include_router(auth_router)


@app.on_event("startup")
async def _startup():
    await ensure_indexes(db)


# ---------------- Models ----------------
class ChatRequest(BaseModel):
    session_id: str
    message: str
    mode: Optional[str] = "tutor"  # tutor | planner


class ChatResponse(BaseModel):
    session_id: str
    reply: str
    timestamp: str


class PlannerRequest(BaseModel):
    exam: str
    hours_per_day: int
    weak_subjects: List[str]
    target_date: str


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    answers: List[int]


class QuizResultQuestion(BaseModel):
    id: str
    text: str
    your_answer: int
    correct_answer: int
    is_correct: bool
    explanation: str


class QuizResult(BaseModel):
    quiz_id: str
    score: int
    total: int
    correct: int
    wrong: int
    accuracy: float
    coins_earned: int
    xp_earned: int
    questions: List[QuizResultQuestion]


# ---------------- Content endpoints ----------------
@api_router.get("/")
async def root():
    return {"message": "Avision Institute API", "status": "ok"}


@api_router.get("/greeting")
async def greeting(user: Optional[dict] = Depends(get_optional_user)):
    hour = datetime.now(timezone.utc).hour + 5  # rough IST
    hour = hour % 24
    if hour < 12:
        g = "Good Morning"
    elif hour < 17:
        g = "Good Afternoon"
    else:
        g = "Good Evening"
    if user:
        first = (user.get("name") or "Student").split(" ")[0]
        return {"greeting": g, "name": first, "streak": user.get("streak", 0), "coins": user.get("coins", 0), "xp": user.get("xp", 0)}
    return {"greeting": g, "name": PROFILE["name"].split(" ")[0], "streak": PROFILE["streak"], "coins": PROFILE["coins"], "xp": PROFILE["xp"]}


@api_router.get("/quick-access")
async def quick_access():
    return {"items": QUICK_ACCESS}


@api_router.get("/exam-categories")
async def exam_categories():
    return {"categories": EXAM_CATEGORIES}


@api_router.get("/exams/{exam_id}")
async def exam_detail(exam_id: str):
    name = exam_id
    for cat in EXAM_CATEGORIES:
        for e in cat["exams"]:
            if e["id"] == exam_id:
                name = e["name"]
                break
    return default_exam_detail(exam_id, name)


@api_router.get("/courses")
async def courses(active_only: bool = False):
    src = [c for c in COURSES if (c.get("active", True) or not active_only)]
    return {"courses": [{k: v for k, v in c.items() if k != "chapters"} for c in src]}


@api_router.get("/courses/active")
async def active_courses():
    """Only active courses – used for the Registration → Course Selection step."""
    src = [c for c in COURSES if c.get("active", True)]
    return {"courses": [
        {"id": c["id"], "title": c["title"], "subject": c["subject"], "instructor": c["instructor"],
         "duration_hours": c["duration_hours"], "rating": c["rating"], "students": c["students"],
         "thumbnail": c["thumbnail"]}
        for c in src
    ]}


@api_router.get("/courses/{course_id}")
async def course_detail(course_id: str):
    for c in COURSES:
        if c["id"] == course_id:
            return c
    raise HTTPException(404, "Course not found")


@api_router.get("/live-classes")
async def live_classes():
    return {"classes": LIVE_CLASSES}


@api_router.get("/current-affairs")
async def current_affairs():
    return {"articles": CURRENT_AFFAIRS}


@api_router.get("/current-affairs/{article_id}")
async def current_affairs_detail(article_id: str):
    for a in CURRENT_AFFAIRS:
        if a["id"] == article_id:
            return a
    raise HTTPException(404, "Article not found")


@api_router.get("/daily-quiz")
async def daily_quiz():
    # Strip correct answers for client-side quiz
    quiz = {**DAILY_QUIZ}
    quiz["questions"] = [
        {"id": q["id"], "text": q["text"], "options": q["options"]}
        for q in DAILY_QUIZ["questions"]
    ]
    return quiz


@api_router.post("/quiz/submit", response_model=QuizResult)
async def quiz_submit(req: QuizSubmitRequest):
    if req.quiz_id != DAILY_QUIZ["id"]:
        raise HTTPException(404, "Quiz not found")
    total = len(DAILY_QUIZ["questions"])
    correct = 0
    detail: List[QuizResultQuestion] = []
    for i, q in enumerate(DAILY_QUIZ["questions"]):
        ans = req.answers[i] if i < len(req.answers) else -1
        is_correct = ans == q["correct"]
        if is_correct:
            correct += 1
        detail.append(QuizResultQuestion(
            id=q["id"], text=q["text"], your_answer=ans, correct_answer=q["correct"],
            is_correct=is_correct, explanation=q["explanation"],
        ))
    wrong = total - correct
    accuracy = round((correct / total) * 100, 1) if total else 0.0
    coins = correct * 10
    xp = correct * 20
    return QuizResult(
        quiz_id=req.quiz_id, score=correct * 4 - wrong, total=total,
        correct=correct, wrong=wrong, accuracy=accuracy,
        coins_earned=coins, xp_earned=xp, questions=detail,
    )


@api_router.get("/mock-tests")
async def mock_tests():
    return {"tests": MOCK_TESTS}


@api_router.get("/leaderboard")
async def leaderboard():
    return {"users": LEADERBOARD}


@api_router.get("/profile")
async def profile():
    return PROFILE


@api_router.get("/performance")
async def performance():
    return {
        "weekly_hours": [3.2, 4.1, 2.8, 5.0, 4.5, 6.2, 3.8],
        "accuracy_trend": [65, 68, 72, 70, 75, 78, 82],
        "subject_strength": [
            {"subject": "Quant", "score": 82},
            {"subject": "Reasoning", "score": 76},
            {"subject": "English", "score": 88},
            {"subject": "GK/CA", "score": 71},
        ],
        "weak_areas": ["Data Interpretation", "Cloze Test", "Static GK"],
        "strong_areas": ["Reading Comprehension", "Percentages", "Puzzles"],
        "completion": 62,
        "ai_suggestions": [
            "Spend 30 mins daily on DI sets to boost speed",
            "Revise Static GK from Lucent's – 20 pages/day",
            "Attempt 1 sectional test on Cloze Test this week",
        ],
    }


# ---------------- AI endpoints ----------------
def _system_prompt(mode: str) -> str:
    if mode == "planner":
        return (
            "You are the Avision Institute AI Study Planner. Create realistic, day-wise study plans "
            "for Indian competitive exams (SSC, Banking, UPSC, CLAT, CUET, IPMAT, Railway, State PSC, etc). "
            "Be concise, actionable, and encouraging. Format plans with clear headings and bullet points."
        )
    return (
        "You are the Avision Institute AI Tutor – a friendly, expert coach for Indian competitive exams. "
        "Answer doubts clearly with short worked examples. Suggest which exam suits a student based on their "
        "interest and background. Keep replies concise, structured (use bullets/headers when useful), and motivating."
    )


@api_router.post("/ai/chat", response_model=ChatResponse)
async def ai_chat(req: ChatRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI key not configured")
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=req.session_id,
            system_message=_system_prompt(req.mode or "tutor"),
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        # Load history from DB for continuity
        history_docs = await db.chat_messages.find(
            {"session_id": req.session_id}, {"_id": 0}
        ).sort("timestamp", 1).to_list(50)

        # Rebuild by replaying past user messages (simple continuity for MVP)
        for m in history_docs:
            if m.get("role") == "user":
                await chat.send_message(UserMessage(text=m["content"]))

        reply = await chat.send_message(UserMessage(text=req.message))
        ts = datetime.now(timezone.utc).isoformat()

        await db.chat_messages.insert_many([
            {"id": str(uuid.uuid4()), "session_id": req.session_id, "role": "user", "content": req.message, "timestamp": ts},
            {"id": str(uuid.uuid4()), "session_id": req.session_id, "role": "assistant", "content": reply, "timestamp": ts},
        ])
        return ChatResponse(session_id=req.session_id, reply=reply, timestamp=ts)
    except Exception as e:
        logger.exception("AI chat error")
        raise HTTPException(500, f"AI error: {str(e)}")


@api_router.get("/ai/history/{session_id}")
async def ai_history(session_id: str):
    docs = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(200)
    return {"messages": docs}


@api_router.post("/ai/reset/{session_id}")
async def ai_reset(session_id: str):
    await db.chat_messages.delete_many({"session_id": session_id})
    return {"status": "ok"}


@api_router.post("/study-planner")
async def study_planner(req: PlannerRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(500, "AI key not configured")
    prompt = (
        f"Create a concise, week-by-week study plan for the {req.exam} exam. "
        f"Student can study {req.hours_per_day} hours/day, target date is {req.target_date}. "
        f"Weak subjects: {', '.join(req.weak_subjects) if req.weak_subjects else 'None specified'}. "
        f"Format with markdown headings and short bullets. Include daily plan template, weekly targets, "
        f"revision schedule, and 3 mock tests per week. Add a short motivation line at the end."
    )
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"planner-{uuid.uuid4()}",
        system_message=_system_prompt("planner"),
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")
    try:
        plan = await chat.send_message(UserMessage(text=prompt))
        return {"plan": plan, "generated_at": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logger.exception("Planner error")
        raise HTTPException(500, f"Planner error: {str(e)}")


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
