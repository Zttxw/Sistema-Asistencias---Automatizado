from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class HistorialMacItem(BaseModel):
    mac_anterior: Optional[str] = None
    mac_nueva: str
    fecha_cambio: datetime
    motivo: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
