from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class EmpleadoBase(BaseModel):
    nombre: str = Field(..., example="Jeanpier Merma")
    documento: str = Field(..., example="72849102")
    mac: str = Field(..., example="68:58:A0:DB:7D:4D")
    departamento: Optional[str] = Field(None, example="OTI")
    horas_meta: Optional[int] = Field(None, example=640)
    activo: bool = True

    @field_validator('mac')
    @classmethod
    def normalizar_mac(cls, v: str) -> str:
        return v.strip().upper()


class EmpleadoCreate(EmpleadoBase):
    pass


class EmpleadoUpdate(BaseModel):
    nombre: Optional[str] = None
    documento: Optional[str] = None
    mac: Optional[str] = None
    departamento: Optional[str] = None
    horas_meta: Optional[int] = None
    activo: Optional[bool] = None
    motivo_cambio_mac: Optional[str] = None

    @field_validator('mac')
    @classmethod
    def normalizar_mac(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            return v.strip().upper()
        return v


class EmpleadoResponse(EmpleadoBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
