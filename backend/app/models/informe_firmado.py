from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class InformeFirmado(Base):
    __tablename__ = "informes_firmados"

    id = Column(Integer, primary_key=True, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id", ondelete="CASCADE"), nullable=False, index=True)
    semana_inicio = Column(Date, nullable=False, index=True)
    semana_fin = Column(Date, nullable=False)
    archivo_path = Column(String(500), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    firmado_por_id = Column(Integer, ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    empleado = relationship("Empleado", backref="informes_firmados")
    firmado_por = relationship("Usuario")
