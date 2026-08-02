from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.rol import Rol
from app.models.permiso import Permiso
from app.models.usuario import Usuario
from app.schemas.rol import RolCreate, RolUpdate
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate
from app.core.security import get_password_hash


# --- PERMISOS ---
def get_permisos(db: Session) -> List[Permiso]:
    return db.query(Permiso).all()


def get_permisos_by_codigos(db: Session, codigos: List[str]) -> List[Permiso]:
    return db.query(Permiso).filter(Permiso.codigo.in_(codigos)).all()


# --- ROLES ---
def get_roles(db: Session) -> List[Rol]:
    return db.query(Rol).all()


def get_rol_by_id(db: Session, rol_id: int) -> Optional[Rol]:
    return db.query(Rol).filter(Rol.id == rol_id).first()


def get_rol_by_nombre(db: Session, nombre: str) -> Optional[Rol]:
    return db.query(Rol).filter(Rol.nombre == nombre.strip()).first()


def create_rol(db: Session, rol_in: RolCreate) -> Rol:
    nombre_clean = rol_in.nombre.strip()
    existente = get_rol_by_nombre(db, nombre_clean)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ya existe un rol registrado con el nombre '{nombre_clean}'"
        )

    permisos_obj = get_permisos_by_codigos(db, rol_in.permisos) if rol_in.permisos else []

    db_rol = Rol(
        nombre=nombre_clean,
        descripcion=rol_in.descripcion,
        permisos=permisos_obj
    )
    db.add(db_rol)
    db.commit()
    db.refresh(db_rol)
    return db_rol


def update_rol(db: Session, db_rol: Rol, rol_in: RolUpdate) -> Rol:
    if rol_in.nombre is not None:
        nombre_clean = rol_in.nombre.strip()
        if nombre_clean != db_rol.nombre:
            existente = get_rol_by_nombre(db, nombre_clean)
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Ya existe otro rol con el nombre '{nombre_clean}'"
                )
            db_rol.nombre = nombre_clean

    if rol_in.descripcion is not None:
        db_rol.descripcion = rol_in.descripcion

    if rol_in.permisos is not None:
        permisos_obj = get_permisos_by_codigos(db, rol_in.permisos)
        db_rol.permisos = permisos_obj

    db.commit()
    db.refresh(db_rol)
    return db_rol


def delete_rol(db: Session, db_rol: Rol):
    usuarios_asociados = db.query(Usuario).filter(Usuario.rol_id == db_rol.id).count()
    if usuarios_asociados > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No se puede eliminar el rol '{db_rol.nombre}' porque tiene {usuarios_asociados} usuarios asignados."
        )

    db.delete(db_rol)
    db.commit()


# --- USUARIOS ---
def get_usuarios(db: Session, skip: int = 0, limit: int = 100) -> List[Usuario]:
    return db.query(Usuario).offset(skip).limit(limit).all()


def get_usuario_by_id(db: Session, usuario_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_usuario_by_email(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()


def create_usuario(db: Session, user_in: UsuarioCreate) -> Usuario:
    email_clean = user_in.email.strip().lower()
    existente = get_usuario_by_email(db, email_clean)
    if existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe una cuenta de usuario registrada con ese email"
        )

    rol = get_rol_by_id(db, user_in.rol_id)
    if not rol:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El rol especificado no existe"
        )

    hashed_pw = get_password_hash(user_in.password)
    db_user = Usuario(
        email=email_clean,
        password_hash=hashed_pw,
        rol_id=user_in.rol_id,
        empleado_id=user_in.empleado_id,
        activo=user_in.activo
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_usuario(db: Session, db_user: Usuario, user_in: UsuarioUpdate) -> Usuario:
    if user_in.email is not None:
        email_clean = user_in.email.strip().lower()
        if email_clean != db_user.email:
            existente = get_usuario_by_email(db, email_clean)
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe otra cuenta registrada con ese email"
                )
            db_user.email = email_clean

    if user_in.password:
        db_user.password_hash = get_password_hash(user_in.password)

    if user_in.rol_id is not None:
        rol = get_rol_by_id(db, user_in.rol_id)
        if not rol:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="El rol especificado no existe"
            )
        db_user.rol_id = user_in.rol_id

    if user_in.empleado_id is not None:
        db_user.empleado_id = user_in.empleado_id

    if user_in.activo is not None:
        db_user.activo = user_in.activo

    db.commit()
    db.refresh(db_user)
    return db_user


def soft_delete_usuario(db: Session, db_user: Usuario) -> Usuario:
    db_user.activo = False
    db.commit()
    db.refresh(db_user)
    return db_user
