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


MESES_ESPANOL = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


def get_meses_completados_empleado(db: Session, empleado_id: int) -> dict:
    """
    Retorna la lista de meses COMPLETADOS del practicante (1 a N meses).
    Cada mes representa el período oficial para su respectiva Firma Digital (1 firma por mes).
    Aplica la regla: solo meses concluidos (ultimo_dia_mes < primer_dia_mes_actual).
    """
    registros = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id,
        Asistencia.hora_entrada != None
    ).order_by(Asistencia.fecha.asc()).all()

    if not registros:
        return {"meses": [], "semanas": [], "consolidado": None}

    hoy = date.today()
    primer_dia_mes_actual = hoy.replace(day=1)

    meses_dict = {}
    for reg in registros:
        # Clave por mes calendario (año, mes)
        clave = (reg.fecha.year, reg.fecha.month)
        
        primer_dia = date(reg.fecha.year, reg.fecha.month, 1)
        if reg.fecha.month == 12:
            ultimo_dia = date(reg.fecha.year, 12, 31)
        else:
            ultimo_dia = date(reg.fecha.year, reg.fecha.month + 1, 1) - timedelta(days=1)

        # REGLA DE NEGOCIO: Solo mostrar meses concluidos (antes de este mes en curso)
        if ultimo_dia >= primer_dia_mes_actual:
            continue

        if clave not in meses_dict:
            meses_dict[clave] = {
                "primer_dia": primer_dia,
                "ultimo_dia": ultimo_dia,
                "horas": 0.0
            }

        # REGLA INSTITUCIONAL: Lunes a Viernes (0 a 4), máx 6.0 hrs/día
        if reg.fecha.weekday() < 5 and reg.hora_entrada and reg.hora_salida:
            dt_ent = reg.hora_entrada if isinstance(reg.hora_entrada, datetime) else datetime.combine(reg.fecha, reg.hora_entrada)
            dt_sal = reg.hora_salida if isinstance(reg.hora_salida, datetime) else datetime.combine(reg.fecha, reg.hora_salida)
            if dt_sal < dt_ent:
                dt_sal += timedelta(days=1)
            segundos = (dt_sal - dt_ent).total_seconds()
            horas_dia = min(6.0, round(segundos / 3600.0, 1))
            meses_dict[clave]["horas"] += horas_dia

    if not meses_dict:
        return {"meses": [], "semanas": [], "consolidado": None}

    firmados_db = db.query(InformeFirmado).filter(InformeFirmado.empleado_id == empleado_id).all()

    meses_ordenados = sorted(meses_dict.keys(), key=lambda x: (x[0], x[1]))
    resultado_meses = []
    total_horas_acumuladas = 0.0

    for num_mes, (anio, mes) in enumerate(meses_ordenados, start=1):
        info_m = meses_dict[(anio, mes)]
        p_dia = info_m["primer_dia"]
        u_dia = info_m["ultimo_dia"]
        horas = round(info_m["horas"], 1)
        total_horas_acumuladas += horas

        nombre_mes_str = f"Mes {num_mes} ({MESES_ESPANOL[mes - 1]} {anio})"
        rango_str = f"{p_dia.strftime('%d/%m/%Y')} – {u_dia.strftime('%d/%m/%Y')}"

        informe_existente = None
        for f in firmados_db:
            if f.semana_inicio <= p_dia and f.semana_fin >= u_dia:
                informe_existente = f
                break

        item_mes = {
            "numero_mes": num_mes,
            "nombre_mes": nombre_mes_str,
            "fecha_inicio": p_dia,
            "fecha_fin": u_dia,
            "rango_str": rango_str,
            "horas_mes": horas,
            "firmado": informe_existente is not None,
            "informe_firmado_id": informe_existente.id if informe_existente else None,
            "fecha_firma": informe_existente.created_at if informe_existente else None,
            "nombre_archivo": informe_existente.nombre_archivo if informe_existente else None,
            # Alias de compatibilidad
            "semana_inicio": p_dia,
            "semana_fin": u_dia,
            "numero_semana": num_mes,
            "horas_semana": horas,
        }
        resultado_meses.append(item_mes)

    # Consolidado informativo global
    primer_dia_global = meses_dict[meses_ordenados[0]]["primer_dia"]
    ultimo_dia_global = meses_dict[meses_ordenados[-1]]["ultimo_dia"]

    consolidado_info = {
        "semana_inicio": primer_dia_global,
        "semana_fin": ultimo_dia_global,
        "rango_str": f"{primer_dia_global.strftime('%d/%m/%Y')} – {ultimo_dia_global.strftime('%d/%m/%Y')}",
        "total_semanas": len(resultado_meses),
        "total_horas": round(total_horas_acumuladas, 1),
        "firmado": False,
        "informe_firmado_id": None
    }

    return {
        "meses": resultado_meses,
        "semanas": resultado_meses,
        "consolidado": consolidado_info
    }


def get_semanas_completadas_empleado(db: Session, empleado_id: int) -> dict:
    return get_meses_completados_empleado(db, empleado_id)



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
