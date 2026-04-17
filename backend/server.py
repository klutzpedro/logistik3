from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt as pyjwt

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
JWT_ALGO = "HS256"
JWT_EXPIRE_HOURS = 24 * 7

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="Koarmada 3 Logistics Monitor")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# =========== MODELS ===========
UserRole = Literal["admin", "operator", "viewer"]
AssetType = Literal["kapal", "pangkalan"]
KonisStatus = Literal["siap", "siap_terbatas", "tidak_siap"]


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: UserRole = "viewer"


class UserLogin(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class Logistics(BaseModel):
    bahan_bakar: float = 0  # percentage 0-100
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
    photo: Optional[str] = None  # base64


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
    images: List[str] = Field(default_factory=list)  # base64 strings
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


# =========== AUTH HELPERS ===========
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(creds: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        payload = pyjwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User tidak ditemukan")
        return user
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token tidak valid")


def require_role(*roles: str):
    async def checker(user: dict = Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Akses ditolak")
        return user
    return checker


# =========== AUTH ROUTES ===========
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token(user_id, data.role)
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user_id, email=data.email, name=data.name, role=data.role),
    )


@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.username}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Username atau password salah")
    token = create_token(user["id"], user["role"])
    return TokenResponse(
        access_token=token,
        user=UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"]),
    )


@api_router.get("/auth/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(id=user["id"], email=user["email"], name=user["name"], role=user["role"])


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


@api_router.get("/assets", response_model=List[Asset])
async def list_assets(type: Optional[AssetType] = None, user: dict = Depends(get_current_user)):
    q = {"type": type} if type else {}
    docs = await db.assets.find(q, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Asset(**_serialize_asset_doc(d)) for d in docs]


@api_router.get("/assets/{asset_id}", response_model=Asset)
async def get_asset(asset_id: str, user: dict = Depends(get_current_user)):
    doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    return Asset(**_serialize_asset_doc(doc))


@api_router.post("/assets", response_model=Asset)
async def create_asset(data: AssetCreate, user: dict = Depends(require_role("admin", "operator"))):
    asset = Asset(**data.model_dump())
    doc = asset.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.assets.insert_one(doc)
    return asset


@api_router.put("/assets/{asset_id}", response_model=Asset)
async def update_asset(asset_id: str, data: AssetCreate, user: dict = Depends(require_role("admin", "operator"))):
    existing = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    update_doc = data.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.assets.update_one({"id": asset_id}, {"$set": update_doc})
    new_doc = await db.assets.find_one({"id": asset_id}, {"_id": 0})
    return Asset(**_serialize_asset_doc(new_doc))


@api_router.delete("/assets/{asset_id}")
async def delete_asset(asset_id: str, user: dict = Depends(require_role("admin"))):
    result = await db.assets.delete_one({"id": asset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Asset tidak ditemukan")
    return {"success": True}


# =========== DASHBOARD ROUTES ===========
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
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

    # Logistics averages for ships
    kapal = [a for a in assets if a["type"] == "kapal"]
    logistics_avg = {}
    if kapal:
        for key in ("bahan_bakar", "air_bersih", "fresh_room", "minyak_lincir", "amunisi", "ransum"):
            logistics_avg[key] = sum(a.get("logistics", {}).get(key, 0) for a in kapal) / len(kapal)

    # Readiness per asset (for bar chart)
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
async def ai_analysis(req: AIAnalysisRequest, user: dict = Depends(get_current_user)):
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
    # Save to history
    await db.ai_analyses.insert_one({
        **result.model_dump(),
        "timestamp": result.timestamp.isoformat(),
        "user_id": user["id"],
    })
    return result


@api_router.get("/ai-analysis/history/{asset_id}")
async def ai_history(asset_id: str, user: dict = Depends(get_current_user)):
    history = await db.ai_analyses.find({"asset_id": asset_id}, {"_id": 0}).sort("timestamp", -1).limit(20).to_list(20)
    return history


# =========== SEEDING ===========
async def seed_initial_data():
    # Ensure admin user exists (reset to default password on every startup for single-admin mode)
    admin_email = "admin"
    admin_password = "Paparoni83#"
    existing_admin = await db.users.find_one({"email": admin_email})
    if not existing_admin:
        await db.users.delete_many({})  # clear any legacy seed users
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "name": "Panglima Koarmada 3",
            "role": "admin",
            "password_hash": hash_password(admin_password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info("Admin user seeded.")

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
                    {"id": str(uuid.uuid4()), "name": "Sonar Thales Kingklip", "type": "Sonar", "status": "siap", "notes": ""},
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
                    {"id": str(uuid.uuid4()), "name": "Rudal MBDA Exocet MM40", "type": "SSM", "status": "siap", "notes": ""},
                    {"id": str(uuid.uuid4()), "name": "Rudal MBDA Seawolf", "type": "SAM", "status": "siap", "notes": ""},
                ],
                "location": "Lantamal XIV Sorong", "commander": "Letkol Laut (P) Candra Adi",
            },
            {
                "type": "kapal", "name": "KRI Nanggala", "code": "402",
                "description": "Kapal selam serangan kelas Cakra. Simulasi unit 3D viewer.",
                "specifications": {"kelas": "Type 209/1300", "panjang": "59.5 m", "lebar": "6.3 m", "kecepatan_maks": "21.5 knot bawah air", "awak": 34, "dibuat": "1981"},
                "images": [ship_img_3],
                "konis_status": "tidak_siap", "readiness_percentage": 25,
                "logistics": {"bahan_bakar": 30, "air_bersih": 20, "fresh_room": 40, "minyak_lincir": 25, "amunisi": 60, "ransum": 35},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Torpedo AEG SUT", "type": "Heavy Torpedo", "status": "tidak_siap", "notes": "Overhaul"},
                    {"id": str(uuid.uuid4()), "name": "Sonar CSU-3", "type": "Sonar", "status": "siap_terbatas", "notes": "Kalibrasi diperlukan"},
                ],
                "location": "Fasharkan Manokwari", "commander": "Letkol Laut (P) Dharma Wijaya",
            },
            {
                "type": "kapal", "name": "KRI Banda Aceh", "code": "593",
                "description": "Kapal Angkut Tank (LPD) kelas Makassar, peran amfibi & HADR.",
                "specifications": {"kelas": "Makassar LPD", "panjang": "125 m", "lebar": "22 m", "kecepatan_maks": "15 knot", "awak": 126, "dibuat": "2011"},
                "images": [ship_img_1, ship_img_2],
                "konis_status": "siap", "readiness_percentage": 88,
                "logistics": {"bahan_bakar": 92, "air_bersih": 85, "fresh_room": 80, "minyak_lincir": 88, "amunisi": 75, "ransum": 90},
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Meriam Bofors 40mm", "type": "AA Gun", "status": "siap", "notes": ""},
                    {"id": str(uuid.uuid4()), "name": "Helipad Dual Heli", "type": "Aviation", "status": "siap", "notes": "Dapat membawa 2 heli"},
                ],
                "location": "Lantamal XIV Sorong", "commander": "Kolonel Laut (P) Erlangga Jaya",
            },
            {
                "type": "pangkalan", "name": "Lantamal XIV Sorong", "code": "LTM-XIV",
                "description": "Pangkalan Utama TNI AL wilayah Papua Barat Daya, pusat operasi Koarmada 3.",
                "specifications": {"luas_area": "120 ha", "dermaga": "4 unit", "kapasitas_kapal": "12 kapal", "runway_heli": "Ya", "bengkel": "Kelas B"},
                "images": [base_img],
                "konis_status": "siap", "readiness_percentage": 94,
                "logistics": {"bahan_bakar": 95, "air_bersih": 92, "fresh_room": 88, "minyak_lincir": 90, "amunisi": 96, "ransum": 85},
                "personnel": [
                    {"id": str(uuid.uuid4()), "name": "Laksamana Pertama Adhi Wibowo", "rank": "Laksma TNI", "position": "Komandan Lantamal XIV", "photo": officer_1},
                    {"id": str(uuid.uuid4()), "name": "Kolonel Laut Bagas Prakoso", "rank": "Kolonel", "position": "Kepala Staf", "photo": officer_2},
                    {"id": str(uuid.uuid4()), "name": "Letkol Laut Candra Adi", "rank": "Letkol", "position": "Pamen Operasi", "photo": officer_1},
                    {"id": str(uuid.uuid4()), "name": "Mayor Laut Dharma Wijaya", "rank": "Mayor", "position": "Pamen Logistik", "photo": officer_2},
                ],
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Coastal Radar CRS-300", "type": "Radar", "status": "siap", "notes": ""},
                    {"id": str(uuid.uuid4()), "name": "Meriam Pantai 40mm", "type": "Coastal Gun", "status": "siap", "notes": ""},
                ],
                "location": "Sorong, Papua Barat Daya", "commander": "Laksma TNI Adhi Wibowo",
            },
            {
                "type": "pangkalan", "name": "Fasharkan Manokwari", "code": "FSH-MKW",
                "description": "Fasilitas Pemeliharaan dan Perbaikan kapal wilayah Teluk Cendrawasih.",
                "specifications": {"luas_area": "45 ha", "dermaga": "2 unit", "graving_dock": "1 unit", "kapasitas_kapal": "6 kapal", "bengkel": "Kelas C"},
                "images": [base_img],
                "konis_status": "siap_terbatas", "readiness_percentage": 72,
                "logistics": {"bahan_bakar": 68, "air_bersih": 75, "fresh_room": 70, "minyak_lincir": 65, "amunisi": 80, "ransum": 72},
                "personnel": [
                    {"id": str(uuid.uuid4()), "name": "Kolonel Laut Erlangga Jaya", "rank": "Kolonel", "position": "Komandan Fasharkan", "photo": officer_1},
                    {"id": str(uuid.uuid4()), "name": "Letkol Laut Fadli Hidayat", "rank": "Letkol", "position": "Kepala Bengkel", "photo": officer_2},
                    {"id": str(uuid.uuid4()), "name": "Mayor Laut Gunawan Santoso", "rank": "Mayor", "position": "Pamen Teknik", "photo": officer_1},
                ],
                "weapon_systems": [
                    {"id": str(uuid.uuid4()), "name": "Crane Dermaga 50T", "type": "Support", "status": "siap", "notes": ""},
                    {"id": str(uuid.uuid4()), "name": "Graving Dock", "type": "Maintenance", "status": "siap_terbatas", "notes": "Butuh overhaul pintu"},
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
    return {"message": "Koarmada 3 Logistics Monitoring API", "status": "operational"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
