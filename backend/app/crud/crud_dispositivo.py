from datetime import datetime, timedelta, timezone
from typing import List, Union, Dict, Any
from sqlalchemy.orm import Session
from app.models.empleado import Empleado
from app.models.dispositivo_detectado import DispositivoDetectado
from app.models.asistencia import Asistencia
from app.schemas.dispositivo_detectado import DeteccionPayload, DispositivoNoRegistradoItem
from app.schemas.asistencia import AsistenciaCreatePayload
from app.crud.crud_asistencia import registrar_deteccion_asistencia
from app.utils.mac_vendor import lookup_mac_vendor


def procesar_deteccion(db: Session, payload: DeteccionPayload) -> Union[Asistencia, Dict[str, Any]]:
    mac_normalizada = payload.mac.strip().upper()

    # 1. Buscar si la MAC corresponde a un Empleado activo
    empleado = db.query(Empleado).filter(
        Empleado.mac == mac_normalizada,
        Empleado.activo == True
    ).first()

    if empleado:
        # a. SI EXISTE -> Registrar/Actualizar asistencia de Entrada / Salida
        payload_asistencia = AsistenciaCreatePayload(
            mac=mac_normalizada,
            timestamp=payload.timestamp,
            agente_id=payload.agente_id
        )
        return registrar_deteccion_asistencia(db, payload_asistencia)

    # b. SI NO EXISTE -> Registrar/Actualizar en dispositivos_detectados
    dt = payload.timestamp
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

    disp = db.query(DispositivoDetectado).filter(
        DispositivoDetectado.mac == mac_normalizada
    ).first()

    if not disp:
        disp = DispositivoDetectado(
            mac=mac_normalizada,
            primera_vez_visto=dt,
            ultima_vez_visto=dt,
            veces_visto=1,
            agente_id=payload.agente_id
        )
        db.add(disp)
    else:
        disp.ultima_vez_visto = dt
        disp.veces_visto += 1
        disp.agente_id = payload.agente_id

    db.commit()

    return {
        "status": "no_registrado",
        "detail": "dispositivo no registrado, catalogado para revisión",
        "mac": mac_normalizada
    }


def get_dispositivos_no_registrados(db: Session, minutos: int = 10) -> List[DispositivoNoRegistradoItem]:
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    limite = ahora - timedelta(minutes=minutos)

    registros = (
        db.query(DispositivoDetectado)
        .filter(DispositivoDetectado.ultima_vez_visto >= limite)
        .order_by(DispositivoDetectado.ultima_vez_visto.desc())
        .all()
    )

    resultado = []
    for item in registros:
        vendor = lookup_mac_vendor(item.mac)
        resultado.append(
            DispositivoNoRegistradoItem(
                mac=item.mac,
                fabricante=vendor,
                primera_vez_visto=item.primera_vez_visto,
                ultima_vez_visto=item.ultima_vez_visto,
                veces_visto=item.veces_visto
            )
        )
    return resultado


def limpiar_dispositivo_detectado_si_existe(db: Session, mac: str) -> None:
    mac_clean = mac.strip().upper()
    disp = db.query(DispositivoDetectado).filter(
        DispositivoDetectado.mac == mac_clean
    ).first()

    if disp:
        db.delete(disp)
        db.commit()
