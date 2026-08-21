import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "asistencias_db"
    MYSQL_USER: str = "asistencias_user"
    MYSQL_PASSWORD: str = "asistencias_pass"

    SECRET_KEY: str = "secret_key_super_segura_sistema_asistencias_2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ADMIN_EMAIL: str = "admin@sistema.com"
    ADMIN_PASSWORD: str = "CHANGE_ME_ON_FIRST_LOGIN"

    # PENDIENTE: Ruta al archivo .pem/.crt con los certificados raíz oficiales de RENIEC/PCM para producción
    FIRMAPERU_TRUST_ROOTS_PATH: Optional[str] = None

    # Configuración de Credenciales de Firma Perú (PCM / SGTD)
    FIRMAPERU_CLIENT_ID: Optional[str] = None
    FIRMAPERU_CLIENT_SECRET: Optional[str] = None
    FIRMAPERU_TOKEN_URL: str = "https://apps.firmaperu.gob.pe/admin/api/security/generate-token"
    FIRMAPERU_AUTH_FILE_PATH: Optional[str] = "fwAuthorization.json"

    # URL base pública del servidor accesible desde la red local (ej. http://10.0.50.30:8080)
    PUBLIC_URL: Optional[str] = None

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
