from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base
from app.models.rol_permiso import rol_permisos


class Permiso(Base):
    __tablename__ = "permisos"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    codigo = Column(String(100), unique=True, nullable=False, index=True)
    descripcion = Column(String(255), nullable=True)

    roles = relationship("Rol", secondary=rol_permisos, back_populates="permisos")
