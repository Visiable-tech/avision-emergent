"""
AI Doubt Solver module — Phase 5.

Multi-turn Q&A with Claude Sonnet 4.6 for competitive-exam doubts.
Supports optional image attachment (student photo of question) and stores
persistent conversation threads per user.

Endpoints:
  POST /api/ai-doubt/threads                — create thread w/ optional first message
  GET  /api/ai-doubt/threads                — list user's threads
  GET  /api/ai-doubt/threads/{tid}          — thread + messages
  POST /api/ai-doubt/threads/{tid}/messages — non-streaming send (aggregated response)
  GET  /api/ai-doubt/threads/{tid}/stream   — SSE stream of last user message
  DELETE /api/ai-doubt/threads/{tid}
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from dotenv import load_dotenv

from auth import get_current_user

load_dotenv()

router = APIRouter(prefix="/api/ai-doubt", tags=["ai-doubt"])

_db: Optional[AsyncIOMotorDatabase] = None
_KEY: Optional[str] = None


def init_ai_doubt(db: AsyncIOMotorDatabase):
    global _db, _KEY
    _db = db
    _KEY = os.environ.get("EMERGENT_LLM_KEY", "")


async def ensure_ai_doubt_indexes(db):
    await db.ai_threads.create_index([("user_id", 1), ("updated_at", -1)])
    await db.ai_threads.create_index("id", unique=True)
    await db.ai_messages.create_index([("thread_id", 1), ("ts", 1)])


# Subject-specific system prompts. Kept short & focused.
SUBJECTS = {
    "quant": "Quantitative Aptitude (arithmetic, algebra, DI, percentages, etc.)",
    "reasoning": "Logical Reasoning (puzzles, seating, coding-decoding, blood-relations)",
    "english": "English Language (grammar, vocabulary, comprehension, cloze test)",
    "gs": "General Studies (history, geography, polity, economy, science)",
    "banking": "Banking Awareness (banking, financial, current affairs)",
    "current-affairs": "Current Affairs (national, international, sports)",
    "general": "Competitive-exam preparation across all subjects",
}


def _sys_prompt(subject: str, exam: str | None) -> str:
    subj_desc = SUBJECTS.get(subject, SUBJECTS["general"])
    exam_line = f"The student is preparing for {exam}." if exam else ""
    return f"""You are Avision AI Tutor, an expert Indian competitive-exam mentor.
Subject focus: {subj_desc}. {exam_line}

Rules:
- Be concise, structured, and easy to skim on mobile.
- Use Markdown: **bold** important terms, bullet points, and short paragraphs.
- Always show step-by-step reasoning for numeric problems.
- End numeric solutions with a clear **Final Answer: <value>** line.
- For MCQs, mention the correct option letter (A/B/C/D) if visible.
- If the student sent an image of a question, extract & solve exactly what's shown.
- Add one **Shortcut / Tip** section at the end when applicable.
- Never give a wall-of-text answer. Keep it under 350 words unless the problem truly needs more.
- Use Indian English & INR (₹) where relevant.
"""


# ---------------------- MODELS ---------------------------

def _clean(d: dict) -> dict:
    d = {**d}
    d.pop("_id", None)
    return d


async def _get_thread(tid: str, user_id: str) -> dict:
    t = await _db.ai_threads.find_one({"id": tid, "user_id": user_id})
    if not t:
        raise HTTPException(404, "Thread not found")
    return t


async def _messages_for_thread(tid: str) -> list[dict]:
    cur = _db.ai_messages.find({"thread_id": tid}, {"_id": 0}).sort("ts", 1)
    return await cur.to_list(200)


async def _title_from(msg: str) -> str:
    m = (msg or "").strip().split("\n")[0]
    if len(m) > 60:
        m = m[:57] + "…"
    return m or "New doubt"


# ---------------------- ROUTES ---------------------------

@router.post("/threads")
async def create_thread(body: dict, user=Depends(get_current_user)):
    subject = (body.get("subject") or "general").lower()
    exam = body.get("exam")
    initial = (body.get("message") or "").strip()
    image_b64 = body.get("image_base64")
    course_id = body.get("course_id")
    now = datetime.now(timezone.utc).isoformat()
    tid = str(uuid.uuid4())
    title = await _title_from(initial or "New doubt")
    thread = {
        "id": tid,
        "user_id": user["user_id"],
        "subject": subject,
        "exam": exam,
        "course_id": course_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "message_count": 0,
    }
    await _db.ai_threads.insert_one(thread)
    thread.pop("_id", None)

    # If user included an initial message, store it & compute AI reply
    if initial or image_b64:
        user_msg = {
            "id": str(uuid.uuid4()),
            "thread_id": tid,
            "role": "user",
            "content": initial,
            "has_image": bool(image_b64),
            "image_base64": image_b64 if image_b64 else None,
            "ts": now,
        }
        await _db.ai_messages.insert_one(user_msg)
        # Reply via non-streaming aggregation (thread creation is one-shot)
        reply_text = await _ai_reply(thread, initial, image_b64)
        ai_msg = {
            "id": str(uuid.uuid4()),
            "thread_id": tid,
            "role": "assistant",
            "content": reply_text,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await _db.ai_messages.insert_one(ai_msg)
        await _db.ai_threads.update_one(
            {"id": tid},
            {"$set": {"updated_at": ai_msg["ts"], "title": title or (initial[:60] if initial else "Image question")},
             "$inc": {"message_count": 2}},
        )
        thread["message_count"] = 2
        thread["updated_at"] = ai_msg["ts"]
        thread["last_message"] = reply_text[:120]

    return {"thread": thread}


@router.get("/threads")
async def list_threads(user=Depends(get_current_user), limit: int = 50):
    cur = _db.ai_threads.find({"user_id": user["user_id"]}, {"_id": 0}).sort("updated_at", -1).limit(limit)
    threads = await cur.to_list(limit)
    return {"threads": threads}


@router.get("/threads/{tid}")
async def thread_detail(tid: str, user=Depends(get_current_user)):
    t = await _get_thread(tid, user["user_id"])
    msgs = await _messages_for_thread(tid)
    # Strip image bases from history payloads to keep size small
    for m in msgs:
        if m.get("image_base64"):
            m["image_base64"] = None
            m["has_image"] = True
    return {"thread": _clean(t), "messages": msgs}


@router.delete("/threads/{tid}")
async def delete_thread(tid: str, user=Depends(get_current_user)):
    t = await _get_thread(tid, user["user_id"])
    await _db.ai_messages.delete_many({"thread_id": tid})
    await _db.ai_threads.delete_one({"id": tid})
    return {"deleted": True}


@router.post("/threads/{tid}/messages")
async def send_message(tid: str, body: dict, user=Depends(get_current_user)):
    """Non-streaming send: appends user msg, gets AI reply, returns both."""
    thread = await _get_thread(tid, user["user_id"])
    text = (body.get("message") or "").strip()
    image_b64 = body.get("image_base64")
    if not text and not image_b64:
        raise HTTPException(400, "message or image required")
    now = datetime.now(timezone.utc).isoformat()
    user_msg = {
        "id": str(uuid.uuid4()),
        "thread_id": tid,
        "role": "user",
        "content": text,
        "has_image": bool(image_b64),
        "image_base64": image_b64,
        "ts": now,
    }
    await _db.ai_messages.insert_one(user_msg)

    reply_text = await _ai_reply(thread, text, image_b64)
    ai_msg = {
        "id": str(uuid.uuid4()),
        "thread_id": tid,
        "role": "assistant",
        "content": reply_text,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    await _db.ai_messages.insert_one(ai_msg)
    await _db.ai_threads.update_one(
        {"id": tid},
        {"$set": {"updated_at": ai_msg["ts"], "last_message": reply_text[:120]}, "$inc": {"message_count": 2}},
    )
    # Redact image + strip ObjectId before returning
    u = {**user_msg}; u["image_base64"] = None; u.pop("_id", None)
    a = {**ai_msg}; a.pop("_id", None)
    return {"user_message": u, "assistant_message": a}


@router.get("/threads/{tid}/stream")
async def stream_message(
    tid: str,
    message: str = Query(...),
    image_base64: Optional[str] = Query(default=None),
    user=Depends(get_current_user),
):
    """SSE endpoint: streams tokens as `data: {"delta": "..."}` and finishes
    with `data: {"done": true, "message_id": "..."}`."""
    thread = await _get_thread(tid, user["user_id"])
    text = (message or "").strip()
    if not text and not image_base64:
        raise HTTPException(400, "message or image required")
    now = datetime.now(timezone.utc).isoformat()
    user_msg = {
        "id": str(uuid.uuid4()),
        "thread_id": tid,
        "role": "user",
        "content": text,
        "has_image": bool(image_base64),
        "image_base64": image_base64,
        "ts": now,
    }
    await _db.ai_messages.insert_one(user_msg)

    async def gen():
        collected = []
        try:
            async for delta in _ai_stream(thread, text, image_base64):
                collected.append(delta)
                yield f"data: {json.dumps({'delta': delta})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        # Persist final message
        reply = "".join(collected).strip() or "Sorry, I could not process that."
        ai_msg = {
            "id": str(uuid.uuid4()),
            "thread_id": tid,
            "role": "assistant",
            "content": reply,
            "ts": datetime.now(timezone.utc).isoformat(),
        }
        await _db.ai_messages.insert_one(ai_msg)
        await _db.ai_threads.update_one(
            {"id": tid},
            {"$set": {"updated_at": ai_msg["ts"], "last_message": reply[:120]},
             "$inc": {"message_count": 2}},
        )
        yield f"data: {json.dumps({'done': True, 'message_id': ai_msg['id'], 'ts': ai_msg['ts']})}\n\n"

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )


# --------------------- LLM PLUMBING ---------------------------

def _make_chat(thread: dict):
    """Build a fresh LlmChat instance per call (per playbook)."""
    from emergentintegrations.llm.chat import LlmChat
    api_key = _KEY or os.environ.get("EMERGENT_LLM_KEY", "")
    return LlmChat(
        api_key=api_key,
        session_id=thread["id"],
        system_message=_sys_prompt(thread.get("subject", "general"), thread.get("exam")),
    ).with_model("anthropic", "claude-sonnet-4-6")


def _detect_mime(image_b64: str) -> str:
    """Detect image MIME from base64 header."""
    if not image_b64:
        return "image/jpeg"
    b = image_b64[:16]
    if b.startswith("/9j/"):
        return "image/jpeg"
    if b.startswith("iVBOR"):
        return "image/png"
    if b.startswith("UklGR"):
        return "image/webp"
    return "image/jpeg"


async def _build_user_msg(thread: dict, text: str, image_b64: Optional[str]):
    """Rebuild UserMessage with history & optional image."""
    from emergentintegrations.llm.chat import UserMessage, ImageContent
    # Load short history (last 10 messages, no images embedded again for context)
    history = await _messages_for_thread(thread["id"])
    # We only need to append the LATEST user message; LlmChat maintains history
    # via session_id — but our persistence is separate, so we prepend history as
    # part of the text prompt to guarantee context.
    ctx = ""
    if len(history) > 1:
        prev = history[-11:-1]  # up to 10 previous
        parts = []
        for m in prev:
            role = "Student" if m["role"] == "user" else "Tutor"
            content = (m.get("content") or "").strip()
            if content:
                parts.append(f"{role}: {content}")
        if parts:
            ctx = "Previous conversation:\n" + "\n".join(parts) + "\n\n---\n\n"

    full_text = (ctx + (text or "Please solve the attached question step-by-step.")).strip()
    if image_b64:
        img = ImageContent(image_base64=image_b64)
        return UserMessage(text=full_text, file_contents=[img])
    return UserMessage(text=full_text)


async def _ai_reply(thread: dict, text: str, image_b64: Optional[str]) -> str:
    from emergentintegrations.llm.chat import TextDelta, StreamDone
    if not (_KEY or os.environ.get("EMERGENT_LLM_KEY")):
        return "AI is not configured yet. Please add EMERGENT_LLM_KEY to backend .env."
    chat = _make_chat(thread)
    msg = await _build_user_msg(thread, text, image_b64)
    parts: list[str] = []
    try:
        async for ev in chat.stream_message(msg):
            if isinstance(ev, TextDelta):
                parts.append(ev.content)
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        return f"AI error: {e}"
    reply = "".join(parts).strip()
    return reply or "Sorry, I could not generate an answer."


async def _ai_stream(thread: dict, text: str, image_b64: Optional[str]):
    """Async generator yielding text deltas."""
    from emergentintegrations.llm.chat import TextDelta, StreamDone
    if not (_KEY or os.environ.get("EMERGENT_LLM_KEY")):
        yield "AI is not configured. Please add EMERGENT_LLM_KEY to backend .env."
        return
    chat = _make_chat(thread)
    msg = await _build_user_msg(thread, text, image_b64)
    try:
        async for ev in chat.stream_message(msg):
            if isinstance(ev, TextDelta):
                yield ev.content
            elif isinstance(ev, StreamDone):
                break
    except Exception as e:
        yield f"\n\n[AI error] {e}"
