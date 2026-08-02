from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class DeteccionPayload(BaseModel):
    mac: str = Field(..., example="04:10:6B:9A:D9:4C")
    timestamp: datetime = Field(..., example="2026-08-02T14:50:00+00:00")
    agente_id: str = Field(..., example="fedora")


class DispositivoNoRegistradoItem(BaseModel):
    mac: str
    fabricante: Optional[str] = None
    primera_vez_visto: datetime
    ultima_vez_visto: datetime
    veces_visto: int

    class Config:
        from_attributes = True
