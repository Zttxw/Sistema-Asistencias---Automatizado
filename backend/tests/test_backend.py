import sys
import os
import unittest
from io import BytesIO
from datetime import date, datetime, timezone
import openpyxl
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Configurar path e importar base de datos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app.database
from app.database import Base, get_db

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
        self.client = TestClient(app)

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_obtener_whitelist_vacia(self):
        response = self.client.get("/api/empleados/macs")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_crear_empleado_y_whitelist(self):
        payload = {
            "nombre": "Jeanpier Merma",
            "documento": "72849102",
            "mac": "68:58:a0:db:7d:4d",
            "departamento": "OTI",
            "activo": True
        }
        res_crear = self.client.post("/api/empleados", json=payload)
        self.assertEqual(res_crear.status_code, 201)
        data = res_crear.json()
        self.assertEqual(data["mac"], "68:58:A0:DB:7D:4D")

        # Verificar whitelist
        res_wl = self.client.get("/api/empleados/macs")
        self.assertEqual(res_wl.status_code, 200)
        self.assertEqual(res_wl.json(), ["68:58:A0:DB:7D:4D"])

    def test_editar_empleado_y_validacion_mac_duplicada(self):
        emp1 = self.client.post("/api/empleados", json={
            "nombre": "Empleado Uno",
            "documento": "11111111",
            "mac": "AA:BB:CC:11:22:33",
            "departamento": "TI",
            "activo": True
        }).json()

        emp2 = self.client.post("/api/empleados", json={
            "nombre": "Empleado Dos",
            "documento": "22222222",
            "mac": "AA:BB:CC:44:55:66",
            "departamento": "Recursos Humanos",
            "activo": True
        }).json()

        res_edit = self.client.put(f"/api/empleados/{emp1['id']}", json={
            "nombre": "Empleado Uno Editado",
            "departamento": "Sistemas"
        })
        self.assertEqual(res_edit.status_code, 200)
        self.assertEqual(res_edit.json()["nombre"], "Empleado Uno Editado")

        res_colision = self.client.put(f"/api/empleados/{emp1['id']}", json={
            "mac": "AA:BB:CC:44:55:66"
        })
        self.assertEqual(res_colision.status_code, 400)

    def test_soft_delete_empleado(self):
        emp = self.client.post("/api/empleados", json={
            "nombre": "Empleado A Borrar",
            "documento": "33333333",
            "mac": "CC:DD:EE:11:22:33",
            "departamento": "Logística",
            "activo": True
        }).json()

        res_del = self.client.delete(f"/api/empleados/{emp['id']}")
        self.assertEqual(res_del.status_code, 200)
        self.assertFalse(res_del.json()["activo"])

    def test_asistencia_manual_flujo_completo_y_errores(self):
        emp = self.client.post("/api/empleados", json={
            "nombre": "Jeanpier Merma",
            "documento": "72849102",
            "mac": "68:58:A0:DB:7D:4D",
            "departamento": "OTI",
            "activo": True
        }).json()

        # 1. Entrada manual exitosa
        res_ent = self.client.post("/api/asistencia/manual", json={
            "empleado_id": emp["id"],
            "tipo": "entrada",
            "timestamp": "2026-08-02T08:00:00+00:00",
            "motivo": "Olvidó el celular"
        })
        self.assertEqual(res_ent.status_code, 200)
        data_ent = res_ent.json()
        self.assertEqual(data_ent["origen_entrada"], "manual")
        self.assertEqual(data_ent["motivo"], "Olvidó el celular")

        # 2. Intento de entrada manual duplicada (Error 400)
        res_dup = self.client.post("/api/asistencia/manual", json={
            "empleado_id": emp["id"],
            "tipo": "entrada",
            "timestamp": "2026-08-02T08:30:00+00:00"
        })
        self.assertEqual(res_dup.status_code, 400)
        self.assertIn("Ya existe una entrada registrada para este empleado hoy", res_dup.json()["detail"])

        # 3. Salida manual exitosa
        res_sal = self.client.post("/api/asistencia/manual", json={
            "empleado_id": emp["id"],
            "tipo": "salida",
            "timestamp": "2026-08-02T17:00:00+00:00",
            "motivo": "Salida manual autorizada"
        })
        self.assertEqual(res_sal.status_code, 200)
        data_sal = res_sal.json()
        self.assertEqual(data_sal["origen_salida"], "manual")

    def test_asistencia_manual_salida_sin_entrada_error(self):
        emp = self.client.post("/api/empleados", json={
            "nombre": "Empleado Sin Entrada",
            "documento": "99999999",
            "mac": "99:88:77:66:55:44",
            "departamento": "TI",
            "activo": True
        }).json()

        res = self.client.post("/api/asistencia/manual", json={
            "empleado_id": emp["id"],
            "tipo": "salida",
            "timestamp": "2026-08-02T17:00:00+00:00"
        })
        self.assertEqual(res.status_code, 400)
        self.assertIn("No se puede registrar salida sin una entrada previa ese día", res.json()["detail"])

    def test_historial_mac_creacion_y_actualizacion(self):
        # 1. Crear empleado -> primer HistorialMac
        emp = self.client.post("/api/empleados", json={
            "nombre": "Jeanpier Merma",
            "documento": "72849102",
            "mac": "11:22:33:44:55:66",
            "departamento": "OTI",
            "activo": True
        }).json()

        res_hist1 = self.client.get(f"/api/empleados/{emp['id']}/historial_mac")
        self.assertEqual(res_hist1.status_code, 200)
        hist1 = res_hist1.json()
        self.assertEqual(len(hist1), 1)
        self.assertIsNone(hist1[0]["mac_anterior"])
        self.assertEqual(hist1[0]["mac_nueva"], "11:22:33:44:55:66")
        self.assertEqual(hist1[0]["motivo"], "Registro inicial")

        # 2. Editar MAC -> segundo HistorialMac
        res_edit = self.client.put(f"/api/empleados/{emp['id']}", json={
            "mac": "77:88:99:AA:BB:CC",
            "motivo_cambio_mac": "Celular nuevo"
        })
        self.assertEqual(res_edit.status_code, 200)

        res_hist2 = self.client.get(f"/api/empleados/{emp['id']}/historial_mac")
        self.assertEqual(res_hist2.status_code, 200)
        hist2 = res_hist2.json()
        self.assertEqual(len(hist2), 2)
        # Orden descendente: el más reciente primero
        self.assertEqual(hist2[0]["mac_anterior"], "11:22:33:44:55:66")
        self.assertEqual(hist2[0]["mac_nueva"], "77:88:99:AA:BB:CC")
        self.assertEqual(hist2[0]["motivo"], "Celular nuevo")

        self.assertIsNone(hist2[1]["mac_anterior"])
        self.assertEqual(hist2[1]["mac_nueva"], "11:22:33:44:55:66")


if __name__ == '__main__':
    unittest.main()
