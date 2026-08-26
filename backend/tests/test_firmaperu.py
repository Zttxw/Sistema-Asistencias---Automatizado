import sys
import os
import io
import json
import base64
import unittest
import unittest.mock
from datetime import date, datetime, timedelta, timezone

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID

from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
from pyhanko.pdf_utils.reader import PdfFileReader
from pyhanko.sign import fields, signers, validation
from pyhanko_certvalidator.registry import SimpleCertificateStore
from asn1crypto import keys, x509 as asn1_x509
from reportlab.pdfgen import canvas

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app.database
from app.database import Base, get_db
from app.config import settings
from app.core.database_seed import seed_initial_data
from app.models.empleado import Empleado
from app.models.usuario import Usuario
from app.models.rol import Rol
from app.models.firma_token import FirmaToken
from app.models.informe_firmado import InformeFirmado
from app.utils.pdf_validation import validar_firma_digital_pdf
from app.core.security import create_access_token

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
app.database.engine = engine

from app.main import app


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def generar_pdf_firmado_mock_pyhanko() -> bytes:
    """
    Genera en memoria un documento PDF válido firmado digitalmente con PAdES/PKCS#7
    usando pyHanko y cryptography para pruebas automáticas.
    """
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Test Signer PAdES")])
    cert = x509.CertificateBuilder().subject_name(subject).issuer_name(issuer).public_key(key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc)).not_valid_after(datetime.now(timezone.utc) + timedelta(days=1)).sign(key, hashes.SHA256())

    key_der = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    cert_der = cert.public_bytes(serialization.Encoding.DER)
    asn_key = keys.PrivateKeyInfo.load(key_der)
    asn_cert = asn1_x509.Certificate.load(cert_der)

    store = SimpleCertificateStore.from_certs([asn_cert])
    signer = signers.SimpleSigner(signing_cert=asn_cert, signing_key=asn_key, cert_registry=store)

    buf = io.BytesIO()
    c = canvas.Canvas(buf)
    c.drawString(100, 100, "Documento de Prueba Firmado PAdES pyHanko")
    c.save()
    pdf_bytes = buf.getvalue()

    w = IncrementalPdfFileWriter(io.BytesIO(pdf_bytes))
    fields.append_signature_field(w, sig_field_spec=fields.SigFieldSpec(sig_field_name="Sig1"))
    out = io.BytesIO()
    signers.sign_pdf(w, signers.PdfSignatureMetadata(field_name="Sig1"), signer=signer, output=out)
    return out.getvalue()


class TestFirmaPeruIntegration(unittest.TestCase):

    def setUp(self):
        self.patcher = unittest.mock.patch('app.routers.firmaperu.obtener_jwt_firmaperu', return_value='TEST_JWT_TOKEN_PCM_123')
        self.mock_jwt = self.patcher.start()

        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()

        self.client = TestClient(app)

        # Login como Admin / Ingeniero
        res_login = self.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        self.assertEqual(res_login.status_code, 200)
        self.admin_token = res_login.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

        # Crear Empleado A
        res_emp_a = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Practicante A",
            "documento": "11112222",
            "mac": "11:22:33:44:55:66",
            "departamento": "OTI",
            "horas_meta": 640
        })
        self.assertEqual(res_emp_a.status_code, 201)
        self.empleado_a_id = res_emp_a.json()["id"]

        # Crear Empleado B
        res_emp_b = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Practicante B",
            "documento": "33334444",
            "mac": "AA:BB:CC:DD:EE:FF",
            "departamento": "OTI",
            "horas_meta": 640
        })
        self.assertEqual(res_emp_b.status_code, 201)
        self.empleado_b_id = res_emp_b.json()["id"]

    def tearDown(self):
        self.patcher.stop()
        Base.metadata.drop_all(bind=engine)

    def test_utilidad_pdf_validation_con_pyhanko(self):
        # 1. Documento simple -> Falso
        es_val, msg = validar_firma_digital_pdf(b"No es un PDF")
        self.assertFalse(es_val)

        # 2. PDF preliminar sin firma -> Falso
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 100, "PDF preliminar sin firma")
        c.save()
        pdf_sin_firma = buf.getvalue()

        es_val_pdf, msg_pdf = validar_firma_digital_pdf(pdf_sin_firma)
        self.assertFalse(es_val_pdf)
        self.assertIn("Firma Digital", msg_pdf)

        # 3. PDF falso con substrings de texto insertados a mano -> Rechazado por pyHanko
        fake_pdf = b"%PDF-1.5 \n /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [0 10 20 30] /Contents <" + b"A" * 300 + b"> \n %%EOF"
        es_val_fake, msg_fake = validar_firma_digital_pdf(fake_pdf)
        self.assertFalse(es_val_fake)

        # 4. PDF real firmado con pyHanko PAdES -> Válido en integridad (Advierte modo desarrollo)
        pdf_firmado_real = generar_pdf_firmado_mock_pyhanko()
        es_val_firmado, msg_firmado = validar_firma_digital_pdf(pdf_firmado_real)
        self.assertTrue(es_val_firmado)
        self.assertIn("NO validada contra cadena de confianza oficial", msg_firmado)

    def test_cadena_confianza_ca_no_reconocida_falla(self):
        """
        Prueba que cuando se configuran Trust Roots oficial (CA de prueba fija),
        un certificado no emitido por dicha CA es rechazado por la cadena de confianza (Nivel 2).
        """
        ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        ca_subj = ca_iss = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "CA Oficial Falsa PCM")])
        ca_cert = x509.CertificateBuilder().subject_name(ca_subj).issuer_name(ca_iss).public_key(ca_key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc)).not_valid_after(datetime.now(timezone.utc) + timedelta(days=365)).sign(ca_key, hashes.SHA256())
        ca_asn_cert = asn1_x509.Certificate.load(ca_cert.public_bytes(serialization.Encoding.DER))

        pdf_firmado_untrusted = generar_pdf_firmado_mock_pyhanko()

        es_val, msg = validar_firma_digital_pdf(pdf_firmado_untrusted, custom_trust_roots=[ca_asn_cert])
        self.assertFalse(es_val)
        self.assertIn("cadena de confianza oficial", msg)

    def test_cadena_confianza_ca_coincidente_exito(self):
        """
        Prueba el camino positivo (Nivel 2): Cuando el certificado del firmante SI fue emitido
        por la CA de confianza configurada, la validación de pyHanko retorna True (trusted=True).
        """
        # 1. Crear CA de prueba oficial con extensiones X.509 apropiadas
        ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        ca_name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Root CA PCM Test")])
        ca_cert = x509.CertificateBuilder().subject_name(ca_name).issuer_name(ca_name).public_key(ca_key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc)).not_valid_after(datetime.now(timezone.utc) + timedelta(days=365)).add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True).add_extension(x509.KeyUsage(digital_signature=True, key_cert_sign=True, crl_sign=True, content_commitment=True, key_encipherment=False, data_encipherment=False, key_agreement=False, encipher_only=False, decipher_only=False), critical=True).sign(ca_key, hashes.SHA256())
        ca_asn_cert = asn1_x509.Certificate.load(ca_cert.public_bytes(serialization.Encoding.DER))

        # 2. Crear Certificado de Firmante EMITIDO por la CA de prueba oficial
        signer_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        signer_subj = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Ingeniero Firmante PCM")])
        signer_cert = x509.CertificateBuilder().subject_name(signer_subj).issuer_name(ca_name).public_key(signer_key.public_key()).serial_number(x509.random_serial_number()).not_valid_before(datetime.now(timezone.utc)).not_valid_after(datetime.now(timezone.utc) + timedelta(days=30)).add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True).add_extension(x509.KeyUsage(digital_signature=True, content_commitment=True, key_encipherment=False, data_encipherment=False, key_agreement=False, key_cert_sign=False, crl_sign=False, encipher_only=False, decipher_only=False), critical=True).sign(ca_key, hashes.SHA256())

        signer_asn_key = keys.PrivateKeyInfo.load(signer_key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()))
        signer_asn_cert = asn1_x509.Certificate.load(signer_cert.public_bytes(serialization.Encoding.DER))

        signer_store = SimpleCertificateStore.from_certs([signer_asn_cert, ca_asn_cert])
        signer = signers.SimpleSigner(signing_cert=signer_asn_cert, signing_key=signer_asn_key, cert_registry=signer_store)

        # 3. Firmar PDF
        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 100, "PDF firmado con certificado derivado de CA oficial")
        c.save()
        w = IncrementalPdfFileWriter(io.BytesIO(buf.getvalue()))
        fields.append_signature_field(w, sig_field_spec=fields.SigFieldSpec(sig_field_name="Sig1"))
        out = io.BytesIO()
        signers.sign_pdf(w, signers.PdfSignatureMetadata(field_name="Sig1"), signer=signer, output=out)
        signed_bytes = out.getvalue()

        # 4. Validar pasando la CA oficial -> Debe retornar True y mensaje de Cadena Oficial
        es_val, msg = validar_firma_digital_pdf(signed_bytes, custom_trust_roots=[ca_asn_cert])
        self.assertTrue(es_val)
        self.assertIn("Cadena de Confianza Oficial", msg)

    def test_trust_roots_path_invalido_falla_cerrado(self):
        """
        Prueba que el sistema falla cerrado (HTTP 400 / error de configuración)
        si FIRMAPERU_TRUST_ROOTS_PATH apunta a un archivo inexistente o corrupto.
        """
        pdf_firmado_real = generar_pdf_firmado_mock_pyhanko()
        es_val, msg = validar_firma_digital_pdf(pdf_firmado_real, custom_trust_path="/ruta/inexistente/bundle_ca.pem")
        self.assertFalse(es_val)
        self.assertIn("Error de configuración", msg)

    def test_flujo_preparar_firma_param_documento_y_subir(self):
        res_prep = self.client.post(
            "/api/firmaperu/preparar-firma",
            headers=self.admin_headers,
            json={
                "empleado_id": self.empleado_a_id,
                "semana_inicio": "2026-11-02",
                "semana_fin": "2026-11-29"
            }
        )
        self.assertEqual(res_prep.status_code, 200)
        data_prep = res_prep.json()
        self.assertIn("param_token", data_prep)
        self.assertEqual(data_prep["document_extension"], "pdf")
        param_token = data_prep["param_token"]

        db = TestingSessionLocal()
        token_db = db.query(FirmaToken).filter(FirmaToken.token == param_token).first()
        self.assertIsNotNone(token_db)
        self.assertEqual(token_db.estado, "pendiente")
        self.assertTrue((token_db.expires_at - token_db.created_at) >= timedelta(minutes=9, seconds=55))
        db.close()

        res_param = self.client.post(
            "/api/firmaperu/param",
            data={"param_token": param_token}
        )
        self.assertEqual(res_param.status_code, 200)
        param_b64 = res_param.text
        json_bytes = base64.b64decode(param_b64)
        config_pades = json.loads(json_bytes.decode("utf-8"))

        self.assertEqual(config_pades["signatureFormat"], "PAdES")
        self.assertIn("/api/firmaperu/documento/", config_pades["documentToSign"])
        self.assertIn("/api/firmaperu/subir-firmado/", config_pades["uploadDocumentSigned"])

        db = TestingSessionLocal()
        token_db = db.query(FirmaToken).filter(FirmaToken.token == param_token).first()
        self.assertEqual(token_db.estado, "emitido")
        db.close()

        res_doc = self.client.get(f"/api/firmaperu/documento/{param_token}")
        self.assertEqual(res_doc.status_code, 200)
        self.assertEqual(res_doc.headers["content-type"], "application/pdf")
        self.assertTrue(len(res_doc.content) > 1000)

        pdf_firmado_real = generar_pdf_firmado_mock_pyhanko()

        files = {
            "signed_file": ("INFORME_FIRMADO_REAL.pdf", pdf_firmado_real, "application/pdf")
        }
        res_subir = self.client.post(f"/api/firmaperu/subir-firmado/{param_token}", files=files)
        self.assertEqual(res_subir.status_code, 200)
        self.assertEqual(res_subir.json()["status"], "ok")

        db = TestingSessionLocal()
        token_db = db.query(FirmaToken).filter(FirmaToken.token == param_token).first()
        self.assertEqual(token_db.estado, "usado")
        db.close()

        res_reuso = self.client.post(f"/api/firmaperu/subir-firmado/{param_token}", files=files)
        self.assertEqual(res_reuso.status_code, 400)

    def test_preparar_firma_practicante_bloqueado_403(self):
        db = TestingSessionLocal()
        rol_pract = db.query(Rol).filter(Rol.nombre == "Practicante").first()
        user_pract = Usuario(email="practicante_sin_rol@sistema.com", password_hash="hash", rol_id=rol_pract.id, empleado_id=self.empleado_a_id, activo=True)
        db.add(user_pract)
        db.commit()
        db.refresh(user_pract)
        user_pract_id = user_pract.id
        db.close()

        token_pract = create_access_token(data={"sub": str(user_pract_id)})
        headers_pract = {"Authorization": f"Bearer {token_pract}"}

        res = self.client.post(
            "/api/firmaperu/preparar-firma",
            headers=headers_pract,
            json={"empleado_id": self.empleado_a_id, "semana_inicio": "2026-11-02", "semana_fin": "2026-11-29"}
        )
        self.assertEqual(res.status_code, 403)
        self.assertIn("No autorizado para preparar firmas", res.json()["detail"])

    def test_preparar_firma_jefe_de_oficina_permitido_200(self):
        db = TestingSessionLocal()
        rol_jefe = db.query(Rol).filter(Rol.nombre == "Jefe de Oficina").first()
        user_jefe = Usuario(email="jefe_oficina@sistema.com", password_hash="hash", rol_id=rol_jefe.id, activo=True)
        db.add(user_jefe)
        db.commit()
        db.refresh(user_jefe)
        user_jefe_id = user_jefe.id
        db.close()

        token_jefe = create_access_token(data={"sub": str(user_jefe_id)})
        headers_jefe = {"Authorization": f"Bearer {token_jefe}"}

        res = self.client.post(
            "/api/firmaperu/preparar-firma",
            headers=headers_jefe,
            json={"empleado_id": self.empleado_a_id, "semana_inicio": "2026-11-02", "semana_fin": "2026-11-29"}
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("param_token", res.json())

    def test_subir_firmado_token_pendiente_rechazado_400(self):
        res_prep = self.client.post(
            "/api/firmaperu/preparar-firma",
            headers=self.admin_headers,
            json={"empleado_id": self.empleado_a_id, "semana_inicio": "2026-11-02", "semana_fin": "2026-11-29"}
        )
        token_pendiente = res_prep.json()["param_token"]

        pdf_firmado_real = generar_pdf_firmado_mock_pyhanko()
        res_subir = self.client.post(
            f"/api/firmaperu/subir-firmado/{token_pendiente}",
            files={"signed_file": ("FIRMADO.pdf", pdf_firmado_real, "application/pdf")}
        )
        self.assertEqual(res_subir.status_code, 400)
        self.assertIn("El token de firma no ha sido emitido mediante el Firmador Java (/param)", res_subir.json()["detail"])

    def test_token_expirado_es_rechazado_403(self):
        db = TestingSessionLocal()
        tok_exp = FirmaToken(
            token="TOKEN_EXPIRADO_123",
            empleado_id=self.empleado_a_id,
            semana_inicio=date(2026, 11, 2),
            semana_fin=date(2026, 11, 29),
            pdf_path="/tmp/fake.pdf",
            estado="emitido",
            created_at=datetime.utcnow() - timedelta(minutes=20),
            expires_at=datetime.utcnow() - timedelta(minutes=10)
        )
        db.add(tok_exp)
        db.commit()
        db.close()

        res_param = self.client.post("/api/firmaperu/param", data={"param_token": "TOKEN_EXPIRADO_123"})
        self.assertEqual(res_param.status_code, 403)

        res_doc = self.client.get("/api/firmaperu/documento/TOKEN_EXPIRADO_123")
        self.assertEqual(res_doc.status_code, 403)

        pdf_firmado_real = generar_pdf_firmado_mock_pyhanko()
        res_subir = self.client.post("/api/firmaperu/subir-firmado/TOKEN_EXPIRADO_123", files={"signed_file": ("f.pdf", pdf_firmado_real, "application/pdf")})
        self.assertEqual(res_subir.status_code, 403)

    def test_subir_pdf_sin_firma_digital_es_rechazado_400(self):
        res_prep = self.client.post(
            "/api/firmaperu/preparar-firma",
            headers=self.admin_headers,
            json={"empleado_id": self.empleado_a_id, "semana_inicio": "2026-11-02", "semana_fin": "2026-11-29"}
        )
        token = res_prep.json()["param_token"]
        self.client.post("/api/firmaperu/param", data={"param_token": token})

        buf = io.BytesIO()
        c = canvas.Canvas(buf)
        c.drawString(100, 100, "PDF preliminar sin firma")
        c.save()
        pdf_sin_firma = buf.getvalue()

        res_subir = self.client.post(
            f"/api/firmaperu/subir-firmado/{token}",
            files={"signed_file": ("NO_FIRMADO.pdf", pdf_sin_firma, "application/pdf")}
        )
        self.assertEqual(res_subir.status_code, 400)
        self.assertIn("Validación de Firma Digital fallida", res_subir.json()["detail"])

    def test_permisos_descarga_practicante_bloqueado_403(self):
        db = TestingSessionLocal()
        rol_pract = db.query(Rol).filter(Rol.nombre == "Practicante").first()

        user_a = Usuario(email="practicante_a@sistema.com", password_hash="hash", rol_id=rol_pract.id, empleado_id=self.empleado_a_id, activo=True)
        user_b = Usuario(email="practicante_b@sistema.com", password_hash="hash", rol_id=rol_pract.id, empleado_id=self.empleado_b_id, activo=True)
        db.add(user_a)
        db.add(user_b)
        db.commit()

        inf_b = InformeFirmado(
            empleado_id=self.empleado_b_id,
            semana_inicio=date(2026, 11, 2),
            semana_fin=date(2026, 11, 29),
            archivo_path="/tmp/informe_b.pdf",
            nombre_archivo="informe_b.pdf",
            firmado_por_id=1
        )
        db.add(inf_b)
        db.commit()
        db.refresh(inf_b)
        inf_b_id = inf_b.id
        user_a_id = user_a.id
        db.close()

        token_a = create_access_token(data={"sub": str(user_a_id)})
        headers_a = {"Authorization": f"Bearer {token_a}"}

        res_desc = self.client.get(f"/api/informes-firmados/{inf_b_id}/descargar", headers=headers_a)
        self.assertEqual(res_desc.status_code, 403)
        self.assertIn("No cuenta con autorización para descargar el informe firmado de otro usuario", res_desc.json()["detail"])

    def test_firmaperu_auth_servicio_carga_credenciales_y_jwt(self):
        from app.services.firmaperu_auth import cargar_credenciales_firmaperu, obtener_jwt_firmaperu, _token_cache

        # Reset cache for testing
        _token_cache["token"] = None
        _token_cache["expires_at"] = 0

        c_id, c_sec, t_url = cargar_credenciales_firmaperu()
        self.assertIsNotNone(c_id)
        self.assertIsNotNone(c_sec)
        self.assertIn("apps.firmaperu.gob.pe", t_url)

        # Mock httpx Client context manager
        mock_response = unittest.mock.MagicMock()
        mock_response.status_code = 200
        mock_response.text = '"JWT_TOKEN_DESDE_SERVICE_MOCK"'

        mock_client = unittest.mock.MagicMock()
        mock_client.__enter__.return_value = mock_client
        mock_client.post.return_value = mock_response

        with unittest.mock.patch("app.services.firmaperu_auth.httpx.Client", return_value=mock_client):
            token = obtener_jwt_firmaperu()
            self.assertEqual(token, "JWT_TOKEN_DESDE_SERVICE_MOCK")

    def test_eliminar_informe_firmado_exito(self):
        db = TestingSessionLocal()
        inf = InformeFirmado(
            empleado_id=self.empleado_a_id,
            semana_inicio=date(2026, 11, 2),
            semana_fin=date(2026, 11, 29),
            archivo_path="/tmp/fake_eliminar.pdf",
            nombre_archivo="fake_eliminar.pdf",
            firmado_por_id=1
        )
        db.add(inf)
        db.commit()
        db.refresh(inf)
        inf_id = inf.id
        db.close()

        res_del = self.client.delete(f"/api/informes-firmados/{inf_id}", headers=self.admin_headers)
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json()["status"], "ok")

        # Verificar que ya no existe en DB
        db = TestingSessionLocal()
        inf_check = db.query(InformeFirmado).filter(InformeFirmado.id == inf_id).first()
        self.assertIsNone(inf_check)
        db.close()


if __name__ == "__main__":
    unittest.main()
