import io
import os
from datetime import date, datetime, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session

from app.models.empleado import Empleado
from app.models.usuario import Usuario
from app.crud.crud_asistencia import get_asistencias_empleado_por_rango

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Ruta de la imagen del membrete institucional
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEMBRETE_PATH = os.path.join(BASE_DIR, "..", "assets", "membrete.jpg")

DIAS_ESPANOL = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']


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
    con diagramación simétrica, alineación corporativa y membrete institucional.
    """
    registros = get_asistencias_empleado_por_rango(db, empleado.id, fecha_inicio, fecha_fin)

    buffer = io.BytesIO()
    # Ancho total imprimible = 612 - (40 + 40) = 532 pt
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=110,
        bottomMargin=45
    )

    styles = getSampleStyleSheet()

    # Estilos de título y texto
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        textColor=colors.HexColor("#3484A5"),  # Azul Institucional
        alignment=1,  # Centrado
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#475569"),
        alignment=1,  # Centrado
        spaceAfter=10
    )

    meta_label_left = ParagraphStyle(
        'MetaLabelLeft',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B"),
        alignment=0  # Izquierda
    )

    meta_label_right_val = ParagraphStyle(
        'MetaLabelRightVal',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B"),
        alignment=2  # Derecha
    )

    semana_title_style = ParagraphStyle(
        'SemanaTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10.5,
        textColor=colors.HexColor("#3484A5"),
        spaceBefore=3,
        spaceAfter=2
    )

    consolidado_title_style = ParagraphStyle(
        'ConsolidadoTitle',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=10.5,
        textColor=colors.HexColor("#3484A5"),
        spaceBefore=5,
        spaceAfter=3
    )

    elements = []

    # 1. Encabezado del documento
    doc_titulo = "INFORME MENSUAL DE ASISTENCIA Y CONTROL DE PRÁCTICAS PRE-PROFESIONALES"
    
    elements.append(Paragraph(doc_titulo, title_style))
    elements.append(Paragraph("Oficina de Tecnologías de la Información &bull; Control de Asistencia y Firma Digital", subtitle_style))
    elements.append(Spacer(1, 2))

    # 2. Ficha de Metadatos del Practicante/Empleado (Ancho Total: 532 pt = 296 + 236)
    meta_data = [
        [
            Paragraph(f"<b>Practicante / Empleado:</b> {empleado.nombre}", meta_label_left),
            Paragraph(f"<b>DNI / Documento:</b> {empleado.documento}", meta_label_left)
        ],
        [
            Paragraph(f"<b>Departamento / Área:</b> {empleado.departamento or 'OTI'}", meta_label_left),
            Paragraph(f"<b>Período Solicitado:</b> {fecha_inicio.strftime('%d/%m/%Y')} – {fecha_fin.strftime('%d/%m/%Y')}", meta_label_left)
        ],
        [
            Paragraph(f"<b>Emitido por:</b> {usuario_generador.email}", meta_label_left),
            Paragraph(f"<b>Meta de Horas:</b> {f'{empleado.horas_meta} hrs' if empleado.horas_meta else 'No definida'}", meta_label_left)
        ]
    ]

    t_meta = Table(meta_data, colWidths=[296, 236])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(t_meta)
    elements.append(Spacer(1, 5))

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
        no_rec_style = ParagraphStyle(
            'NoRecords',
            parent=styles['Normal'],
            fontName='Helvetica-Oblique',
            fontSize=8.5,
            textColor=colors.HexColor("#64748B"),
            alignment=1
        )
        elements.append(Spacer(1, 10))
        elements.append(Paragraph(f"Sin registros de asistencia en el período seleccionado ({fecha_inicio.strftime('%d/%m/%Y')} – {fecha_fin.strftime('%d/%m/%Y')}).", no_rec_style))
        elements.append(Spacer(1, 15))
    else:
        semanas_ordenadas = sorted(semanas_dict.keys(), key=lambda x: x[0])
        total_semanas = len(semanas_ordenadas)

        for num_semana, (lunes, domingo) in enumerate(semanas_ordenadas, start=1):
            list_regs = semanas_dict[(lunes, domingo)]

            rango_semana_str = f"{lunes.strftime('%d/%m/%Y')} – {domingo.strftime('%d/%m/%Y')}"
            p_semana_title = Paragraph(f"<b>Semana {num_semana}</b> ({rango_semana_str})", semana_title_style)

            # Mapear los registros por fecha para ubicar las asistencias registradas
            regs_by_date = {reg.fecha: reg for reg in list_regs}

            # Construir siempre los 5 días hábiles oficiales de la semana (Lunes a Viernes)
            dias_semana = [lunes + timedelta(days=i) for i in range(5)]
            for reg in list_regs:
                if reg.fecha.weekday() >= 5 and reg.fecha not in dias_semana:
                    dias_semana.append(reg.fecha)
            dias_semana.sort()

            # Tabla de días de la semana (Ancho Total: 532 pt = 115 + 80 + 80 + 75 + 182)
            table_data = [["Día / Fecha", "Hora Entrada", "Hora Salida", "Horas", "Firma y Sello"]]
            total_semana_horas = 0.0

            for dia_fecha in dias_semana:
                nom_dia = DIAS_ESPANOL[dia_fecha.weekday()]
                fecha_str = f"{nom_dia} {dia_fecha.strftime('%d/%m/%Y')}"

                reg = regs_by_date.get(dia_fecha)

                # REGLA INSTITUCIONAL: Los fines de semana (Sábado/Domingo) siempre computan 0.0 hrs
                es_fin_de_semana = dia_fecha.weekday() >= 5

                if reg and reg.hora_entrada and reg.hora_salida and not es_fin_de_semana:
                    h_ent = reg.hora_entrada.strftime("%H:%M")
                    h_sal = reg.hora_salida.strftime("%H:%M")

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
                    horas_reales = round(segundos / 3600.0, 1)
                    # Regla oficial de practicantes: tope máximo de 6.0 horas computables por día
                    MAX_HORAS_DIARIAS_PRACTICANTE = 6.0
                    horas_dia = min(MAX_HORAS_DIARIAS_PRACTICANTE, horas_reales)
                    horas_str = f"{horas_dia:.1f}"
                    total_semana_horas += horas_dia
                elif reg and (reg.hora_entrada or reg.hora_salida) and not es_fin_de_semana:
                    h_ent = reg.hora_entrada.strftime("%H:%M") if reg.hora_entrada else "--:--"
                    h_sal = reg.hora_salida.strftime("%H:%M") if reg.hora_salida else "--:--"
                    horas_str = "0.0"
                else:
                    h_ent = reg.hora_entrada.strftime("%H:%M") if (reg and reg.hora_entrada) else "--:--"
                    h_sal = reg.hora_salida.strftime("%H:%M") if (reg and reg.hora_salida) else "--:--"
                    horas_str = "0.0"

                table_data.append([
                    fecha_str,
                    h_ent,
                    h_sal,
                    horas_str,
                    ""
                ])

            total_semana_horas = round(total_semana_horas, 1)
            total_consolidado_horas += total_semana_horas

            table_data.append([
                "Total semanal",
                "",
                "",
                f"{total_semana_horas:.1f}",
                ""
            ])

            t_semana = Table(table_data, colWidths=[115, 80, 80, 75, 182])

            ts = [
                # Encabezado
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3484A5")),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 7.5),
                ('ALIGN', (0, 0), (0, 0), 'LEFT'),
                ('ALIGN', (1, 0), (4, 0), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('TOPPADDING', (0, 0), (-1, -1), 2.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 2.5),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ('ROWBACKGROUNDS', (0, 1), (-1, -2), [colors.white, colors.HexColor("#F8FAFC")]),
                
                # Alineación de datos
                ('ALIGN', (0, 1), (0, -2), 'LEFT'),
                ('ALIGN', (1, 1), (2, -2), 'CENTER'),
                ('ALIGN', (3, 1), (3, -2), 'RIGHT'),

                # Bloque sólido unificado para la columna 'Firma y Sello' (sin rayas internas)
                ('SPAN', (4, 1), (4, -2)),
                ('BACKGROUND', (4, 1), (4, -2), colors.white),

                # Fila final Total Semanal (Verde Institucional sutil)
                ('SPAN', (0, -1), (2, -1)),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('FONTSIZE', (0, -1), (-1, -1), 7.5),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#E6F7F4")),
                ('TEXTCOLOR', (0, -1), (-1, -1), colors.HexColor("#1A5C50")),
                ('ALIGN', (0, -1), (0, -1), 'RIGHT'),
                ('ALIGN', (3, -1), (3, -1), 'RIGHT'),
                ('RIGHTPADDING', (0, -1), (0, -1), 10),
                ('RIGHTPADDING', (3, -1), (3, -1), 8),
            ]
            t_semana.setStyle(TableStyle(ts))
            
            # Envolver cada semana en KeepTogether para evitar desfasamiento / corte a la mitad
            bloque_semana = KeepTogether([
                p_semana_title,
                t_semana,
                Spacer(1, 3)
            ])
            elements.append(bloque_semana)

            # Salto a la 2da Hoja al iniciar Semana 4 debido a los datos de cabecera en Hoja 1
            if num_semana == 3 and total_semanas > 3:
                elements.append(PageBreak())
            elif num_semana > 3 and (num_semana - 3) % 4 == 0 and num_semana < total_semanas:
                elements.append(PageBreak())

    total_consolidado_horas = round(total_consolidado_horas, 1)

    # 4. Sección Consolidado Final (Ancho Total: 532 pt = 340 + 192) y Signaturas agrupadas
    consolidado_elements = []

    meta_alcanzada = empleado.horas_meta is not None and total_consolidado_horas >= float(empleado.horas_meta)
    
    if meta_alcanzada:
        cons_titulo = "<b>RESUMEN MENSUAL Y CONTROL FINAL DE PRÁCTICAS (META COMPLETADA)</b>"
    else:
        cons_titulo = "<b>RESUMEN Y CONTROL MENSUAL DE ASISTENCIAS (EN CURSO - FIRMA MENSUAL)</b>"

    consolidado_elements.append(Paragraph(cons_titulo, consolidado_title_style))

    consolidado_rows = [
        [
            Paragraph("<b>Total de horas acumuladas en el período:</b>", meta_label_left),
            Paragraph(f"<b>{total_consolidado_horas:.1f} horas</b>", meta_label_right_val)
        ]
    ]

    if empleado.horas_meta is not None:
        restantes = max(0.0, round(float(empleado.horas_meta) - total_consolidado_horas, 1))
        consolidado_rows.append([
            Paragraph("<b>Meta total de horas requeridas:</b>", meta_label_left),
            Paragraph(f"<b>{empleado.horas_meta} horas</b>", meta_label_right_val)
        ])
        
        estado_meta_str = "<b>META DE HORAS COMPLETADA</b>" if meta_alcanzada else f"<b>{restantes:.1f} horas restantes</b>"
        consolidado_rows.append([
            Paragraph("<b>Estado / Horas restantes:</b>", meta_label_left),
            Paragraph(estado_meta_str, meta_label_right_val)
        ])

    t_cons = Table(consolidado_rows, colWidths=[340, 192])
    t_cons_style = [
        ('BACKGROUND', (0, 0), (-1, -2), colors.HexColor("#F8FAFC")),
        ('BOX', (0, 0), (-1, -1), 0.75, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]
    if len(consolidado_rows) > 1:
        # Fila final de horas restantes destacada con tono Dorado/Ámbar institucional
        t_cons_style.append(('BACKGROUND', (0, -1), (-1, -1), colors.HexColor("#FEF3C7")))
    
    t_cons.setStyle(TableStyle(t_cons_style))
    consolidado_elements.append(t_cons)
    consolidado_elements.append(Spacer(1, 6))

    # 5. Espacio limpio para Firma Digital (sin líneas de guiones ni textos)
    consolidado_elements.append(Spacer(1, 25))

    # Nota explicativa final
    sig_text = Paragraph(
        "<b>NOTA:</b> El presente informe es un documento impreso/digital oficial de asistencia. "
        "Está diseñado para ser firmado mensualmente mediante firma digital o física.",
        ParagraphStyle('Note', parent=styles['Normal'], fontName='Helvetica-Oblique', fontSize=7.5, leading=9.5, textColor=colors.HexColor("#64748B"), alignment=1)
    )
    consolidado_elements.append(sig_text)

    # Mantener juntos el Consolidado y los recuadros de firma para evitar desfasamiento
    elements.append(KeepTogether(consolidado_elements))

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
