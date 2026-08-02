from sqlalchemy import Column, Integer, String, Boolean, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base


class Empleado(Base):
    __tablename__ = "empleados"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    documento = Column(String(20), unique=True, index=True, nullable=False)
    mac = Column(String(17), unique=True, index=True, nullable=False)
    departamento = Column(String(50), nullable=True)
    horas_meta = Column(Integer, nullable=True, default=None)
    activo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    asistencias = relationship("Asistencia", back_populates="empleado", cascade="all, delete-orphan")
    historial_macs = relationship("HistorialMac", back_populates="empleado", cascade="all, delete-orphan", order_by="HistorialMac.fecha_cambio.desc()")
