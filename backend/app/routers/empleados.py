from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.empleado import EmpleadoCreate, EmpleadoUpdate, EmpleadoResponse
from app.schemas.historial_mac import HistorialMacItem
from app import crud

router = APIRouter(prefix="/api/empleados", tags=["empleados"])


@router.get("/macs", response_model=List[str])
def obtener_whitelist_macs(db: Session = Depends(get_db)):
    """
    Retorna la lista blanca de direcciones MACs en mayúsculas pertenecientes a los empleados activos.
    """
    return crud.crud_empleado.get_whitelist_macs(db)


@router.get("", response_model=List[EmpleadoResponse])
def listar_empleados(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lista todos los empleados (activos e inactivos).
    """
    return crud.crud_empleado.get_empleados(db, skip=skip, limit=limit)


@router.post("", response_model=EmpleadoResponse, status_code=status.HTTP_201_CREATED)
def crear_empleado(empleado_in: EmpleadoCreate, db: Session = Depends(get_db)):
    emp_existente = crud.crud_empleado.get_empleado_by_mac(db, empleado_in.mac)
    if emp_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un empleado registrado con esa dirección MAC"
        )
    return crud.crud_empleado.create_empleado(db, empleado_in)


@router.put("/{empleado_id}", response_model=EmpleadoResponse)
def actualizar_empleado(empleado_id: int, empleado_in: EmpleadoUpdate, db: Session = Depends(get_db)):
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return crud.crud_empleado.update_empleado(db, emp, empleado_in)


@router.delete("/{empleado_id}", response_model=EmpleadoResponse)
def desactivar_empleado(empleado_id: int, db: Session = Depends(get_db)):
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return crud.crud_empleado.soft_delete_empleado(db, emp)


@router.get("/{empleado_id}/historial_mac", response_model=List[HistorialMacItem])
def obtener_historial_mac(empleado_id: int, db: Session = Depends(get_db)):
    """
    Retorna el historial de cambios de dirección MAC de un empleado ordenado descendentemente.
    """
    emp = crud.crud_empleado.get_empleado_by_id(db, empleado_id)
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado"
        )
    return crud.crud_empleado.get_historial_mac_empleado(db, empleado_id)
