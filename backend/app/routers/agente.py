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

# Ruta al directorio de datos del agente montado como volumen Docker
AGENTE_DATA_DIR = os.environ.get("AGENTE_DATA_DIR", "/agente_data")
# URL interna del mini-servidor HTTP del agente corriendo en el host Windows
AGENTE_HTTP_URL = os.environ.get("AGENTE_HTTP_URL", "http://host.docker.internal:5050")


class AgenteConfigPayload(BaseModel):
    network_range: str = "auto"
    interface: Optional[str] = None
    api_url: str
    interval_seconds: int = 60
    timeout_seconds: int = 3


@router.get("/status")
def obtener_estado_agente(
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Consulta el estado del agente contactando su mini-servidor HTTP.
    Si el agente no responde, se asume que está detenido.
    """
    try:
        resp = httpx.get(f"{AGENTE_HTTP_URL}/status", timeout=5.0)
        return resp.json()
    except httpx.ConnectError:
        return {
            "running": False,
            "error": "El agente no responde. Puede estar detenido o el mini-servidor no está activo."
        }
    except httpx.TimeoutException:
        return {
            "running": False,
            "error": "Timeout al contactar el agente. Puede estar sobrecargado."
        }
    except Exception as e:
        return {
            "running": False,
            "error": f"Error inesperado al contactar el agente: {str(e)}"
        }


@router.get("/logs")
def obtener_logs_agente(
    lines: int = Query(default=150, ge=1, le=1000, description="Número de líneas a retornar"),
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Lee las últimas N líneas del archivo agente.log montado como volumen.
    """
    log_path = os.path.join(AGENTE_DATA_DIR, "agente.log")

    if not os.path.exists(log_path):
        raise HTTPException(
            status_code=404,
            detail="No se encontró el archivo de logs del agente. Verificar que el volumen esté montado."
        )

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
        raise HTTPException(
            status_code=500,
            detail=f"Error al leer los logs del agente: {str(e)}"
        )


@router.get("/config")
def obtener_config_agente(
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Lee y retorna el config.json del agente montado como volumen.
    """
    config_path = os.path.join(AGENTE_DATA_DIR, "config.json")

    if not os.path.exists(config_path):
        raise HTTPException(
            status_code=404,
            detail="No se encontró el archivo config.json del agente."
        )

    try:
        with open(config_path, "r", encoding="utf-8") as f:
            config = json.load(f)
            return config
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al leer la configuración del agente: {str(e)}"
        )


@router.put("/config")
def actualizar_config_agente(
    payload: AgenteConfigPayload,
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Guarda la nueva configuración en config.json y reinicia el agente para aplicar los cambios.
    """
    config_path = os.path.join(AGENTE_DATA_DIR, "config.json")

    try:
        data = {
            "network_range": payload.network_range,
            "interface": payload.interface,
            "api_url": payload.api_url,
            "interval_seconds": payload.interval_seconds,
            "timeout_seconds": payload.timeout_seconds,
        }

        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)

        # Enviar señal de reinicio al agente para que aplique los cambios
        restarted = False
        try:
            httpx.post(f"{AGENTE_HTTP_URL}/restart", timeout=3.0)
            restarted = True
        except Exception:
            pass

        return {
            "ok": True,
            "message": "Configuración del agente guardada correctamente" + (" y agente reiniciado." if restarted else "."),
            "config": data
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar la configuración del agente: {str(e)}"
        )


@router.post("/restart")
def reiniciar_agente(
    _user=Depends(require_permission("agente.gestionar"))
):
    """
    Envía una señal de reinicio al agente vía su mini-servidor HTTP.
    """
    try:
        resp = httpx.post(f"{AGENTE_HTTP_URL}/restart", timeout=5.0)
        return resp.json()
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="No se pudo contactar al agente. Puede estar detenido."
        )
    except httpx.TimeoutException:
        # Un timeout al reiniciar es normal: el agente puede cerrarse antes de responder
        return {"ok": True, "message": "Señal de reinicio enviada. El agente se reiniciará en breve."}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al reiniciar el agente: {str(e)}"
        )
