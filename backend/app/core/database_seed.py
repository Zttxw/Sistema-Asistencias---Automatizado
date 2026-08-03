from sqlalchemy.orm import Session
from app.config import settings
from app.models.permiso import Permiso
from app.models.rol import Rol
from app.models.usuario import Usuario
from app.core.security import get_password_hash

PERMISOS_CATALOGO = [
    {"codigo": "empleados.ver", "descripcion": "Ver lista y detalles de empleados"},
    {"codigo": "empleados.crear", "descripcion": "Crear nuevos empleados"},
    {"codigo": "empleados.editar", "descripcion": "Editar datos y MAC de empleados"},
    {"codigo": "empleados.eliminar", "descripcion": "Desactivar empleados (soft-delete)"},
    {"codigo": "asistencias.ver", "descripcion": "Ver reporte general de asistencias"},
    {"codigo": "asistencias.ver_propia", "descripcion": "Ver solo su propia asistencia como empleado"},
    {"codigo": "asistencias.registrar_manual", "descripcion": "Registrar entrada/salida manual de asistencias"},
    {"codigo": "asistencias.exportar", "descripcion": "Exportar reportes de asistencia a Excel y PDF"},
    {"codigo": "dispositivos.ver", "descripcion": "Ver dispositivos no registrados detectados"},
    {"codigo": "dispositivos.registrar", "descripcion": "Registrar dispositivos detectados como empleados"},
    {"codigo": "roles.gestionar", "descripcion": "Crear, editar y eliminar roles y permisos"},
    {"codigo": "usuarios.gestionar", "descripcion": "Crear, editar y gestionar cuentas de usuario"},
]


def seed_initial_data(db: Session):
    # 1. Poblar permisos
    permisos_db = {}
    for item in PERMISOS_CATALOGO:
        p = db.query(Permiso).filter(Permiso.codigo == item["codigo"]).first()
        if not p:
            p = Permiso(codigo=item["codigo"], descripcion=item["descripcion"])
            db.add(p)
            db.flush()
        permisos_db[item["codigo"]] = p

    # 2. Poblar roles
    # Rol Admin (Todos los permisos)
    rol_admin = db.query(Rol).filter(Rol.nombre == "Admin").first()
    if not rol_admin:
        rol_admin = Rol(
            nombre="Admin",
            descripcion="Administrador total del sistema",
            permisos=list(permisos_db.values())
        )
        db.add(rol_admin)
        db.flush()
    else:
        rol_admin.permisos = list(permisos_db.values())

    # Rol Jefe de Oficina
    rol_jefe = db.query(Rol).filter(Rol.nombre == "Jefe de Oficina").first()
    permisos_jefe = [
        permisos_db["asistencias.ver"],
        permisos_db["asistencias.exportar"],
        permisos_db["empleados.ver"],
        permisos_db["empleados.crear"],
        permisos_db["empleados.editar"],
    ]
    if not rol_jefe:
        rol_jefe = Rol(
            nombre="Jefe de Oficina",
            descripcion="Jefe de oficina con gestión de empleados e informes PDF",
            permisos=permisos_jefe
        )
        db.add(rol_jefe)
        db.flush()
    else:
        rol_jefe.permisos = permisos_jefe

    # Rol Empleado
    rol_empleado = db.query(Rol).filter(Rol.nombre == "Empleado").first()
    if not rol_empleado:
        rol_empleado = Rol(
            nombre="Empleado",
            descripcion="Empleado con acceso a su propia asistencia",
            permisos=[permisos_db["asistencias.ver_propia"]]
        )
        db.add(rol_empleado)
        db.flush()

    # Rol Invitado
    rol_invitado = db.query(Rol).filter(Rol.nombre == "Invitado").first()
    if not rol_invitado:
        rol_invitado = Rol(
            nombre="Invitado",
            descripcion="Usuario con acceso de lectura (asistencias, empleados, dispositivos)",
            permisos=[
                permisos_db["asistencias.ver"],
                permisos_db["empleados.ver"],
                permisos_db["dispositivos.ver"]
            ]
        )
        db.add(rol_invitado)
        db.flush()

    db.commit()

    # 3. Poblar Usuario Admin Inicial si no existe ningún usuario con rol Admin
    admin_user = db.query(Usuario).filter(Usuario.rol_id == rol_admin.id).first()
    if not admin_user:
        hashed_password = get_password_hash(settings.ADMIN_PASSWORD)
        admin_user = Usuario(
            email=settings.ADMIN_EMAIL,
            password_hash=hashed_password,
            rol_id=rol_admin.id,
            activo=True
        )
        db.add(admin_user)
        db.commit()
        print(f"[INFO] Usuario Administrador inicial creado: {settings.ADMIN_EMAIL}")
