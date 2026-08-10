import os
from datetime import date, datetime, timedelta
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.empleado import Empleado
from app.models.asistencia import Asistencia
from app.models.informe_firmado import InformeFirmado
from app.schemas.informe_firmado import SemanaDisponibleItem

STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "storage", "informes_firmados")


def asegurar_directorio_storage():
    os.makedirs(STORAGE_DIR, exist_ok=True)


def get_semanas_completadas_empleado(db: Session, empleado_id: int) -> dict:
    """
    Retorna la lista de semanas COMPLETADAS del practicante y la información del informe consolidado general (1 a N semanas).
    Aplica la regla de negocio: solo semanas concluidas (semana_fin < lunes_actual).
    Indica si cada semana (o el consolidado total) cuenta con un PDF firmado digitalmente.
    """
    registros = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id,
        Asistencia.hora_entrada != None
    ).order_by(Asistencia.fecha.asc()).all()

    if not registros:
        return {"semanas": [], "consolidado": None}

    # Fecha del lunes de la semana actual en curso
    hoy = date.today()
    lunes_semana_actual = hoy - timedelta(days=hoy.weekday())

    semanas_dict = {}
    for reg in registros:
        lunes = reg.fecha - timedelta(days=reg.fecha.weekday())
        domingo = lunes + timedelta(days=6)

        # REGLA DE NEGOCIO: Solo mostrar semanas que YA TERMINARON (antes de esta semana en curso)
        if domingo >= lunes_semana_actual:
            continue

        clave = (lunes, domingo)
        if clave not in semanas_dict:
            semanas_dict[clave] = 0.0

        # REGLA INSTITUCIONAL: Solo se computan horas de Lunes a Viernes (weekday 0 a 4). Fines de semana = 0.0 hrs.
        if reg.fecha.weekday() < 5 and reg.hora_entrada and reg.hora_salida:
            dt_ent = reg.hora_entrada if isinstance(reg.hora_entrada, datetime) else datetime.combine(reg.fecha, reg.hora_entrada)
            dt_sal = reg.hora_salida if isinstance(reg.hora_salida, datetime) else datetime.combine(reg.fecha, reg.hora_salida)
            if dt_sal < dt_ent:
                dt_sal += timedelta(days=1)
            segundos = (dt_sal - dt_ent).total_seconds()
            horas_dia = min(6.0, round(segundos / 3600.0, 1))
            semanas_dict[clave] += horas_dia

    if not semanas_dict:
        return {"semanas": [], "consolidado": None}

    # Consultar informes firmados existentes para este empleado
    firmados_db = db.query(InformeFirmado).filter(InformeFirmado.empleado_id == empleado_id).all()

    semanas_ordenadas = sorted(semanas_dict.keys(), key=lambda x: x[0])
    resultado = []
    total_horas_acumuladas = 0.0

    for num_semana, (lunes, domingo) in enumerate(semanas_ordenadas, start=1):
        horas = round(semanas_dict[(lunes, domingo)], 1)
        total_horas_acumuladas += horas
        rango_str = f"{lunes.strftime('%d/%m/%Y')} – {domingo.strftime('%d/%m/%Y')}"

        # Buscar si existe firma individual o consolidada que cubra esta semana
        informe_existente = None
        for f in firmados_db:
            if f.semana_inicio <= lunes and f.semana_fin >= domingo:
                informe_existente = f
                break

        resultado.append({
            "numero_semana": num_semana,
            "semana_inicio": lunes,
            "semana_fin": domingo,
            "rango_str": rango_str,
            "horas_semana": horas,
            "firmado": informe_existente is not None,
            "informe_firmado_id": informe_existente.id if informe_existente else None,
            "fecha_firma": informe_existente.created_at if informe_existente else None,
            "nombre_archivo": informe_existente.nombre_archivo if informe_existente else None,
        })

    # Construir información del Consolidado Global (Semanas 1 a N)
    primer_lunes = semanas_ordenadas[0][0]
    ultimo_domingo = semanas_ordenadas[-1][1]
    rango_consolidado_str = f"{primer_lunes.strftime('%d/%m/%Y')} – {ultimo_domingo.strftime('%d/%m/%Y')}"

    consolidado_firmado_obj = None
    for f in firmados_db:
        if f.semana_inicio <= primer_lunes and f.semana_fin >= ultimo_domingo:
            consolidado_firmado_obj = f
            break

    consolidado_info = {
        "semana_inicio": primer_lunes,
        "semana_fin": ultimo_domingo,
        "rango_str": rango_consolidado_str,
        "total_semanas": len(semanas_ordenadas),
        "total_horas": round(total_horas_acumuladas, 1),
        "firmado": consolidado_firmado_obj is not None,
        "informe_firmado_id": consolidado_firmado_obj.id if consolidado_firmado_obj else None,
        "fecha_firma": consolidado_firmado_obj.created_at if consolidado_firmado_obj else None,
        "nombre_archivo": consolidado_firmado_obj.nombre_archivo if consolidado_firmado_obj else None,
    }

    return {
        "semanas": resultado,
        "consolidado": consolidado_info
    }


def guardar_pdf_firmado(
    db: Session,
    empleado_id: int,
    semana_inicio: date,
    semana_fin: date,
    content_bytes: bytes,
    filename: str,
    usuario_id: int
) -> InformeFirmado:
    asegurar_directorio_storage()

    nombre_sanitizado = f"firmado_emp{empleado_id}_{semana_inicio.strftime('%Y%m%d')}_{filename}"
    filepath = os.path.join(STORAGE_DIR, nombre_sanitizado)

    with open(filepath, "wb") as f:
        f.write(content_bytes)

    # Verificar si ya existía registro
    existente = db.query(InformeFirmado).filter(
        InformeFirmado.empleado_id == empleado_id,
        InformeFirmado.semana_inicio == semana_inicio
    ).first()

    if existente:
        existente.archivo_path = filepath
        existente.nombre_archivo = filename
        existente.firmado_por_id = usuario_id
        existente.created_at = datetime.utcnow()
        db.commit()
        db.refresh(existente)
        return existente
    else:
        nuevo = InformeFirmado(
            empleado_id=empleado_id,
            semana_inicio=semana_inicio,
            semana_fin=semana_fin,
            archivo_path=filepath,
            nombre_archivo=filename,
            firmado_por_id=usuario_id,
            created_at=datetime.utcnow()
        )
        db.add(nuevo)
        db.commit()
        db.refresh(nuevo)
        return nuevo


def get_informe_firmado_by_id(db: Session, informe_id: int) -> Optional[InformeFirmado]:
    return db.query(InformeFirmado).filter(InformeFirmado.id == informe_id).first()
