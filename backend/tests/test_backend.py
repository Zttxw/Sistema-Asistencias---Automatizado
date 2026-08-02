import sys
import os
import unittest
from datetime import date, datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

# Configurar path e importar base de datos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import app.database
from app.database import Base, get_db
from app.core.database_seed import seed_initial_data
from app.models.rol import Rol
from app.models.usuario import Usuario

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
            "email": "admin@sistema.com",
            "password": "Admin123456!"
        })
        self.assertEqual(res_login.status_code, 200)
        self.admin_token = res_login.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}

    def tearDown(self):
        Base.metadata.drop_all(bind=engine)

    def test_login_exitoso_y_fallido(self):
        # Login correcto
        res_ok = self.client.post("/api/auth/login", json={
            "email": "admin@sistema.com",
            "password": "Admin123456!"
        })
        self.assertEqual(res_ok.status_code, 200)
        data = res_ok.json()
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)

        # Login con contraseña errónea (HTTP 401)
        res_bad = self.client.post("/api/auth/login", json={
            "email": "admin@sistema.com",
            "password": "PasswordIncorrecta"
        })
        self.assertEqual(res_bad.status_code, 401)

    def test_acceso_denegado_sin_token(self):
        # Intentar crear empleado sin Header Authorization (HTTP 401)
        res = self.client.post("/api/empleados", json={
            "nombre": "Prueba Sin Token",
            "documento": "00000000",
            "mac": "AA:AA:AA:AA:AA:AA",
            "departamento": "TI"
        })
        self.assertEqual(res.status_code, 401)

    def test_acceso_denegado_por_falta_de_permisos(self):
        # 1. Crear un usuario "Invitado"
        db = TestingSessionLocal()
        rol_invitado = db.query(Rol).filter(Rol.nombre == "Invitado").first()
        db.close()

        res_user = self.client.post("/api/usuarios", headers=self.admin_headers, json={
            "email": "invitado@sistema.com",
            "password": "Invitado123456!",
            "rol_id": rol_invitado.id,
            "activo": True
        })
        self.assertEqual(res_user.status_code, 201)

        # 2. Login como Invitado
        token_inv = self.client.post("/api/auth/login", json={
            "email": "invitado@sistema.com",
            "password": "Invitado123456!"
        }).json()["access_token"]
        headers_inv = {"Authorization": f"Bearer {token_inv}"}

        # 3. Invitado puede ver empleados (tiene 'empleados.ver')
        res_ver = self.client.get("/api/empleados", headers=headers_inv)
        self.assertEqual(res_ver.status_code, 200)

        # 4. Invitado NO puede crear empleados (carece de 'empleados.crear' -> HTTP 403)
        res_crear = self.client.post("/api/empleados", headers=headers_inv, json={
            "nombre": "Intento Invitado",
            "documento": "11111111",
            "mac": "BB:BB:BB:BB:BB:BB"
        })
        self.assertEqual(res_crear.status_code, 403)

    def test_refresh_token_valido_e_invalido(self):
        res_login = self.client.post("/api/auth/login", json={
            "email": "admin@sistema.com",
            "password": "Admin123456!"
        }).json()
        ref_token = res_login["refresh_token"]

        # Refresh exitoso
        res_ref = self.client.post("/api/auth/refresh", json={"refresh_token": ref_token})
        self.assertEqual(res_ref.status_code, 200)
        self.assertIn("access_token", res_ref.json())

        # Intentar reusar el mismo refresh token (ya fue rotado y revocado -> HTTP 401)
        res_reuse = self.client.post("/api/auth/refresh", json={"refresh_token": ref_token})
        self.assertEqual(res_reuse.status_code, 401)

    def test_creacion_de_rol_custom_y_permisos(self):
        # Crear rol Auditor con permiso 'asistencias.exportar'
        res_rol = self.client.post("/api/roles", headers=self.admin_headers, json={
            "nombre": "Auditor",
            "descripcion": "Solo exportar reportes",
            "permisos": ["asistencias.exportar"]
        })
        self.assertEqual(res_rol.status_code, 201)
        rol_auditor_id = res_rol.json()["id"]

        # Crear usuario con rol Auditor
        res_user = self.client.post("/api/usuarios", headers=self.admin_headers, json={
            "email": "auditor@sistema.com",
            "password": "Auditor123456!",
            "rol_id": rol_auditor_id,
            "activo": True
        })
        self.assertEqual(res_user.status_code, 201)

        # Login como Auditor
        token_aud = self.client.post("/api/auth/login", json={
            "email": "auditor@sistema.com",
            "password": "Auditor123456!"
        }).json()["access_token"]
        headers_aud = {"Authorization": f"Bearer {token_aud}"}

        # Auditor no puede listar usuarios (HTTP 403)
        res_usr_list = self.client.get("/api/usuarios", headers=headers_aud)
        self.assertEqual(res_usr_list.status_code, 403)

        # Auditor puede exportar asistencias (HTTP 200)
        res_exp = self.client.get("/api/asistencias/export", headers=headers_aud)
        self.assertEqual(res_exp.status_code, 200)

    def test_aislamiento_asistencia_rol_empleado(self):
        # 1. Crear 2 Empleados en el catálogo
        emp1 = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Empleado Uno",
            "documento": "11111111",
            "mac": "AA:11:22:33:44:55",
            "departamento": "TI"
        }).json()

        emp2 = self.client.post("/api/empleados", headers=self.admin_headers, json={
            "nombre": "Empleado Dos",
            "documento": "22222222",
            "mac": "BB:11:22:33:44:55",
            "departamento": "Ventas"
        }).json()

        # 2. Registrar asistencia manual para ambos el mismo día
        self.client.post("/api/asistencia/manual", headers=self.admin_headers, json={
            "empleado_id": emp1["id"],
            "tipo": "entrada",
            "timestamp": "2026-08-02T08:00:00+00:00"
        })

        self.client.post("/api/asistencia/manual", headers=self.admin_headers, json={
            "empleado_id": emp2["id"],
            "tipo": "entrada",
            "timestamp": "2026-08-02T08:05:00+00:00"
        })

        # 3. Crear usuario vinculado a Empleado Uno (rol Empleado)
        db = TestingSessionLocal()
        rol_emp = db.query(Rol).filter(Rol.nombre == "Empleado").first()
        db.close()

        self.client.post("/api/usuarios", headers=self.admin_headers, json={
            "email": "emp1@sistema.com",
            "password": "Emp1Password!",
            "rol_id": rol_emp.id,
            "empleado_id": emp1["id"],
            "activo": True
        })

        # 4. Login como Empleado Uno
        token_e1 = self.client.post("/api/auth/login", json={
            "email": "emp1@sistema.com",
            "password": "Emp1Password!"
        }).json()["access_token"]
        headers_e1 = {"Authorization": f"Bearer {token_e1}"}

        # 5. Empleado Uno consulta asistencias del día -> ve ÚNICAMENTE su propia asistencia
        res_asist = self.client.get("/api/asistencias?fecha=2026-08-02", headers=headers_e1)
        self.assertEqual(res_asist.status_code, 200)
        items = res_asist.json()
        self.assertEqual(len(items), 1)
        self.assertEqual(items[0]["empleado"], "Empleado Uno")


if __name__ == '__main__':
    unittest.main()
