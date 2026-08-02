import io
import os
from datetime import date, datetime
from typing import List, Optional
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
    registros = get_asistencias_empleado_por_rango(db, empleado.id, fecha_inicio, fecha_fin)

    buffer = io.BytesIO()
    
    # Documento ajustado a los márgenes del membrete institucional
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=45,
        leftMargin=45,
        topMargin=105,   # Espacio reservado para el encabezado membretado
        bottomMargin=65   # Espacio reservado para el pie membretado
    )

    styles = getSampleStyleSheet()

    # Estilos de texto adaptados
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#1A365D"),
        alignment=1,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4A5568"),
        alignment=1,
        spaceAfter=14
    )

    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#2D3748")
    )

    elements = []

    # Encabezado del documento
    elements.append(Paragraph("SISTEMA DE ASISTENCIAS - REPORTE DE CONFORMIDAD DE PRÁCTICAS", title_style))
    elements.append(Paragraph("Oficina de Tecnologías de la Información &bull; Documento Oficial de Registro", subtitle_style))
    elements.append(Spacer(1, 6))

    # Tabla Metadatos
    meta_data = [
        [
            Paragraph(f"<b>Practicante:</b> {empleado.nombre}", meta_label),
            Paragraph(f"<b>DNI/Documento:</b> {empleado.documento}", meta_label)
        ],
        [
            Paragraph(f"<b>Departamento:</b> {empleado.departamento or 'OTI'}", meta_label),
            Paragraph(f"<b>Período Evaluado:</b> {fecha_inicio.strftime('%d/%m/%Y')} al {fecha_fin.strftime('%d/%m/%Y')}", meta_label)
        ],
        [
            Paragraph(f"<b>Emitido Por:</b> {usuario_generador.email}", meta_label),
            Paragraph(f"<b>Fecha de Emisión:</b> {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}", meta_label)
        ]
    ]

    t_meta = Table(meta_data, colWidths=[260, 260])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F7FAFC")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#EDF2F7")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(t_meta)
    elements.append(Spacer(1, 14))

    # Tabla de datos de asistencias
    table_data = [["N°", "Fecha", "Entrada", "Salida", "Origen Entrada", "Origen Salida", "Observaciones"]]

    for idx, reg in enumerate(registros, start=1):
        h_ent = reg.hora_entrada.strftime("%H:%M:%S") if reg.hora_entrada else "-"
        h_sal = reg.hora_salida.strftime("%H:%M:%S") if reg.hora_salida else "-"
        o_ent = (reg.origen_entrada or "auto").capitalize()
        o_sal = (reg.origen_salida or "-").capitalize()
        mot = reg.motivo or "-"
        table_data.append([
            str(idx),
            reg.fecha.strftime("%d/%m/%Y"),
            h_ent,
            h_sal,
            o_ent,
            o_sal,
            mot
        ])

    if len(registros) == 0:
        table_data.append(["-", "Sin asistencias registradas en este período", "-", "-", "-", "-", "-"])

    t_data = Table(table_data, colWidths=[25, 70, 65, 65, 90, 85, 120])
    t_data.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3484A5")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8.5),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    elements.append(t_data)

    elements.append(Spacer(1, 20))

    # Nota explicativa
    sig_text = Paragraph(
        "<b>NOTA:</b> Este informe ha sido generado por el Sistema de Asistencias OTI para ser firmado "
        "digitalmente de manera externa mediante el certificado oficial ONPE / Firma Perú.",
        ParagraphStyle('Note', parent=styles['Normal'], fontSize=8, textColor=colors.HexColor("#718096"), alignment=1)
    )
    elements.append(sig_text)

    # Callback para dibujar el membrete de fondo en cada página
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
