from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(120), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    rol_id = Column(Integer, ForeignKey("roles.id"), nullable=False, index=True)
    empleado_id = Column(Integer, ForeignKey("empleados.id"), nullable=True, index=True)
    activo = Column(Boolean, default=True, nullable=False)
    creado_en = Column(DateTime, default=func.now(), nullable=False)

    rol = relationship("Rol", back_populates="usuarios")
    empleado = relationship("Empleado")
    refresh_tokens = relationship("RefreshToken", back_populates="usuario", cascade="all, delete-orphan")
