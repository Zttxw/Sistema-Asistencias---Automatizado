import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MYSQL_SERVER: str = "localhost"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "asistencias_db"
    MYSQL_USER: str = "asistencias_user"
    MYSQL_PASSWORD: str = "asistencias_pass"
    SECRET_KEY: str = "secret_key_super_segura"

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+pymysql://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_SERVER}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
