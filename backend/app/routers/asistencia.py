from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.asistencia import AsistenciaCreatePayload, AsistenciaManualPayload, AsistenciaResponse, AsistenciaReporteItem
from app import crud

router = APIRouter(tags=["asistencias"])


@router.post("/api/asistencia", response_model=AsistenciaResponse)
def registrar_asistencia(payload: AsistenciaCreatePayload, db: Session = Depends(get_db)):
    """
    Recibe la detección de una MAC enviada por un Agente de Asistencia.
    - Si es la primera detección del día: registra la hora_entrada.
    - Si es una detección subsiguiente del mismo día: actualiza la hora_salida.
    """
    return crud.crud_asistencia.registrar_deteccion_asistencia(db, payload)


@router.post("/api/asistencia/manual", response_model=AsistenciaResponse)
def registrar_asistencia_manual(payload: AsistenciaManualPayload, db: Session = Depends(get_db)):
    """
    Registra manualmente la entrada o salida de un empleado.
    """
    return crud.crud_asistencia.registrar_asistencia_manual(db, payload)


@router.get("/api/asistencias", response_model=List[AsistenciaReporteItem])
def obtener_asistencias(
    fecha: Optional[date] = Query(default_factory=date.today, description="Fecha a consultar en formato YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    """
    Retorna el reporte de asistencias registradas para una fecha dada (por defecto hoy),
    incluyendo el nombre del empleado, hora_entrada y hora_salida.
    """
    return crud.crud_asistencia.get_asistencias_por_fecha(db, fecha)


@router.get("/api/asistencias/export")
def exportar_asistencias_excel(
    fecha_inicio: Optional[date] = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[date] = Query(None, description="Fecha de fin (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """
    Genera y descarga un archivo Excel (.xlsx) con las asistencias registradas en el rango de fechas.
    Si no se especifican fechas, exporta las asistencias del mes actual.
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
