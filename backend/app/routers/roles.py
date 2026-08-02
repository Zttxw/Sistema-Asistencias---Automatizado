from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.rol import RolCreate, RolUpdate, RolResponse
from app.core.deps import require_permission
from app.crud import crud_rol_usuario

router = APIRouter(prefix="/api/roles", tags=["roles"])


@router.get("", response_model=List[RolResponse], dependencies=[Depends(require_permission("roles.gestionar"))])
def listar_roles(db: Session = Depends(get_db)):
    """
    Lista todos los roles registrados con sus respectivos permisos asociados. Requiere permiso 'roles.gestionar'.
    """
    return crud_rol_usuario.get_roles(db)


@router.post("", response_model=RolResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("roles.gestionar"))])
def crear_rol(rol_in: RolCreate, db: Session = Depends(get_db)):
    """
    Crea un nuevo rol dinámico asignándole una lista de códigos de permisos. Requiere permiso 'roles.gestionar'.
    """
    return crud_rol_usuario.create_rol(db, rol_in)


@router.put("/{rol_id}", response_model=RolResponse, dependencies=[Depends(require_permission("roles.gestionar"))])
def actualizar_rol(rol_id: int, rol_in: RolUpdate, db: Session = Depends(get_db)):
    """
    Actualiza el nombre, descripción o permisos de un rol existente. Requiere permiso 'roles.gestionar'.
    """
    db_rol = crud_rol_usuario.get_rol_by_id(db, rol_id)
    if not db_rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    return crud_rol_usuario.update_rol(db, db_rol, rol_in)


@router.delete("/{rol_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_permission("roles.gestionar"))])
def eliminar_rol(rol_id: int, db: Session = Depends(get_db)):
    """
    Elimina un rol si no posee usuarios asignados. Requiere permiso 'roles.gestionar'.
    """
    db_rol = crud_rol_usuario.get_rol_by_id(db, rol_id)
    if not db_rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rol no encontrado"
        )
    crud_rol_usuario.delete_rol(db, db_rol)
