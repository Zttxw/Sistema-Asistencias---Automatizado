from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict


class AsistenciaCreatePayload(BaseModel):
    mac: str = Field(..., example="68:58:A0:DB:7D:4D")
    timestamp: datetime = Field(..., example="2026-08-01T08:03:00+00:00")
    agente_id: str = Field(..., example="PC-OFICINA-1")

    @field_validator('mac')
    @classmethod
    def normalizar_mac(cls, v: str) -> str:
        return v.strip().upper()


class AsistenciaManualPayload(BaseModel):
    empleado_id: int
    tipo: str = Field(..., example="entrada")
    timestamp: Optional[datetime] = None
    motivo: Optional[str] = Field(None, example="Olvidó el celular")

    @field_validator('tipo')
    @classmethod
    def validar_tipo(cls, v: str) -> str:
        tipo_clean = v.strip().lower()
        if tipo_clean not in ["entrada", "salida"]:
            raise ValueError("El campo 'tipo' debe ser 'entrada' o 'salida'")
        return tipo_clean


class AsistenciaResponse(BaseModel):
    id: int
    empleado_id: int
    fecha: date
    hora_entrada: datetime
    hora_salida: Optional[datetime] = None
    origen_entrada: Optional[str] = "automatico"
    origen_salida: Optional[str] = None
    motivo: Optional[str] = None
    agente_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AsistenciaReporteItem(BaseModel):
    empleado: str
    departamento: Optional[str] = None
    fecha: str
    hora_entrada: str
    hora_salida: Optional[str] = None
    origen_entrada: Optional[str] = None
    origen_salida: Optional[str] = None
    motivo: Optional[str] = None
