from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict


class UsuarioCreate(BaseModel):
    email: EmailStr
    password: str
    rol_id: int
    empleado_id: Optional[int] = None
    activo: bool = True


class UsuarioUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    rol_id: Optional[int] = None
    empleado_id: Optional[int] = None
    activo: Optional[bool] = None


class UsuarioResponse(BaseModel):
    id: int
    email: str
    rol_id: int
    rol_nombre: Optional[str] = None
    empleado_id: Optional[int] = None
    empleado_nombre: Optional[str] = None
    activo: bool
    creado_en: datetime

    model_config = ConfigDict(from_attributes=True)
