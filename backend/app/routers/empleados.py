from typing import List, Optional
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status, Response, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.empleado import EmpleadoCreate, EmpleadoUpdate, EmpleadoResponse
from app.schemas.historial_mac import HistorialMacItem
from app import crud
from app.core.deps import require_permission, get_current_user
from app.models.usuario import Usuario

router = APIRouter(prefix="/api/empleados", tags=["empleados"])


@router.get("/macs", response_model=List[str])
def obtener_whitelist_macs(db: Session = Depends(get_db)):
    """
    Retorna la lista blanca de direcciones MACs en mayúsculas pertenecientes a los empleados activos.
    """
    return crud.crud_empleado.get_whitelist_macs(db)


@router.get("", response_model=List[EmpleadoResponse], dependencies=[Depends(require_permission("empleados.ver"))])
def listar_empleados(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lista todos los empleados (activos e inactivos). Requiere permiso 'empleados.ver'.
    """
    return crud.crud_empleado.get_empleados(db, skip=skip, limit=limit)


@router.post("", response_model=EmpleadoResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("empleados.crear"))])
def crear_empleado(empleado_in: EmpleadoCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo empleado. Requiere permiso 'empleados.crear'.
    """
    emp_existente = crud.crud_empleado.get_empleado_by_mac(db, empleado_in.mac)
    if emp_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un empleado registrado con esa dirección MAC"
        )
    return crud.crud_empleado.create_empleado(db, empleado_in)


@router.get("/{empleado_id}/informe_pdf")
def descargar_informe_pdf_empleado(
    empleado_id: int,
    fecha_inicio: Optional[date] = Query(None),
    fecha_fin: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user)
):
    """
    Genera y descarga el informe PDF de asistencias del practicante/empleado agrupado por semanas.
    Si se omiten 'fecha_inicio' y 'fecha_fin', genera el informe consolidado completo hasta la última semana registrada.
    Requiere permiso 'asistencias.exportar'.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )

    if not fecha_inicio or not fecha_fin:
        semanas_info = crud.crud_informe_firmado.get_semanas_completadas_empleado(db, empleado_id)
        cons = semanas_info.get("consolidado")
        if cons:
            fecha_inicio = cons["semana_inicio"]
            fecha_fin = cons["semana_fin"]
        else:
            hoy = date.today()
            fecha_inicio = date(hoy.year, 1, 1)
            fecha_fin = hoy

    pdf_bytes = crud.crud_informe.generar_pdf_informe_semanal_practicante(
        db=db,
        empleado=emp,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        usuario_generador=current_user
    )

    nombre_limpio = emp.nombre.replace(" ", "_")
    filename = f"informe_CONSOLIDADO_{nombre_limpio}_{fecha_inicio}_{fecha_fin}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.put("/{empleado_id}", response_model=EmpleadoResponse, dependencies=[Depends(require_permission("empleados.editar"))])
def actualizar_empleado(empleado_id: int, empleado_in: EmpleadoUpdate, db: Session = Depends(get_db)):
    """
    Actualiza datos de un empleado. Requiere permiso 'empleados.editar'.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return crud.crud_empleado.update_empleado(db, emp, empleado_in)


@router.delete("/{empleado_id}", response_model=EmpleadoResponse, dependencies=[Depends(require_permission("empleados.eliminar"))])
def desactivar_empleado(empleado_id: int, db: Session = Depends(get_db)):
    """
    Desactiva a un empleado (soft-delete). Requiere permiso 'empleados.eliminar'.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return crud.crud_empleado.soft_delete_empleado(db, emp)


@router.get("/{empleado_id}/historial_mac", response_model=List[HistorialMacItem], dependencies=[Depends(require_permission("empleados.ver"))])
def obtener_historial_mac(empleado_id: int, db: Session = Depends(get_db)):
    """
    Retorna el historial de cambios de dirección MAC de un empleado. Requiere permiso 'empleados.ver'.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return crud.crud_empleado.get_historial_mac_empleado(db, empleado_id)
