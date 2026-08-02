from typing import Optional

OUI_DATABASE = {
    "04:10:6B": "Xiaomi Communications Co Ltd",
    "64:09:80": "Xiaomi Communications Co Ltd",
    "9C:99:A0": "Xiaomi Communications Co Ltd",
    "CC:00:F1": "Sagemcom Broadband SAS",
    "68:58:A0": "Apple, Inc.",
    "00:1C:42": "Parallels International GmbH",
    "00:50:56": "VMware, Inc.",
    "08:00:27": "Oracle Corporation",
    "52:54:00": "QEMU Virtual NIC",
    "BC:D1:D3": "Samsung Electronics Co., Ltd",
    "A4:C4:94": "Intel Corporate",
    "B8:27:EB": "Raspberry Pi Foundation",
    "DC:A6:32": "Raspberry Pi Trading Ltd",
    "E4:5F:01": "Raspberry Pi Trading Ltd",
    "00:11:22": "Cisco Systems, Inc",
    "FC:EC:DA": "Ubiquiti Inc.",
    "50:C7:BF": "TP-Link Corporation Limited"
}


def lookup_mac_vendor(mac: str) -> Optional[str]:
    """
    Retorna el nombre del fabricante basado en los primeros 3 octetos (OUI) de la dirección MAC.
    Retorna 'Desconocido' si no se encuentra en el diccionario de OUIs.
    """
    if not mac:
        return "Desconocido"

    # Limpiar y normalizar formato a XX:XX:XX
    mac_clean = mac.strip().upper().replace("-", ":").replace(".", "")
    parts = mac_clean.split(":")

    if len(parts) >= 3:
        oui = f"{parts[0]}:{parts[1]}:{parts[2]}"
        return OUI_DATABASE.get(oui, "Desconocido")

    # Si venía sin delimitadores ej "04106B9AD94C"
    if len(mac_clean) >= 6:
        oui = f"{mac_clean[0:2]}:{mac_clean[2:4]}:{mac_clean[4:6]}"
        return OUI_DATABASE.get(oui, "Desconocido")

    return "Desconocido"
