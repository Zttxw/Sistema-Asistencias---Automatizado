from datetime import datetime
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class FirmaToken(Base):
    __tablename__ = "firma_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    token = Column(String(100), unique=True, nullable=False, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    semana_inicio = Column(Date, nullable=False)
    semana_fin = Column(Date, nullable=False)
    ingeniero_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    pdf_path = Column(String(500), nullable=False)
    estado = Column(String(20), default="pendiente", nullable=False)  # 'pendiente', 'emitido', 'usado', 'expirado'
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    empleado = relationship("Empleado")
    ingeniero = relationship("Usuario")
