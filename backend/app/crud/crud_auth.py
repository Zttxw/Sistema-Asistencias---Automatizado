from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.config import settings
from app.models.usuario import Usuario
from app.models.refresh_token import RefreshToken
from app.core.security import verify_password, create_access_token, generate_random_token


def authenticate_user(db: Session, email: str, password: str) -> Optional[Usuario]:
    user = db.query(Usuario).filter(Usuario.email == email.strip().lower()).first()
    if not user:
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def create_user_tokens(db: Session, user: Usuario) -> Tuple[str, str]:
    permisos = []
    if user.rol and user.rol.permisos:
        permisos = [p.codigo for p in user.rol.permisos]

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "rol": user.rol.nombre if user.rol else None,
        "permisos": permisos
    }
    access_token = create_access_token(data=payload)

    # Crear Refresh Token en BD
    raw_refresh_token = generate_random_token()
    expira_en = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db_refresh_token = RefreshToken(
        usuario_id=user.id,
        token=raw_refresh_token,
        expira_en=expira_en,
        revocado=False
    )
    db.add(db_refresh_token)
    db.commit()

    return access_token, raw_refresh_token


def refresh_access_token(db: Session, refresh_token_str: str) -> Tuple[str, str]:
    db_token = db.query(RefreshToken).filter(
        RefreshToken.token == refresh_token_str,
        RefreshToken.revocado == False
    ).first()

    if not db_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido o revocado"
        )

    now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
    if db_token.expira_en < now_naive:
        db_token.revocado = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token expirado"
        )

    user = db_token.usuario
    if not user or not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario inactivo o no encontrado"
        )

    # Rotar el refresh token anterior (revocarlo)
    db_token.revocado = True
    db.commit()

    # Generar nuevo access_token y nuevo refresh_token
    new_access_token, new_refresh_token = create_user_tokens(db, user)
    return new_access_token, new_refresh_token


def logout_user(db: Session, refresh_token_str: str):
    db_token = db.query(RefreshToken).filter(RefreshToken.token == refresh_token_str).first()
    if db_token:
        db_token.revocado = True
        db.commit()
