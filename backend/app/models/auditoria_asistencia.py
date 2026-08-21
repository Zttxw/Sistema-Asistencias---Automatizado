from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class AuditoriaAsistencia(Base):
    __tablename__ = "auditorias_asistencias"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    asistencia_id = Column(Integer, ForeignKey("asistencias.id", ondelete="SET NULL"), nullable=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=False, index=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    usuario_email = Column(String(100), nullable=False)
    accion = Column(String(50), nullable=False)  # CREACION_MANUAL, EDICION, ELIMINACION, MIGRACION_EXCEL
    fecha_asistencia = Column(Date, nullable=False, index=True)
    valores_anteriores = Column(String(500), nullable=True)
    valores_nuevos = Column(String(500), nullable=True)
    motivo = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    empleado = relationship("Empleado")
    usuario = relationship("Usuario")
