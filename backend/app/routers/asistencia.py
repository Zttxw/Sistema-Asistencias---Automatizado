from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.asistencia import AsistenciaCreatePayload, AsistenciaManualPayload, AsistenciaResponse, AsistenciaReporteItem
from app.models.usuario import Usuario
from app import crud
from app.core.deps import require_permission, require_any_permission

router = APIRouter(tags=["asistencias"])


@router.post("/api/asistencia", response_model=AsistenciaResponse)
def registrar_asistencia(payload: AsistenciaCreatePayload, db: Session = Depends(get_db)):
    """
    Recibe la detección de una MAC (utilizado para pruebas legacy / directas).
    """
    return crud.crud_asistencia.registrar_deteccion_asistencia(db, payload)


@router.post("/api/asistencia/manual", response_model=AsistenciaResponse, dependencies=[Depends(require_permission("asistencias.registrar_manual"))])
def registrar_asistencia_manual(payload: AsistenciaManualPayload, db: Session = Depends(get_db)):
    """
    Registra manualmente la entrada o salida de un empleado. Requiere permiso 'asistencias.registrar_manual'.
    """
    return crud.crud_asistencia.registrar_asistencia_manual(db, payload)


@router.get("/api/asistencias", response_model=List[AsistenciaReporteItem])
def obtener_asistencias(
    fecha: Optional[date] = Query(default_factory=date.today, description="Fecha a consultar en formato YYYY-MM-DD"),
    user: Usuario = Depends(require_any_permission(["asistencias.ver", "asistencias.ver_propia"])),
    db: Session = Depends(get_db)
):
    """
    Retorna el reporte de asistencias registradas para una fecha dada (por defecto hoy).
    - Si el usuario tiene 'asistencias.ver' (o es Admin): ve las asistencias de todos los empleados.
    - Si solo tiene 'asistencias.ver_propia' (rol Empleado): ve únicamente su propia asistencia asociada a su empleado_id.
    """
    reporte = crud.crud_asistencia.get_asistencias_por_fecha(db, fecha)

    # Verificar si el usuario tiene permiso global 'asistencias.ver' o es Admin
    user_permisos = [p.codigo for p in user.rol.permisos] if user.rol and user.rol.permisos else []
    tiene_acceso_total = (user.rol and user.rol.nombre == "Admin") or ("asistencias.ver" in user_permisos)

    if not tiene_acceso_total:
        # Filtrar únicamente los registros del empleado vinculado a la cuenta
        if not user.empleado:
            return []
        nombre_empleado_propio = user.empleado.nombre
        reporte = [item for item in reporte if item.empleado == nombre_empleado_propio]

    return reporte


@router.get("/api/asistencias/export", dependencies=[Depends(require_permission("asistencias.exportar"))])
def exportar_asistencias_excel(
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Genera y descarga un archivo Excel (.xlsx) con las asistencias registradas. Requiere permiso 'asistencias.exportar'.
    """
    registros = crud.crud_asistencia.get_asistencias_por_rango_fechas(db, fecha_inicio, fecha_fin)
    excel_bytes = crud.crud_asistencia.generar_excel_asistencias(registros)

    headers = {
        "Content-Disposition": "attachment; filename=asistencias.xlsx"
    }
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers
    )
