from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class InformeGenerarPayload(BaseModel):
    empleado_id: int
    fecha_inicio: date
    fecha_fin: date


class InformeResponse(BaseModel):
    id: int
    empleado_id: int
    empleado_nombre: str
    empleado_departamento: Optional[str] = None
    fecha_inicio: date
    fecha_fin: date
    generado_por_id: int
    generado_por_email: str
    fecha_generacion: datetime
    estado: str
    aprobado_por_id: Optional[int] = None
    aprobado_por_email: Optional[str] = None
    fecha_aprobacion: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
