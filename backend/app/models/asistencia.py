from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.database import Base


class Asistencia(Base):
    __tablename__ = "asistencias"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    fecha = Column(Date, nullable=False, index=True)
    hora_entrada = Column(DateTime, nullable=False)
    hora_salida = Column(DateTime, nullable=True)
    origen_entrada = Column(String(20), nullable=True, default="automatico")
    origen_salida = Column(String(20), nullable=True)
    motivo = Column(String(255), nullable=True)
    agente_id = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)

    empleado = relationship("Empleado", back_populates="asistencias")

    __table_args__ = (
        UniqueConstraint('empleado_id', 'fecha', name='uq_empleado_fecha'),
    )
