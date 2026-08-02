from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dispositivo_detectado import DeteccionPayload
from app.crud.crud_dispositivo import procesar_deteccion

router = APIRouter(
    prefix="/api/deteccion",
    tags=["detecciones"]
)


@router.post("", status_code=status.HTTP_200_OK)
def recibir_deteccion(payload: DeteccionPayload, db: Session = Depends(get_db)):
    return procesar_deteccion(db, payload)
