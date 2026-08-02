from datetime import date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.informe import InformeGenerarPayload, InformeResponse
from app.models.usuario import Usuario
from app.models.empleado import Empleado
from app import crud
from app.crud import crud_informe
from app.core.deps import require_permission, require_any_permission

router = APIRouter(prefix="/api/informes", tags=["informes"])


def _to_response_dto(informe) -> InformeResponse:
    return InformeResponse(
        id=informe.id,
        empleado_id=informe.empleado_id,
        empleado_nombre=informe.empleado.nombre if informe.empleado else "Desconocido",
        empleado_departamento=informe.empleado.departamento if informe.empleado else None,
        fecha_inicio=informe.fecha_inicio,
        fecha_fin=informe.fecha_fin,
        generado_por_id=informe.generado_por_id,
        generado_por_email=informe.generado_por.email if informe.generado_por else "Sistema",
        fecha_generacion=informe.fecha_generacion,
        estado=informe.estado,
        aprobado_por_id=informe.aprobado_por_id,
        aprobado_por_email=informe.aprobado_por.email if informe.aprobado_por else None,
        fecha_aprobacion=informe.fecha_aprobacion
    )


@router.post("/generar")
def generar_informe_pdf(
    payload: InformeGenerarPayload,
    current_user: Usuario = Depends(require_permission("informes.generar")),
    db: Session = Depends(get_db)
):
    """
    Genera un PDF de conformidad de asistencias para un practicante en un rango de fecha libre,
    y registra la solicitud en el historial con estado 'generado'.
    """
    # 1. Validación de fechas
    if payload.fecha_inicio > payload.fecha_fin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de inicio no puede ser posterior a la fecha de fin"
        )
    if payload.fecha_fin > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La fecha de fin no puede ser posterior al día de hoy"
        )

    # 2. Verificar existencia del empleado
    empleado = db.query(Empleado).filter(Empleado.id == payload.empleado_id).first()
    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El empleado especificado no existe"
        )

    # 3. Crear registro en tabla informes_practicante
    crud_informe.crear_informe_registro(
        db=db,
        empleado_id=payload.empleado_id,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        generado_por_id=current_user.id
    )

    # 4. Generar documento PDF en bytes
    pdf_bytes = crud_informe.generar_pdf_informe_asistencias(
        db=db,
        empleado=empleado,
        fecha_inicio=payload.fecha_inicio,
        fecha_fin=payload.fecha_fin,
        usuario_generador=current_user
    )

    filename = f"informe_asistencias_{empleado.documento}_{payload.fecha_inicio}_{payload.fecha_fin}.pdf"
    headers = {
        "Content-Disposition": f'attachment; filename="{filename}"'
    }

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers=headers
    )


@router.get("", response_model=List[InformeResponse])
def listar_informes(
    empleado_id: Optional[int] = Query(None, description="Filtrar por ID de empleado"),
    estado: Optional[str] = Query(None, description="Filtrar por estado ('generado' | 'aprobado')"),
    user: Usuario = Depends(require_any_permission(["informes.generar", "informes.aprobar"])),
    db: Session = Depends(get_db)
):
    """
    Retorna el historial de informes de asistencia generados, opcionalmente filtrado por empleado o estado.
    """
    informes = crud_informe.obtener_informes_historial(db, empleado_id=empleado_id, estado=estado)
    return [_to_response_dto(inf) for inf in informes]


@router.patch("/{informe_id}/aprobar", response_model=InformeResponse)
def aprobar_informe(
    informe_id: int,
    current_user: Usuario = Depends(require_permission("informes.aprobar")),
    db: Session = Depends(get_db)
):
    """
    Marca un informe previamente generado como 'aprobado', registrando quién lo aprobó y la marca temporal.
    """
    informe_actualizado = crud_informe.aprobar_informe_registro(
        db=db,
        informe_id=informe_id,
        aprobado_por_id=current_user.id
    )
    return _to_response_dto(informe_actualizado)
