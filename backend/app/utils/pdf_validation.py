import io
import os
import asyncio
import concurrent.futures
from typing import Tuple, Optional, List
from pyhanko.pdf_utils.reader import PdfFileReader, PdfReadError
from pyhanko.sign import validation
from pyhanko.keys import load_certs_from_pemder
from pyhanko_certvalidator import ValidationContext
from asn1crypto import x509 as asn1_x509

from app.config import settings

# PENDIENTE: En ambiente de producción con DNIe/RENIEC/SGTD, configurar FIRMAPERU_TRUST_ROOTS_PATH
# apuntando al bundle .pem/.crt de la Entidad Certificadora Nacional.


async def _validar_sig_async(sig, vc):
    return await validation.async_validate_pdf_signature(sig, signer_validation_context=vc)


def validar_firma_digital_pdf(
    content_bytes: bytes,
    custom_trust_roots: Optional[List[asn1_x509.Certificate]] = None,
    custom_trust_path: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Verifica una Firma Digital PAdES / PKCS#7 en un PDF evaluando dos niveles distintos de garantía:

    NIVEL 1 — Integridad del Documento:
      Verifica que el hash del contenido coincida con la tabla /ByteRange y que la estructura CMS no esté corrupta.

    NIVEL 2 — Identidad del Firmante / Cadena de Confianza:
      Verifica si el certificado del firmante se deriva de las autoridades de certificación (CAs) oficiales.
      Requiere la configuración de FIRMAPERU_TRUST_ROOTS_PATH (o pasar custom_trust_roots).
      Si no se proporciona una cadena oficial (modo desarrollo), se valida únicamente la integridad.
      SI SE CONFIGURA UNA RUTA Y FALLA LA CARGA, EL SISTEMA FALLA CERRADO (RECHAZA LA FIRMA).

    Retorna: (es_valido: bool, mensaje_detalle: str)
    """
    if not content_bytes or len(content_bytes) < 100:
        return False, "El archivo proporcionado no es un PDF válido o está corrupto (tamaño muy pequeño)."

    if not content_bytes.startswith(b"%PDF"):
        return False, "El archivo subido no cuenta con la cabecera estándar de documento PDF (%PDF)."

    # Determinar si existen trust roots configuradas para validación de identidad estricta
    trust_roots = custom_trust_roots
    trust_path = custom_trust_path or settings.FIRMAPERU_TRUST_ROOTS_PATH or os.environ.get("FIRMAPERU_TRUST_ROOTS_PATH")

    if trust_roots is None and trust_path:
        if not os.path.exists(trust_path):
            return False, f"Error de configuración: El archivo de certificados raíz en '{trust_path}' no existe o la ruta es inválida."
        try:
            loaded = list(load_certs_from_pemder(trust_path))
            if not loaded:
                return False, f"Error de configuración: No se encontraron certificados válidos en el archivo '{trust_path}'."
            trust_roots = loaded
        except Exception as e:
            return False, f"Error crítico al cargar certificados de confianza desde '{trust_path}': {str(e)}"

    tiene_trust_roots_oficiales = trust_roots is not None and len(trust_roots) > 0

    try:
        reader = PdfFileReader(io.BytesIO(content_bytes))
        signatures = reader.embedded_signatures
        if not signatures:
            return False, "El documento PDF no contiene ninguna Firma Digital PAdES/PKCS#7 embebida."

        for sig in signatures:
            if tiene_trust_roots_oficiales:
                vc = ValidationContext(trust_roots=trust_roots, allow_fetching=False)
            else:
                certs = [sig.signer_cert] if getattr(sig, "signer_cert", None) else []
                vc = ValidationContext(trust_roots=certs, allow_fetching=False) if certs else ValidationContext(allow_fetching=False)

            # Ejecutar validación pyHanko de forma segura independientemente del contexto de hilos o event loop
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = None

            if loop and loop.is_running():
                with concurrent.futures.ThreadPoolExecutor() as pool:
                    status = pool.submit(lambda: asyncio.run(_validar_sig_async(sig, vc))).result()
            else:
                status = asyncio.run(_validar_sig_async(sig, vc))

            # --- NIVEL 1: Validación de Integridad ---
            if not status.intact:
                return False, "La firma digital está corrupta o la integridad del documento PDF ha sido alterada."

            # --- NIVEL 2: Validación de Cadena de Confianza ---
            if tiene_trust_roots_oficiales:
                if not status.trusted:
                    return False, f"La firma digital no pertenece a la cadena de confianza oficial configurada ({status.summary()})."
                return True, "Firma Digital PAdES/PKCS#7 validada con éxito (Integridad + Cadena de Confianza Oficial)."

        # Si no hay trust roots oficiales configuradas (modo desarrollo)
        return True, "Firma Digital PAdES/PKCS#7 con integridad verificada, pero NO validada contra cadena de confianza oficial (Modo Desarrollo: PENDIENTE FIRMAPERU_TRUST_ROOTS_PATH)."

    except PdfReadError as pre:
        return False, f"El documento PDF tiene una estructura malformada o inválida: {str(pre)}"
    except Exception as e:
        return False, f"Error al analizar el documento PDF: {str(e)}"
