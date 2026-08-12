from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.core.deps import require_permission
from app.crud import crud_rol_usuario

router = APIRouter(prefix="/api/usuarios", tags=["usuarios"])


def _map_usuario_response(u) -> UsuarioResponse:
    return UsuarioResponse(
        id=u.id,
        email=u.email,
        rol_id=u.rol_id,
        rol_nombre=u.rol.nombre if u.rol else None,
        empleado_id=u.empleado_id,
        empleado_nombre=u.empleado.nombre if u.empleado else None,
        activo=u.activo,
        nombre_firmante=u.nombre_firmante,
        cargo_firmante=u.cargo_firmante,
        colegiatura_firmante=u.colegiatura_firmante,
        institucion_firmante=u.institucion_firmante,
        creado_en=u.creado_en
    )


@router.get("", response_model=List[UsuarioResponse], dependencies=[Depends(require_permission("usuarios.gestionar"))])
def listar_usuarios(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Lista todos los usuarios del sistema. Requiere permiso 'usuarios.gestionar'.
    """
    usuarios = crud_rol_usuario.get_usuarios(db, skip=skip, limit=limit)
    return [_map_usuario_response(u) for u in usuarios]


@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission("usuarios.gestionar"))])
def crear_usuario(user_in: UsuarioCreate, db: Session = Depends(get_db)):
    """
    Crea una nueva cuenta de usuario asignándole un rol. Requiere permiso 'usuarios.gestionar'.
    """
    db_user = crud_rol_usuario.create_usuario(db, user_in)
    return _map_usuario_response(db_user)


@router.put("/{usuario_id}", response_model=UsuarioResponse, dependencies=[Depends(require_permission("usuarios.gestionar"))])
def actualizar_usuario(usuario_id: int, user_in: UsuarioUpdate, db: Session = Depends(get_db)):
    """
    Actualiza datos de un usuario (email, password, rol, empleado_id, activo). Requiere permiso 'usuarios.gestionar'.
    """
    db_user = crud_rol_usuario.get_usuario_by_id(db, usuario_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    updated_user = crud_rol_usuario.update_usuario(db, db_user, user_in)
    return _map_usuario_response(updated_user)


@router.delete("/{usuario_id}", response_model=UsuarioResponse, dependencies=[Depends(require_permission("usuarios.gestionar"))])
def desactivar_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """
    Desactiva una cuenta de usuario (soft-delete activo=False). Requiere permiso 'usuarios.gestionar'.
    """
    db_user = crud_rol_usuario.get_usuario_by_id(db, usuario_id)
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado"
        )
    deleted_user = crud_rol_usuario.soft_delete_usuario(db, db_user)
    return _map_usuario_response(deleted_user)
