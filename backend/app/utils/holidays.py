from datetime import date
from typing import Optional

FERIADOS_FIJOS = {
    (1, 1): "Año Nuevo",
    (5, 1): "Día del Trabajo",
    (6, 7): "Batalla de Arica y Día de la Bandera",
    (6, 29): "San Pedro y San Pablo",
    (7, 23): "Día de la Fuerza Aérea del Perú",
    (7, 28): "Fiestas Patrias",
    (7, 29): "Fiestas Patrias",
    (8, 6): "Batalla de Junín",
    (8, 30): "Santa Rosa de Lima",
    (10, 8): "Combate de Angamos",
    (11, 1): "Día de Todos los Santos",
    (12, 8): "Inmaculada Concepción",
    (12, 9): "Batalla de Ayacucho",
    (12, 25): "Navidad"
}

FERIADOS_VARIABLES = {
    date(2025, 4, 17): "Jueves Santo",
    date(2025, 4, 18): "Viernes Santo",
    date(2026, 4, 2): "Jueves Santo",
    date(2026, 4, 3): "Viernes Santo",
    date(2027, 3, 25): "Jueves Santo",
    date(2027, 3, 26): "Viernes Santo",
}


def obtener_nombre_feriado(dt: date) -> Optional[str]:
    """
    Retorna el nombre del feriado nacional para una fecha dada, o None si es un día laborable regular.
    """
    if dt in FERIADOS_VARIABLES:
        return FERIADOS_VARIABLES[dt]
    key = (dt.month, dt.day)
    return FERIADOS_FIJOS.get(key)
