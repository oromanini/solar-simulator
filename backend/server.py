from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Header, Cookie
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import resend
import math

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

# ============ MODELS ============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime

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
    
    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user_doc["email"] != ALLOWED_ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return user_doc

# ============ AUTH ROUTES ============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    raise HTTPException(status_code=501, detail="Auth session exchange is not configured.")

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
    estados = [
        "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
        "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
        "RS", "RO", "RR", "SC", "SP", "SE", "TO"
    ]
    return estados

@api_router.get("/cidades/{estado}")
async def get_cidades(estado: str):
    cidades_por_estado = {
        "AC": ["Rio Branco", "Cruzeiro do Sul", "Sena Madureira"],
        "AL": ["Maceió", "Arapiraca", "Palmeira dos Índios"],
        "AP": ["Macapá", "Santana", "Laranjal do Jari"],
        "AM": ["Manaus", "Parintins", "Itacoatiara"],
        "BA": ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna"],
        "CE": ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Maracanaú"],
        "DF": ["Brasília"],
        "ES": ["Vitória", "Vila Velha", "Serra", "Cariacica"],
        "GO": ["Goiânia", "Aparecida de Goiânia", "Anápolis", "Rio Verde"],
        "MA": ["São Luís", "Imperatriz", "São José de Ribamar", "Timon"],
        "MT": ["Cuiabá", "Várzea Grande", "Rondonópolis", "Sinop"],
        "MS": ["Campo Grande", "Dourados", "Três Lagoas", "Corumbá"],
        "MG": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim"],
        "PA": ["Belém", "Ananindeua", "Santarém", "Marabá"],
        "PB": ["João Pessoa", "Campina Grande", "Santa Rita", "Patos"],
        "PR": ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "Foz do Iguaçu"],
        "PE": ["Recife", "Jaboatão dos Guararapes", "Olinda", "Caruaru"],
        "PI": ["Teresina", "Parnaíba", "Picos", "Floriano"],
        "RJ": ["Rio de Janeiro", "São Gonçalo", "Duque de Caxias", "Nova Iguaçu", "Niterói"],
        "RN": ["Natal", "Mossoró", "Parnamirim", "São Gonçalo do Amarante"],
        "RS": ["Porto Alegre", "Caxias do Sul", "Pelotas", "Canoas", "Santa Maria"],
        "RO": ["Porto Velho", "Ji-Paraná", "Ariquemes", "Vilhena"],
        "RR": ["Boa Vista", "Rorainópolis", "Caracaraí"],
        "SC": ["Florianópolis", "Joinville", "Blumenau", "São José", "Chapecó"],
        "SP": ["São Paulo", "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "Ribeirão Preto"],
        "SE": ["Aracaju", "Nossa Senhora do Socorro", "Lagarto", "Itabaiana"],
        "TO": ["Palmas", "Araguaína", "Gurupi", "Porto Nacional"]
    }
    return cidades_por_estado.get(estado.upper(), [])

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
