/**
 * FirmaBridge — Service Worker (background.js)
 *
 * Detecta navegaciones de sub_frame hacia FirmaPeruWeb.application,
 * extrae el parámetro "port" y lanza el Firmador vía native messaging.
 *
 * NO intercepta polling ni POST — solo reemplaza el disparo ClickOnce.
 */

const NATIVE_HOST_NAME = "pe.gob.pcm.firmabridge";

// Estado compartido para el popup
let lastEvent = { timestamp: null, port: null, status: null, message: null };

/**
 * Listener principal: detecta iframes con URL de FirmaPeruWeb.application
 */
chrome.webNavigation.onBeforeNavigate.addListener(
  (details) => {
    // Solo sub_frames (iframes), nunca el frame principal
    if (details.frameId === 0) return;

    const url = details.url;
    console.log("[FirmaBridge] Detected sub_frame navigation:", url);

    // Extraer el puerto del query string
    let port;
    try {
      const parsedUrl = new URL(url);
      const portParam = parsedUrl.searchParams.get("port");
      if (!portParam) {
        console.warn("[FirmaBridge] URL has no 'port' parameter, ignoring.");
        return;
      }
      port = parseInt(portParam, 10);
    } catch (e) {
      console.error("[FirmaBridge] Failed to parse URL:", e);
      return;
    }

    // Validar rango del puerto
    if (isNaN(port) || port < 1024 || port > 65535) {
      console.error("[FirmaBridge] Invalid port:", port);
      updateStatus(port, "error", `Puerto inválido: ${port}`);
      return;
    }

    console.log(`[FirmaBridge] Launching Firmador on port ${port}...`);

    // Enviar mensaje al native host
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: "launch", port: port },
      (response) => {
        if (chrome.runtime.lastError) {
          const errMsg = chrome.runtime.lastError.message;
          console.error("[FirmaBridge] Native host error:", errMsg);
          updateStatus(port, "error", errMsg);
          setBadge("✗", "#D32F2F");
          return;
        }

        if (response && response.status === "launched") {
          console.log("[FirmaBridge] Firmador launched successfully.");
          updateStatus(port, "launched", "Firmador lanzado correctamente");
          setBadge("✓", "#388E3C");
          // Limpiar el badge después de 8 segundos
          setTimeout(() => setBadge("", "#000000"), 8000);
        } else {
          const msg = response ? response.message : "Respuesta desconocida";
          console.error("[FirmaBridge] Unexpected response:", response);
          updateStatus(port, "error", msg);
          setBadge("✗", "#D32F2F");
        }
      }
    );
  },
  {
    url: [{ urlContains: "FirmaPeruWeb.application" }]
  }
);

/**
 * Actualiza el estado interno para que el popup pueda mostrarlo.
 */
function updateStatus(port, status, message) {
  lastEvent = {
    timestamp: new Date().toISOString(),
    port: port,
    status: status,
    message: message
  };
}

/**
 * Muestra un badge en el ícono de la extensión.
 */
function setBadge(text, color) {
  chrome.action.setBadgeText({ text: text });
  chrome.action.setBadgeBackgroundColor({ color: color });
}

/**
 * Responde a mensajes del popup solicitando el estado.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "getStatus") {
    sendResponse(lastEvent);
  }
  return false; // Respuesta síncrona
});
