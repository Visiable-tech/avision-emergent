"""Authentication module: JWT email/password + course_id support."""
import os
import re
import uuid
import secrets
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel, EmailStr, Field, field_validator

# Injected by server.py
_db = None


def init_auth(db):
    global _db
    _db = db


SECRET_KEY = os.environ.get("JWT_SECRET_KEY", "dev-only-change-me")
ALGORITHM = "HS256"
ISSUER = "avision-institute"
AUDIENCE = "avision-mobile"
ACCESS_TOKEN_DAYS = 30
RESET_TOKEN_MINUTES = 30
BCRYPT_ROUNDS = int(os.environ.get("BCRYPT_ROUNDS", "12"))
DUMMY_HASH = bcrypt.hashpw(b"dummy-password", bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()

PHONE_RE = re.compile(r"^[6-9]\d{9}$")


# ---------------- Models ----------------
class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=60)
    email: EmailStr
    password: str = Field(min_length=6, max_length=64)
    phone: str
    course_id: str

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        if not PHONE_RE.match(v.strip()):
            raise ValueError("Enter a valid 10-digit Indian mobile number")
        return v.strip()


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    new_password: str = Field(min_length=6, max_length=64)


class UpdateCourseIn(BaseModel):
    course_id: str


class GoogleSessionIn(BaseModel):
    session_id: str
    course_id: Optional[str] = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ---------------- Helpers ----------------
def hash_password(password: str) -> str:
    if len(password.encode("utf-8")) > 72:
        raise HTTPException(400, "Password too long (max 72 bytes)")
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=BCRYPT_ROUNDS)).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "iss": ISSUER,
        "aud": AUDIENCE,
        "sub": user_id,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "nbf": now,
        "exp": now + timedelta(days=ACCESS_TOKEN_DAYS),
        "typ": "access",
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


async def _validate(token: str) -> dict:
    try:
        payload = jwt.decode(
            token, SECRET_KEY, algorithms=[ALGORITHM],
            audience=AUDIENCE, issuer=ISSUER,
            options={"require": ["exp", "iat", "sub", "jti"]},
        )
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    revoked = await _db.revoked_tokens.find_one({"jti": payload["jti"]}, {"_id": 0})
    if revoked:
        raise HTTPException(status_code=401, detail="Token revoked")
    return payload


async def get_current_user(authorization: Optional[str] = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.split(" ", 1)[1].strip()
    payload = await _validate(token)
    user = await _db.users.find_one(
        {"user_id": payload["sub"]},
        {"_id": 0, "password_hash": 0},
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_optional_user(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None


def _sanitize_user(u: dict) -> dict:
    return {k: v for k, v in u.items() if k not in ("password_hash", "_id")}


async def _validate_course(course_id: str, courses_list) -> dict:
    course = next((c for c in courses_list if c["id"] == course_id and c.get("active", True)), None)
    if not course:
        raise HTTPException(400, "Selected course is not available. Please pick a valid active course.")
    return course


# ---------------- Router ----------------
router = APIRouter(prefix="/api/auth", tags=["auth"])


def make_router(courses_provider):
    """courses_provider: callable returning current list of courses (with active flag)."""

    @router.post("/register", response_model=TokenOut, status_code=201)
    async def register(data: RegisterIn):
        await _validate_course(data.course_id, courses_provider())
        email = data.email.lower().strip()
        existing = await _db.users.find_one({"email": email}, {"_id": 0, "user_id": 1})
        if existing:
            raise HTTPException(status_code=409, detail="Email already registered. Please login instead.")
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        referral_code = _generate_referral_code(data.name)
        now = datetime.now(timezone.utc)
        doc = {
            "user_id": user_id,
            "name": data.name.strip(),
            "email": email,
            "password_hash": hash_password(data.password),
            "phone": data.phone,
            "course_id": data.course_id,
            "auth_provider": "email",
            "coins": 100,  # welcome bonus
            "xp": 0,
            "streak": 0,
            "level": 1,
            "referral_code": referral_code,
            "referred_by": None,
            "created_at": now,
            "failed_login_attempts": 0,
            "lock_until": None,
        }
        await _db.users.insert_one(doc)
        token = create_access_token(user_id)
        return {"access_token": token, "token_type": "bearer", "user": _sanitize_user(doc)}

    @router.post("/login", response_model=TokenOut)
    async def login(data: LoginIn):
        email = data.email.lower().strip()
        user = await _db.users.find_one({"email": email})
        if not user:
            bcrypt.checkpw(data.password.encode(), DUMMY_HASH.encode())
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        now = datetime.now(timezone.utc)
        lock_until = user.get("lock_until")
        if lock_until:
            if lock_until.tzinfo is None:
                lock_until = lock_until.replace(tzinfo=timezone.utc)
            if lock_until > now:
                raise HTTPException(status_code=429, detail="Too many attempts. Try again in 15 minutes.")

        if not user.get("password_hash") or not verify_password(data.password, user["password_hash"]):
            attempts = int(user.get("failed_login_attempts", 0)) + 1
            update = {"failed_login_attempts": attempts}
            if attempts >= 5:
                update["lock_until"] = now + timedelta(minutes=15)
            await _db.users.update_one({"email": email}, {"$set": update})
            raise HTTPException(status_code=401, detail="Incorrect email or password")

        await _db.users.update_one(
            {"email": email},
            {"$set": {"failed_login_attempts": 0, "lock_until": None, "last_login_at": now}},
        )
        token = create_access_token(user["user_id"])
        return {"access_token": token, "token_type": "bearer", "user": _sanitize_user(user)}

    @router.get("/me")
    async def me(user: dict = Depends(get_current_user)):
        return user

    @router.post("/logout")
    async def logout(authorization: Optional[str] = Header(default=None)):
        if not authorization or not authorization.lower().startswith("bearer "):
            return {"message": "Logged out"}
        token = authorization.split(" ", 1)[1].strip()
        try:
            payload = await _validate(token)
            await _db.revoked_tokens.update_one(
                {"jti": payload["jti"]},
                {"$setOnInsert": {"jti": payload["jti"], "exp": payload["exp"]}},
                upsert=True,
            )
        except HTTPException:
            pass
        return {"message": "Logged out"}

    @router.post("/forgot-password")
    async def forgot(data: ForgotIn):
        email = data.email.lower().strip()
        user = await _db.users.find_one({"email": email}, {"_id": 0, "email": 1})
        if user:
            raw = secrets.token_urlsafe(24)
            token_hash = hashlib.sha256(raw.encode()).hexdigest()
            await _db.password_reset_tokens.insert_one({
                "email": email,
                "token_hash": token_hash,
                "exp": datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_MINUTES),
            })
            # Mock: in production this would be emailed. For dev, we surface it in the response.
            return {"message": "If the account exists, a reset link was sent.", "mock_reset_token": raw}
        return {"message": "If the account exists, a reset link was sent."}

    @router.post("/reset-password")
    async def reset(data: ResetIn):
        token_hash = hashlib.sha256(data.token.encode()).hexdigest()
        record = await _db.password_reset_tokens.find_one({"token_hash": token_hash}, {"_id": 0})
        if not record:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        exp = record["exp"]
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp < datetime.now(timezone.utc):
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")

        await _db.users.update_one(
            {"email": record["email"]},
            {"$set": {
                "password_hash": hash_password(data.new_password),
                "failed_login_attempts": 0,
                "lock_until": None,
            }},
        )
        await _db.password_reset_tokens.delete_one({"token_hash": token_hash})
        return {"message": "Password reset successful"}

    @router.post("/update-course")
    async def update_course(data: UpdateCourseIn, user: dict = Depends(get_current_user)):
        await _validate_course(data.course_id, courses_provider())
        await _db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": {"course_id": data.course_id}},
        )
        return {"message": "Course updated", "course_id": data.course_id}

    return router


def _generate_referral_code(name: str) -> str:
    base = re.sub(r"[^A-Z0-9]", "", name.upper())[:4] or "USER"
    return f"{base}{secrets.token_hex(3).upper()}"


async def ensure_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.users.create_index("user_id", unique=True)
    await db.users.create_index("referral_code", unique=True, sparse=True)
    await db.revoked_tokens.create_index("exp", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("exp", expireAfterSeconds=0)
