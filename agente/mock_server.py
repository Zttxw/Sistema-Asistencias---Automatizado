from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/deteccion', methods=['POST'])
def recibir_deteccion():
    data = request.get_json()
    print(f"[MOCK SERVER] Recibida detección: {data}")
    return jsonify({"status": "recibido", "payload": data}), 200

@app.route('/api/asistencia', methods=['POST'])
def recibir_asistencia():
    data = request.get_json()
    print(f"[MOCK SERVER] Recibido payload: {data}")
    return jsonify({"status": "éxito", "registrado": data}), 200

if __name__ == '__main__':
    print("Iniciando Mock Server HTTP en http://localhost:5000/api/deteccion ...")
    app.run(host='0.0.0.0', port=5000)
