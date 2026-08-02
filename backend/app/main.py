import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
import app.models.empleado
import app.models.asistencia
import app.models.dispositivo_detectado
import app.models.historial_mac
import app.models.rol
import app.models.permiso
import app.models.rol_permiso
import app.models.usuario
import app.models.refresh_token
from app.core.database_seed import seed_initial_data
from app.routers import empleados, asistencia, deteccion, dispositivos, auth, roles, permisos, usuarios


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas al iniciar el servidor si no existen y poblar datos iniciales
    for attempt in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            print("[INFO] Tablas de base de datos MySQL verificadas/creadas correctamente.")
            db = SessionLocal()
            try:
                seed_initial_data(db)
            finally:
                db.close()
            break
        except Exception as e:
            print(f"[WARNING] Intento {attempt + 1}/10: Esperando inicialización de MySQL: {e}")
            time.sleep(2)
    yield


app = FastAPI(
    title="API de Sistema de Asistencias",
    description="Backend en FastAPI con MySQL para recepción de detecciones MAC Wi-Fi, autenticación RBAC con JWT, gestión de asistencias y usuarios.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(roles.router)
app.include_router(permisos.router)
app.include_router(usuarios.router)
app.include_router(empleados.router)
app.include_router(asistencia.router)
app.include_router(deteccion.router)
app.include_router(dispositivos.router)


@app.get("/", tags=["health"])
def root_health():
    return {"status": "ok", "service": "Sistema de Asistencias Backend"}
