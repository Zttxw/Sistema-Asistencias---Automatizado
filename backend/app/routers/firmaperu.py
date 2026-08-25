import os
import json
import base64
import secrets
from datetime import datetime, timedelta, date
from typing import Optional
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request, Response
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud
from app.core.deps import get_current_user
from app.models.usuario import Usuario
from app.models.firma_token import FirmaToken
from app.utils.pdf_validation import validar_firma_digital_pdf
from app.services.firmaperu_auth import obtener_jwt_firmaperu

STORAGE_TMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage", "tmp_firmas")

def asegurar_directorio_tmp():
    os.makedirs(STORAGE_TMP_DIR, exist_ok=True)


router = APIRouter(prefix="/api/firmaperu", tags=["firmaperu"])


class PrepararFirmaPayload(BaseModel):
    empleado_id: int
    semana_inicio: date
    semana_fin: date


@router.post("/preparar-firma")
def preparar_firma_digital(
    payload: PrepararFirmaPayload,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    1. Verifica que el usuario autenticado posea rol de Ingeniero / Administrador / Jefatura.
    2. Genera el PDF preliminar del practicante para el período especificado.
    3. Guarda el PDF temporalmente en storage/tmp_firmas/.
    4. Emite un param_token opaco efímero (TTL 10 min) y lo registra en DB.
    5. Devuelve param_token al frontend para iniciar Firma Perú.
    """
    es_admin_o_firmante = current_user.rol and (
        current_user.rol.nombre in ["Administrador", "Ingeniero", "Jefatura", "Jefe de Oficina", "Superusuario", "Admin"]
        or any(p.codigo in ["asistencias.exportar", "roles.gestionar"] for p in (current_user.rol.permisos or []))
    )
    if not es_admin_o_firmante:
        raise HTTPException(status_code=403, detail="No autorizado para preparar firmas de informes de practicantes.")

    emp = crud.crud_empleado.get_empleado_by_id(db, payload.empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Practicante / Empleado no encontrado.")

    # Generar PDF preliminar
    pdf_bytes = crud.crud_informe.generar_pdf_informe_semanal_practicante(
        db=db,
        empleado=emp,
        fecha_inicio=payload.semana_inicio,
        fecha_fin=payload.semana_fin,
        usuario_generador=current_user
    )

    asegurar_directorio_tmp()
    token_str = secrets.token_urlsafe(32)
    tmp_filepath = os.path.join(STORAGE_TMP_DIR, f"{token_str}.pdf")

    with open(tmp_filepath, "wb") as f:
        f.write(pdf_bytes)

    expires_at = datetime.utcnow() + timedelta(minutes=10)

    nuevo_token = FirmaToken(
        token=token_str,
        empleado_id=payload.empleado_id,
        semana_inicio=payload.semana_inicio,
        semana_fin=payload.semana_fin,
        ingeniero_id=current_user.id,
        pdf_path=tmp_filepath,
        estado="pendiente",
        created_at=datetime.utcnow(),
        expires_at=expires_at
    )
    db.add(nuevo_token)
    db.commit()
    db.refresh(nuevo_token)

    return {
        "param_token": token_str,
        "document_extension": "pdf"
    }


def obtener_base_url_publica(request: Request) -> str:
    """
    Resuelve la URL base pública accesible en la red local (ej. http://10.0.50.30:8080).
    1. Si PUBLIC_URL está definido en .env, usa ese valor explícito.
    2. De lo contrario, deriva la URL desde las cabeceras de proxy de Nginx (Host + X-Forwarded-Proto).
    3. Fallback a request.base_url.
    """
    from app.config import settings
    if settings.PUBLIC_URL:
        return settings.PUBLIC_URL.rstrip("/")
    
    forwarded_proto = request.headers.get("x-forwarded-proto", "http")
    host_header = request.headers.get("host")
    if host_header:
        return f"{forwarded_proto}://{host_header}".rstrip("/")

    return str(request.base_url).rstrip("/")


@router.post("/param")
async def obtener_parametros_firma(
    request: Request,
    param_token: Optional[str] = Form(None),
    token: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Endpoint consumido directamente por el Firmador Java (sin JWT).
    Valida el param_token y responde con el JSON de configuración PAdES codificado en Base64.
    """
    token_buscado = param_token or token
    if not token_buscado:
        token_buscado = request.query_params.get("param_token") or request.query_params.get("token")

    if not token_buscado:
        raise HTTPException(status_code=400, detail="El parámetro param_token es requerido.")

    ftoken = db.query(FirmaToken).filter(FirmaToken.token == token_buscado).first()
    if not ftoken:
        raise HTTPException(status_code=403, detail="Token de firma no encontrado o inválido.")

    if ftoken.estado == "usado" or datetime.utcnow() > ftoken.expires_at:
        raise HTTPException(status_code=403, detail="El token de firma ha expirado o ya fue utilizado.")

    # Marcar estado a emitido
    ftoken.estado = "emitido"
    db.commit()

    base_url = obtener_base_url_publica(request)

    # Obtener token JWT oficial de Firma Perú (PCM) con manejo de errores estricto
    try:
        jwt_token = obtener_jwt_firmaperu()
    except Exception as e:
        print(f"[FirmaPeru /param ERROR] No se pudo obtener el token JWT: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Error al obtener token de autorización con Firma Perú: {e}"
        )

    # Estructura oficial de parámetros de Firma Perú (PAdES)
    params_dict = {
        "signatureFormat": "PAdES",
        "signatureLevel": "B",
        "signaturePackaging": "enveloped",
        "documentToSign": f"{base_url}/api/firmaperu/documento/{ftoken.token}",
        "certificateFilter": ".*",
        "theme": "claro",
        "visiblePosition": False,
        "signatureReason": "Conformidad de informe mensual de prácticas pre-profesionales",
        "uploadDocumentSigned": f"{base_url}/api/firmaperu/subir-firmado/{ftoken.token}",
        "token": jwt_token
    }

    json_str = json.dumps(params_dict)
    param_b64 = base64.b64encode(json_str.encode("utf-8")).decode("utf-8")

    return Response(content=param_b64, media_type="text/plain")


@router.get("/documento/{token}")
def descargar_documento_temporal(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Endpoint consumido por el Firmador Java para obtener el PDF preliminar a ser firmado.
    """
    ftoken = db.query(FirmaToken).filter(FirmaToken.token == token).first()
    if not ftoken:
        raise HTTPException(status_code=404, detail="Token no encontrado.")

    if ftoken.estado == "usado" or datetime.utcnow() > ftoken.expires_at:
        raise HTTPException(status_code=403, detail="El token de firma ha expirado.")

    if not os.path.exists(ftoken.pdf_path):
        raise HTTPException(status_code=404, detail="El archivo físico del PDF temporal no se encuentra en el servidor.")

    return FileResponse(
        path=ftoken.pdf_path,
        media_type="application/pdf",
        filename=f"preliminar_emp_{ftoken.empleado_id}.pdf"
    )


@router.post("/subir-firmado/{token}")
async def recibir_documento_firmado(
    token: str,
    signed_file: Optional[UploadFile] = File(None),
    archivo: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    """
    Endpoint consumido por el Firmador Java tras aplicar la firma digital.
    Exige que el token esté en estado 'emitido' y valida criptográficamente la firma PAdES antes de guardar.
    """
    ftoken = db.query(FirmaToken).filter(FirmaToken.token == token).first()
    if not ftoken:
        raise HTTPException(status_code=404, detail="Token de firma no encontrado.")

    if ftoken.estado == "usado":
        raise HTTPException(status_code=400, detail="Este token ya fue procesado anteriormente.")

    if ftoken.estado != "emitido":
        raise HTTPException(status_code=400, detail="El token de firma no ha sido emitido mediante el Firmador Java (/param).")

    if datetime.utcnow() > ftoken.expires_at:
        raise HTTPException(status_code=403, detail="El token de firma ha expirado.")

    upload_obj = signed_file or archivo or file
    if not upload_obj:
        raise HTTPException(status_code=400, detail="No se recibió ningún archivo PDF firmado en la solicitud.")

    content_bytes = await upload_obj.read()

    # Validar firma digital criptográfica con pyHanko (Integridad + Cadena de Confianza si FIRMAPERU_TRUST_ROOTS_PATH está configurado)
    es_valido, msj_validacion = validar_firma_digital_pdf(content_bytes)
    if not es_valido:
        raise HTTPException(status_code=400, detail=f"Validación de Firma Digital fallida: {msj_validacion}")

    # Guardar en almacenamiento oficial de informes firmados
    filename = upload_obj.filename or f"FIRMADO_EMP_{ftoken.empleado_id}_{ftoken.semana_inicio.strftime('%Y%m%d')}.pdf"
    
    informe_firmado = crud.crud_informe_firmado.guardar_pdf_firmado(
        db=db,
        empleado_id=ftoken.empleado_id,
        semana_inicio=ftoken.semana_inicio,
        semana_fin=ftoken.semana_fin,
        content_bytes=content_bytes,
        filename=filename,
        usuario_id=ftoken.ingeniero_id
    )

    # Marcar token como usado
    ftoken.estado = "usado"
    db.commit()

    # Eliminar PDF preliminar temporal
    if os.path.exists(ftoken.pdf_path):
        try:
            os.remove(ftoken.pdf_path)
        except Exception:
            pass

    return {
        "status": "ok",
        "message": f"Informe mensual procesado exitosamente ({msj_validacion}).",
        "informe_id": informe_firmado.id
    }
