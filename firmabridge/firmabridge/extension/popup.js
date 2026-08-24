/**
 * FirmaBridge — Popup Script (popup.js)
 *
 * Separado del HTML para cumplir con la CSP de Manifest V3
 * que prohíbe scripts inline (script-src 'self').
 */

document.addEventListener("DOMContentLoaded", () => {
  // Obtener versión del manifest
  const manifest = chrome.runtime.getManifest();
  document.getElementById("version").textContent = "v" + manifest.version;

  // Verificar conexión con el native host
  checkNativeHost();
  loadLastEvent();
});

function checkNativeHost() {
  const dot = document.getElementById("hostDot");
  const text = document.getElementById("hostStatus");

  chrome.runtime.sendNativeMessage(
    "pe.gob.pcm.firmabridge",
    { action: "ping" },
    (response) => {
      if (chrome.runtime.lastError) {
        dot.className = "status-dot error";
        text.textContent = "No conectado";
        text.title = chrome.runtime.lastError.message;
      } else if (response && response.status === "pong") {
        dot.className = "status-dot ok";
        text.textContent = "Conectado";
      } else {
        dot.className = "status-dot ok";
        text.textContent = "Conectado (v" + (response.version || "?") + ")";
      }
    }
  );
}

function loadLastEvent() {
  chrome.runtime.sendMessage({ type: "getStatus" }, (event) => {
    if (!event || !event.timestamp) return;

    const container = document.getElementById("eventContent");
    const statusClass = event.status === "launched" ? "success" : "error";
    const statusLabel = event.status === "launched" ? "\u2713 Lanzado" : "\u2717 Error";

    const time = new Date(event.timestamp);
    const timeStr = time.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });

    container.innerHTML =
      '<div class="event-detail">' +
        '<span class="key">Hora</span>' +
        '<span class="value">' + timeStr + '</span>' +
      '</div>' +
      '<div class="event-detail">' +
        '<span class="key">Puerto</span>' +
        '<span class="value">' + event.port + '</span>' +
      '</div>' +
      '<div class="event-detail">' +
        '<span class="key">Estado</span>' +
        '<span class="value ' + statusClass + '">' + statusLabel + '</span>' +
      '</div>' +
      (event.message && event.status === "error" ?
        '<div class="event-detail">' +
          '<span class="key">Detalle</span>' +
          '<span class="value error" style="font-size:11px;max-width:180px;word-break:break-all;">' + event.message + '</span>' +
        '</div>' : "");
  });
}
