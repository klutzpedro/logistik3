from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import hmac
import hashlib
import time
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt as pyjwt

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']

# SSO Configuration
SSO_SECRET = os.environ.get('SSO_SECRET', 'CHANGE-ME-SHARED-WITH-K3ICS')
SSO_TOKEN_MAX_AGE = int(os.environ.get('SSO_TOKEN_MAX_AGE', '300'))  # 5 minutes
SESSION_HOURS = int(os.environ.get('SESSION_HOURS', '8'))
K3ICS_LOGIN_URL = os.environ.get('K3ICS_LOGIN_URL', 'https://k3ics.online')
COOKIE_SECURE = os.environ.get('COOKIE_SECURE', 'true').lower() == 'true'
COOKIE_NAME = 'logistic3_session'

JWT_ALGO = "HS256"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Logistic3 - Koarmada 3 Logistics Monitor")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =========== MODELS ===========
AssetType = Literal["kapal", "pangkalan"]
KonisStatus = Literal["siap", "siap_terbatas", "tidak_siap"]


class Logistics(BaseModel):
    bahan_bakar: float = 0
    air_bersih: float = 0
    fresh_room: float = 0
    minyak_lincir: float = 0
    amunisi: float = 0
    ransum: float = 0


class Personnel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    rank: str
    position: str
    photo: Optional[str] = None


class WeaponSystem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    status: KonisStatus = "siap"
    notes: Optional[str] = ""


class AssetCreate(BaseModel):
    type: AssetType
    name: str
    code: str
    description: str = ""
    specifications: Dict[str, Any] = Field(default_factory=dict)
    images: List[str] = Field(default_factory=list)
    konis_status: KonisStatus = "siap"
    readiness_percentage: float = 100
    logistics: Logistics = Field(default_factory=Logistics)
    personnel: List[Personnel] = Field(default_factory=list)
    weapon_systems: List[WeaponSystem] = Field(default_factory=list)
    location: Optional[str] = None
    commander: Optional[str] = None


class Asset(AssetCreate):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class AIAnalysisRequest(BaseModel):
    asset_id: str
    question: Optional[str] = None


class AIAnalysisResponse(BaseModel):
    asset_id: str
    analysis: str
    timestamp: datetime


# =========== SSO (HMAC) ===========
def verify_sso_token(token: str) -> bool:
    """Verify HMAC SSO token from k3ics.online.
    Token format: <unix_timestamp>.<hex_hmac_sha256>
    Signature = HMAC_SHA256(SSO_SECRET, str(timestamp))
    Rejected if older than SSO_TOKEN_MAX_AGE seconds.
    """
    try:
        ts_str, sig = token.split('.', 1)
        ts = int(ts_str)
    except Exception:
        return False

    now = int(time.time())
    if abs(now - ts) > SSO_TOKEN_MAX_AGE:
        return False

    expected = hmac.new(SSO_SECRET.encode(), ts_str.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, sig.lower())


def create_session_cookie_value() -> str:
    payload = {
        "via": "sso",
        "iat": int(time.time()),
        "exp": datetime.now(timezone.utc) + timedelta(hours=SESSION_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def is_session_valid(request: Request) -> bool:
    cookie = request.cookies.get(COOKIE_NAME)
    if not cookie:
        return False
    try:
        pyjwt.decode(cookie, JWT_SECRET, algorithms=[JWT_ALGO])
        return True
    except Exception:
        return False


def require_session(request: Request):
    """Dependency: reject requests without a valid session cookie."""
    if not is_session_valid(request):
        raise HTTPException(status_code=401, detail="Session tidak valid. Silakan akses melalui k3ics.online.")
    return True


# =========== SSO ROUTES ===========
@api_router.get("/sso/enter")
async def sso_enter(sso: str, response: Response):
    """User lands here with ?sso=timestamp.hmac from k3ics.online."""
    if not verify_sso_token(sso):
        raise HTTPException(status_code=401, detail="Token SSO tidak valid atau sudah kadaluarsa")

    cookie_value = create_session_cookie_value()
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_value,
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"success": True, "message": "Session aktif", "expires_in_hours": SESSION_HOURS}


@api_router.post("/sso/enter")
async def sso_enter_post(payload: dict, response: Response):
    sso = payload.get("sso", "")
    if not verify_sso_token(sso):
        raise HTTPException(status_code=401, detail="Token SSO tidak valid atau sudah kadaluarsa")

    cookie_value = create_session_cookie_value()
    response.set_cookie(
        key=COOKIE_NAME,
        value=cookie_value,
        max_age=SESSION_HOURS * 3600,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )
    return {"success": True, "message": "Session aktif", "expires_in_hours": SESSION_HOURS}


@api_router.get("/sso/check")
async def sso_check(request: Request):
    return {
        "authorized": is_session_valid(request),
        "login_url": K3ICS_LOGIN_URL,
    }


@api_router.post("/sso/logout")
async def sso_logout(response: Response):
    response.delete_cookie(key=COOKIE_NAME, path="/")
    return {"success": True, "redirect": K3ICS_LOGIN_URL}


# =========== ASSET ROUTES ===========
def _serialize_asset_doc(doc: dict) -> dict:
    doc.pop("_id", None)
    for k in ("created_at", "updated_at"):
        if isinstance(doc.get(k), str):
            try:
                doc[k] = datetime.fromisoformat(doc[k])
            except Exception:
                pass
    return doc


# ===== HISTORY / SNAPSHOT =====
# 1 hari KONIS = 06:00 - 06:00 hari berikutnya (Asia/Jakarta, UTC+7)
KONIS_DAY_START_HOUR = 6
TZ_OFFSET_HOURS = 7  # Asia/Jakarta (WIT Papua Barat = UTC+9 but using WIB +7 for Koarmada 3 standard)


def get_konis_date(now: Optional[datetime] = None) -> str:
    """Return logical KONIS date (YYYY-MM-DD) given current time.
    If time < 06:00 local → date is yesterday.
    """
    if now is None:
        now = datetime.now(timezone.utc)
    # convert to local
    local = now + timedelta(hours=TZ_OFFSET_HOURS)
    if local.hour < KONIS_DAY_START_HOUR:
        local = local - timedelta(days=1)
    return local.strftime("%Y-%m-%d")


async def snapshot_asset(asset_doc: dict):
    """Upsert daily snapshot for the asset's current state."""
    konis_date = get_konis_date()
    snap = {
        "asset_id": asset_doc["id"],
        "asset_code": asset_doc["code"],
        "asset_name": asset_doc["name"],
        "type": asset_doc["type"],
        "konis_date": konis_date,
        "konis_status": asset_doc.get("konis_status", "siap"),
        "readiness_percentage": asset_doc.get("readiness_percentage", 0),
        "logistics": asset_doc.get("logistics", {}),
        "weapon_systems_summary": [
            {"id": w.get("id"), "name": w.get("name"), "status": w.get("status")}
            for w in asset_doc.get("weapon_systems", [])
        ],
        "location": asset_doc.get("location"),
        "commander": asset_doc.get("commander"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.asset_snapshots.update_one(
        {"asset_id": asset_doc["id"], "konis_date": konis_date},
        {"$set": snap},
        upsert=True,
    )


async def backfill_snapshots_if_empty():
    """First run: generate snapshots for last 30 days for each asset (with random-ish variation
    simulating history). Only runs once when asset_snapshots is empty."""
    if await db.asset_snapshots.count_documents({}) > 0:
        return
    import random
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    if not assets:
        return
    today = datetime.now(timezone.utc) + timedelta(hours=TZ_OFFSET_HOURS)
    for days_back in range(30, -1, -1):
        d = (today - timedelta(days=days_back)).strftime("%Y-%m-%d")
        for a in assets:
            # Add small random variation
            base_read = a.get("readiness_percentage", 80)
            drift = random.randint(-8, 8) if days_back > 0 else 0
            read = max(0, min(100, base_read + drift - (days_back * 0.3)))

            logi = a.get("logistics", {}) or {}
            logi_var = {k: max(0, min(100, v + random.randint(-10, 5))) for k, v in logi.items()}

            # Status might change for older days
            status = a.get("konis_status", "siap")
            if read < 40:
                status = "tidak_siap"
            elif read < 70:
                status = "siap_terbatas"
            else:
                status = "siap"

            await db.asset_snapshots.insert_one({
                "asset_id": a["id"],
                "asset_code": a["code"],
                "asset_name": a["name"],
                "type": a["type"],
                "konis_date": d,
                "konis_status": status,
                "readiness_percentage": round(read, 1),
                "logistics": logi_var,
                "weapon_systems_summary": [],
                "location": a.get("location"),
                "commander": a.get("commander"),
                "updated_at": (today - timedelta(days=days_back)).isoformat(),
            })
    logger.info("Backfilled 30 days of snapshots.")


@api_router.get("/assets", response_model=List[Asset])
async def list_assets(type: Optional[AssetType] = None, _=Depends(require_session)):
    q = {"type": type} if type else {}
    docs = await db.assets.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Asset(**_serialize_asset_doc(d)) for d in docs]


@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, _=Depends(require_session)):
    doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    return Asset(**_serialize_asset_doc(doc))


@api_router.post("/assets", response_model=Asset)
async def create_asset(data: AssetCreate, _=Depends(require_session)):
    asset = Asset(**data.model_dump())
    doc = asset.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.assets.insert_one(doc)
    await snapshot_asset(doc)
    return asset


@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, data: AssetCreate, _=Depends(require_session)):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.assets.update_one({"id": asset_id}, {"$set": update_doc})
    new_doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    await snapshot_asset(new_doc)
    return Asset(**_serialize_asset_doc(new_doc))


@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, _=Depends(require_session)):
    result = await db.assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    return {"success": True}


# =========== QUICK STATUS UPDATE ENDPOINTS (for inline edit) ===========
class QuickKonisUpdate(BaseModel):
    konis_status: Optional[KonisStatus] = None
    readiness_percentage: Optional[float] = None


@api_router.patch("/assets/{asset_id}/konis", response_model=Asset)
async def update_konis(asset_id: str, data: QuickKonisUpdate, _=Depends(require_session)):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    patch = {k: v for k, v in data.model_dump().items() if v is not None}
    patch["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.assets.update_one({"id": asset_id}, {"$set": patch})
    new_doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    await snapshot_asset(new_doc)
    return Asset(**_serialize_asset_doc(new_doc))


@api_router.patch("/assets/{asset_id}/logistics", response_model=Asset)
async def update_logistics(asset_id: str, data: Logistics, _=Depends(require_session)):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    await db.assets.update_one(
        {"id": asset_id},
        {"$set": {"logistics": data.model_dump(), "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    new_doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    await snapshot_asset(new_doc)
    return Asset(**_serialize_asset_doc(new_doc))


# =========== HISTORY ENDPOINTS ===========
@api_router.get("/assets/{asset_id}/history")
async def asset_history(asset_id: str, days: int = 30, _=Depends(require_session)):
    """Return daily snapshots for the past N days (chronological).
    For days with no update, returns the last known state carried forward with `is_stale=True`."""
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")

    now_local = datetime.now(timezone.utc) + timedelta(hours=TZ_OFFSET_HOURS)
    start_date = (now_local - timedelta(days=days)).strftime("%Y-%m-%d")
    end_date = get_konis_date()

    snaps = await db.asset_snapshots.find(
        {"asset_id": asset_id, "konis_date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0},
    ).sort("konis_date", 1).to_list(1000)

    by_date = {s["konis_date"]: s for s in snaps}

    # Fill gaps (day without update → carry forward last known + mark stale)
    result = []
    last_known = None
    for i in range(days, -1, -1):
        d = (now_local - timedelta(days=i)).strftime("%Y-%m-%d")
        if d in by_date:
            last_known = by_date[d]
            result.append({**last_known, "is_stale": False, "date": d})
        elif last_known:
            result.append({**last_known, "is_stale": True, "date": d, "konis_date": d})
        else:
            # no data at all yet for this asset
            result.append({
                "date": d, "konis_date": d, "asset_id": asset_id,
                "konis_status": "siap", "readiness_percentage": 0,
                "logistics": {}, "is_stale": True, "no_data": True,
            })
    return {
        "asset_id": asset_id,
        "asset_name": asset["name"],
        "asset_code": asset["code"],
        "days": days,
        "start_date": start_date,
        "end_date": end_date,
        "history": result,
    }


@api_router.get("/assets/{asset_id}/at")
async def asset_at_date(asset_id: str, date: str, _=Depends(require_session)):
    """Get asset state at a specific date (YYYY-MM-DD). If no snapshot that day, carry forward."""
    asset = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")

    snap = await db.asset_snapshots.find_one(
        {"asset_id": asset_id, "konis_date": {"$lte": date}},
        {"_id": 0},
        sort=[("konis_date", -1)],
    )
    if not snap:
        return {"no_data": True, "asset_id": asset_id, "requested_date": date}
    snap["requested_date"] = date
    snap["is_stale"] = snap.get("konis_date") != date
    return snap


@api_router.get("/dashboard/history")
async def dashboard_history(days: int = 30, _=Depends(require_session)):
    """Fleet-wide aggregated trend over the past N days."""
    now_local = datetime.now(timezone.utc) + timedelta(hours=TZ_OFFSET_HOURS)
    start_date = (now_local - timedelta(days=days)).strftime("%Y-%m-%d")
    end_date = get_konis_date()

    snaps = await db.asset_snapshots.find(
        {"konis_date": {"$gte": start_date, "$lte": end_date}},
        {"_id": 0},
    ).to_list(100000)

    # Group by date
    by_date: Dict[str, list] = {}
    for s in snaps:
        by_date.setdefault(s["konis_date"], []).append(s)

    timeline = []
    for i in range(days, -1, -1):
        d = (now_local - timedelta(days=i)).strftime("%Y-%m-%d")
        day_snaps = by_date.get(d, [])
        if not day_snaps:
            timeline.append({
                "date": d, "count": 0, "avg_readiness": 0,
                "siap": 0, "siap_terbatas": 0, "tidak_siap": 0,
                "logistics_avg": {},
            })
            continue
        avg_read = sum(s.get("readiness_percentage", 0) for s in day_snaps) / len(day_snaps)
        siap = sum(1 for s in day_snaps if s.get("konis_status") == "siap")
        terbatas = sum(1 for s in day_snaps if s.get("konis_status") == "siap_terbatas")
        tidak = sum(1 for s in day_snaps if s.get("konis_status") == "tidak_siap")

        # logistics average
        logi_sums = {}
        for s in day_snaps:
            for k, v in (s.get("logistics", {}) or {}).items():
                logi_sums.setdefault(k, []).append(v)
        logi_avg = {k: round(sum(vals) / len(vals), 1) for k, vals in logi_sums.items()}

        timeline.append({
            "date": d,
            "count": len(day_snaps),
            "avg_readiness": round(avg_read, 1),
            "siap": siap,
            "siap_terbatas": terbatas,
            "tidak_siap": tidak,
            "logistics_avg": logi_avg,
        })
    return {"days": days, "timeline": timeline}


# =========== DASHBOARD ===========
@api_router.get("/dashboard/stats")
async def dashboard_stats(_=Depends(require_session)):
    assets = await db.assets.find({}, {"_id": 0}).to_list(1000)
    total_kapal = sum(1 for a in assets if a["type"] == "kapal")
    total_pangkalan = sum(1 for a in assets if a["type"] == "pangkalan")

    status_count = {"siap": 0, "siap_terbatas": 0, "tidak_siap": 0}
    for a in assets:
        status_count[a.get("konis_status", "siap")] += 1

    avg_readiness = (
        sum(a.get("readiness_percentage", 0) for a in assets) / len(assets)
        if assets else 0
    )

    kapal = [a for a in assets if a["type"] == "kapal"]
    logistics_avg = {}
    if kapal:
        for key in ("bahan_bakar", "air_bersih", "fresh_room", "minyak_lincir", "amunisi", "ransum"):
            logistics_avg[key] = sum(a.get("logistics", {}).get(key, 0) for a in kapal) / len(kapal)

    readiness_list = [
        {"name": a["name"], "code": a["code"], "readiness": a.get("readiness_percentage", 0),
         "status": a.get("konis_status", "siap"), "type": a["type"]}
        for a in assets
    ]

    return {
        "total_kapal": total_kapal,
        "total_pangkalan": total_pangkalan,
        "total_assets": len(assets),
        "status_count": status_count,
        "avg_readiness": round(avg_readiness, 1),
        "logistics_avg": logistics_avg,
        "readiness_list": readiness_list,
    }


# =========== AI ANALYSIS ===========
@api_router.post("/ai-analysis", response_model=AIAnalysisResponse)
async def ai_analysis(req: AIAnalysisRequest, _=Depends(require_session)):
    asset = await db.assets.find_one({"id": req.asset_id}, {"_id": 0})
    if not asset:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")

    asset_type_name = "Kapal (KRI)" if asset["type"] == "kapal" else "Pangkalan"
    logistics = asset.get("logistics", {})
    weapons = asset.get("weapon_systems", [])
    personnel_count = len(asset.get("personnel", []))

    context = f"""
Anda adalah asisten analisa kondisi teknis untuk Koarmada 3 TNI AL.
Berikan analisa profesional, ringkas, dan tactical.

DATA ASET:
- Jenis: {asset_type_name}
- Nama: {asset['name']} ({asset['code']})
- Komandan: {asset.get('commander', '-')}
- Lokasi: {asset.get('location', '-')}
- Status KONIS: {asset.get('konis_status', 'siap').upper()}
- Persentase Kesiapan: {asset.get('readiness_percentage', 0)}%
- Deskripsi: {asset.get('description', '')}

KONDISI LOGISTIK (%):
- Bahan Bakar: {logistics.get('bahan_bakar', 0)}%
- Air Bersih: {logistics.get('air_bersih', 0)}%
- Fresh Room: {logistics.get('fresh_room', 0)}%
- Minyak Lincir: {logistics.get('minyak_lincir', 0)}%
- Amunisi: {logistics.get('amunisi', 0)}%
- Ransum: {logistics.get('ransum', 0)}%

SISTEM SENJATA / KEMAMPUAN:
{chr(10).join(f'- {w["name"]} ({w["type"]}): {w["status"].upper()}' for w in weapons) if weapons else '- (Belum terdata)'}

Jumlah Personel: {personnel_count}

TUGAS:
Berikan analisa dalam 4 bagian dengan heading yang jelas:
1. **RINGKASAN KONDISI** - 2 kalimat status umum
2. **TEMUAN KRITIS** - poin-poin risiko utama
3. **REKOMENDASI AKSI** - langkah konkret prioritas
4. **PROYEKSI KESIAPAN OPERASIONAL** - estimasi readiness 7 hari ke depan

Gunakan bahasa Indonesia militer yang profesional. Maksimal 300 kata.
"""
    if req.question:
        context += f"\n\nPERTANYAAN TAMBAHAN: {req.question}"

    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"konis-{req.asset_id}-{uuid.uuid4()}",
            system_message="Anda adalah perwira analisa kondisi teknis (KONIS) TNI AL Koarmada 3 yang memberikan laporan tactical profesional.",
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        msg = UserMessage(text=context)
        response_text = await chat.send_message(msg)
    except Exception as e:
        logger.exception("AI error")
        raise HTTPException(status_code=500, detail=f"Gagal menghasilkan analisa AI: {str(e)}")

    result = AIAnalysisResponse(
        asset_id=req.asset_id,
        analysis=response_text,
        timestamp=datetime.now(timezone.utc),
    )
    await db.ai_analyses.insert_one({
        **result.model_dump(),
        "timestamp": result.timestamp.isoformat(),
    })
    return result


# =========== SEEDING ===========
async def seed_initial_data():
    assets_count = await db.assets.count_documents({})
    if assets_count == 0:
        logger.info("Seeding dummy assets...")
        ship_img_1 = "https://images.unsplash.com/photo-1768754707973-282ae26e3aa2"
        ship_img_2 = "https://images.unsplash.com/photo-1692603107931-8676aa4574f5"
        ship_img_3 = "https://images.unsplash.com/photo-1759687448389-757d021525d0"
        base_img = "https://images.unsplash.com/photo-1756755148763-ef15c312dd09"
        officer_1 = "https://images.unsplash.com/photo-1714272663284-5ce8ab649ecd"
        officer_2 = "https://images.unsplash.com/photo-1771343917024-0b5397850ccd"

        dummy_assets = [
            {
                "type": "kapal", "name": "KRI Diponegoro", "code": "365",
                "description": "Korvet kelas SIGMA dengan kemampuan anti-kapal permukaan dan anti-udara.",
                "specifications": {"kelas": "SIGMA 9113", "panjang": "90.71 m", "lebar": "13.02 m", "kecepatan_maks": "28 knot", "awak": 80, "dibuat": "2007"},
                "images": [ship_img_1, ship_img_2],
                "konis_status": "siap", "readiness_percentage": 92,
                "logistics": {"bahan_bakar": 88, "air_bersih": 75, "fresh_room": 90, "minyak_lincir": 82, "amunisi": 95, "ransum": 70},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Meriam OTO Melara 76mm", "type": "Main Gun", "status": "siap", "notes": "Siap operasi"},
                    {"id": str(uuid.uuid4()), "name": "Rudal Exocet MM40 Block II", "type": "SSM", "status": "siap", "notes": "4x siap tembak"},
                    {"id": str(uuid.uuid4()), "name": "Rudal Mistral Tetral", "type": "SAM", "status": "siap_terbatas", "notes": "2 unit butuh kalibrasi"},
                    {"id": str(uuid.uuid4()), "name": "Torpedo B515", "type": "ASW", "status": "siap", "notes": ""},
                ],
                "location": "Lantamal XIV Sorong", "commander": "Letkol Laut (P) Ahmad Surya",
            },
            {
                "type": "kapal", "name": "KRI Sultan Hasanuddin", "code": "366",
                "description": "Korvet SIGMA kedua Koarmada 3, fokus pada patroli laut lepas dan kemampuan ASW.",
                "specifications": {"kelas": "SIGMA 9113", "panjang": "90.71 m", "lebar": "13.02 m", "kecepatan_maks": "28 knot", "awak": 80, "dibuat": "2007"},
                "images": [ship_img_2, ship_img_1],
                "konis_status": "siap_terbatas", "readiness_percentage": 68,
                "logistics": {"bahan_bakar": 55, "air_bersih": 60, "fresh_room": 72, "minyak_lincir": 48, "amunisi": 80, "ransum": 65},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Meriam OTO Melara 76mm", "type": "Main Gun", "status": "siap", "notes": ""},
                    {"id": str(uuid.uuid4()), "name": "Rudal Exocet MM40", "type": "SSM", "status": "siap_terbatas", "notes": "Butuh pemeliharaan"},
                ],
                "location": "Lantamal XIV Sorong", "commander": "Letkol Laut (P) Bayu Saputra",
            },
            {
                "type": "kapal", "name": "KRI Bung Tomo", "code": "357",
                "description": "Kapal multi-peran kelas Nakhoda Ragam, kemampuan serbu cepat.",
                "specifications": {"kelas": "Nakhoda Ragam", "panjang": "95 m", "lebar": "12.8 m", "kecepatan_maks": "30 knot", "awak": 79, "dibuat": "2014"},
                "images": [ship_img_2],
                "konis_status": "siap", "readiness_percentage": 85,
                "logistics": {"bahan_bakar": 78, "air_bersih": 85, "fresh_room": 88, "minyak_lincir": 75, "amunisi": 90, "ransum": 82},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Meriam BAE 76mm Super Rapid", "type": "Main Gun", "status": "siap", "notes": ""},
                ],
                "location": "Lantamal XIV Sorong", "commander": "Letkol Laut (P) Candra Adi",
            },
            {
                "type": "kapal", "name": "KRI Nanggala", "code": "402",
                "description": "Kapal selam serangan kelas Cakra.",
                "specifications": {"kelas": "Type 209/1300", "panjang": "59.5 m", "lebar": "6.3 m", "kecepatan_maks": "21.5 knot bawah air", "awak": 34, "dibuat": "1981"},
                "images": [ship_img_3],
                "konis_status": "tidak_siap", "readiness_percentage": 25,
                "logistics": {"bahan_bakar": 30, "air_bersih": 20, "fresh_room": 40, "minyak_lincir": 25, "amunisi": 60, "ransum": 35},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Torpedo AEG SUT", "type": "Heavy Torpedo", "status": "tidak_siap", "notes": "Overhaul"},
                ],
                "location": "Fasharkan Manokwari", "commander": "Letkol Laut (P) Dharma Wijaya",
            },
            {
                "type": "kapal", "name": "KRI Banda Aceh", "code": "593",
                "description": "Kapal Angkut Tank (LPD) kelas Makassar.",
                "specifications": {"kelas": "Makassar LPD", "panjang": "125 m", "lebar": "22 m", "kecepatan_maks": "15 knot", "awak": 126, "dibuat": "2011"},
                "images": [ship_img_1, ship_img_2],
                "konis_status": "siap", "readiness_percentage": 88,
                "logistics": {"bahan_bakar": 92, "air_bersih": 85, "fresh_room": 80, "minyak_lincir": 88, "amunisi": 75, "ransum": 90},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Meriam Bofors 40mm", "type": "AA Gun", "status": "siap", "notes": ""},
                ],
                "location": "Lantamal XIV Sorong", "commander": "Kolonel Laut (P) Erlangga Jaya",
            },
            {
                "type": "pangkalan", "name": "Lantamal XIV Sorong", "code": "LTM-XIV",
                "description": "Pangkalan Utama TNI AL wilayah Papua Barat Daya, pusat operasi Koarmada 3.",
                "specifications": {"luas_area": "120 ha", "dermaga": "4 unit", "kapasitas_kapal": "12 kapal"},
                "images": [base_img],
                "konis_status": "siap", "readiness_percentage": 94,
                "logistics": {"bahan_bakar": 95, "air_bersih": 92, "fresh_room": 88, "minyak_lincir": 90, "amunisi": 96, "ransum": 85},
                "personnel": [
                    {"id": str(uuid.uuid4()), "name": "Laksamana Pertama Adhi Wibowo", "rank": "Laksma TNI", "position": "Komandan Lantamal XIV", "photo": officer_1},
                    {"id": str(uuid.uuid4()), "name": "Kolonel Laut Bagas Prakoso", "rank": "Kolonel", "position": "Kepala Staf", "photo": officer_2},
                ],
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Coastal Radar CRS-300", "type": "Radar", "status": "siap", "notes": ""},
                ],
                "location": "Sorong, Papua Barat Daya", "commander": "Laksma TNI Adhi Wibowo",
            },
            {
                "type": "pangkalan", "name": "Fasharkan Manokwari", "code": "FSH-MKW",
                "description": "Fasilitas Pemeliharaan dan Perbaikan kapal wilayah Teluk Cendrawasih.",
                "specifications": {"luas_area": "45 ha", "dermaga": "2 unit", "graving_dock": "1 unit"},
                "images": [base_img],
                "konis_status": "siap_terbatas", "readiness_percentage": 72,
                "logistics": {"bahan_bakar": 68, "air_bersih": 75, "fresh_room": 70, "minyak_lincir": 65, "amunisi": 80, "ransum": 72},
                "personnel": [
                    {"id": str(uuid.uuid4()), "name": "Kolonel Laut Erlangga Jaya", "rank": "Kolonel", "position": "Komandan Fasharkan", "photo": officer_1},
                ],
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Crane Dermaga 50T", "type": "Support", "status": "siap", "notes": ""},
                ],
                "location": "Manokwari, Papua Barat", "commander": "Kolonel Laut Erlangga Jaya",
            },
        ]

        for a in dummy_assets:
            asset = Asset(**a)
            doc = asset.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            doc["updated_at"] = doc["updated_at"].isoformat()
            await db.assets.insert_one(doc)
    logger.info("Seeding complete.")


@app.on_event("startup")
async def on_startup():
    await seed_initial_data()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@api_router.get("/")
async def root():
    return {"message": "Logistic3 API", "status": "operational"}


app.include_router(api_router)

# CORS: must allow credentials for cookie-based session
allowed_origins = os.environ.get('CORS_ORIGINS', '*').split(',')
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
