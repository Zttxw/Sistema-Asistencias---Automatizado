#!/usr/bin/env bash
set -e

# NAVEGAR AL DIRECTORIO DEL PROYECTO
cd ~/agente-asistencias-backend || { echo "ERROR: no se encontró la carpeta del proyecto ~/agente-asistencias-backend"; exit 1; }

echo "=== 1. VERIFICACIÓN INICIAL DE CONTENEDORES SIRACOM ==="
INITIAL_SIRACOM_COUNT=$(docker ps --filter "name=siracom_" --filter "status=running" -q | wc -l)
echo "Contenedores siracom_ en ejecución detectados: ${INITIAL_SIRACOM_COUNT}"

if [ "${INITIAL_SIRACOM_COUNT}" -ne 4 ]; then
  echo "ERROR: Se esperaban exactamente 4 contenedores de siracom_ corriendo, pero se detectaron ${INITIAL_SIRACOM_COUNT}."
  echo "Abortando el despliegue por seguridad para proteger el entorno en producción."
  exit 1
fi
echo "[OK] Los 4 contenedores de siracom_ están activos y seguros."

echo "=== 2. CONFIGURACIÓN DE FIREWALL UFW ==="
sudo ufw allow 8010/tcp comment 'Asistencias backend'
sudo ufw allow 8082/tcp comment 'Asistencias frontend'
sudo ufw status

echo "=== 3. DESPLIEGUE DOCKER (SISTEMA DE ASISTENCIAS) ==="
docker compose up -d --build

echo "=== 4. VERIFICACIÓN POSTERIOR DE INTEGRIDAD SIRACOM ==="
POST_SIRACOM_COUNT=$(docker ps --filter "name=siracom_" --filter "status=running" -q | wc -l)
echo "Contenedores siracom_ activos tras el despliegue: ${POST_SIRACOM_COUNT}"

if [ "${POST_SIRACOM_COUNT}" -ne "${INITIAL_SIRACOM_COUNT}" ]; then
  echo "ERROR CRÍTICO: El número de contenedores siracom_ cambió tras la ejecución de Docker Compose."
  echo "Conteo inicial: ${INITIAL_SIRACOM_COUNT} | Conteo actual: ${POST_SIRACOM_COUNT}"
  exit 1
fi
echo "[OK] Integridad verificada. Todos los contenedores de siracom_ continúan corriendo intactos."

echo "=== 5. PRUEBAS DE SALUD DEL SISTEMA DE ASISTENCIAS ==="
echo "Probando Backend FastAPI (puerto 8010)..."
curl -f http://localhost:8010/ || { echo "ERROR: Falló la prueba de salud del backend FastAPI en http://localhost:8010/"; exit 1; }

echo ""
echo "Probando Frontend Web (puerto 8082)..."
curl -f http://localhost:8082/ || { echo "ERROR: Falló la prueba de respuesta del frontend React/Nginx en http://localhost:8082/"; exit 1; }

echo ""
echo "========================================================"
echo " [ÉXITO] Despliegue completado y verificado correctamente."
echo " - Backend API: http://10.0.30.50:8010"
echo " - Web Dashboard: http://10.0.30.50:8082"
echo " - MySQL DB: Red interna asistencias_net (puerto 3306)"
echo "========================================================"
