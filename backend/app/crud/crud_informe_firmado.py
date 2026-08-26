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
    Retorna la lista de bloques de 4 SEMANAS del practicante (Bloque 1: Sem 1-4, Bloque 2: Sem 5-8, etc.).
    Cada bloque de 4 semanas representa el período oficial para su respetiva Firma Digital (1 sola firma por bloque).
    Aplica la regla de bloques concluidos o en progreso según sus asistencias.
    """
    registros = db.query(Asistencia).filter(
        Asistencia.empleado_id == empleado_id,
        Asistencia.hora_entrada != None
    ).order_by(Asistencia.fecha.asc()).all()

    if not registros:
        return {"meses": [], "semanas": [], "consolidado": None}

    hoy = date.today()
    min_fecha = min(r.fecha for r in registros)
    max_fecha = max(r.fecha for r in registros)
    primer_lunes = min_fecha - timedelta(days=min_fecha.weekday())

    firmados_db = db.query(InformeFirmado).filter(InformeFirmado.empleado_id == empleado_id).all()

    resultado_bloques = []
    num_bloque = 1

    curr_lunes = primer_lunes
    while curr_lunes <= max_fecha or curr_lunes <= hoy:
        p_dia = curr_lunes
        u_dia = p_dia + timedelta(days=27)  # 4 semanas (28 días: Lunes semana 1 a Domingo semana 4)

        # Si el bloque ni siquiera ha comenzado en relación a hoy, salir
        if p_dia > hoy:
            break

        regs_bloque = [r for r in registros if p_dia <= r.fecha <= u_dia]
        horas_bloque = 0.0
        for reg in regs_bloque:
            if reg.fecha.weekday() < 5 and reg.hora_entrada and reg.hora_salida:
                dt_ent = reg.hora_entrada if isinstance(reg.hora_entrada, datetime) else datetime.combine(reg.fecha, reg.hora_entrada)
                dt_sal = reg.hora_salida if isinstance(reg.hora_salida, datetime) else datetime.combine(reg.fecha, reg.hora_salida)
                if dt_sal < dt_ent:
                    dt_sal += timedelta(days=1)
                segundos = (dt_sal - dt_ent).total_seconds()
                horas_dia = min(6.0, round(segundos / 3600.0, 1))
                horas_bloque += horas_dia

        informe_existente = None
        for f in firmados_db:
            if f.semana_inicio <= u_dia and f.semana_fin >= p_dia:
                informe_existente = f
                break

        sem_inicio_num = 4 * (num_bloque - 1) + 1
        sem_fin_num = 4 * num_bloque
        nombre_bloque_str = f"Mes {num_bloque} (Semanas {sem_inicio_num} a {sem_fin_num})"
        rango_str = f"{p_dia.strftime('%d/%m/%Y')} – {u_dia.strftime('%d/%m/%Y')}"

        item_bloque = {
            "numero_mes": num_bloque,
            "nombre_mes": nombre_bloque_str,
            "fecha_inicio": p_dia,
            "fecha_fin": u_dia,
            "rango_str": rango_str,
            "horas_mes": round(horas_bloque, 1),
            "firmado": informe_existente is not None,
            "informe_firmado_id": informe_existente.id if informe_existente else None,
            "fecha_firma": informe_existente.created_at if informe_existente else None,
            "nombre_archivo": informe_existente.nombre_archivo if informe_existente else None,
            # Alias de compatibilidad para el frontend
            "semana_inicio": p_dia,
            "semana_fin": u_dia,
            "numero_semana": num_bloque,
            "horas_semana": round(horas_bloque, 1),
        }
        resultado_bloques.append(item_bloque)

        curr_lunes += timedelta(weeks=4)
        num_bloque += 1

    total_horas_totales = sum(item["horas_mes"] for item in resultado_bloques)
    emp = db.query(Empleado).filter(Empleado.id == empleado_id).first()
    horas_meta_val = emp.horas_meta if (emp and emp.horas_meta) else 640

    return {
        "meses": resultado_bloques,
        "semanas": resultado_bloques,
        "consolidado": {
            "total_horas": round(total_horas_totales, 1),
            "horas_meta": horas_meta_val,
            "total_bloques": len(resultado_bloques)
        }
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


def eliminar_informe_firmado(db: Session, informe_id: int) -> bool:
    """
    Elimina el registro de informe firmado de la base de datos y borra el archivo físico asociado en disco.
    """
    informe = db.query(InformeFirmado).filter(InformeFirmado.id == informe_id).first()
    if not informe:
        return False

    if informe.archivo_path and os.path.exists(informe.archivo_path):
        try:
            os.remove(informe.archivo_path)
        except Exception as e:
            print(f"[WARN] Error al eliminar archivo físico de informe firmado ({informe.archivo_path}): {e}")

    db.delete(informe)
    db.commit()
    return True

