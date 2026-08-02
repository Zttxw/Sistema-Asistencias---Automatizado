from typing import List, Optional
from pydantic import BaseModel, EmailStr


class LoginPayload(BaseModel):
    email: EmailStr
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
