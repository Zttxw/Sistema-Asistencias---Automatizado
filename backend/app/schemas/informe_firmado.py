from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel


class InformeFirmadoResponse(BaseModel):
    id: int
    empleado_id: int
    semana_inicio: date
    semana_fin: date
    nombre_archivo: str
    created_at: datetime
    firmado_por_email: Optional[str] = None

    class Config:
        from_attributes = True


class SemanaDisponibleItem(BaseModel):
    numero_semana: int
    semana_inicio: date
    semana_fin: date
    rango_str: str
    horas_semana: float
    firmado: bool
    informe_firmado_id: Optional[int] = None
    fecha_firma: Optional[datetime] = None
    nombre_archivo: Optional[str] = None


class ConsolidadoInfo(BaseModel):
    semana_inicio: date
    semana_fin: date
    rango_str: str
    total_semanas: int
    total_horas: float
    firmado: bool
    informe_firmado_id: Optional[int] = None
    fecha_firma: Optional[datetime] = None
    nombre_archivo: Optional[str] = None


class SemanasCompletadasResponse(BaseModel):
    semanas: list[SemanaDisponibleItem]
    consolidado: Optional[ConsolidadoInfo] = None

