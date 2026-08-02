import io
import os
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.informe_practicante import InformePracticante
from app.models.empleado import Empleado
from app.models.usuario import Usuario
from app.crud.crud_asistencia import get_asistencias_empleado_por_rango

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Ruta de la imagen del membrete institucional
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEMBRETE_PATH = os.path.join(BASE_DIR, "..", "assets", "membrete.jpg")

DIAS_ESPANOL = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']


def crear_informe_registro(
    db: Session,
    empleado_id: int,
    fecha_inicio: date,
    fecha_fin: date,
    generado_por_id: int
) -> InformePracticante:
    informe = InformePracticante(
        empleado_id=empleado_id,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin,
        generado_por_id=generado_por_id,
        estado="generado"
    )
    db.add(informe)
    db.commit()
    db.refresh(informe)
    return informe


def obtener_informes_historial(
    db: Session,
    empleado_id: Optional[int] = None,
    estado: Optional[str] = None
) -> List[InformePracticante]:
    query = db.query(InformePracticante)
    if empleado_id:
        query = query.filter(InformePracticante.empleado_id == empleado_id)
    if estado:
        query = query.filter(InformePracticante.estado == estado)
    return query.order_by(InformePracticante.fecha_generacion.desc()).all()


def aprobar_informe_registro(
    db: Session,
    informe_id: int,
    aprobado_por_id: int
) -> InformePracticante:
    informe = db.query(InformePracticante).filter(InformePracticante.id == informe_id).first()
    if not informe:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="El informe especificado no existe"
        )
    if informe.estado == "aprobado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El informe ya fue aprobado previamente"
        )

    informe.estado = "aprobado"
    informe.aprobado_por_id = aprobado_por_id
    informe.fecha_aprobacion = datetime.now()

    db.commit()
    db.refresh(informe)
    return informe


def generar_pdf_informe_asistencias(
    db: Session,
    empleado: Empleado,
    fecha_inicio: date,
    fecha_fin: date,
    usuario_generador: Usuario
) -> bytes:
    """
    Función legada/general para informe continuo de asistencias.
    """
    return generar_pdf_informe_semanal_practicante(db, empleado, fecha_inicio, fecha_fin, usuario_generador)


def generar_pdf_informe_semanal_practicante(
    db: Session,
    empleado: Empleado,
    fecha_inicio: date,
    fecha_fin: date,
    usuario_generador: Usuario
) -> bytes:
    """
    Genera el informe de prácticas de asistencias agrupado por semanas calendario (lunes-domingo),
    incluyendo la columna 'Firma' para firma física externa y consolidado de horas meta.
    """
    registros = get_asistencias_empleado_por_rango(db, empleado.id, fecha_inicio, fecha_fin)

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=100,
        bottomMargin=60
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=14,
        leading=17,
        textColor=colors.HexColor("#1A365D"),
        alignment=1,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"),
        alignment=1,
        spaceAfter=12
    )

    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#2D3748")
    )

    semana_title_style = ParagraphStyle(
        'SemanaTitle',
        parent=styles['Heading2'],
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#3484A5"),
        spaceBefore=8,
        spaceAfter=4
    )

    elements = []

    # 1. Encabezado del documento
    elements.append(Paragraph("INFORME DE ASISTENCIA Y CONTROL DE PRÁCTICAS PRE-PROFESIONALES", title_style))
    elements.append(Paragraph("Oficina de Tecnologías de la Información &bull; Control de Asistencia Semanal", subtitle_style))
    elements.append(Spacer(1, 4))

    # 2. Ficha de Metadatos del Practicante/Empleado
    meta_data = [
        [
            Paragraph(f"<b>Practicante / Empleado:</b> {empleado.nombre}", meta_label),
            Paragraph(f"<b>DNI / Documento:</b> {empleado.documento}", meta_label)
        ],
        [
            Paragraph(f"<b>Departamento / Área:</b> {empleado.departamento or 'OTI'}", meta_label),
            Paragraph(f"<b>Período Solicitado:</b> {fecha_inicio.strftime('%d/%m/%Y')} – {fecha_fin.strftime('%d/%m/%Y')}", meta_label)
        ],
        [
            Paragraph(f"<b>Emitido por:</b> {usuario_generador.email}", meta_label),
            Paragraph(f"<b>Meta de Horas:</b> {f'{empleado.horas_meta} hrs' if empleado.horas_meta else 'No definida'}", meta_label)
        ]
    ]

    t_meta = Table(meta_data, colWidths=[265, 265])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F7FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_meta)
    elements.append(Spacer(1, 10))

    # 3. Agrupar asistencias por semanas calendario (lunes-domingo)
    semanas_dict: Dict[tuple, List] = {}

    for reg in registros:
        lunes = reg.fecha - timedelta(days=reg.fecha.weekday())
        domingo = lunes + timedelta(days=6)
        clave_semana = (lunes, domingo)
        if clave_semana not in semanas_dict:
            semanas_dict[clave_semana] = []
        semanas_dict[clave_semana].append(reg)

    total_consolidado_horas = 0.0

    if not semanas_dict:
        # Caso sin registros en el rango de fechas
        no_rec_style = ParagraphStyle(
            'NoRecords',
            parent=styles['Normal'],
            fontSize=9,
            textColor=colors.HexColor("#718096"),
            alignment=1
        )
        elements.append(Spacer(1, 15))
        elements.append(Paragraph(f"<i>Sin registros de asistencia en el período seleccionado ({fecha_inicio.strftime('%d/%m/%Y')} – {fecha_fin.strftime('%d/%m/%Y')}).</i>", no_rec_style))
        elements.append(Spacer(1, 20))
    else:
        # Ordenar semanas cronológicamente
        semanas_ordenadas = sorted(semanas_dict.keys(), key=lambda x: x[0])

        for num_semana, (lunes, domingo) in enumerate(semanas_ordenadas, start=1):
            list_regs = semanas_dict[(lunes, domingo)]

            # Título de la Semana
            rango_semana_str = f"{lunes.strftime('%d/%m/%Y')} – {domingo.strftime('%d/%m/%Y')}"
            elements.append(Paragraph(f"<b>Semana {num_semana}</b> ({rango_semana_str})", semana_title_style))

            # Tabla de días de la semana
            table_data = [["Día / Fecha", "Hora Entrada", "Hora Salida", "Horas", "Firma"]]
            total_semana_horas = 0.0

            for reg in list_regs:
                nom_dia = DIAS_ESPANOL[reg.fecha.weekday()]
                fecha_str = f"{nom_dia} {reg.fecha.strftime('%d/%m/%Y')}"
                h_ent = reg.hora_entrada.strftime("%H:%M") if reg.hora_entrada else "-"
                h_sal = reg.hora_salida.strftime("%H:%M") if reg.hora_salida else "-"

                # Cálculo de horas trabajadas en el día
                if reg.hora_entrada and reg.hora_salida:
                    if isinstance(reg.hora_entrada, datetime):
                        dt_ent = reg.hora_entrada
                    else:
                        dt_ent = datetime.combine(reg.fecha, reg.hora_entrada)

                    if isinstance(reg.hora_salida, datetime):
                        dt_sal = reg.hora_salida
                    else:
                        dt_sal = datetime.combine(reg.fecha, reg.hora_salida)

                    if dt_sal < dt_ent:
                        dt_sal += timedelta(days=1)

                    segundos = (dt_sal - dt_ent).total_seconds()
                    horas_dia = round(segundos / 3600.0, 1)
                    horas_str = f"{horas_dia:.1f}"
                    total_semana_horas += horas_dia
                else:
                    horas_str = "-"

                table_data.append([
                    fecha_str,
                    h_ent,
                    h_sal,
                    horas_str,
                    ""  # Celda vacía con altura suficiente para Firma física
                ])

            # Fila de Total Semanal
            total_semana_horas = round(total_semana_horas, 1)
            total_consolidado_horas += total_semana_horas

            table_data.append([
                "Total semanal",
                "",
                "",
                f"{total_semana_horas:.1f}",
                ""
            ])

            # Crear tabla de la semana con estilo institucional
            t_semana = Table(table_data, colWidths=[110, 85, 85, 75, 175])
            
            # Estilos de celda
            ts = [
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3484A5")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8.5),
                ('ALIGN', (0, 0), (3, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -2), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -2), 6),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#F8FAFC")]),
                
                # Fila final Total Semanal
                ('SPAN', (0, -1), (2, -1)),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 8.5),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E6FFFA")),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor("#234E52")),
                ('ALIGN', (0, -1), (0, -1), 'RIGHT'),
                ('RIGHTPADDING', (0, -1), (0, -1), 10),
            ]
            t_semana.setStyle(TableStyle(ts))
            elements.append(t_semana)
            elements.append(Spacer(1, 8))

    total_consolidado_horas = round(total_consolidado_horas, 1)

    # 4. Sección Consolidado Final
    elements.append(Spacer(1, 6))
    consolidado_title_style = ParagraphStyle(
        'ConsolidadoTitle',
        parent=styles['Heading2'],
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#1A365D"),
        spaceBefore=6,
        spaceAfter=4
    )
    elements.append(Paragraph("<b>CONSOLIDADO DE PRÁCTICAS / ASISTENCIA</b>", consolidado_title_style))

    consolidado_rows = [
        [
            Paragraph("<b>Total de horas acumuladas en el período:</b>", meta_label),
            Paragraph(f"<b>{total_consolidado_horas:.1f} horas</b>", meta_label)
        ]
    ]

    if empleado.horas_meta is not None:
        restantes = max(0.0, round(float(empleado.horas_meta) - total_consolidado_horas, 1))
        consolidado_rows.append([
            Paragraph("<b>Meta total de horas requeridas:</b>", meta_label),
            Paragraph(f"{empleado.horas_meta} horas", meta_label)
        ])
        consolidado_rows.append([
            Paragraph("<b>Horas restantes para completar la meta:</b>", meta_label),
            Paragraph(f"<b>{restantes:.1f} horas</b>", meta_label)
        ])

    t_cons = Table(consolidado_rows, colWidths=[330, 200])
    t_cons.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#EDF2F7")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_cons)
    elements.append(Spacer(1, 14))

    # Nota explicativa final
    sig_text = Paragraph(
        "<b>NOTA:</b> El presente informe es un documento impreso oficial de asistencia. "
        "La columna 'Firma' está destinada para la firma física del responsable.",
        ParagraphStyle('Note', parent=styles['Normal'], fontSize=7.5, textColor=colors.HexColor("#718096"), alignment=1)
    )
    elements.append(sig_text)

    # Callback para dibujar la hoja membretada en cada página
    def draw_background(canvas, doc_page):
        canvas.saveState()
        if os.path.exists(MEMBRETE_PATH):
            canvas.drawImage(
                MEMBRETE_PATH,
                0,
                0,
                width=doc_page.pagesize[0],
                height=doc_page.pagesize[1]
            )
        canvas.restoreState()

    doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)
    buffer.seek(0)
    return buffer.getvalue()
