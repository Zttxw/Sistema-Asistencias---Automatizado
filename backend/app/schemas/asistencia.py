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
    tipo: Optional[str] = Field("entrada", example="entrada")
    timestamp: Optional[datetime] = None
    fecha: Optional[date] = None
    hora_entrada: Optional[str] = None  # HH:MM
    hora_salida: Optional[str] = None   # HH:MM
    motivo: Optional[str] = Field(None, example="Olvidó el celular")

    @field_validator('tipo')
    @classmethod
    def validar_tipo(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return "entrada"
        tipo_clean = v.strip().lower()
        if tipo_clean not in ["entrada", "salida", "completo"]:
            raise ValueError("El campo 'tipo' debe ser 'entrada', 'salida' o 'completo'")
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


class AsistenciaEdicionPayload(BaseModel):
    hora_entrada: Optional[str] = None  # HH:MM o HH:MM:SS
    hora_salida: Optional[str] = None   # HH:MM o HH:MM:SS
    motivo: Optional[str] = None


class AsistenciaReporteItem(BaseModel):
    id: Optional[int] = None
    empleado_id: Optional[int] = None
    empleado: str
    departamento: Optional[str] = None
    fecha: str
    hora_entrada: Optional[str] = None
    hora_salida: Optional[str] = None
    horas_computables: Optional[float] = 0.0
    origen_entrada: Optional[str] = None
    origen_salida: Optional[str] = None
    motivo: Optional[str] = None
    agente_id: Optional[str] = None
    esta_firmado: Optional[bool] = False

