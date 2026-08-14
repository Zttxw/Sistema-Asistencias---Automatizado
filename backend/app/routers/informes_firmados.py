import os
from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud
from app.core.deps import require_permission, get_current_user
from app.models.usuario import Usuario
from app.schemas.informe_firmado import SemanaDisponibleItem, InformeFirmadoResponse, SemanasCompletadasResponse
from app.utils.pdf_validation import validar_firma_digital_pdf

router = APIRouter(prefix="/api/informes-firmados", tags=["informes-firmados"])


@router.get("/mis-meses-completados", response_model=SemanasCompletadasResponse)
@router.get("/mis-semanas-completadas", response_model=SemanasCompletadasResponse)
def listar_mis_semanas_completadas(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de meses completados del practicante autenticado.
    """
    emp = user.empleado
    if not emp and user.email:
        emp = crud.crud_empleado.get_empleado_by_email(db, user.email)
    
    if not emp:
        return {"meses": [], "semanas": [], "consolidado": None}

    return crud.crud_informe_firmado.get_meses_completados_empleado(db, emp.id)


@router.get("/mi-informe-pdf")
def descargar_mi_informe_pdf(
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    informe_id: Optional[int] = Query(None),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Genera o retorna el PDF de asistencias del practicante autenticado.
    Si existe un informe firmado digitalmente con informe_id, lo retorna directo.
    """
    emp = user.empleado
    if not emp and user.email:
        emp = crud.crud_empleado.get_empleado_by_email(db, user.email)

    if not emp:
        raise HTTPException(status_code=404, detail="No se encontró un registro de practicante asociado a esta cuenta.")

    if informe_id:
        informe = crud.crud_informe_firmado.get_informe_firmado_by_id(db, informe_id)
        if informe and os.path.exists(informe.archivo_path):
            return FileResponse(
                path=informe.archivo_path,
                media_type="application/pdf",
                filename=f"FIRMADO_{informe.nombre_archivo}",
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0"
                }
            )

    if not fecha_inicio or not fecha_fin:
        semanas_info = crud.crud_informe_firmado.get_semanas_completadas_empleado(db, emp.id)
        lista_bloques = semanas_info.get("semanas", [])
        if lista_bloques:
            ultimo = lista_bloques[-1]
            fecha_inicio = ultimo["semana_inicio"]
            fecha_fin = ultimo["semana_fin"]
            if ultimo.get("firmado") and ultimo.get("informe_firmado_id"):
                informe = crud.crud_informe_firmado.get_informe_firmado_by_id(db, ultimo["informe_firmado_id"])
                if informe and os.path.exists(informe.archivo_path):
                    return FileResponse(
                        path=informe.archivo_path,
                        media_type="application/pdf",
                        filename=f"FIRMADO_{informe.nombre_archivo}",
                        headers={
                            "Cache-Control": "no-cache, no-store, must-revalidate",
                            "Pragma": "no-cache",
                            "Expires": "0"
                        }
                    )
        else:
            hoy = date.today()
            fecha_inicio = hoy - timedelta(days=27)
            fecha_fin = hoy

    pdf_bytes = crud.crud_informe.generar_pdf_informe_semanal_practicante(
        db=db,
        empleado=emp,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        usuario_generador=user
    )

    nombre_limpio = emp.nombre.replace(" ", "_")
    filename = f"informe_asistencia_{nombre_limpio}_{fecha_inicio}_{fecha_fin}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.get("/empleados/{empleado_id}/meses-completados", response_model=SemanasCompletadasResponse)
@router.get("/empleados/{empleado_id}/semanas-completadas", response_model=SemanasCompletadasResponse)
def listar_semanas_completadas_empleado(
    empleado_id: int,
    db: Session = Depends(get_db)
):
    """
    Retorna la lista de meses COMPLETADOS del practicante (1 a N meses).
    Indica si cada mes ya cuenta con un PDF firmado digitalmente.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    return crud.crud_informe_firmado.get_meses_completados_empleado(db, empleado_id)


@router.post("/empleados/{empleado_id}/subir", response_model=InformeFirmadoResponse, dependencies=[Depends(require_permission("asistencias.exportar"))])
async def subir_informe_pdf_firmado(
    empleado_id: int,
    semana_inicio: date = Form(...),
    semana_fin: date = Form(...),
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Permite al Ingeniero/Admin subir un informe PDF de una semana completada tras haber sido firmado digitalmente.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")

    if not archivo.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="El archivo subido debe ser un documento PDF (*.pdf).")

    content_bytes = await archivo.read()
    if len(content_bytes) == 0:
        raise HTTPException(status_code=400, detail="El archivo PDF subido está vacío.")

    # Validar firma digital criptográfica (Hallazgo #1 de auditoría)
    es_valido, msj_val = validar_firma_digital_pdf(content_bytes)
    if not es_valido:
        raise HTTPException(status_code=400, detail=f"Validación de Firma Digital fallida: {msj_val}")

    informe_firmado = crud.crud_informe_firmado.guardar_pdf_firmado(
        db=db,
        empleado_id=empleado_id,
        semana_inicio=semana_inicio,
        semana_fin=semana_fin,
        content_bytes=content_bytes,
        filename=archivo.filename,
        usuario_id=current_user.id
    )

    res = InformeFirmadoResponse.from_orm(informe_firmado)
    res.firmado_por_email = current_user.email
    return res


@router.get("/{informe_id}/descargar")
def descargar_pdf_firmado(
    informe_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Descarga o visualiza el archivo PDF que fue previamente firmado digitalmente y guardado en el servidor.
    Verifica autorización: Administradores/Ingenieros pueden ver cualquier informe; Practicantes solo sus propios informes.
    """
    informe = crud.crud_informe_firmado.get_informe_firmado_by_id(db, informe_id)
    if not informe:
        raise HTTPException(status_code=404, detail="Informe firmado no encontrado.")

    # Hallazgo #2 de auditoría: Verificación de Permisos
    es_admin_o_firmante = current_user.rol and current_user.rol.nombre in ["Administrador", "Ingeniero", "Jefatura", "Superusuario"]
    es_propietario = current_user.empleado_id == informe.empleado_id or (current_user.empleado and current_user.empleado.id == informe.empleado_id)

    if not (es_admin_o_firmante or es_propietario):
        raise HTTPException(status_code=403, detail="No cuenta con autorización para descargar el informe firmado de otro usuario.")

    if not os.path.exists(informe.archivo_path):
        raise HTTPException(status_code=404, detail="El archivo físico del informe firmado no se encuentra en el servidor.")

    filename_clean = f"FIRMADO_{informe.nombre_archivo}"
    return FileResponse(
        path=informe.archivo_path,
        media_type="application/pdf",
        filename=filename_clean,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )
