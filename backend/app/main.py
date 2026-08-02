import time
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
import app.models.empleado
import app.models.asistencia
import app.models.dispositivo_detectado
import app.models.historial_mac
from app.routers import empleados, asistencia, deteccion, dispositivos


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crear tablas al iniciar el servidor si no existen
    for attempt in range(10):
        try:
            Base.metadata.create_all(bind=engine)
            print("[INFO] Tablas de base de datos MySQL verificadas/creadas correctamente.")
            break
        except Exception as e:
            print(f"[WARNING] Intento {attempt + 1}/10: Esperando inicialización de MySQL: {e}")
            time.sleep(2)
    yield


app = FastAPI(
    title="API de Sistema de Asistencias",
    description="Backend en FastAPI con MySQL para recepción de detecciones MAC Wi-Fi, gestión de asistencias y descubrimiento de dispositivos.",
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

app.include_router(empleados.router)
app.include_router(asistencia.router)
app.include_router(deteccion.router)
app.include_router(dispositivos.router)


@app.get("/", tags=["health"])
def root_health():
    return {"status": "ok", "service": "Sistema de Asistencias Backend"}
