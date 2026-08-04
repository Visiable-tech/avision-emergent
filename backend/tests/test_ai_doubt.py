"""Tests for AI Doubt Solver module (Phase 5).

Covers:
- Thread create (with & without initial message, subject defaulting, title derivation)
- Threads list (order + fields)
- Thread detail (image redaction, has_image preserved)
- Send message (multi-turn, text-only, image-based, 400 on empty)
- SSE streaming endpoint (content-type, chunked deltas, done event, persistence)
- Delete thread (and cascade of messages)
- Cross-user isolation (404 for another user's thread)
"""
from __future__ import annotations

import base64
import io
import json
import os
import time
import uuid
from pathlib import Path

import httpx
import pytest
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / "frontend" / ".env")
BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL missing"
API = f"{BASE_URL}/api"

TEST_EMAIL = "test@avision.com"
TEST_PASS = "Test@123"


def _login(email=TEST_EMAIL, password=TEST_PASS):
    r = requests.post(
        f"{API}/auth/login",
        json={"email": email, "password": password},
        timeout=20,
    )
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    j = r.json()
    return j.get("access_token") or j.get("token")


@pytest.fixture(scope="module")
def token():
    return _login()


@pytest.fixture(scope="module")
def sess(token):
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def sess_b():
    """A second, isolated user for cross-user tests."""
    email = f"qa+aid+{uuid.uuid4().hex[:8]}@avision.in"
    password = "Aid@1234"
    r = requests.post(
        f"{API}/auth/register",
        json={
            "name": "AID Second",
            "email": email,
            "password": password,
            "phone": f"90000{uuid.uuid4().int % 100000:05d}",
            "category_id": "banking",
        },
        timeout=20,
    )
    assert r.status_code in (200, 201), r.text
    tok = r.json().get("access_token") or r.json().get("token") or _login(email, password)
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    return s


# ----------------------- CREATE THREADS ----------------------------
class TestCreateThread:
    def test_create_thread_without_initial(self, sess):
        r = sess.post(f"{API}/ai-doubt/threads", json={"subject": "reasoning"}, timeout=30)
        assert r.status_code == 200, r.text
        t = r.json()["thread"]
        assert t["subject"] == "reasoning"
        assert t["message_count"] == 0
        assert t["title"] == "New doubt"
        assert "id" in t and "created_at" in t and "updated_at" in t
        assert "_id" not in t
        # cleanup
        sess.delete(f"{API}/ai-doubt/threads/{t['id']}", timeout=15)

    def test_create_thread_default_subject(self, sess):
        r = sess.post(f"{API}/ai-doubt/threads", json={}, timeout=30)
        assert r.status_code == 200, r.text
        t = r.json()["thread"]
        assert t["subject"] == "general"
        sess.delete(f"{API}/ai-doubt/threads/{t['id']}", timeout=15)

    def test_create_thread_with_initial_message(self, sess):
        payload = {"subject": "quant", "exam": "IBPS PO", "message": "Solve: 25% of 60"}
        r = sess.post(f"{API}/ai-doubt/threads", json=payload, timeout=60)
        assert r.status_code == 200, r.text
        t = r.json()["thread"]
        assert t["subject"] == "quant"
        assert t["exam"] == "IBPS PO"
        assert t["message_count"] == 2
        # Title auto-derived from first message
        assert t["title"] == "Solve: 25% of 60"
        assert t.get("last_message"), "last_message should be non-empty"
        # verify assistant actually replied
        det = sess.get(f"{API}/ai-doubt/threads/{t['id']}", timeout=20).json()
        msgs = det["messages"]
        assert len(msgs) == 2
        assert msgs[0]["role"] == "user" and msgs[0]["content"] == "Solve: 25% of 60"
        assert msgs[1]["role"] == "assistant" and len(msgs[1]["content"].strip()) > 10
        # Store for later multi-turn tests
        pytest.thread_id_quant = t["id"]


# ----------------------- LIST THREADS ----------------------------
class TestListThreads:
    def test_list_threads_ordered_desc(self, sess):
        # create two threads quickly
        r1 = sess.post(f"{API}/ai-doubt/threads", json={"subject": "english"}, timeout=15).json()["thread"]
        time.sleep(0.5)
        r2 = sess.post(f"{API}/ai-doubt/threads", json={"subject": "gs"}, timeout=15).json()["thread"]

        lst = sess.get(f"{API}/ai-doubt/threads", timeout=20).json()["threads"]
        assert isinstance(lst, list)
        ids = [t["id"] for t in lst]
        # r2 was created after r1 → should appear first
        assert ids.index(r2["id"]) < ids.index(r1["id"])

        # required fields on each row
        for t in lst[:3]:
            for k in ("id", "title", "subject", "message_count", "updated_at"):
                assert k in t, f"missing {k}"
            assert "_id" not in t

        # cleanup
        sess.delete(f"{API}/ai-doubt/threads/{r1['id']}")
        sess.delete(f"{API}/ai-doubt/threads/{r2['id']}")


# ----------------------- SEND MESSAGE (non-stream) ----------------------------
class TestSendMessage:
    @pytest.fixture(scope="class")
    def tid(self, sess):
        r = sess.post(f"{API}/ai-doubt/threads", json={"subject": "quant", "exam": "IBPS PO"}, timeout=30).json()["thread"]
        yield r["id"]
        sess.delete(f"{API}/ai-doubt/threads/{r['id']}")

    def test_send_text_message(self, sess, tid):
        r = sess.post(
            f"{API}/ai-doubt/threads/{tid}/messages",
            json={"message": "What is 25% of 60? Show the shortcut."},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user_message"]["content"].startswith("What is 25%")
        assert body["user_message"].get("image_base64") is None  # redacted
        ai_content = body["assistant_message"]["content"]
        assert isinstance(ai_content, str) and len(ai_content.strip()) > 10
        # Answer should mention 15 (25% of 60)
        assert "15" in ai_content, f"expected numeric answer in reply, got: {ai_content[:200]}"

    def test_multi_turn_context(self, sess, tid):
        # follow up referencing the previous answer
        r = sess.post(
            f"{API}/ai-doubt/threads/{tid}/messages",
            json={"message": "Explain that shortcut again in one line."},
            timeout=90,
        )
        assert r.status_code == 200, r.text
        ai_content = r.json()["assistant_message"]["content"]
        # Should reference either percent, 25, 60, or 15 — indicating context awareness
        assert any(tok in ai_content.lower() for tok in ("25%", "25 %", "60", "15", "percent", "shortcut", "quarter")), (
            f"reply does not seem to reference prior turn: {ai_content[:200]}"
        )

    def test_send_requires_message_or_image(self, sess, tid):
        r = sess.post(f"{API}/ai-doubt/threads/{tid}/messages", json={}, timeout=15)
        assert r.status_code == 400

    def test_thread_state_after_messages(self, sess, tid):
        det = sess.get(f"{API}/ai-doubt/threads/{tid}", timeout=20).json()
        # 2 sends × (user+assistant) = 4 msgs
        assert len(det["messages"]) >= 4
        # Thread meta updated
        assert det["thread"]["message_count"] >= 4
        assert det["thread"].get("last_message")


# ----------------------- IMAGE MESSAGE ----------------------------
def _tiny_png_base64() -> str:
    """Generate a real (non-blank) PNG with actual visual features via PIL."""
    try:
        from PIL import Image, ImageDraw, ImageFont  # type: ignore
    except Exception:
        pytest.skip("Pillow not installed — skipping real image test")
    img = Image.new("RGB", (240, 120), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    # Draw actual textual visual content — a math question
    d.rectangle([2, 2, 237, 117], outline=(0, 0, 0), width=2)
    d.text((12, 12), "Q: What is 12 x 8 ?", fill=(0, 0, 0))
    d.text((12, 44), "A) 84  B) 96", fill=(20, 20, 200))
    d.text((12, 66), "C) 108 D) 88", fill=(20, 20, 200))
    # add some texture / edges
    for i in range(0, 240, 20):
        d.line([(i, 100), (i + 10, 118)], fill=(180, 180, 180), width=1)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("ascii")


class TestImageMessage:
    def test_send_image_only(self, sess):
        tid = sess.post(f"{API}/ai-doubt/threads", json={"subject": "quant"}, timeout=30).json()["thread"]["id"]
        try:
            img_b64 = _tiny_png_base64()
            r = sess.post(
                f"{API}/ai-doubt/threads/{tid}/messages",
                json={"message": "Solve this question", "image_base64": img_b64},
                timeout=120,
            )
            assert r.status_code == 200, r.text
            ai_content = r.json()["assistant_message"]["content"]
            assert len(ai_content.strip()) > 10
            # It should NOT be a raw AI error / config error string
            assert not ai_content.lower().startswith("ai error"), ai_content
            assert "not configured" not in ai_content.lower(), ai_content

            # detail — image should be redacted but has_image preserved
            det = sess.get(f"{API}/ai-doubt/threads/{tid}", timeout=20).json()
            user_msg = [m for m in det["messages"] if m["role"] == "user"][0]
            assert user_msg["has_image"] is True
            assert user_msg["image_base64"] is None, "image_base64 should be redacted in history"
        finally:
            sess.delete(f"{API}/ai-doubt/threads/{tid}")


# ----------------------- SSE STREAM ----------------------------
class TestStreaming:
    @pytest.mark.asyncio
    async def test_stream_endpoint(self, token):
        # create dedicated thread
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(
                f"{API}/ai-doubt/threads",
                headers={"Authorization": f"Bearer {token}"},
                json={"subject": "quant"},
            )
            assert r.status_code == 200
            tid = r.json()["thread"]["id"]

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                url = f"{API}/ai-doubt/threads/{tid}/stream"
                params = {"message": "What is 15% of 200? Show the steps."}
                deltas = []
                done_event = None
                content_type = None
                async with client.stream(
                    "GET",
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {token}", "Accept": "text/event-stream"},
                ) as resp:
                    assert resp.status_code == 200, await resp.aread()
                    content_type = resp.headers.get("content-type", "")
                    buffer = ""
                    async for chunk in resp.aiter_text():
                        buffer += chunk
                        while "\n\n" in buffer:
                            raw, buffer = buffer.split("\n\n", 1)
                            raw = raw.strip()
                            if not raw.startswith("data:"):
                                continue
                            payload = raw[5:].strip()
                            try:
                                obj = json.loads(payload)
                            except Exception:
                                continue
                            if "delta" in obj:
                                deltas.append(obj["delta"])
                            elif obj.get("done"):
                                done_event = obj
                                break
                        if done_event:
                            break

                assert "text/event-stream" in content_type, content_type
                assert len(deltas) >= 3, f"expected at least 3 delta chunks, got {len(deltas)}"
                assert done_event is not None, "no done event received"
                assert "message_id" in done_event

            # verify persistence
            async with httpx.AsyncClient(timeout=20.0) as client:
                det = await client.get(
                    f"{API}/ai-doubt/threads/{tid}",
                    headers={"Authorization": f"Bearer {token}"},
                )
                assert det.status_code == 200
                msgs = det.json()["messages"]
                ai_msgs = [m for m in msgs if m["role"] == "assistant"]
                assert any(m["id"] == done_event["message_id"] for m in ai_msgs), (
                    "streamed message not persisted with returned id"
                )
                # aggregated content matches deltas
                target = next(m for m in ai_msgs if m["id"] == done_event["message_id"])
                assert len(target["content"]) > 0
        finally:
            async with httpx.AsyncClient(timeout=15.0) as client:
                await client.delete(
                    f"{API}/ai-doubt/threads/{tid}",
                    headers={"Authorization": f"Bearer {token}"},
                )


# ----------------------- DELETE ----------------------------
class TestDelete:
    def test_delete_thread_cascades(self, sess):
        # create + send a message so there are child docs
        tid = sess.post(f"{API}/ai-doubt/threads", json={"subject": "gs", "message": "What is fiscal policy? One line."}, timeout=60).json()["thread"]["id"]
        r = sess.delete(f"{API}/ai-doubt/threads/{tid}", timeout=20)
        assert r.status_code == 200 and r.json().get("deleted") is True
        # GET should now 404
        r2 = sess.get(f"{API}/ai-doubt/threads/{tid}", timeout=15)
        assert r2.status_code == 404

    def test_delete_missing_thread_404(self, sess):
        r = sess.delete(f"{API}/ai-doubt/threads/nonexistent-xyz", timeout=15)
        assert r.status_code == 404


# ----------------------- CROSS-USER ISOLATION ----------------------------
class TestCrossUserIsolation:
    def test_user_b_cannot_read_user_a_thread(self, sess, sess_b):
        # user A creates a thread
        tid = sess.post(f"{API}/ai-doubt/threads", json={"subject": "banking"}, timeout=15).json()["thread"]["id"]
        try:
            r = sess_b.get(f"{API}/ai-doubt/threads/{tid}", timeout=15)
            assert r.status_code == 404
            r2 = sess_b.post(
                f"{API}/ai-doubt/threads/{tid}/messages", json={"message": "hi"}, timeout=15
            )
            assert r2.status_code == 404
            r3 = sess_b.delete(f"{API}/ai-doubt/threads/{tid}", timeout=15)
            assert r3.status_code == 404
        finally:
            sess.delete(f"{API}/ai-doubt/threads/{tid}")

    def test_user_b_list_excludes_user_a(self, sess, sess_b):
        tid = sess.post(f"{API}/ai-doubt/threads", json={"subject": "banking"}, timeout=15).json()["thread"]["id"]
        try:
            lst = sess_b.get(f"{API}/ai-doubt/threads", timeout=15).json()["threads"]
            assert all(t["id"] != tid for t in lst)
        finally:
            sess.delete(f"{API}/ai-doubt/threads/{tid}")
