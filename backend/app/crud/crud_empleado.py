from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.empleado import Empleado
from app.models.historial_mac import HistorialMac
from app.schemas.empleado import EmpleadoCreate, EmpleadoUpdate
from app.crud.crud_dispositivo import limpiar_dispositivo_detectado_si_existe


from datetime import datetime, timedelta
from app.models.asistencia import Asistencia


def calcular_horas_acumuladas_empleado(db: Session, empleado_id: int) -> float:
    asistencias = db.query(Asistencia).filter(Asistencia.empleado_id == empleado_id).all()
    total_horas = 0.0
    for reg in asistencias:
        if reg.hora_entrada and reg.hora_salida:
            dt_ent = reg.hora_entrada if isinstance(reg.hora_entrada, datetime) else datetime.combine(reg.fecha, reg.hora_entrada)
            dt_sal = reg.hora_salida if isinstance(reg.hora_salida, datetime) else datetime.combine(reg.fecha, reg.hora_salida)
            if dt_sal < dt_ent:
                dt_sal += timedelta(days=1)
            segundos = (dt_sal - dt_ent).total_seconds()
            horas_reales = round(segundos / 3600.0, 1)
            horas_dia = min(6.0, horas_reales)  # Máximo 6.0h diarias por norma practicante
            total_horas += horas_dia
    return round(total_horas, 1)


def get_empleado_by_id(db: Session, empleado_id: int) -> Optional[Empleado]:
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    if emp:
        emp.horas_acumuladas = calcular_horas_acumuladas_empleado(db, emp.id)
    return emp


def get_empleado_by_mac(db: Session, mac: str) -> Optional[Empleado]:
    mac_clean = mac.strip().upper()
    emp = db.query(Empleado).filter(Empleado.mac == mac_clean).first()
    if emp:
        emp.horas_acumuladas = calcular_horas_acumuladas_empleado(db, emp.id)
    return emp


def get_empleado_by_email(db: Session, email: str) -> Optional[Empleado]:
    if not email:
        return None
    email_clean = email.strip().lower()
    from app.models.usuario import Usuario
    user = db.query(Usuario).filter(Usuario.email.ilike(email_clean)).first()
    if user and user.empleado_id:
        emp = get_empleado_by_id(db, user.empleado_id)
        if emp:
            return emp

    username = email_clean.split('@')[0]
    emp = db.query(Empleado).filter(Empleado.nombre.ilike(f"%{username}%")).first()
    if not emp:
        emp = db.query(Empleado).filter(Empleado.activo == True).first()
    if emp:
        emp.horas_acumuladas = calcular_horas_acumuladas_empleado(db, emp.id)
    return emp


def get_empleados(db: Session, skip: int = 0, limit: int = 100) -> List[Empleado]:
    empleados = db.query(Empleado).offset(skip).limit(limit).all()
    for emp in empleados:
        emp.horas_acumuladas = calcular_horas_acumuladas_empleado(db, emp.id)
    return empleados


def get_whitelist_macs(db: Session) -> List[str]:
    """
    Retorna la lista de direcciones MACs en mayúsculas pertenecientes a empleados activos.
    """
    empleados_activos = db.query(Empleado.mac).filter(Empleado.activo == True).all()
    return [emp.mac.upper() for emp in empleados_activos]


def create_empleado(db: Session, empleado_in: EmpleadoCreate) -> Empleado:
    mac_clean = empleado_in.mac.strip().upper()
    db_empleado = Empleado(
        nombre=empleado_in.nombre,
        documento=empleado_in.documento,
        mac=mac_clean,
        departamento=empleado_in.departamento,
        horas_meta=empleado_in.horas_meta,
        activo=empleado_in.activo
    )
    db.add(db_empleado)
    db.commit()
    db.refresh(db_empleado)

    # Registrar el primer HistorialMac (Registro inicial)
    hist_inicial = HistorialMac(
        empleado_id=db_empleado.id,
        mac_anterior=None,
        mac_nueva=mac_clean,
        motivo="Registro inicial"
    )
    db.add(hist_inicial)
    db.commit()

    # Limpiar de la lista de dispositivos detectados no registrados si existía
    limpiar_dispositivo_detectado_si_existe(db, mac_clean)

    return db_empleado


def update_empleado(db: Session, db_empleado: Empleado, empleado_in: EmpleadoUpdate) -> Empleado:
    if empleado_in.mac is not None:
        mac_clean = empleado_in.mac.strip().upper()
        if mac_clean != db_empleado.mac:
            existente = db.query(Empleado).filter(Empleado.mac == mac_clean, Empleado.id != db_empleado.id).first()
            if existente:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe otro empleado registrado con esa dirección MAC"
                )
            mac_anterior = db_empleado.mac
            db_empleado.mac = mac_clean

            # Registrar en HistorialMac
            hist_cambio = HistorialMac(
                empleado_id=db_empleado.id,
                mac_anterior=mac_anterior,
                mac_nueva=mac_clean,
                motivo=empleado_in.motivo_cambio_mac or "Cambio de MAC"
            )
            db.add(hist_cambio)

            limpiar_dispositivo_detectado_si_existe(db, mac_clean)

    if empleado_in.documento is not None:
        doc_clean = empleado_in.documento.strip()
        if doc_clean != db_empleado.documento:
            existente_doc = db.query(Empleado).filter(Empleado.documento == doc_clean, Empleado.id != db_empleado.id).first()
            if existente_doc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Ya existe otro empleado registrado con ese número de documento"
                )
            db_empleado.documento = doc_clean

    if empleado_in.nombre is not None:
        db_empleado.nombre = empleado_in.nombre
    if empleado_in.departamento is not None:
        db_empleado.departamento = empleado_in.departamento
    if empleado_in.horas_meta is not None:
        db_empleado.horas_meta = empleado_in.horas_meta
    if empleado_in.activo is not None:
        db_empleado.activo = empleado_in.activo

    db.commit()
    db.refresh(db_empleado)
    return db_empleado


def soft_delete_empleado(db: Session, db_empleado: Empleado) -> Empleado:
    db_empleado.activo = False
    db.commit()
    db.refresh(db_empleado)
    return db_empleado


def get_historial_mac_empleado(db: Session, empleado_id: int) -> List[HistorialMac]:
    return (
        db.query(HistorialMac)
        .filter(HistorialMac.empleado_id == empleado_id)
        .order_by(HistorialMac.fecha_cambio.desc(), HistorialMac.id.desc())
        .all()
    )
