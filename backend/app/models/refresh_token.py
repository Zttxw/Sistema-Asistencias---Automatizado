from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String(255), unique=True, nullable=False, index=True)
    expira_en = Column(DateTime, nullable=False)
    revocado = Column(Boolean, default=False, nullable=False)
    creado_en = Column(DateTime, default=func.now(), nullable=False)

    usuario = relationship("Usuario", back_populates="refresh_tokens")
