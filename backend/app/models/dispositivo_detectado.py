from sqlalchemy import Column, Integer, String, DateTime
from app.database import Base


class DispositivoDetectado(Base):
    __tablename__ = "dispositivos_detectados"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    mac = Column(String(17), unique=True, index=True, nullable=False)
    primera_vez_visto = Column(DateTime, nullable=False)
    ultima_vez_visto = Column(DateTime, nullable=False)
    veces_visto = Column(Integer, default=1, nullable=False)
    agente_id = Column(String(100), nullable=False)
