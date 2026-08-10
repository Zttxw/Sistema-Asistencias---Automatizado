from datetime import date, datetime, timezone, timedelta
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

    PERU_TZ = timezone(timedelta(hours=-5))

    # Convertir timestamp a hora local de Perú (UTC-5)
    dt_local = payload.timestamp
    if dt_local.tzinfo is None:
        dt_local = dt_local.replace(tzinfo=timezone.utc)
    dt = dt_local.astimezone(PERU_TZ).replace(tzinfo=None)

    # 2. Extraer la fecha local (sin hora)
    fecha_hoy = dt.date()

    # Regla Institucional: No se computan ni registran asistencias los fines de semana (Sábados y Domingos)
    if fecha_hoy.weekday() >= 5:
        if asistencia:
            return asistencia
        return Asistencia(
            id=0,
            empleado_id=empleado.id,
            fecha=fecha_hoy,
            origen_entrada="ignorado_fin_de_semana",
            agente_id=payload.agente_id
        )

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

    PERU_TZ = timezone(timedelta(hours=-5))
    dt_local = payload.timestamp or datetime.now(timezone.utc)
    if dt_local.tzinfo is None:
        dt_local = dt_local.replace(tzinfo=timezone.utc)
    dt = dt_local.astimezone(PERU_TZ).replace(tzinfo=None)

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
            motivo=payload.motivo
        )
        db.add(asistencia)
    else:
        if not asistencia:
            asistencia = Asistencia(
                empleado_id=empleado.id,
                fecha=fecha_hoy,
                hora_entrada=dt,
                hora_salida=dt,
                origen_entrada="manual",
                origen_salida="manual",
                motivo=payload.motivo
            )
            db.add(asistencia)
        else:
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


def get_asistencias_hoy(db: Session) -> List[AsistenciaReporteItem]:
    PERU_TZ = timezone(timedelta(hours=-5))
    fecha_hoy = datetime.now(PERU_TZ).date()
    return get_asistencias_por_fecha(db, fecha_hoy)


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


def get_historial_diario_empleado(db: Session, empleado_id: int) -> List[AsistenciaReporteItem]:
    registros = (
        db.query(Asistencia)
        .filter(
            Asistencia.empleado_id == empleado_id,
            Asistencia.hora_entrada != None
        )
        .order_by(Asistencia.fecha.desc())
        .all()
    )

    DIAS_ESPANOL = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"]
    resultado = []

    for reg in registros:
        nom_dia = DIAS_ESPANOL[reg.fecha.weekday()]
        h_ent = reg.hora_entrada.strftime("%H:%M") if reg.hora_entrada else None
        h_sal = reg.hora_salida.strftime("%H:%M") if reg.hora_salida else None

        horas_comp = 0.0
        # REGLA INSTITUCIONAL: Solo Lunes a Viernes (0 a 4) computan horas
        if reg.fecha.weekday() < 5 and reg.hora_entrada and reg.hora_salida:
            dt_ent = reg.hora_entrada if isinstance(reg.hora_entrada, datetime) else datetime.combine(reg.fecha, reg.hora_entrada)
            dt_sal = reg.hora_salida if isinstance(reg.hora_salida, datetime) else datetime.combine(reg.fecha, reg.hora_salida)
            if dt_sal < dt_ent:
                dt_sal += timedelta(days=1)
            segundos = (dt_sal - dt_ent).total_seconds()
            horas_comp = min(6.0, round(segundos / 3600.0, 1))

        resultado.append(
            AsistenciaReporteItem(
                id=reg.id,
                empleado=reg.empleado.nombre if reg.empleado else "Practicante",
                departamento=reg.empleado.departamento if (reg.empleado and reg.empleado.departamento) else "OTI",
                fecha=f"{nom_dia} {reg.fecha.strftime('%d/%m/%Y')}",
                hora_entrada=h_ent,
                hora_salida=h_sal,
                horas_computables=horas_comp,
                origen_entrada=reg.origen_entrada or "automático",
                origen_salida=reg.origen_salida,
                motivo=reg.motivo,
                agente_id=reg.agente_id
            )
        )
    return resultado



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
