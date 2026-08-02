from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PermisoResponse(BaseModel):
    id: int
    codigo: str
    descripcion: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class RolCreate(BaseModel):
    nombre: str
    descripcion: Optional[str] = None
    permisos: List[str] = []  # Lista de códigos de permiso


class RolUpdate(BaseModel):
    nombre: Optional[str] = None
    descripcion: Optional[str] = None
    permisos: Optional[List[str]] = None  # Lista de códigos de permiso


class RolResponse(BaseModel):
    id: int
    nombre: str
    descripcion: Optional[str] = None
    creado_en: datetime
    permisos: List[PermisoResponse] = []

    model_config = ConfigDict(from_attributes=True)
