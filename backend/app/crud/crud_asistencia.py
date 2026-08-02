from datetime import date, datetime, timezone
from io import BytesIO
import calendar
from typing import List, Optional
import openpyxl
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.empleado import Empleado
from app.models.asistencia import Asistencia
from app.schemas.asistencia import AsistenciaCreatePayload, AsistenciaManualPayload, AsistenciaReporteItem


def registrar_deteccion_asistencia(db: Session, payload: AsistenciaCreatePayload) -> Asistencia:
    mac_normalizada = payload.mac.strip().upper()

    # 1. Buscar el empleado por mac donde activo=True
    empleado = db.query(Empleado).filter(
        Empleado.mac == mac_normalizada,
        Empleado.activo == True
    ).first()

    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Empleado no encontrado o inactivo para la MAC {mac_normalizada}"
        )

    # Convertir timestamp a timezone-naive para almacenar y comparar homogéneamente
    dt = payload.timestamp
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

    # 2. Extraer la fecha (sin hora) del timestamp recibido
    fecha_hoy = dt.date()

    # 3. Buscar en asistencias un registro con ese empleado_id y esa fecha
    asistencia = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado.id,
        Asistencia.fecha == fecha_hoy
    ).first()

    if not asistencia:
        # Si NO existe -> crear nuevo registro: hora_entrada = timestamp, hora_salida = NULL
        asistencia = Asistencia(
            empleado_id=empleado.id,
            fecha=fecha_hoy,
            hora_entrada=dt,
            hora_salida=None,
            origen_entrada="automatico",
            origen_salida=None,
            agente_id=payload.agente_id
        )
        db.add(asistencia)
    else:
        # Si YA existe -> actualizar hora_salida = timestamp, solo si el nuevo timestamp es posterior al hora_entrada
        if dt > asistencia.hora_entrada:
            if asistencia.hora_salida is None or dt > asistencia.hora_salida:
                asistencia.hora_salida = dt
                asistencia.origen_salida = "automatico"
                asistencia.agente_id = payload.agente_id

    db.commit()
    db.refresh(asistencia)
    return asistencia


def registrar_asistencia_manual(db: Session, payload: AsistenciaManualPayload) -> Asistencia:
    empleado = db.query(Empleado).filter(
        Empleado.id == payload.empleado_id,
        Empleado.activo == True
    ).first()

    if not empleado:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empleado no encontrado o inactivo"
        )

    dt = payload.timestamp or datetime.now(timezone.utc)
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)

    fecha_hoy = dt.date()

    asistencia = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado.id,
        Asistencia.fecha == fecha_hoy
    ).first()

    if payload.tipo == "entrada":
        if asistencia:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ya existe una entrada registrada para este empleado hoy"
            )
        asistencia = Asistencia(
            empleado_id=empleado.id,
            fecha=fecha_hoy,
            hora_entrada=dt,
            hora_salida=None,
            origen_entrada="manual",
            origen_salida=None,
            motivo=payload.motivo,
            agente_id="manual"
        )
        db.add(asistencia)
    elif payload.tipo == "salida":
        if not asistencia:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se puede registrar salida sin una entrada previa ese día"
            )
        if dt <= asistencia.hora_entrada:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="La hora de salida debe ser posterior a la hora de entrada"
            )
        asistencia.hora_salida = dt
        asistencia.origen_salida = "manual"
        if payload.motivo:
            asistencia.motivo = payload.motivo

    db.commit()
    db.refresh(asistencia)
    return asistencia


def get_asistencias_por_fecha(db: Session, fecha_consulta: date) -> List[AsistenciaReporteItem]:
    asistencias = (
        db.query(Asistencia)
        .join(Empleado, Asistencia.empleado_id == Empleado.id)
        .filter(Asistencia.fecha == fecha_consulta)
        .order_by(Asistencia.hora_entrada.asc())
        .all()
    )

    resultado = []
    for item in asistencias:
        h_entrada_str = item.hora_entrada.strftime("%H:%M:%S") if item.hora_entrada else ""
        h_salida_str = item.hora_salida.strftime("%H:%M:%S") if item.hora_salida else None
        resultado.append(
            AsistenciaReporteItem(
                empleado=item.empleado.nombre,
                departamento=item.empleado.departamento,
                fecha=item.fecha.strftime("%Y-%m-%d"),
                hora_entrada=h_entrada_str,
                hora_salida=h_salida_str,
                origen_entrada=item.origen_entrada,
                origen_salida=item.origen_salida,
                motivo=item.motivo
            )
        )
    return resultado


def get_asistencias_por_rango_fechas(
    db: Session,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None
) -> List[Asistencia]:
    today = date.today()
    if fecha_inicio is None:
        fecha_inicio = date(today.year, today.month, 1)
    if fecha_fin is None:
        ultimo_dia = calendar.monthrange(today.year, today.month)[1]
        fecha_fin = date(today.year, today.month, ultimo_dia)

    return (
        db.query(Asistencia)
        .join(Empleado, Asistencia.empleado_id == Empleado.id)
        .filter(Asistencia.fecha >= fecha_inicio, Asistencia.fecha <= fecha_fin)
        .order_by(Asistencia.fecha.asc(), Asistencia.hora_entrada.asc())
        .all()
    )


def get_asistencias_empleado_por_rango(
    db: Session,
    empleado_id: int,
    fecha_inicio: date,
    fecha_fin: date
) -> List[Asistencia]:
    return (
        db.query(Asistencia)
        .filter(
            Asistencia.empleado_id == empleado_id,
            Asistencia.fecha >= fecha_inicio,
            Asistencia.fecha <= fecha_fin
        )
        .order_by(Asistencia.fecha.asc(), Asistencia.hora_entrada.asc())
        .all()
    )



def generar_excel_asistencias(asistencias: List[Asistencia]) -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Asistencias"

    headers = ["Empleado", "Departamento", "Fecha", "Hora Entrada", "Hora Salida", "Origen Entrada", "Origen Salida", "Motivo"]
    ws.append(headers)

    for item in asistencias:
        emp_nombre = item.empleado.nombre if item.empleado else ""
        emp_depto = item.empleado.departamento if (item.empleado and item.empleado.departamento) else ""
        f_str = item.fecha.strftime("%Y-%m-%d") if item.fecha else ""
        h_entrada = item.hora_entrada.strftime("%H:%M:%S") if item.hora_entrada else ""
        h_salida = item.hora_salida.strftime("%H:%M:%S") if item.hora_salida else ""
        o_entrada = item.origen_entrada or ""
        o_salida = item.origen_salida or ""
        mot = item.motivo or ""

        ws.append([emp_nombre, emp_depto, f_str, h_entrada, h_salida, o_entrada, o_salida, mot])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
