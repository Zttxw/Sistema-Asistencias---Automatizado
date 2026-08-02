from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class HistorialMac(Base):
    __tablename__ = "historial_macs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    mac_anterior = Column(String(17), nullable=True)
    mac_nueva = Column(String(17), nullable=False)
    fecha_cambio = Column(DateTime, default=func.now(), nullable=False)
    motivo = Column(String(255), nullable=True)

    empleado = relationship("Empleado", back_populates="historial_macs")
