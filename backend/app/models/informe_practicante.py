from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class InformePracticante(Base):
    __tablename__ = "informes_practicante"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    fecha_inicio = Column(Date, nullable=False)
    fecha_fin = Column(Date, nullable=False)
    generado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False, index=True)
    fecha_generacion = Column(DateTime, default=func.now(), nullable=False)
    estado = Column(String(20), default="generado", nullable=False)
    aprobado_por_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True, index=True)
    fecha_aprobacion = Column(DateTime, nullable=True)

    empleado = relationship("Empleado")
    generado_por = relationship("Usuario", foreign_keys=[generado_por_id])
    aprobado_por = relationship("Usuario", foreign_keys=[aprobado_por_id])
