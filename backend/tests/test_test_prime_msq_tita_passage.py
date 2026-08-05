"""Backend tests for Test Prime multi-question-type support (MSQ/TITA/passage-MCQ) + bilingual EN/HI fields.

Covers checks #1-#7 from the review request.
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL / EXPO_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")

API = f"{BASE_URL}/api/test-prime"


# ---------- module-level fixtures / helpers ----------
@pytest.fixture(scope="module")
def sess():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# helper: pick a test_id for exam pattern
def _find_test_id(sess, exam_id: str):
    r = sess.get(f"{API}/tests", params={"exam": exam_id, "limit": 50})
    r.raise_for_status()
    tests = r.json().get("tests", [])
    assert tests, f"no tests found for exam={exam_id}"
    # prefer a full-mock for richest coverage
    for t in tests:
        if t.get("type") == "full-mock":
            return t["id"]
    return tests[0]["id"]


# ================= Test #1: Activate Prime =================
class TestEntitlementActivate:
    USER = "qa_msq_1"

    def test_activate_prime(self, sess):
        r = sess.post(
            f"{API}/entitlement/activate",
            params={"user_id": self.USER},
            json={"plan": "prime", "duration_days": 30},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("is_prime") is True
        assert d.get("plan") == "Test Prime"
        assert d.get("expires_at")


# ================= Tests #2, #4, #5, #6: CLAT full flow (single class for xdist loadscope pinning) =================
class TestClatFullFlow:
    """Kept as a single class so that all sequential state (attempt_id, questions)
    stays on one xdist worker (loadscope pins a class to one worker).
    """
    USER = "qa_msq_1"
    _state: dict = {"attempt_id": None, "questions": None, "test_id": None}

    def test_01_activate_and_start(self, sess):
        sess.post(f"{API}/entitlement/activate", params={"user_id": self.USER},
                  json={"plan": "prime", "duration_days": 30})
        clat_test_id = _find_test_id(sess, "clat")
        self._state["test_id"] = clat_test_id
        r = sess.post(
            f"{API}/attempts/start",
            params={"user_id": self.USER},
            json={"test_id": clat_test_id},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert "attempt_id" in d
        self._state["attempt_id"] = d["attempt_id"]
        qs = d.get("questions")
        assert isinstance(qs, list) and len(qs) > 0
        self._state["questions"] = qs
        for f in ("sections", "sectional_timing", "total_duration_sec", "negative_marking"):
            assert f in d, f"missing top-level {f}"

    def test_02_q_type_field_on_every_question(self, sess):
        qs = self._state["questions"]
        assert qs, "run test_01 first"
        allowed = {"mcq", "msq", "tita", "passage-mcq"}
        for q in qs:
            assert "q_type" in q, f"missing q_type in q {q.get('id')}"
            assert q["q_type"] in allowed, f"bad q_type {q['q_type']}"

    def test_03_passage_mcq_present_with_passage(self, sess):
        qs = self._state["questions"]
        pm = [q for q in qs if q["q_type"] == "passage-mcq"]
        assert len(pm) >= 3, f"expected at least a few passage-mcq questions, got {len(pm)}"
        for q in pm:
            assert q.get("passage"), f"passage-mcq {q['id']} missing passage text"
            assert isinstance(q["passage"], str) and len(q["passage"]) > 20

    def test_04_bilingual_fields_present(self, sess):
        qs = self._state["questions"]
        for q in qs:
            assert "text_hi" in q, f"{q['id']} missing text_hi"
            assert isinstance(q["text_hi"], str) and q["text_hi"].strip() != ""
            assert "options_hi" in q, f"{q['id']} missing options_hi"
            assert isinstance(q["options_hi"], list)
            if q["q_type"] != "tita":
                assert len(q["options_hi"]) == len(q.get("options", []))
                for o in q["options_hi"]:
                    assert isinstance(o, str) and o.strip() != ""

    def test_05_correct_and_explanation_stripped(self, sess):
        qs = self._state["questions"]
        for q in qs:
            assert "correct" not in q, f"{q['id']} leaked 'correct' field: {q.get('correct')}"
            assert "explanation" not in q, f"{q['id']} leaked 'explanation' field"

    def test_06_patch_state_mixed_types(self, sess):
        aid = self._state["attempt_id"]
        qs = self._state["questions"]
        assert aid, "attempt_id missing — start attempt first"
        answers = {}
        for q in qs[:15]:
            qt = q["q_type"]
            if qt == "msq":
                answers[q["id"]] = [0, 2]
            elif qt == "tita":
                answers[q["id"]] = "42"
            else:
                answers[q["id"]] = 1
        r_att = sess.get(f"{API}/attempts/{aid}", params={"user_id": self.USER})
        assert r_att.status_code == 200
        att = r_att.json()
        sec_names = [s["name"] for s in att.get("sections", [])]
        section_times = {n: 600 for n in sec_names}
        active = sec_names[0] if sec_names else None
        body = {
            "answers": answers,
            "section_times": section_times,
            "active_section": active,
            "current_index": 3,
        }
        r = sess.patch(f"{API}/attempts/{aid}/state",
                       params={"user_id": self.USER}, json=body)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("answers") and len(d["answers"]) == len(answers)
        for qid, v in answers.items():
            assert d["answers"].get(qid) == v, f"answer for {qid} not persisted correctly"
        secs = {s["name"]: s for s in d.get("sections", [])}
        if active and active in secs:
            assert secs[active].get("started") is True
            assert secs[active].get("time_left_sec") == 600

    def test_07_submit_and_review_shape(self, sess):
        aid = self._state["attempt_id"]
        r_att = sess.get(f"{API}/attempts/{aid}", params={"user_id": self.USER})
        qs = r_att.json().get("questions", [])
        answers = {}
        for q in qs:
            if q["q_type"] == "tita":
                answers[q["id"]] = "-99999"
            elif q["q_type"] == "msq":
                answers[q["id"]] = [3]
            else:
                answers[q["id"]] = 0
        sess.patch(f"{API}/attempts/{aid}/state",
                   params={"user_id": self.USER}, json={"answers": answers})
        r = sess.post(f"{API}/attempts/{aid}/submit", params={"user_id": self.USER})
        assert r.status_code == 200, r.text
        res = r.json()
        assert res.get("status") == "submitted"
        review = res.get("review")
        assert isinstance(review, list) and len(review) == len(qs)
        for item in review:
            for k in ("q_type", "user", "correct", "status"):
                assert k in item, f"review item missing {k}"
            assert item["status"] in ("correct", "wrong", "unattempted")
        sec = res.get("sectional")
        assert isinstance(sec, list) and len(sec) >= 1
        for s in sec:
            for k in ("score", "correct", "wrong", "accuracy"):
                assert k in s, f"sectional missing {k}"
        dw = res.get("difficulty_wise")
        assert isinstance(dw, list) and len(dw) >= 3
        diffs = {d["difficulty"] for d in dw}
        assert {"Easy", "Medium", "Hard"}.issubset(diffs)
        assert isinstance(res.get("topic_wise"), list)
        tita_review = [r for r in review if r["q_type"] == "tita"]
        if tita_review:
            for r in tita_review:
                assert r["marks_earned"] == 0.0 or r["status"] != "wrong", \
                    f"TITA got negative marks: {r}"

    def test_08_analytics_endpoint_returns_submitted(self, sess):
        aid = self._state["attempt_id"]
        r = sess.get(f"{API}/attempts/{aid}/analytics",
                     params={"user_id": self.USER})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("status") == "submitted"
        assert d.get("attempt_id") == aid
        for k in ("review", "sectional", "difficulty_wise", "topic_wise", "score", "percentile"):
            assert k in d, f"analytics missing {k}"


# ================= Test #3: IPMAT Indore -> TITA in SA section =================
class TestIpmatTita:
    def test_ipmat_indore_has_tita_in_sa(self, sess):
        # Activate Prime for a fresh user
        u = "qa_tita_1"
        sess.post(f"{API}/entitlement/activate", params={"user_id": u},
                  json={"plan": "prime", "duration_days": 30})
        tid = _find_test_id(sess, "ipmat-indore")
        r = sess.post(f"{API}/attempts/start", params={"user_id": u},
                      json={"test_id": tid})
        assert r.status_code == 200, r.text
        d = r.json()
        qs = d["questions"]
        sa_questions = [q for q in qs if "(SA)" in q.get("section", "")]
        assert sa_questions, "expected questions in Quantitative Aptitude (SA) section"
        tita_in_sa = [q for q in sa_questions if q["q_type"] == "tita"]
        # entire SA section should be TITA per generator logic
        assert len(tita_in_sa) == len(sa_questions), \
            f"expected all SA questions to be TITA; SA={len(sa_questions)}, TITA={len(tita_in_sa)}"
        # Sanity: TITA has empty options
        for q in tita_in_sa:
            assert q.get("options") == []
            assert isinstance(q.get("text_hi"), str) and q["text_hi"]


# ================= Test #5b: TITA no-negative — direct IPMAT test (SA section is 100% TITA) =================
class TestTitaNoNegativeIpmat:
    """IPMAT Indore has an SA section that is fully TITA. We answer every TITA
    with a wrong string, ensure no negative marking is applied (score for wrong
    TITAs is 0, not -neg). This is a stronger, guaranteed-TITA check.
    """

    def test_ipmat_tita_no_negative(self, sess):
        u = "qa_tita_neg"
        sess.post(f"{API}/entitlement/activate",
                  params={"user_id": u},
                  json={"plan": "prime", "duration_days": 30})
        tid = _find_test_id(sess, "ipmat-indore")
        r = sess.post(f"{API}/attempts/start", params={"user_id": u},
                      json={"test_id": tid})
        assert r.status_code == 200
        d = r.json()
        aid = d["attempt_id"]
        qs = d["questions"]
        answers = {}
        tita_ids = []
        for q in qs:
            if q["q_type"] == "tita":
                answers[q["id"]] = "-999999"
                tita_ids.append(q["id"])
        assert tita_ids, "expected some TITA questions"
        sess.patch(f"{API}/attempts/{aid}/state",
                   params={"user_id": u},
                   json={"answers": answers})
        r = sess.post(f"{API}/attempts/{aid}/submit", params={"user_id": u})
        assert r.status_code == 200
        res = r.json()
        review = res["review"]
        tita_review = [x for x in review if x["q_type"] == "tita"]
        assert len(tita_review) == len(tita_ids)
        wrong_tita = [x for x in tita_review if x["status"] == "wrong"]
        assert wrong_tita, "expected wrong TITA reviews"
        for w in wrong_tita:
            assert w["marks_earned"] == 0.0, \
                f"TITA wrong got negative marks: {w['marks_earned']} for {w['id']}"


# ================= Test #7: Backward-compat plain MCQ (SBI PO) =================
class TestBackwardCompatSBI:
    def test_sbi_po_start_and_submit(self, sess):
        u = "qa_bc_sbi"
        sess.post(f"{API}/entitlement/activate",
                  params={"user_id": u},
                  json={"plan": "prime", "duration_days": 30})
        tid = _find_test_id(sess, "sbi-po")
        r = sess.post(f"{API}/attempts/start", params={"user_id": u},
                      json={"test_id": tid})
        assert r.status_code == 200, r.text
        d = r.json()
        aid = d["attempt_id"]
        qs = d["questions"]
        # Should be MCQ-heavy (SBI PO); may still sprinkle a few MSQ/passage.
        mcq_count = sum(1 for q in qs if q["q_type"] == "mcq")
        assert mcq_count / len(qs) >= 0.5, f"expected majority MCQ in SBI PO, got {mcq_count}/{len(qs)}"
        # All should still have text_hi/options_hi
        for q in qs:
            assert isinstance(q.get("text_hi"), str) and q["text_hi"].strip()
            assert isinstance(q.get("options_hi"), list)
        # Answer with plain integers everywhere and submit
        answers = {}
        for q in qs:
            if q["q_type"] == "msq":
                answers[q["id"]] = [0]
            elif q["q_type"] == "tita":
                answers[q["id"]] = "10"
            else:
                answers[q["id"]] = 2
        sess.patch(f"{API}/attempts/{aid}/state",
                   params={"user_id": u}, json={"answers": answers})
        r = sess.post(f"{API}/attempts/{aid}/submit", params={"user_id": u})
        assert r.status_code == 200, r.text
        res = r.json()
        assert res["status"] == "submitted"
        assert "score" in res and "percentile" in res
        assert isinstance(res.get("review"), list) and len(res["review"]) == len(qs)
