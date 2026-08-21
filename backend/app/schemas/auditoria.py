from typing import Optional
from pydantic import BaseModel


class AuditoriaAsistenciaItem(BaseModel):
    id: int
    asistencia_id: Optional[int] = None
    empleado_id: int
    empleado_nombre: str
    usuario_id: Optional[int] = None
    usuario_email: str
    accion: str  # CREACION_MANUAL, EDICION, ELIMINACION, MIGRACION_EXCEL
    fecha_asistencia: str
    valores_anteriores: Optional[str] = None
    valores_nuevos: Optional[str] = None
    motivo: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True
