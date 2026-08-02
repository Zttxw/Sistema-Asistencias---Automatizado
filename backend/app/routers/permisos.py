from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.rol import PermisoResponse
from app.core.deps import require_permission
from app.crud import crud_rol_usuario

router = APIRouter(prefix="/api/permisos", tags=["permisos"])


@router.get("", response_model=List[PermisoResponse], dependencies=[Depends(require_permission("roles.gestionar"))])
def listar_permisos(db: Session = Depends(get_db)):
    """
    Lista el catálogo completo de permisos del sistema disponibles. Requiere permiso 'roles.gestionar'.
    """
    return crud_rol_usuario.get_permisos(db)
