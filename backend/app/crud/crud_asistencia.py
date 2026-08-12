from datetime import date, datetime, timezone, timedelta, time
from io import BytesIO
import calendar
from typing import List, Optional
import openpyxl
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.empleado import Empleado
from app.models.asistencia import Asistencia
from app.models.informe_firmado import InformeFirmado
from app.schemas.asistencia import AsistenciaCreatePayload, AsistenciaManualPayload, AsistenciaReporteItem, AsistenciaEdicionPayload


def registrar_deteccion_asistencia(db: Session, payload: AsistenciaCreatePayload) -> Asistencia:
    mac_normalizada = payload.mac.strip().upper()

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
    dt_local = payload.timestamp
    if dt_local.tzinfo is None:
        dt_local = dt_local.replace(tzinfo=timezone.utc)
    dt = dt_local.astimezone(PERU_TZ).replace(tzinfo=None)

    fecha_hoy = dt.date()

    if fecha_hoy.weekday() >= 5:
        return Asistencia(
            id=0,
            empleado_id=empleado.id,
            fecha=fecha_hoy,
            origen_entrada="ignorado_fin_de_semana",
            agente_id=payload.agente_id
        )

    asistencia = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado.id,
        Asistencia.fecha == fecha_hoy
    ).first()

    if not asistencia:
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

    # 1. Determinar la fecha objetivo de la asistencia
    if payload.fecha:
        fecha_objetivo = payload.fecha
    elif payload.timestamp:
        dt_local = payload.timestamp
        if dt_local.tzinfo is None:
            dt_local = dt_local.replace(tzinfo=timezone.utc)
        dt = dt_local.astimezone(PERU_TZ).replace(tzinfo=None)
        fecha_objetivo = dt.date()
    else:
        fecha_objetivo = datetime.now(PERU_TZ).date()

    # 2. Verificar si la fecha pertenece a un informe mensual firmado por la Jefatura
    check_asistencia_bloqueada_por_firma(db, empleado.id, fecha_objetivo)

    asistencia = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado.id,
        Asistencia.fecha == fecha_objetivo
    ).first()

    # 3. Si se envían horas explícitas (Entrada / Salida extemporáneas de fecha seleccionada)
    if payload.hora_entrada or payload.hora_salida:
        dt_ent = None
        dt_sal = None
        if payload.hora_entrada and payload.hora_entrada.strip() not in ["", "--:--"]:
            parts = payload.hora_entrada.strip().split(":")
            h, m = int(parts[0]), int(parts[1])
            s = int(parts[2]) if len(parts) > 2 else 0
            dt_ent = datetime.combine(fecha_objetivo, time(h, m, s))

        if payload.hora_salida and payload.hora_salida.strip() not in ["", "--:--"]:
            parts = payload.hora_salida.strip().split(":")
            h, m = int(parts[0]), int(parts[1])
            s = int(parts[2]) if len(parts) > 2 else 0
            dt_sal = datetime.combine(fecha_objetivo, time(h, m, s))
            if dt_ent and dt_sal < dt_ent:
                dt_sal += timedelta(days=1)

        if not asistencia:
            asistencia = Asistencia(
                empleado_id=empleado.id,
                fecha=fecha_objetivo,
                hora_entrada=dt_ent or datetime.combine(fecha_objetivo, time(8, 0)),
                hora_salida=dt_sal,
                origen_entrada="manual",
                origen_salida="manual" if dt_sal else None,
                agente_id="MANUAL-WEB",
                motivo=payload.motivo
            )
            db.add(asistencia)
        else:
            if dt_ent:
                asistencia.hora_entrada = dt_ent
                asistencia.origen_entrada = "manual"
            if dt_sal:
                asistencia.hora_salida = dt_sal
                asistencia.origen_salida = "manual"
            if payload.motivo:
                asistencia.motivo = payload.motivo
    else:
        # 4. Marcación por timestamp (Entrada / Salida rápida)
        dt_local = payload.timestamp or datetime.now(timezone.utc)
        if dt_local.tzinfo is None:
            dt_local = dt_local.replace(tzinfo=timezone.utc)
        dt = dt_local.astimezone(PERU_TZ).replace(tzinfo=None)

        if payload.tipo == "entrada":
            if asistencia and asistencia.hora_entrada:
                asistencia.hora_entrada = dt
                asistencia.origen_entrada = "manual"
                if payload.motivo:
                    asistencia.motivo = payload.motivo
            else:
                asistencia = Asistencia(
                    empleado_id=empleado.id,
                    fecha=fecha_objetivo,
                    hora_entrada=dt,
                    hora_salida=None,
                    origen_entrada="manual",
                    origen_salida=None,
                    agente_id="MANUAL-WEB",
                    motivo=payload.motivo
                )
                db.add(asistencia)
        else:
            if not asistencia:
                asistencia = Asistencia(
                    empleado_id=empleado.id,
                    fecha=fecha_objetivo,
                    hora_entrada=dt,
                    hora_salida=dt,
                    origen_entrada="manual",
                    origen_salida="manual",
                    agente_id="MANUAL-WEB",
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


def check_asistencia_bloqueada_por_firma(db: Session, empleado_id: int, fecha_asistencia: date):
    """
    Verifica si existe un InformeFirmado para el empleado_id que cubra la fecha de la asistencia.
    Si ya fue firmado por la Jefatura, impide la modificación o eliminación del registro.
    """
    informe = db.query(InformeFirmado).filter(
        InformeFirmado.empleado_id == empleado_id,
        InformeFirmado.semana_inicio <= fecha_asistencia,
        InformeFirmado.semana_fin >= fecha_asistencia
    ).first()
    if informe:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No se puede modificar ni eliminar una asistencia que pertenece a un informe mensual que ya fue firmado por la Jefatura."
        )


def update_asistencia_manual(db: Session, asistencia_id: int, payload: AsistenciaEdicionPayload) -> Asistencia:
    asistencia = db.query(Asistencia).filter(Asistencia.id == asistencia_id).first()
    if not asistencia:
        raise HTTPException(status_code=404, detail="Registro de asistencia no encontrado.")

    # 1. Verificar bloqueo de firma
    check_asistencia_bloqueada_por_firma(db, asistencia.empleado_id, asistencia.fecha)

    # 2. Actualizar hora_entrada
    if payload.hora_entrada is not None:
        val_ent = payload.hora_entrada.strip()
        if val_ent in ["", "--:--", "--:--:--"]:
            asistencia.hora_entrada = None
        else:
            try:
                parts = val_ent.split(":")
                h, m = int(parts[0]), int(parts[1])
                s = int(parts[2]) if len(parts) > 2 else 0
                asistencia.hora_entrada = datetime.combine(asistencia.fecha, time(h, m, s))
                asistencia.origen_entrada = "manual"
            except Exception:
                raise HTTPException(status_code=400, detail="Formato de hora de entrada inválido (use HH:MM).")

    # 3. Actualizar hora_salida
    if payload.hora_salida is not None:
        val_sal = payload.hora_salida.strip()
        if val_sal in ["", "--:--", "--:--:--"]:
            asistencia.hora_salida = None
        else:
            try:
                parts = val_sal.split(":")
                h, m = int(parts[0]), int(parts[1])
                s = int(parts[2]) if len(parts) > 2 else 0
                dt_sal = datetime.combine(asistencia.fecha, time(h, m, s))
                if asistencia.hora_entrada and dt_sal < asistencia.hora_entrada:
                    dt_sal += timedelta(days=1)
                asistencia.hora_salida = dt_sal
                asistencia.origen_salida = "manual"
            except Exception:
                raise HTTPException(status_code=400, detail="Formato de hora de salida inválido (use HH:MM).")

    if payload.motivo is not None:
        asistencia.motivo = payload.motivo

    db.commit()
    db.refresh(asistencia)
    return asistencia


def delete_asistencia_manual(db: Session, asistencia_id: int):
    asistencia = db.query(Asistencia).filter(Asistencia.id == asistencia_id).first()
    if not asistencia:
        raise HTTPException(status_code=404, detail="Registro de asistencia no encontrado.")

    # Verificar bloqueo de firma
    check_asistencia_bloqueada_por_firma(db, asistencia.empleado_id, asistencia.fecha)

    db.delete(asistencia)
    db.commit()
    return {"ok": True, "message": "Asistencia eliminada correctamente."}


def get_asistencias_por_fecha(db: Session, fecha_consulta: date) -> List[AsistenciaReporteItem]:
    asistencias = (
        db.query(Asistencia)
        .join(Empleado, Asistencia.empleado_id == Empleado.id)
        .filter(Asistencia.fecha == fecha_consulta)
        .order_by(Asistencia.hora_entrada.asc())
        .all()
    )

    # Obtener IDs de empleados con informes firmados que cubran la fecha
    informes_firmados = db.query(InformeFirmado).filter(
        InformeFirmado.semana_inicio <= fecha_consulta,
        InformeFirmado.semana_fin >= fecha_consulta
    ).all()
    firmados_emp_ids = {inf.empleado_id for inf in informes_firmados}

    resultado = []
    for item in asistencias:
        h_entrada_str = item.hora_entrada.strftime("%H:%M:%S") if item.hora_entrada else ""
        h_salida_str = item.hora_salida.strftime("%H:%M:%S") if item.hora_salida else None

        horas_comp = 0.0
        if item.fecha.weekday() < 5 and item.hora_entrada and item.hora_salida:
            dt_ent = item.hora_entrada if isinstance(item.hora_entrada, datetime) else datetime.combine(item.fecha, item.hora_entrada)
            dt_sal = item.hora_salida if isinstance(item.hora_salida, datetime) else datetime.combine(item.fecha, item.hora_salida)
            if dt_sal < dt_ent:
                dt_sal += timedelta(days=1)
            segundos = (dt_sal - dt_ent).total_seconds()
            horas_comp = min(6.0, round(segundos / 3600.0, 1))

        resultado.append(
            AsistenciaReporteItem(
                id=item.id,
                empleado_id=item.empleado_id,
                empleado=item.empleado.nombre,
                departamento=item.empleado.departamento,
                fecha=item.fecha.strftime("%Y-%m-%d"),
                hora_entrada=h_entrada_str,
                hora_salida=h_salida_str,
                horas_computables=horas_comp,
                origen_entrada=item.origen_entrada,
                origen_salida=item.origen_salida,
                motivo=item.motivo,
                esta_firmado=item.empleado_id in firmados_emp_ids
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

    # Obtener rangos firmados del empleado
    informes_firmados = db.query(InformeFirmado).filter(
        InformeFirmado.empleado_id == empleado_id
    ).all()

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

        # Verificar si la fecha está firmada
        esta_firm = any(inf.semana_inicio <= reg.fecha <= inf.semana_fin for inf in informes_firmados)

        resultado.append(
            AsistenciaReporteItem(
                id=reg.id,
                empleado_id=reg.empleado_id,
                empleado=reg.empleado.nombre if reg.empleado else "Practicante",
                departamento=reg.empleado.departamento if (reg.empleado and reg.empleado.departamento) else "OTI",
                fecha=f"{nom_dia} {reg.fecha.strftime('%d/%m/%Y')}",
                hora_entrada=h_ent,
                hora_salida=h_sal,
                horas_computables=horas_comp,
                origen_entrada=reg.origen_entrada or "automático",
                origen_salida=reg.origen_salida,
                motivo=reg.motivo,
                agente_id=reg.agente_id,
                esta_firmado=esta_firm
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
