from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.auth import LoginPayload, RefreshTokenPayload, TokenResponse, UserMeResponse, CambiarPasswordPayload
from app.models.usuario import Usuario
from app.core.deps import get_current_user
from app.core.security import verify_password, get_password_hash
from app.crud.crud_auth import authenticate_user, create_user_tokens, refresh_access_token, logout_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginPayload, db: Session = Depends(get_db)):
    """
    Autentica un usuario con email y contraseña, retornando access_token (60m) y refresh_token (7d).
    """
    user = authenticate_user(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas (email o contraseña inválidos)"
        )
    if not user.activo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de usuario se encuentra inactiva"
        )

    access_token, refresh_token = create_user_tokens(db, user)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshTokenPayload, db: Session = Depends(get_db)):
    """
    Valida un refresh token y retorna un nuevo access_token y refresh_token rotado.
    """
    access_token, refresh_token = refresh_access_token(db, payload.refresh_token)
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/logout")
def logout(payload: RefreshTokenPayload, db: Session = Depends(get_db)):
    """
    Revoca el refresh token para cerrar sesión.
    """
    logout_user(db, payload.refresh_token)
    return {"message": "Sesión cerrada correctamente"}


from app.schemas.auth import LoginPayload, RefreshTokenPayload, TokenResponse, UserMeResponse, CambiarPasswordPayload, PerfilFirmantePayload

@router.get("/me", response_model=UserMeResponse)
def get_me(user: Usuario = Depends(get_current_user)):
    """
    Retorna la información del usuario autenticado actual, su rol, permisos y perfil de firma.
    """
    permisos = []
    if user.rol and user.rol.permisos:
        permisos = [p.codigo for p in user.rol.permisos]

    return UserMeResponse(
        id=user.id,
        email=user.email,
        rol=user.rol.nombre if user.rol else "Sin Rol",
        empleado_id=user.empleado_id,
        activo=user.activo,
        permisos=permisos,
        nombre_firmante=user.nombre_firmante,
        cargo_firmante=user.cargo_firmante,
        colegiatura_firmante=user.colegiatura_firmante,
        institucion_firmante=user.institucion_firmante
    )


@router.put("/perfil", response_model=UserMeResponse)
def actualizar_perfil_firmante(
    payload: PerfilFirmantePayload,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite al usuario (Jefe de Oficina / Admin) configurar sus credenciales y perfil de firma para los informes PDF.
    """
    if payload.nombre_firmante is not None:
        user.nombre_firmante = payload.nombre_firmante.strip()
    if payload.cargo_firmante is not None:
        user.cargo_firmante = payload.cargo_firmante.strip()
    if payload.colegiatura_firmante is not None:
        user.colegiatura_firmante = payload.colegiatura_firmante.strip()
    if payload.institucion_firmante is not None:
        user.institucion_firmante = payload.institucion_firmante.strip()

    db.commit()
    db.refresh(user)
    return get_me(user=user)


@router.post("/cambiar-password")
def cambiar_password(
    payload: CambiarPasswordPayload,
    user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Permite al usuario o admin cambiar su propia contraseña cifrada unidireccionalmente con Bcrypt + Salt.
    """
    if not verify_password(payload.password_actual, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada es incorrecta"
        )

    user.password_hash = get_password_hash(payload.password_nuevo)
    db.commit()
    return {"message": "Contraseña actualizada y cifrada correctamente con Bcrypt"}
