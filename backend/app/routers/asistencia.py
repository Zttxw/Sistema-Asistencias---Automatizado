from datetime import date, datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.asistencia import AsistenciaCreatePayload, AsistenciaManualPayload, AsistenciaResponse, AsistenciaReporteItem, AsistenciaEdicionPayload
from app.models.usuario import Usuario
from app import crud
from app.core.deps import require_permission, require_any_permission, get_current_user

router = APIRouter(tags=["asistencias"])


@router.get("/api/asistencias/practicante/{empleado_id}", response_model=List[AsistenciaReporteItem], dependencies=[Depends(require_any_permission(["asistencias.ver", "asistencias.ver_propia"]))])
def obtener_asistencias_practicante(
    empleado_id: int,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna la tabla completa de registros de asistencia de un practicante específico.
    """
    user_permisos = [p.codigo for p in user.rol.permisos] if user.rol and user.rol.permisos else []
    tiene_acceso_total = (user.rol and user.rol.nombre in ["Admin", "Jefe de Oficina"]) or ("asistencias.ver" in user_permisos)

    if not tiene_acceso_total:
        if not user.empleado_id or user.empleado_id != empleado_id:
            raise HTTPException(status_code=403, detail="No tiene permisos para consultar la asistencia de este practicante.")

    return crud.crud_asistencia.get_historial_diario_empleado(db, empleado_id)


@router.put("/api/asistencias/{asistencia_id}", dependencies=[Depends(require_permission("asistencias.registrar_manual"))])
def editar_asistencia_manual(
    asistencia_id: int,
    payload: AsistenciaEdicionPayload,
    db: Session = Depends(get_db)
):
    """
    Permite al administrador modificar manualmente las horas de entrada/salida y motivo de un registro de asistencia.
    Verifica que el período de la asistencia no haya sido firmado previamente por la Jefatura.
    """
    return crud.crud_asistencia.update_asistencia_manual(db, asistencia_id, payload)


@router.delete("/api/asistencias/{asistencia_id}", dependencies=[Depends(require_permission("asistencias.registrar_manual"))])
def eliminar_asistencia_manual(
    asistencia_id: int,
    db: Session = Depends(get_db)
):
    """
    Permite al administrador eliminar manualmente un registro de asistencia.
    Verifica que el período de la asistencia no haya sido firmado previamente por la Jefatura.
    """
    return crud.crud_asistencia.delete_asistencia_manual(db, asistencia_id)


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


@router.post("/api/asistencia/marcar_propia", response_model=AsistenciaResponse)
def marcar_asistencia_propia(
    tipo: str = Query(..., regex="^(entrada|salida)$", description="Tipo de marcación: entrada o salida"),
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite al usuario autenticado (Practicante/Empleado) registrar su propia entrada o salida del día
    en caso de no portar su teléfono móvil o si el agente ARP no detectó su MAC.
    """
    empleado_id_marcar = user.empleado_id
    if not empleado_id_marcar:
        emp = user.empleado
        if not emp and user.email:
            emp = crud.crud_empleado.get_empleado_by_email(db, user.email)
        if emp:
            empleado_id_marcar = emp.id
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Su cuenta de usuario no tiene un perfil de Practicante vinculado ni empleados registrados."
            )

    payload = AsistenciaManualPayload(
        empleado_id=empleado_id_marcar,
        tipo=tipo,
        timestamp=datetime.now(),
        motivo="Marcación web propia (Sin dispositivo móvil)"
    )
    return crud.crud_asistencia.registrar_asistencia_manual(db, payload)


@router.get("/api/asistencias/mias", response_model=List[AsistenciaReporteItem])
def obtener_mis_asistencias(
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retorna el historial completo diario de asistencias del practicante autenticado.
    """
    emp = user.empleado
    if not emp and user.email:
        emp = crud.crud_empleado.get_empleado_by_email(db, user.email)

    if not emp:
        return []

    return crud.crud_asistencia.get_historial_diario_empleado(db, emp.id)


@router.get("/api/asistencias/hoy", response_model=List[AsistenciaReporteItem])
def obtener_asistencias_hoy(db: Session = Depends(get_db)):
    """
    Retorna el reporte de asistencias del día actual del servidor (PÚBLICO, sin autenticación).
    Ignora cualquier parámetro query string de fecha enviado por el cliente.
    """
    return crud.crud_asistencia.get_asistencias_por_fecha(db, date.today())


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


@router.get("/api/asistencias/migracion/plantilla", dependencies=[Depends(require_permission("asistencias.registrar_manual"))])
def descargar_plantilla_migracion(formato: str = "excel"):
    """
    Genera y descarga la plantilla Excel (.xlsx) o CSV (.csv) para migración masiva de asistencias.
    """
    from app.crud.crud_migracion import generar_plantilla_excel, generar_plantilla_csv
    if formato.lower() == "csv":
        csv_bytes = generar_plantilla_csv()
        headers = {
            "Content-Disposition": "attachment; filename=plantilla_migracion_asistencias.csv"
        }
        return Response(
            content=csv_bytes,
            media_type="text/csv; charset=utf-8",
            headers=headers
        )
    else:
        excel_bytes = generar_plantilla_excel()
        headers = {
            "Content-Disposition": "attachment; filename=plantilla_migracion_asistencias.xlsx"
        }
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers=headers
        )


@router.post("/api/asistencias/migracion/importar", dependencies=[Depends(require_permission("asistencias.registrar_manual"))])
async def importar_asistencias_excel(
    file: UploadFile = File(...),
    fecha_limite: date = Form(...),
    db: Session = Depends(get_db)
):
    """
    Procesa la carga masiva de asistencias históricas desde un archivo Excel (.xlsx / .xls) o CSV (.csv).
    """
    from app.crud.crud_migracion import procesar_migracion_archivo
    filename = file.filename or "migracion.xlsx"
    if not filename.lower().endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(
            status_code=400,
            detail="Formato de archivo no soportado. Debe ser un archivo Excel (.xlsx, .xls) o CSV (.csv)."
        )

    file_content = await file.read()
    res = procesar_migracion_archivo(db, file_content, filename, fecha_limite)
    if not res.get("ok", True):
        raise HTTPException(status_code=400, detail=res.get("error", "Error procesando el archivo de migración."))

    return res


