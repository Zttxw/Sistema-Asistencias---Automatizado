from typing import List
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.dispositivo_detectado import DispositivoNoRegistradoItem
from app.crud.crud_dispositivo import get_dispositivos_no_registrados

router = APIRouter(
    prefix="/api/dispositivos",
    tags=["dispositivos"]
)


@router.get("/no_registrados", response_model=List[DispositivoNoRegistradoItem], status_code=status.HTTP_200_OK)
def listar_dispositivos_no_registrados(
    minutos: int = Query(10, ge=1, description="Filtra dispositivos vistos en los últimos X minutos"),
    db: Session = Depends(get_db)
):
    return get_dispositivos_no_registrados(db, minutos=minutos)
