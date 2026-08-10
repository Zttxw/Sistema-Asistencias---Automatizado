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


class MesDisponibleItem(BaseModel):
    numero_mes: int
    nombre_mes: str
    fecha_inicio: date
    fecha_fin: date
    rango_str: str
    horas_mes: float
    firmado: bool
    informe_firmado_id: Optional[int] = None
    fecha_firma: Optional[datetime] = None
    nombre_archivo: Optional[str] = None
    # Alias de compatibilidad para endpoints de fecha
    semana_inicio: Optional[date] = None
    semana_fin: Optional[date] = None
    numero_semana: Optional[int] = None
    horas_semana: Optional[float] = None


class MesesCompletadosResponse(BaseModel):
    meses: list[MesDisponibleItem]
    # Alias de compatibilidad
    semanas: Optional[list[MesDisponibleItem]] = None
    consolidado: Optional[dict] = None


# Alias de compatibilidad
SemanaDisponibleItem = MesDisponibleItem
ConsolidadoInfo = dict
SemanasCompletadasResponse = MesesCompletadosResponse


