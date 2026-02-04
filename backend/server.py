from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from passlib.context import CryptContext
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import resend
import math
import httpx

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
NOTIFICATION_EMAIL = os.environ.get('NOTIFICATION_EMAIL', 'alluzenergia@gmail.com')
ALLOWED_ADMIN_EMAIL = os.environ.get('ALLOWED_ADMIN_EMAIL', 'alluzenergia@gmail.com')

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============ LOCALIDADES (ESTADOS/CIDADES) ============

IBGE_BASE_URL = "https://servicodados.ibge.gov.br/api/v1/localidades"

async def seed_localidades_if_needed():
    estados_count = await db.estados.count_documents({})
    cidades_count = await db.cidades.count_documents({})
    if estados_count > 0 and cidades_count > 0:
        return

    logger.info("Seeding estados/cidades from IBGE API.")
    async with httpx.AsyncClient(timeout=30) as client:
        estados_response = await client.get(f"{IBGE_BASE_URL}/estados?orderBy=nome")
        estados_response.raise_for_status()
        estados_data = estados_response.json()

        estados_docs = [
            {
                "estado_id": estado["id"],
                "sigla": estado["sigla"],
                "nome": estado["nome"],
            }
            for estado in estados_data
        ]

        if estados_docs:
            await db.estados.delete_many({})
            await db.estados.insert_many(estados_docs)

        cidades_docs = []
        for estado in estados_data:
            estado_id = estado["id"]
            estado_sigla = estado["sigla"]
            estado_nome = estado["nome"]
            cidades_response = await client.get(f"{IBGE_BASE_URL}/estados/{estado_id}/municipios")
            cidades_response.raise_for_status()
            cidades_data = cidades_response.json()
            for cidade in cidades_data:
                cidades_docs.append(
                    {
                        "cidade_id": cidade["id"],
                        "nome": cidade["nome"],
                        "estado_id": estado_id,
                        "estado_sigla": estado_sigla,
                        "estado_nome": estado_nome,
                    }
                )

        if cidades_docs:
            await db.cidades.delete_many({})
            await db.cidades.insert_many(cidades_docs)

@app.on_event("startup")
async def startup_localidades():
    try:
        await seed_localidades_if_needed()
    except Exception as exc:
        logger.error("Failed to seed localidades: %s", exc)

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str = Field(min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserSession(BaseModel):
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime

class LeadBase(BaseModel):
    nome: str
    telefone: str
    email: Optional[str] = None
    num_residencias: int
    valores_conta: List[float]
    estado: str
    cidade: str
    tipo_telhado: str
    tipo_projeto: str
    kwp: float
    valor_projeto: float
    qtd_placas_min: int
    qtd_placas_max: int
    inversor: int
    incidencia_solar: float
    payback_anos: float
    valorizacao_imovel: float
    parcela_estimada: float
    status: Optional[str] = "Novo"

class Lead(LeadBase):
    lead_id: str
    created_at: datetime

class LeadCreate(LeadBase):
    pass

class StatusType(BaseModel):
    status_id: str
    nome: str
    cor: str
    ordem: int
    created_at: datetime

class StatusTypeCreate(BaseModel):
    nome: str
    cor: str = "#3B82F6"
    ordem: Optional[int] = 0

class TarifaConcessionaria(BaseModel):
    tarifa_id: str
    estado: str
    concessionaria: str
    valor_kwh: float
    created_at: datetime
    updated_at: datetime

class TarifaConcessionariaCreate(BaseModel):
    estado: str
    concessionaria: str
    valor_kwh: float

class Configuracao(BaseModel):
    config_id: str = "valor_kwp"
    valor_kwp: float
    updated_at: datetime

class ConfiguracaoUpdate(BaseModel):
    valor_kwp: float

class IrradiacaoSolar(BaseModel):
    estado: str
    cidade: str
    incidencia_media: float

class Estado(BaseModel):
    estado_id: int
    sigla: str
    nome: str

class Cidade(BaseModel):
    cidade_id: int
    nome: str
    estado_id: int
    estado_sigla: str
    estado_nome: str

class LeadUpdateStatus(BaseModel):
    status: str

class LeadFilters(BaseModel):
    nome: Optional[str] = None
    data_inicio: Optional[str] = None
    data_fim: Optional[str] = None
    status: Optional[str] = None
    valor_min: Optional[float] = None
    valor_max: Optional[float] = None
    estado: Optional[str] = None
    cidade: Optional[str] = None

# ============ AUTH HELPERS ============

async def get_session_from_cookie_or_header(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None)
) -> dict:
    token = session_token
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization.replace("Bearer ", "")
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    expires_at = session_doc["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if expires_at < datetime.now(timezone.utc):
        await db.user_sessions.delete_one({"session_token": token})
        raise HTTPException(status_code=401, detail="Session expired")
    
    user_doc = await db.users.find_one(
        {"user_id": session_doc["user_id"]},
        {"_id": 0, "password_hash": 0}
    )
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc["email"] != ALLOWED_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return user_doc

# ============ AUTH ROUTES ============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    raise HTTPException(status_code=501, detail="Auth session exchange is not configured.")

async def create_session_for_user(user_id: str) -> dict:
    session_token = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    session_doc = {
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.user_sessions.insert_one(session_doc)
    return session_doc

async def register_user(payload: UserCreate, response: Response):
    if payload.email != ALLOWED_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Only the admin email can be registered.")

    existing = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=409, detail="User already exists.")

    password_hash = pwd_context.hash(payload.password)
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    user_doc = {
        "user_id": user_id,
        "email": payload.email,
        "name": payload.name,
        "password_hash": password_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(user_doc)

    session_doc = await create_session_for_user(user_id)
    response.set_cookie(
        key="session_token",
        value=session_doc["session_token"],
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {"user": {k: v for k, v in user_doc.items() if k != "password_hash"}}

@api_router.post("/auth/register")
async def register_user_post(payload: UserCreate, response: Response):
    return await register_user(payload, response)

@api_router.post("/auth/register/")
async def register_user_post_trailing(payload: UserCreate, response: Response):
    return await register_user(payload, response)

async def login_user(payload: UserLogin, response: Response):
    user_doc = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not user_doc or not pwd_context.verify(payload.password, user_doc.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    session_doc = await create_session_for_user(user_doc["user_id"])
    response.set_cookie(
        key="session_token",
        value=session_doc["session_token"],
        httponly=True,
        samesite="lax",
        path="/",
    )
    return {"user": {k: v for k, v in user_doc.items() if k != "password_hash"}}

@api_router.post("/auth/login")
async def login_user_post(payload: UserLogin, response: Response):
    return await login_user(payload, response)

@api_router.post("/auth/login/")
async def login_user_post_trailing(payload: UserLogin, response: Response):
    return await login_user(payload, response)

@api_router.get("/auth/me")
async def get_current_user(user: dict = Depends(get_session_from_cookie_or_header)):
    return user

@api_router.post("/auth/logout")
async def logout(
    response: Response,
    session_token: Optional[str] = Cookie(None)
):
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out successfully"}

# ============ PUBLIC ROUTES ============

@api_router.get("/")
async def root():
    return {"message": "Alluz Energia Solar Simulator API"}

@api_router.get("/estados")
async def get_estados():
    estados = await db.estados.find({}, {"_id": 0}).sort("nome", 1).to_list(100)
    if estados:
        return estados
    await seed_localidades_if_needed()
    return await db.estados.find({}, {"_id": 0}).sort("nome", 1).to_list(100)

@api_router.get("/cidades/{estado}")
async def get_cidades(estado: str):
    estado_doc = None
    if estado.isdigit():
        estado_doc = await db.estados.find_one({"estado_id": int(estado)}, {"_id": 0})
    elif len(estado) == 2:
        estado_doc = await db.estados.find_one({"sigla": estado.upper()}, {"_id": 0})
    else:
        estado_doc = await db.estados.find_one({"nome": {"$regex": f"^{estado}$", "$options": "i"}}, {"_id": 0})

    if not estado_doc:
        await seed_localidades_if_needed()
        if estado.isdigit():
            estado_doc = await db.estados.find_one({"estado_id": int(estado)}, {"_id": 0})
        elif len(estado) == 2:
            estado_doc = await db.estados.find_one({"sigla": estado.upper()}, {"_id": 0})
        else:
            estado_doc = await db.estados.find_one({"nome": {"$regex": f"^{estado}$", "$options": "i"}}, {"_id": 0})

    if not estado_doc:
        return []

    return await db.cidades.find(
        {"estado_id": estado_doc["estado_id"]},
        {"_id": 0}
    ).sort("nome", 1).to_list(600)

@api_router.get("/irradiacao/{estado}/{cidade}")
async def get_irradiacao(estado: str, cidade: str):
    irradiacao_data = {
        "AC": 4.8, "AL": 5.5, "AP": 4.9, "AM": 4.6, "BA": 5.8,
        "CE": 5.9, "DF": 5.6, "ES": 5.2, "GO": 5.7, "MA": 5.3,
        "MT": 5.9, "MS": 5.8, "MG": 5.5, "PA": 5.0, "PB": 5.9,
        "PR": 5.0, "PE": 5.9, "PI": 5.8, "RJ": 5.2, "RN": 6.0,
        "RS": 4.9, "RO": 5.1, "RR": 5.0, "SC": 4.8, "SP": 5.3,
        "SE": 5.7, "TO": 5.6
    }
    incidencia = irradiacao_data.get(estado.upper(), 5.0)
    return {"estado": estado, "cidade": cidade, "incidencia_media": incidencia}

@api_router.get("/configuracao/valor-kwp")
async def get_valor_kwp():
    config = await db.configuracoes.find_one({"config_id": "valor_kwp"}, {"_id": 0})
    if not config:
        default_config = {
            "config_id": "valor_kwp",
            "valor_kwp": 3500.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.configuracoes.insert_one(default_config)
        return default_config
    return config

@api_router.post("/leads")
async def create_lead(lead: LeadCreate):
    lead_id = f"lead_{uuid.uuid4().hex[:12]}"
    lead_data = lead.model_dump()
    lead_data["lead_id"] = lead_id
    lead_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.leads.insert_one(lead_data)
    
    # Send email notification
    try:
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 2px solid #F59E0B; border-radius: 10px;">
                <h2 style="color: #F59E0B; text-align: center;">🌞 Novo Lead - Simulador Solar Alluz</h2>
                <hr style="border: 1px solid #F59E0B;">
                <h3>Informações do Cliente:</h3>
                <p><strong>Nome:</strong> {lead_data['nome']}</p>
                <p><strong>Telefone:</strong> {lead_data['telefone']}</p>
                <p><strong>Email:</strong> {lead_data.get('email', 'Não informado')}</p>
                <p><strong>Localização:</strong> {lead_data['cidade']} - {lead_data['estado']}</p>
                <hr style="border: 1px solid #eee;">
                <h3>Detalhes do Projeto:</h3>
                <p><strong>Número de Residências:</strong> {lead_data['num_residencias']}</p>
                <p><strong>Tipo de Projeto:</strong> {lead_data['tipo_projeto']}</p>
                <p><strong>Tipo de Telhado:</strong> {lead_data['tipo_telhado']}</p>
                <p><strong>Valor do Projeto:</strong> R$ {lead_data['valor_projeto']:,.2f}</p>
                <p><strong>Potência (kWp):</strong> {lead_data['kwp']:.2f}</p>
                <p><strong>Quantidade de Placas:</strong> {lead_data['qtd_placas_min']} a {lead_data['qtd_placas_max']}</p>
                <p><strong>Inversor:</strong> {lead_data['inversor']} kW</p>
                <p><strong>Payback:</strong> {lead_data['payback_anos']:.1f} anos</p>
                <p><strong>Parcela Estimada:</strong> R$ {lead_data['parcela_estimada']:.2f}</p>
                <hr style="border: 1px solid #eee;">
                <p style="text-align: center; color: #666; font-size: 12px;">
                    Lead gerado em {datetime.now(timezone.utc).strftime('%d/%m/%Y às %H:%M')}
                </p>
            </div>
        </body>
        </html>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [NOTIFICATION_EMAIL],
            "subject": f"🌞 Novo Lead: {lead_data['nome']} - R$ {lead_data['valor_projeto']:,.2f}",
            "html": html_content
        }
        
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email notification sent for lead {lead_id}")
    except Exception as e:
        logger.error(f"Failed to send email notification: {str(e)}")
    
    return {"lead_id": lead_id, "message": "Lead criado com sucesso"}

# ============ ADMIN ROUTES ============

@api_router.get("/admin/leads")
async def get_leads(
    page: int = 1,
    limit: int = 20,
    nome: Optional[str] = None,
    status: Optional[str] = None,
    estado: Optional[str] = None,
    cidade: Optional[str] = None,
    valor_min: Optional[float] = None,
    valor_max: Optional[float] = None,
    data_inicio: Optional[str] = None,
    data_fim: Optional[str] = None,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    filters = {}
    
    if nome:
        filters["nome"] = {"$regex": nome, "$options": "i"}
    if status:
        filters["status"] = status
    if estado:
        filters["estado"] = estado
    if cidade:
        filters["cidade"] = cidade
    if valor_min is not None:
        filters["valor_projeto"] = filters.get("valor_projeto", {})
        filters["valor_projeto"]["$gte"] = valor_min
    if valor_max is not None:
        filters["valor_projeto"] = filters.get("valor_projeto", {})
        filters["valor_projeto"]["$lte"] = valor_max
    if data_inicio:
        filters["created_at"] = filters.get("created_at", {})
        filters["created_at"]["$gte"] = data_inicio
    if data_fim:
        filters["created_at"] = filters.get("created_at", {})
        filters["created_at"]["$lte"] = data_fim
    
    total = await db.leads.count_documents(filters)
    skip = (page - 1) * limit
    
    leads = await db.leads.find(filters, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "leads": leads,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit)
    }

@api_router.get("/admin/leads/{lead_id}")
async def get_lead(lead_id: str, user: dict = Depends(get_session_from_cookie_or_header)):
    lead = await db.leads.find_one({"lead_id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead

@api_router.patch("/admin/leads/{lead_id}/status")
async def update_lead_status(
    lead_id: str,
    update: LeadUpdateStatus,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    result = await db.leads.update_one(
        {"lead_id": lead_id},
        {"$set": {"status": update.status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")
    
    return {"message": "Status updated"}

@api_router.get("/admin/status-types")
async def get_status_types(user: dict = Depends(get_session_from_cookie_or_header)):
    status_types = await db.status_types.find({}, {"_id": 0}).sort("ordem", 1).to_list(100)
    if not status_types:
        default_statuses = [
            {"status_id": str(uuid.uuid4()), "nome": "Novo", "cor": "#3B82F6", "ordem": 1, "created_at": datetime.now(timezone.utc).isoformat()},
            {"status_id": str(uuid.uuid4()), "nome": "Contato Realizado", "cor": "#F59E0B", "ordem": 2, "created_at": datetime.now(timezone.utc).isoformat()},
            {"status_id": str(uuid.uuid4()), "nome": "Visita Agendada", "cor": "#8B5CF6", "ordem": 3, "created_at": datetime.now(timezone.utc).isoformat()},
            {"status_id": str(uuid.uuid4()), "nome": "Proposta Enviada", "cor": "#EC4899", "ordem": 4, "created_at": datetime.now(timezone.utc).isoformat()},
            {"status_id": str(uuid.uuid4()), "nome": "Convertido", "cor": "#10B981", "ordem": 5, "created_at": datetime.now(timezone.utc).isoformat()},
            {"status_id": str(uuid.uuid4()), "nome": "Perdido", "cor": "#EF4444", "ordem": 6, "created_at": datetime.now(timezone.utc).isoformat()}
        ]
        for status in default_statuses:
            await db.status_types.insert_one({**status})
        return default_statuses
    return status_types

@api_router.post("/admin/status-types")
async def create_status_type(
    status: StatusTypeCreate,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    status_id = str(uuid.uuid4())
    status_data = status.model_dump()
    status_data["status_id"] = status_id
    status_data["created_at"] = datetime.now(timezone.utc).isoformat()
    
    doc_to_insert = {**status_data}
    await db.status_types.insert_one(doc_to_insert)
    
    return status_data

@api_router.delete("/admin/status-types/{status_id}")
async def delete_status_type(
    status_id: str,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    result = await db.status_types.delete_one({"status_id": status_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    return {"message": "Status deleted"}

@api_router.get("/admin/tarifas")
async def get_tarifas(user: dict = Depends(get_session_from_cookie_or_header)):
    tarifas = await db.tarifas.find({}, {"_id": 0}).sort("estado", 1).to_list(1000)
    return tarifas

@api_router.post("/admin/tarifas")
async def create_tarifa(
    tarifa: TarifaConcessionariaCreate,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    tarifa_id = str(uuid.uuid4())
    tarifa_data = tarifa.model_dump()
    tarifa_data["tarifa_id"] = tarifa_id
    tarifa_data["created_at"] = datetime.now(timezone.utc).isoformat()
    tarifa_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    doc_to_insert = {**tarifa_data}
    await db.tarifas.insert_one(doc_to_insert)
    
    return tarifa_data

@api_router.put("/admin/tarifas/{tarifa_id}")
async def update_tarifa(
    tarifa_id: str,
    tarifa: TarifaConcessionariaCreate,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    tarifa_data = tarifa.model_dump()
    tarifa_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.tarifas.update_one(
        {"tarifa_id": tarifa_id},
        {"$set": tarifa_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Tarifa not found")
    
    return {"message": "Tarifa updated"}

@api_router.delete("/admin/tarifas/{tarifa_id}")
async def delete_tarifa(
    tarifa_id: str,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    result = await db.tarifas.delete_one({"tarifa_id": tarifa_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tarifa not found")
    return {"message": "Tarifa deleted"}

@api_router.get("/admin/configuracao")
async def get_configuracao_admin(user: dict = Depends(get_session_from_cookie_or_header)):
    config = await db.configuracoes.find_one({"config_id": "valor_kwp"}, {"_id": 0})
    if not config:
        default_config = {
            "config_id": "valor_kwp",
            "valor_kwp": 3500.0,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.configuracoes.insert_one(default_config)
        return default_config
    return config

@api_router.put("/admin/configuracao")
async def update_configuracao(
    config: ConfiguracaoUpdate,
    user: dict = Depends(get_session_from_cookie_or_header)
):
    result = await db.configuracoes.update_one(
        {"config_id": "valor_kwp"},
        {"$set": {
            "valor_kwp": config.valor_kwp,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    
    return {"message": "Configuração atualizada"}

@api_router.get("/admin/stats")
async def get_stats(user: dict = Depends(get_session_from_cookie_or_header)):
    total_leads = await db.leads.count_documents({})
    
    pipeline = [
        {"$group": {
            "_id": None,
            "total_valor": {"$sum": "$valor_projeto"}
        }}
    ]
    result = await db.leads.aggregate(pipeline).to_list(1)
    total_valor = result[0]["total_valor"] if result else 0
    
    status_counts = await db.leads.aggregate([
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]).to_list(100)
    
    return {
        "total_leads": total_leads,
        "total_valor": total_valor,
        "status_counts": status_counts
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
