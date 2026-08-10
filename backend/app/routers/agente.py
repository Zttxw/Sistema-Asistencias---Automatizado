import json
import os
from typing import Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from app.core.deps import require_permission

router = APIRouter(
    prefix="/api/agente",
    tags=["agente"]
)

# URL interna del mini-servidor HTTP del agente (por defecto PC local 192.168.0.104)
AGENTE_HTTP_URL = os.environ.get("AGENTE_HTTP_URL", "http://192.168.0.104:5050")
# Token de seguridad para autenticarse contra el mini-servidor del agente
AGENTE_SECRET_TOKEN = os.environ.get("AGENTE_SECRET_TOKEN", "")
# Ruta de respaldo para entorno de desarrollo local directo
AGENTE_DATA_DIR = os.environ.get("AGENTE_DATA_DIR", "/agente_data")


def _get_agent_headers() -> dict:
    headers = {"Content-Type": "application/json"}
    if AGENTE_SECRET_TOKEN:
        headers["X-Agent-Token"] = AGENTE_SECRET_TOKEN
    return headers


class AgenteConfigPayload(BaseModel):
    network_range: str = "auto"
    interface: Optional[str] = None
    api_url: str
    secret_token: Optional[str] = None
    interval_seconds: int = 60
    timeout_seconds: int = 3


@router.get("/status")
def obtener_estado_agente(
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Consulta el estado del agente contactando su mini-servidor HTTP.
    """
    try:
        resp = httpx.get(f"{AGENTE_HTTP_URL}/status", headers=_get_agent_headers(), timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            return {"running": False, "error": "No autorizado: Token del agente inválido."}
        else:
            return {"running": False, "error": f"Error del agente: HTTP {resp.status_code}"}
    except httpx.ConnectError:
        return {
            "running": False,
            "error": f"El agente en {AGENTE_HTTP_URL} no responde. Verificar red o servicio."
        }
    except httpx.TimeoutException:
        return {
            "running": False,
            "error": "Timeout al contactar el agente."
        }
    except Exception as e:
        return {
            "running": False,
            "error": f"Error al contactar el agente: {str(e)}"
        }


@router.get("/logs")
def obtener_logs_agente(
    lines: int = Query(default=150, ge=1, le=1000, description="Número de líneas a retornar"),
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Obtiene los logs del agente vía HTTP desde su mini-servidor local.
    """
    # 1. Intentar obtener vía HTTP desde el agente
    try:
        resp = httpx.get(f"{AGENTE_HTTP_URL}/logs?lines={lines}", headers=_get_agent_headers(), timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            raise HTTPException(status_code=401, detail="No autorizado: Token del agente inválido.")
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    # 2. Respaldo local si el volumen estuviese montado (desarrollo local)
    log_path = os.path.join(AGENTE_DATA_DIR, "agente.log")
    if os.path.exists(log_path):
        try:
            with open(log_path, "r", encoding="utf-8", errors="replace") as f:
                all_lines = f.readlines()
                tail = all_lines[-lines:] if len(all_lines) > lines else all_lines
                return {
                    "total_lines": len(all_lines),
                    "returned_lines": len(tail),
                    "content": "".join(tail)
                }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al leer logs locales: {str(e)}")

    raise HTTPException(
        status_code=503,
        detail=f"No se pudo conectar al agente en {AGENTE_HTTP_URL} ni se encontraron logs locales."
    )


@router.get("/config")
def obtener_config_agente(
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Obtiene la configuración actual del agente vía HTTP.
    """
    # 1. Intentar obtener vía HTTP desde el agente
    try:
        resp = httpx.get(f"{AGENTE_HTTP_URL}/config", headers=_get_agent_headers(), timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            raise HTTPException(status_code=401, detail="No autorizado: Token del agente inválido.")
    except (httpx.ConnectError, httpx.TimeoutException):
        pass

    # 2. Respaldo local
    config_path = os.path.join(AGENTE_DATA_DIR, "config.json")
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error al leer config local: {str(e)}")

    raise HTTPException(
        status_code=503,
        detail=f"No se pudo consultar la configuración del agente en {AGENTE_HTTP_URL}."
    )


@router.put("/config")
def actualizar_config_agente(
    payload: AgenteConfigPayload,
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Envía la nueva configuración al agente vía HTTP para actualizar config.json y reiniciarlo.
    """
    data = {
        "network_range": payload.network_range,
        "interface": payload.interface,
        "api_url": payload.api_url,
        "interval_seconds": payload.interval_seconds,
        "timeout_seconds": payload.timeout_seconds,
    }
    if payload.secret_token:
        data["secret_token"] = payload.secret_token
    elif AGENTE_SECRET_TOKEN:
        data["secret_token"] = AGENTE_SECRET_TOKEN

    try:
        resp = httpx.put(f"{AGENTE_HTTP_URL}/config", json=data, headers=_get_agent_headers(), timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            raise HTTPException(status_code=401, detail="No autorizado: Token del agente inválido.")
        else:
            raise HTTPException(status_code=resp.status_code, detail=f"Error del agente: {resp.text}")
    except (httpx.ConnectError, httpx.TimeoutException):
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo contactar al agente en {AGENTE_HTTP_URL} para actualizar su configuración."
        )


@router.post("/restart")
def reiniciar_agente(
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Envía una señal de reinicio al agente vía HTTP con token de autorización.
    """
    try:
        resp = httpx.post(f"{AGENTE_HTTP_URL}/restart", headers=_get_agent_headers(), timeout=5.0)
        if resp.status_code == 200:
            return resp.json()
        elif resp.status_code == 401:
            raise HTTPException(status_code=401, detail="No autorizado: Token del agente inválido.")
        else:
            raise HTTPException(status_code=resp.status_code, detail=f"Error al reiniciar: {resp.text}")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"No se pudo contactar al agente en {AGENTE_HTTP_URL}. Puede estar detenido."
        )
    except httpx.TimeoutException:
        # Un timeout al reiniciar es normal si el agente se apaga antes de responder
        return {"ok": True, "message": "Señal de reinicio enviada. El agente se reiniciará en breve."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al reiniciar el agente: {str(e)}"
        )

