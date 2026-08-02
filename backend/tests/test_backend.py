import sys
import os
import unittest
from datetime import date, datetime, timezone, timedelta, time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Configurar path e importar base de datos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app.database
from app.database import Base, get_db
from app.config import settings
from app.core.database_seed import seed_initial_data
from app.core.security import create_access_token
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.models.empleado import Empleado
from app.models.asistencia import Asistencia

# Configurar base de datos SQLite en memoria para tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Inyectar engine de pruebas en app.database antes de cargar la app
app.database.engine = engine

from app.main import app


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


class TestBackendAPI(unittest.TestCase):

    def setUp(self):
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()

        self.client = TestClient(app)

        # Login como Admin por defecto para helper de tests
        res_login = self.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        self.assertEqual(res_login.status_code, 200)
        self.admin_token = res_login.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_login_exitoso_y_fallido(self):
        # Login correcto
        res_ok = self.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": settings.ADMIN_PASSWORD
        })
        self.assertEqual(res_ok.status_code, 200)
        data = res_ok.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)

        # Login con contraseña errónea (HTTP 401)
        res_bad = self.client.post("/api/auth/login", json={
            "email": settings.ADMIN_EMAIL,
            "password": "PasswordIncorrecta"
        })
        self.assertEqual(res_bad.status_code, 401)

    def test_acceso_denegado_sin_token(self):
        # Intentar crear empleado sin Header Authorization (HTTP 401)
        res = self.client.post("/api/empleados", json={
            "nombre": "Sin Token",
            "documento": "00000000",
            "mac": "00:00:00:00:00:00"
        })
        self.assertEqual(res.status_code, 401)

    def test_crud_empleados_y_unicidad_mac(self):
        # 1. Crear Empleado 1 con horas_meta
        res1 = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Juan Pérez",
            "documento": "12345678",
            "mac": "AA:BB:CC:DD:EE:11",
            "departamento": "Sistemas",
            "horas_meta": 640
        })
        self.assertEqual(res1.status_code, 201)
        emp1 = res1.json()
        self.assertEqual(emp1["horas_meta"], 640)

        # 2. Intentar crear Empleado 2 con la misma MAC (HTTP 400)
        res2 = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Pedro López",
            "documento": "87654321",
            "mac": "AA:BB:CC:DD:EE:11",
            "departamento": "Ventas"
        })
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Ya existe un empleado registrado con esa dirección MAC", res2.json()["detail"])

        # 3. Consultar Whitelist de MACs
        res_macs = self.client.get("/api/empleados/macs")
        self.assertEqual(res_macs.status_code, 200)
        self.assertIn("AA:BB:CC:DD:EE:11", res_macs.json())

    def test_registro_asistencia_manual_y_origen(self):
        # 1. Crear Empleado
        emp = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Maria Quispe",
            "documento": "11223344",
            "mac": "FF:EE:DD:CC:BB:AA",
            "departamento": "OTI"
        }).json()

        # 2. Registrar Asistencia Manual Entrada
        res_manual = self.client.post("/api/asistencia/manual", headers=self.admin_headers, json={
            "empleado_id": emp["id"],
            "tipo": "entrada",
            "timestamp": "2026-08-02T08:00:00",
            "motivo": "Celular descargado"
        })
        self.assertEqual(res_manual.status_code, 200)

        # 3. Consultar Asistencias de hoy
        res_hoy = self.client.get("/api/asistencias/hoy")
        self.assertEqual(res_hoy.status_code, 200)
        items = res_hoy.json()
        self.assertTrue(len(items) > 0)
        item_maria = next(i for i in items if i["empleado"] == "Maria Quispe")
        self.assertEqual(item_maria["origen_entrada"], "manual")

    def test_exportar_excel_asistencias(self):
        # Probar endpoint /api/asistencias/export (Retorna Blob Excel)
        res_exp = self.client.get("/api/asistencias/export", headers=self.admin_headers)
        self.assertEqual(res_exp.status_code, 200)
        self.assertEqual(res_exp.headers["content-type"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        self.assertTrue(len(res_exp.content) > 0)

    def test_flujo_completo_informes_pdf(self):
        # 1. Crear usuario Jefe de Oficina
        db = TestingSessionLocal()
        rol_jefe = db.query(Rol).filter(Rol.nombre == "Jefe de Oficina").first()
        db.close()

        res_user_jefe = self.client.post("/api/usuarios", headers=self.admin_headers, json={
            "email": "jefe@sistema.com",
            "password": "JefePassword123!",
            "rol_id": rol_jefe.id,
            "activo": True
        })
        self.assertEqual(res_user_jefe.status_code, 201)

        # Login como Jefe de Oficina
        token_jefe = self.client.post("/api/auth/login", json={
            "email": "jefe@sistema.com",
            "password": "JefePassword123!"
        }).json()["access_token"]
        headers_jefe = {"Authorization": f"Bearer {token_jefe}"}

        # 2. Crear empleado practicante
        emp_pract = self.client.post("/api/empleados", headers=headers_jefe, json={
            "nombre": "Practicante Uno",
            "documento": "88888888",
            "mac": "88:77:66:55:44:33",
            "departamento": "OTI"
        }).json()

        # 3. Generar Informe PDF exitosamente -> HTTP 200 OK
        res_pdf = self.client.post("/api/informes/generar", headers=headers_jefe, json={
            "empleado_id": emp_pract["id"],
            "fecha_inicio": "2026-08-01",
            "fecha_fin": "2026-08-02"
        })
        self.assertEqual(res_pdf.status_code, 200)
        self.assertEqual(res_pdf.headers["content-type"], "application/pdf")
        self.assertTrue(len(res_pdf.content) > 100)

        # 4. Listar Historial de Informes
        res_list = self.client.get("/api/informes", headers=headers_jefe)
        self.assertEqual(res_list.status_code, 200)
        informes = res_list.json()
        self.assertTrue(len(informes) >= 1)
        inf_id = informes[0]["id"]
        self.assertEqual(informes[0]["estado"], "generado")

        # 5. Aprobar Informe
        res_aprob = self.client.patch(f"/api/informes/{inf_id}/aprobar", headers=headers_jefe)
        self.assertEqual(res_aprob.status_code, 200)
        self.assertEqual(res_aprob.json()["estado"], "aprobado")

    def test_informe_pdf_semanal_practicante_y_ejemplo_24h(self):
        # 1. Crear empleado practicante con horas_meta = 640
        db = TestingSessionLocal()
        emp = Empleado(
            nombre="Practicante Test 24H",
            documento="77665544",
            mac="AA:BB:CC:DD:EE:FF",
            departamento="OTI",
            horas_meta=640,
            activo=True
        )
        db.add(emp)
        db.commit()
        db.refresh(emp)

        # 2. Agregar asistencias exactas del ejemplo de referencia:
        # Lunes 16/11/2026: 08:00 a 13:00 (5h)
        # Martes 17/11/2026: 08:00 a 13:00 (5h)
        # Miércoles 18/11/2026: 08:00 a 13:00 (5h)
        # Jueves 19/11/2026: 08:00 a 13:00 (5h)
        # Viernes 20/11/2026: 09:00 a 13:00 (4h)
        horarios = [
            (date(2026, 11, 16), datetime(2026, 11, 16, 8, 0, 0), datetime(2026, 11, 16, 13, 0, 0)),
            (date(2026, 11, 17), datetime(2026, 11, 17, 8, 0, 0), datetime(2026, 11, 17, 13, 0, 0)),
            (date(2026, 11, 18), datetime(2026, 11, 18, 8, 0, 0), datetime(2026, 11, 18, 13, 0, 0)),
            (date(2026, 11, 19), datetime(2026, 11, 19, 8, 0, 0), datetime(2026, 11, 19, 13, 0, 0)),
            (date(2026, 11, 20), datetime(2026, 11, 20, 9, 0, 0), datetime(2026, 11, 20, 13, 0, 0)),
        ]

        for f, h_ent, h_sal in horarios:
            asist = Asistencia(
                empleado_id=emp.id,
                fecha=f,
                hora_entrada=h_ent,
                hora_salida=h_sal,
                origen_entrada="auto",
                origen_salida="auto",
                agente_id="TEST-AGENT"
            )
            db.add(asist)
        db.commit()

        # 3. Probar endpoint GET /api/empleados/{id}/informe_pdf con parámetros obligatorios
        res = self.client.get(
            f"/api/empleados/{emp.id}/informe_pdf?fecha_inicio=2026-11-16&fecha_fin=2026-11-22",
            headers=self.admin_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertIn("Content-Disposition", res.headers)
        self.assertIn("informe_Practicante_Test_24H_2026-11-16_2026-11-22.pdf", res.headers["Content-Disposition"])
        self.assertTrue(len(res.content) > 1000)

        # 4. Confirmar directamente el cálculo de horas semanales = 24.0 horas exactas
        from app.crud.crud_asistencia import get_asistencias_empleado_por_rango
        regs = get_asistencias_empleado_por_rango(db, emp.id, date(2026, 11, 16), date(2026, 11, 22))
        total_semanal = sum(
            round((r.hora_salida - r.hora_entrada).total_seconds() / 3600.0, 1)
            for r in regs if r.hora_entrada and r.hora_salida
        )
        self.assertEqual(total_semanal, 24.0)
        db.close()

    def test_informe_pdf_rango_sin_registros(self):
        # 1. Crear empleado sin asistencias
        emp = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Practicante Sin Registros",
            "documento": "99991111",
            "mac": "99:99:99:99:99:99",
            "departamento": "OTI"
        }).json()

        # 2. Rango de fechas sin asistencias -> HTTP 200 con PDF limpio (sin error 500)
        res = self.client.get(
            f"/api/empleados/{emp['id']}/informe_pdf?fecha_inicio=2020-01-01&fecha_fin=2020-01-07",
            headers=self.admin_headers
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers["content-type"], "application/pdf")
        self.assertTrue(len(res.content) > 1000)

    def test_bloqueo_rol_empleado_informes(self):
        # 1. Crear usuario con rol Empleado
        db = TestingSessionLocal()
        rol_emp = db.query(Rol).filter(Rol.nombre == "Empleado").first()
        db.close()

        self.client.post("/api/usuarios", headers=self.admin_headers, json={
            "email": "practicante_sin_permiso@sistema.com",
            "password": "PracticantePass123!",
            "rol_id": rol_emp.id,
            "activo": True
        })

        token_emp = self.client.post("/api/auth/login", json={
            "email": "practicante_sin_permiso@sistema.com",
            "password": "PracticantePass123!"
        }).json()["access_token"]
        headers_emp = {"Authorization": f"Bearer {token_emp}"}

        # 2. Prueba Negativa: Intentar generar informe sin permiso -> HTTP 403 Forbidden
        res_gen = self.client.post("/api/informes/generar", headers=headers_emp, json={
            "empleado_id": 1,
            "fecha_inicio": "2026-08-01",
            "fecha_fin": "2026-08-02"
        })
        self.assertEqual(res_gen.status_code, 403)

        # 3. Prueba Negativa: Intentar aprobar informe sin permiso -> HTTP 403 Forbidden
        res_aprob = self.client.patch("/api/informes/1/aprobar", headers=headers_emp)
        self.assertEqual(res_aprob.status_code, 403)


if __name__ == '__main__':
    unittest.main()
