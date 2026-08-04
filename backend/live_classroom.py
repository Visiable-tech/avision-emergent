"""
Live Classroom module — Phase 3.

Contains:
  • Real `lc_sessions` schema (persistent) + auto-seeding for enrolled courses
  • Chat / hand-raise / instructor-poll REST endpoints
  • WebSocket endpoint (`/api/live-classroom/ws/{sid}`) with JWT auth via query param
    that broadcasts chat, hand-raise, poll and presence events room-per-session.
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional

import jwt
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import get_current_user, SECRET_KEY, ALGORITHM, AUDIENCE, ISSUER
from live_courses import COURSES, FACULTIES


router = APIRouter(prefix="/api/live-classroom", tags=["live-classroom"])

_db: Optional[AsyncIOMotorDatabase] = None


def init_live_classroom(db: AsyncIOMotorDatabase):
    global _db
    _db = db


async def ensure_live_classroom_indexes(db):
    await db.lc_sessions.create_index("session_id", unique=True)
    await db.lc_sessions.create_index([("course_id", 1), ("starts_at", 1)])
    await db.lc_chat.create_index([("session_id", 1), ("ts", 1)])
    await db.lc_polls.create_index([("session_id", 1), ("created_at", -1)])
    await db.lc_hand_raises.create_index([("session_id", 1), ("user_id", 1)], unique=True)


# ---------------------- SESSION SEEDING ---------------------------

_YT_LIVE_ID = "jfKfPfyJRdk"     # placeholder LoFi live (unlisted / demo)
_YT_REC_ID = "dQw4w9WgXcQ"       # placeholder recorded


async def _seed_sessions_for_course(course: dict):
    """Idempotently seed 3 sessions per course: 1 live now, 1 upcoming, 1 recorded."""
    if _db is None:
        return
    existing = await _db.lc_sessions.count_documents({"course_id": course["id"]})
    if existing >= 3:
        return

    now = datetime.now(timezone.utc)
    curriculum = course.get("curriculum", [])
    fac_ids = course.get("faculty_ids", [])

    def _pick_subj(i):
        return curriculum[i % max(1, len(curriculum))] if curriculum else {"subject": "General", "topics": ["Session"]}

    def _pick_fac(i):
        fid = fac_ids[i % max(1, len(fac_ids))] if fac_ids else None
        fac = next((f for f in FACULTIES if f["id"] == fid), None)
        return fac or {"id": None, "name": "Faculty", "avatar": None}

    live_subj = _pick_subj(0)
    live_fac = _pick_fac(0)
    up_subj = _pick_subj(1)
    up_fac = _pick_fac(1)
    rec_subj = _pick_subj(2)
    rec_fac = _pick_fac(2)

    sessions = [
        # LIVE NOW (started 20 min ago, runs 2.5h)
        {
            "session_id": f"ses-{course['id']}-live",
            "course_id": course["id"],
            "course_name": course["name"],
            "subject": live_subj.get("subject"),
            "topic": (live_subj.get("topics") or ["Session"])[0],
            "faculty_id": live_fac.get("id"),
            "faculty_name": live_fac.get("name"),
            "faculty_avatar": live_fac.get("avatar"),
            "starts_at": (now - timedelta(minutes=20)).isoformat(),
            "ends_at": (now + timedelta(minutes=130)).isoformat(),
            "duration_min": 150,
            "type": "live",
            "status": "live",
            "video_url": f"https://www.youtube.com/embed/{_YT_LIVE_ID}",
            "video_kind": "youtube",
            "banner_image": course.get("banner_image"),
            "created_at": now.isoformat(),
        },
        # UPCOMING (in 3 hours)
        {
            "session_id": f"ses-{course['id']}-upcoming",
            "course_id": course["id"],
            "course_name": course["name"],
            "subject": up_subj.get("subject"),
            "topic": (up_subj.get("topics") or ["Session"])[1] if len(up_subj.get("topics", [])) > 1 else "Session",
            "faculty_id": up_fac.get("id"),
            "faculty_name": up_fac.get("name"),
            "faculty_avatar": up_fac.get("avatar"),
            "starts_at": (now + timedelta(hours=3)).isoformat(),
            "ends_at": (now + timedelta(hours=5, minutes=30)).isoformat(),
            "duration_min": 150,
            "type": "live",
            "status": "upcoming",
            "video_url": f"https://www.youtube.com/embed/{_YT_LIVE_ID}",
            "video_kind": "youtube",
            "banner_image": course.get("banner_image"),
            "created_at": now.isoformat(),
        },
        # RECORDED
        {
            "session_id": f"ses-{course['id']}-recorded",
            "course_id": course["id"],
            "course_name": course["name"],
            "subject": rec_subj.get("subject"),
            "topic": (rec_subj.get("topics") or ["Session"])[0],
            "faculty_id": rec_fac.get("id"),
            "faculty_name": rec_fac.get("name"),
            "faculty_avatar": rec_fac.get("avatar"),
            "starts_at": (now - timedelta(days=1)).isoformat(),
            "ends_at": (now - timedelta(days=1) + timedelta(minutes=95)).isoformat(),
            "duration_min": 95,
            "type": "recorded",
            "status": "recorded",
            "video_url": f"https://www.youtube.com/embed/{_YT_REC_ID}",
            "video_kind": "youtube",
            "banner_image": course.get("banner_image"),
            "created_at": now.isoformat(),
        },
    ]
    for s in sessions:
        try:
            await _db.lc_sessions.insert_one(s)
        except Exception:
            pass  # duplicate — ignored


async def seed_all_sessions():
    for c in COURSES:
        if c.get("status") == "active":
            await _seed_sessions_for_course(c)


# ------------------------- HELPERS ---------------------------

async def _assert_enrolled(user_id: str, course_id: str):
    if _db is None:
        raise HTTPException(500, "Not initialised")
    e = await _db.lc_enrollments.find_one({"user_id": user_id, "course_id": course_id})
    if not e:
        raise HTTPException(403, "Not enrolled in this course")


def _clean(d: dict) -> dict:
    d = {**d}
    d.pop("_id", None)
    return d


# --------------------- REST ENDPOINTS ------------------------

@router.get("/sessions")
async def list_sessions(course_id: str, user=Depends(get_current_user)):
    await _assert_enrolled(user["user_id"], course_id)
    # Ensure seeded
    course = next((c for c in COURSES if c["id"] == course_id), None)
    if course:
        await _seed_sessions_for_course(course)
    cur = _db.lc_sessions.find({"course_id": course_id}, {"_id": 0}).sort("starts_at", 1)
    items = await cur.to_list(200)
    # Auto-update status based on current time
    now = datetime.now(timezone.utc)
    for it in items:
        try:
            starts = datetime.fromisoformat(it["starts_at"].replace("Z", "+00:00"))
            ends = datetime.fromisoformat(it["ends_at"].replace("Z", "+00:00"))
            if it["type"] == "recorded":
                it["status"] = "recorded"
            elif now < starts:
                it["status"] = "upcoming"
                it["starts_in_min"] = int((starts - now).total_seconds() / 60)
            elif starts <= now <= ends:
                it["status"] = "live"
            else:
                it["status"] = "ended"
        except Exception:
            pass
    return {"sessions": items}


@router.get("/sessions/{sid}")
async def session_detail(sid: str, user=Depends(get_current_user)):
    if _db is None:
        raise HTTPException(500, "Not initialised")
    ses = await _db.lc_sessions.find_one({"session_id": sid}, {"_id": 0})
    if not ses:
        raise HTTPException(404, "Session not found")
    await _assert_enrolled(user["user_id"], ses["course_id"])

    # Refresh status
    now = datetime.now(timezone.utc)
    try:
        starts = datetime.fromisoformat(ses["starts_at"].replace("Z", "+00:00"))
        ends = datetime.fromisoformat(ses["ends_at"].replace("Z", "+00:00"))
        if ses["type"] != "recorded":
            if now < starts:
                ses["status"] = "upcoming"
                ses["starts_in_min"] = int((starts - now).total_seconds() / 60)
            elif starts <= now <= ends:
                ses["status"] = "live"
            else:
                ses["status"] = "ended"
    except Exception:
        pass

    # Active poll (if any)
    active_poll = await _db.lc_polls.find_one({"session_id": sid, "status": "open"}, {"_id": 0})
    ses["active_poll"] = active_poll

    # Hand-raise state
    hr = await _db.lc_hand_raises.find_one({"session_id": sid, "user_id": user["user_id"]}, {"_id": 0})
    ses["hand_raised"] = bool(hr and hr.get("active"))

    # Participants online (from broadcaster)
    ses["participants_online"] = broadcaster.presence_count(sid)
    return ses


@router.get("/sessions/{sid}/chat")
async def session_chat(sid: str, limit: int = 100, user=Depends(get_current_user)):
    if _db is None:
        return {"messages": []}
    ses = await _db.lc_sessions.find_one({"session_id": sid})
    if not ses:
        raise HTTPException(404, "Session not found")
    await _assert_enrolled(user["user_id"], ses["course_id"])
    cur = _db.lc_chat.find({"session_id": sid}, {"_id": 0}).sort("ts", -1).limit(limit)
    docs = await cur.to_list(limit)
    docs.reverse()
    return {"messages": docs}


@router.post("/sessions/{sid}/hand-raise")
async def toggle_hand_raise(sid: str, user=Depends(get_current_user)):
    if _db is None:
        raise HTTPException(500, "Not initialised")
    ses = await _db.lc_sessions.find_one({"session_id": sid})
    if not ses:
        raise HTTPException(404, "Session not found")
    await _assert_enrolled(user["user_id"], ses["course_id"])
    now = datetime.now(timezone.utc).isoformat()
    existing = await _db.lc_hand_raises.find_one({"session_id": sid, "user_id": user["user_id"]})
    if existing and existing.get("active"):
        await _db.lc_hand_raises.update_one(
            {"session_id": sid, "user_id": user["user_id"]},
            {"$set": {"active": False, "updated_at": now}},
        )
        state = False
    else:
        await _db.lc_hand_raises.update_one(
            {"session_id": sid, "user_id": user["user_id"]},
            {"$set": {"active": True, "updated_at": now, "user_name": user.get("name", "Student")}},
            upsert=True,
        )
        state = True
    # Broadcast the change
    await broadcaster.broadcast(sid, {
        "type": "hand_raise",
        "user_id": user["user_id"],
        "user_name": user.get("name", "Student"),
        "active": state,
        "ts": now,
    })
    return {"hand_raised": state}


@router.get("/sessions/{sid}/hand-raises")
async def list_hand_raises(sid: str, user=Depends(get_current_user)):
    ses = await _db.lc_sessions.find_one({"session_id": sid})
    if not ses:
        raise HTTPException(404, "Session not found")
    await _assert_enrolled(user["user_id"], ses["course_id"])
    cur = _db.lc_hand_raises.find({"session_id": sid, "active": True}, {"_id": 0}).sort("updated_at", -1)
    docs = await cur.to_list(50)
    return {"hand_raises": docs, "count": len(docs)}


@router.post("/sessions/{sid}/polls")
async def create_poll(sid: str, body: dict, user=Depends(get_current_user)):
    """Create a poll (instructor OR — for demo — any enrolled user)."""
    ses = await _db.lc_sessions.find_one({"session_id": sid})
    if not ses:
        raise HTTPException(404, "Session not found")
    await _assert_enrolled(user["user_id"], ses["course_id"])
    question = (body.get("question") or "").strip()
    options = body.get("options") or []
    if not question or len(options) < 2:
        raise HTTPException(400, "Poll requires a question and 2+ options")
    # Close any existing open poll
    await _db.lc_polls.update_many(
        {"session_id": sid, "status": "open"},
        {"$set": {"status": "closed"}},
    )
    now = datetime.now(timezone.utc).isoformat()
    poll = {
        "id": str(uuid.uuid4()),
        "session_id": sid,
        "question": question,
        "options": [{"id": str(i), "text": o, "votes": 0} for i, o in enumerate(options)],
        "voters": {},   # user_id -> option_id
        "created_at": now,
        "created_by": user["user_id"],
        "created_by_name": user.get("name", "Instructor"),
        "status": "open",
        "total_votes": 0,
    }
    await _db.lc_polls.insert_one(poll)
    poll.pop("_id", None)
    await broadcaster.broadcast(sid, {"type": "poll_new", "poll": poll})
    return poll


@router.post("/polls/{pid}/vote")
async def vote_poll(pid: str, body: dict, user=Depends(get_current_user)):
    if _db is None:
        raise HTTPException(500, "Not initialised")
    option_id = str(body.get("option_id", ""))
    if not option_id:
        raise HTTPException(400, "option_id required")
    poll = await _db.lc_polls.find_one({"id": pid})
    if not poll:
        raise HTTPException(404, "Poll not found")
    if poll.get("status") != "open":
        raise HTTPException(400, "Poll is closed")
    # Ensure user is enrolled in the session's course
    ses = await _db.lc_sessions.find_one({"session_id": poll["session_id"]})
    if not ses:
        raise HTTPException(404, "Session missing")
    await _assert_enrolled(user["user_id"], ses["course_id"])

    voters = poll.get("voters", {})
    prev = voters.get(user["user_id"])
    options = poll["options"]

    # Decrement previous vote if any
    if prev is not None:
        for o in options:
            if o["id"] == prev:
                o["votes"] = max(0, o["votes"] - 1)
                break
    # Increment new option
    found = False
    for o in options:
        if o["id"] == option_id:
            o["votes"] += 1
            found = True
            break
    if not found:
        raise HTTPException(400, "Invalid option_id")
    voters[user["user_id"]] = option_id
    total = sum(o["votes"] for o in options)
    await _db.lc_polls.update_one(
        {"id": pid},
        {"$set": {"options": options, "voters": voters, "total_votes": total, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    poll_upd = await _db.lc_polls.find_one({"id": pid}, {"_id": 0})
    await broadcaster.broadcast(poll["session_id"], {"type": "poll_update", "poll": poll_upd})
    return poll_upd


@router.post("/polls/{pid}/close")
async def close_poll(pid: str, user=Depends(get_current_user)):
    poll = await _db.lc_polls.find_one({"id": pid})
    if not poll:
        raise HTTPException(404, "Poll not found")
    ses = await _db.lc_sessions.find_one({"session_id": poll["session_id"]})
    await _assert_enrolled(user["user_id"], ses["course_id"])
    await _db.lc_polls.update_one({"id": pid}, {"$set": {"status": "closed"}})
    upd = await _db.lc_polls.find_one({"id": pid}, {"_id": 0})
    await broadcaster.broadcast(poll["session_id"], {"type": "poll_close", "poll": upd})
    return upd


# ---------------------- WEBSOCKET LAYER ---------------------------

class Broadcaster:
    def __init__(self):
        # session_id -> set[ (user_id, WebSocket) ]
        self._rooms: dict[str, set] = {}
        self._lock = asyncio.Lock()

    async def join(self, session_id: str, user: dict, ws: WebSocket):
        async with self._lock:
            self._rooms.setdefault(session_id, set()).add((user["user_id"], ws))
        await self._announce_presence(session_id)

    async def leave(self, session_id: str, user_id: str, ws: WebSocket):
        async with self._lock:
            room = self._rooms.get(session_id)
            if room:
                room.discard((user_id, ws))
                if not room:
                    self._rooms.pop(session_id, None)
        await self._announce_presence(session_id)

    def presence_count(self, session_id: str) -> int:
        room = self._rooms.get(session_id)
        if not room:
            return 0
        # unique users
        return len({uid for uid, _ in room})

    async def _announce_presence(self, session_id: str):
        await self.broadcast(session_id, {"type": "presence", "online": self.presence_count(session_id)})

    async def broadcast(self, session_id: str, message: dict):
        room = list(self._rooms.get(session_id) or [])
        dead: list[tuple] = []
        for uid, ws in room:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append((uid, ws))
        if dead:
            async with self._lock:
                r = self._rooms.get(session_id)
                if r:
                    for d in dead:
                        r.discard(d)


broadcaster = Broadcaster()


def _decode_ws_jwt(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM],
            audience=AUDIENCE, issuer=ISSUER,
            options={"require": ["exp", "iat", "sub", "jti"]},
        )
        return payload
    except Exception:
        return None


@router.websocket("/ws/{sid}")
async def ws_session(ws: WebSocket, sid: str, token: str = Query(default="")):
    """
    WebSocket for a live-classroom session.

    Auth: pass JWT as `?token=` query param (browsers can't set headers on WS).
    Broadcasts: chat, hand_raise, poll_new, poll_update, poll_close, presence
    Client -> server messages:
      { "type": "chat", "message": "..." }
      { "type": "ping" }
    """
    await ws.accept()
    if not token:
        await ws.send_json({"type": "error", "code": "unauthorized", "detail": "Missing token"})
        await ws.close()
        return
    payload = _decode_ws_jwt(token)
    if not payload:
        await ws.send_json({"type": "error", "code": "unauthorized", "detail": "Invalid token"})
        await ws.close()
        return

    user_id = payload["sub"]
    user = await _db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        await ws.send_json({"type": "error", "code": "user_missing"})
        await ws.close()
        return

    ses = await _db.lc_sessions.find_one({"session_id": sid})
    if not ses:
        await ws.send_json({"type": "error", "code": "session_missing"})
        await ws.close()
        return

    ent = await _db.lc_enrollments.find_one({"user_id": user_id, "course_id": ses["course_id"]})
    if not ent:
        await ws.send_json({"type": "error", "code": "not_enrolled"})
        await ws.close()
        return

    await broadcaster.join(sid, user, ws)
    await ws.send_json({"type": "welcome", "user_id": user_id, "session_id": sid, "online": broadcaster.presence_count(sid)})

    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
            except Exception:
                continue
            mtype = data.get("type")
            if mtype == "chat":
                msg = (data.get("message") or "").strip()
                if not msg:
                    continue
                if len(msg) > 500:
                    msg = msg[:500]
                doc = {
                    "id": str(uuid.uuid4()),
                    "session_id": sid,
                    "user_id": user_id,
                    "user_name": user.get("name", "Student"),
                    "message": msg,
                    "ts": datetime.now(timezone.utc).isoformat(),
                }
                await _db.lc_chat.insert_one(doc)
                doc.pop("_id", None)
                await broadcaster.broadcast(sid, {"type": "chat", **doc})
            elif mtype == "ping":
                await ws.send_json({"type": "pong", "ts": datetime.now(timezone.utc).isoformat()})
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await broadcaster.leave(sid, user_id, ws)
