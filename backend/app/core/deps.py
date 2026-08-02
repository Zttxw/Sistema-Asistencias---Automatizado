from typing import Callable, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.core.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> Usuario:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No autenticado o token inválido/expirado",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception

    user_id = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    try:
        user_id_int = int(user_id)
    except ValueError:
        raise credentials_exception

    user = db.query(Usuario).filter(Usuario.id == user_id_int).first()
    if not user:
        raise credentials_exception

    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cuenta de usuario inactiva"
        )

    return user


def require_permission(permiso_codigo: str) -> Callable:
    def dependency(user: Usuario = Depends(get_current_user)) -> Usuario:
        # Admin posee todos los permisos automáticamente
        if user.rol and user.rol.nombre == "Admin":
            return user

        user_permisos = []
        if user.rol and user.rol.permisos:
            user_permisos = [p.codigo for p in user.rol.permisos]

        if permiso_codigo not in user_permisos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"No tiene permisos suficientes ({permiso_codigo}) para realizar esta acción"
            )
        return user

    return dependency


def require_any_permission(permisos_codigos: List[str]) -> Callable:
    def dependency(user: Usuario = Depends(get_current_user)) -> Usuario:
        if user.rol and user.rol.nombre == "Admin":
            return user

        user_permisos = []
        if user.rol and user.rol.permisos:
            user_permisos = [p.codigo for p in user.rol.permisos]

        if not any(p in user_permisos for p in permisos_codigos):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tiene permisos suficientes para realizar esta acción"
            )
        return user

    return dependency
