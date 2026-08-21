from datetime import date
from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.auditoria_asistencia import AuditoriaAsistencia
from app.models.empleado import Empleado
from app.models.usuario import Usuario
from app.schemas.auditoria import AuditoriaAsistenciaItem


def crear_registro_auditoria(
    db: Session,
    empleado_id: int,
    fecha_asistencia: date,
    accion: str,
    usuario: Optional[Usuario] = None,
    asistencia_id: Optional[int] = None,
    valores_anteriores: Optional[str] = None,
    valores_nuevos: Optional[str] = None,
    motivo: Optional[str] = None
) -> AuditoriaAsistencia:
    usuario_id = usuario.id if usuario else None
    usuario_email = usuario.email if usuario else "Sistema"

    auditoria = AuditoriaAsistencia(
        asistencia_id=asistencia_id,
        empleado_id=empleado_id,
        usuario_id=usuario_id,
        usuario_email=usuario_email,
        accion=accion,
        fecha_asistencia=fecha_asistencia,
        valores_anteriores=valores_anteriores,
        valores_nuevos=valores_nuevos,
        motivo=motivo
    )
    db.add(auditoria)
    return auditoria


def get_auditorias_asistencia(
    db: Session,
    skip: int = 0,
    limit: int = 200,
    fecha_inicio: Optional[date] = None,
    fecha_fin: Optional[date] = None,
    empleado_id: Optional[int] = None
) -> List[AuditoriaAsistenciaItem]:
    query = db.query(AuditoriaAsistencia).outerjoin(Empleado, AuditoriaAsistencia.empleado_id == Empleado.id)


    if fecha_inicio:
        query = query.filter(AuditoriaAsistencia.fecha_asistencia >= fecha_inicio)
    if fecha_fin:
        query = query.filter(AuditoriaAsistencia.fecha_asistencia <= fecha_fin)
    if empleado_id:
        query = query.filter(AuditoriaAsistencia.empleado_id == empleado_id)

    records = query.order_by(AuditoriaAsistencia.created_at.desc()).offset(skip).limit(limit).all()

    resultado = []
    for r in records:
        f_asistencia_str = r.fecha_asistencia.strftime("%Y-%m-%d") if r.fecha_asistencia else ""
        c_at_str = r.created_at.strftime("%Y-%m-%d %H:%M:%S") if r.created_at else ""

        resultado.append(
            AuditoriaAsistenciaItem(
                id=r.id,
                asistencia_id=r.asistencia_id,
                empleado_id=r.empleado_id,
                empleado_nombre=r.empleado.nombre if r.empleado else "Desconocido",
                usuario_id=r.usuario_id,
                usuario_email=r.usuario_email,
                accion=r.accion,
                fecha_asistencia=f_asistencia_str,
                valores_anteriores=r.valores_anteriores,
                valores_nuevos=r.valores_nuevos,
                motivo=r.motivo,
                created_at=c_at_str
            )
        )

    return resultado
