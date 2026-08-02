from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.rol_permiso import rol_permisos


class Rol(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nombre = Column(String(50), unique=True, nullable=False, index=True)
    descripcion = Column(String(255), nullable=True)
    creado_en = Column(DateTime, default=func.now(), nullable=False)

    permisos = relationship("Permiso", secondary=rol_permisos, back_populates="roles")
    usuarios = relationship("Usuario", back_populates="rol")
