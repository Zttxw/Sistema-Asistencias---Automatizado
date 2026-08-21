import os
import json
import time
import logging
import httpx
from typing import Dict, Any, Tuple, Optional
from app.config import settings

logger = logging.getLogger("firmaperu")

# Cache global en memoria para token JWT efímero
_token_cache: Dict[str, Any] = {
    "token": None,
    "expires_at": 0.0
}


def cargar_credenciales_firmaperu() -> Tuple[Optional[str], Optional[str], str]:
    """
    Carga client_id, client_secret y token_url de Firma Perú.
    Paso 1: Busca en el archivo JSON (ej. fwAuthorization.json) en disco si existe.
    Paso 2: Si no encuentra el archivo o faltan campos, usa variables de entorno / settings.
    """
    client_id = settings.FIRMAPERU_CLIENT_ID
    client_secret = settings.FIRMAPERU_CLIENT_SECRET
    token_url = settings.FIRMAPERU_TOKEN_URL or "https://apps.firmaperu.gob.pe/admin/api/security/generate-token"

    rutas_archivo = []
    if settings.FIRMAPERU_AUTH_FILE_PATH:
        rutas_archivo.append(settings.FIRMAPERU_AUTH_FILE_PATH)

    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    root_dir = os.path.abspath(os.path.join(base_dir, ".."))

    rutas_archivo.extend([
        os.path.join(root_dir, "fwAuthorization.json"),
        os.path.join(base_dir, "fwAuthorization.json"),
        "/app/fwAuthorization.json",
        "fwAuthorization.json"
    ])

    for path in rutas_archivo:
        if path and os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    c_id = data.get("client_id")
                    c_secret = data.get("client_secret")
                    t_url = data.get("token_url")

                    if c_id and c_secret:
                        logger.info(f"[FirmaPeru] Credenciales cargadas exitosamente desde archivo: {path}")
                        return c_id, c_secret, t_url or token_url
            except Exception as e:
                logger.warning(f"[FirmaPeru] Error al leer archivo de credenciales {path}: {e}")

    return client_id, client_secret, token_url


def obtener_jwt_firmaperu() -> str:
    """
    Obtiene el JWT Token de Firma Perú desde la URL oficial.
    Requisitos:
    - POST a token_url con Content-Type: application/x-www-form-urlencoded
    - Parámetros: client_id y client_secret
    - Cachea el token en memoria mientras esté vigente (50 minutos)
    - Si falla (código != 200), registra el error completo en logs y lanza RuntimeError.
    """
    ahora = time.time()
    if _token_cache["token"] and ahora < _token_cache["expires_at"]:
        logger.debug("[FirmaPeru] Usando JWT token de Firma Perú desde caché.")
        return _token_cache["token"]

    client_id, client_secret, token_url = cargar_credenciales_firmaperu()

    if not client_id or not client_secret:
        err_msg = "[FirmaPeru ERROR] No se configuraron credenciales válidas (client_id / client_secret). Verifique fwAuthorization.json o las variables de entorno."
        logger.error(err_msg)
        print(err_msg)
        raise RuntimeError(err_msg)

    logger.info(f"[FirmaPeru] Solicitando nuevo JWT token a {token_url}...")

    # POST x-www-form-urlencoded según Guía Oficial Firma Perú v1.1 Sec. 2.2
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    payload = {
        "client_id": client_id,
        "client_secret": client_secret
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(token_url, data=payload, headers=headers)

        if resp.status_code != 200:
            error_log = (
                f"[FirmaPeru ERROR] Falló la generación del JWT Token de Firma Perú.\n"
                f"URL: {token_url}\n"
                f"HTTP Status: {resp.status_code}\n"
                f"Response Headers: {dict(resp.headers)}\n"
                f"Response Body: {resp.text}"
            )
            logger.error(error_log)
            print(error_log)
            raise RuntimeError(f"Firma Perú API Error (HTTP {resp.status_code}): {resp.text}")

        token_str = resp.text.strip().strip('"')
        try:
            resp_json = resp.json()
            if isinstance(resp_json, dict) and "token" in resp_json:
                token_str = resp_json["token"]
        except Exception:
            pass

        if not token_str:
            err_empty = f"[FirmaPeru ERROR] La API de Firma Perú respondió HTTP 200 pero el token obtenido está vacío. Body: {resp.text}"
            logger.error(err_empty)
            print(err_empty)
            raise RuntimeError(err_empty)

        # Cachear por 50 minutos (3000 segundos)
        _token_cache["token"] = token_str
        _token_cache["expires_at"] = ahora + 3000
        logger.info("[FirmaPeru] JWT Token de Firma Perú obtenido y almacenado en caché exitosamente.")

        return token_str

    except httpx.RequestError as req_err:
        err_conn = f"[FirmaPeru ERROR] Error de conexión al intentar contactar {token_url}: {req_err}"
        logger.error(err_conn)
        print(err_conn)
        raise RuntimeError(err_conn)
