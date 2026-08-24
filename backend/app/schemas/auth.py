from typing import List, Optional
from pydantic import BaseModel, EmailStr


class LoginPayload(BaseModel):
    email: str
    password: str


class RefreshTokenPayload(BaseModel):
    refresh_token: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserMeResponse(BaseModel):
    id: int
    email: str
    rol: str
    empleado_id: Optional[int] = None
    activo: bool
    permisos: List[str]
    nombre_firmante: Optional[str] = None
    cargo_firmante: Optional[str] = None
    colegiatura_firmante: Optional[str] = None
    institucion_firmante: Optional[str] = None


class PerfilFirmantePayload(BaseModel):
    nombre_firmante: Optional[str] = None
    cargo_firmante: Optional[str] = None
    colegiatura_firmante: Optional[str] = None
    institucion_firmante: Optional[str] = None


class CambiarPasswordPayload(BaseModel):
    password_actual: str
    password_nuevo: str

