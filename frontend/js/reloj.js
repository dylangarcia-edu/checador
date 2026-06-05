// ================================================================
// CHECADOR — reloj.js
// ================================================================

let dentroDelTrabajo = false;
let timestampEntrada = null;

// ── Reloj en tiempo real ───────────────────────────────────────
function actualizarReloj() {
    const ahora = new Date();
    const hh = String(ahora.getHours()).padStart(2, "0");
    const mm = String(ahora.getMinutes()).padStart(2, "0");
    const ss = String(ahora.getSeconds()).padStart(2, "0");

    const elHora = document.getElementById("reloj-hora");
    const elSegs = document.getElementById("reloj-segundos");
    const elFecha = document.getElementById("reloj-fecha");

    if (elHora) elHora.textContent     = `${hh}:${mm}`;
    if (elSegs) elSegs.textContent     = `${hh} : ${mm} : ${ss}`;
    if (elFecha) elFecha.textContent   = capitalizar(
        ahora.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
    );

    const elTiempo = document.getElementById("tiempo-transcurrido");
    if (elTiempo) {
        if (dentroDelTrabajo && timestampEntrada) {
            const diff    = Math.floor((ahora - new Date(timestampEntrada)) / 1000);
            const horas   = Math.floor(diff / 3600);
            const minutos = Math.floor((diff % 3600) / 60);
            const segs    = diff % 60;
            elTiempo.textContent =
                `Llevas ${String(horas).padStart(2,"0")}:${String(minutos).padStart(2,"0")}:${String(segs).padStart(2,"0")} trabajando`;
        } else {
            elTiempo.textContent = "";
        }
    }
}

// ── Estado del botón ───────────────────────────────────────────
function aplicarEstado(dentro, tsEntrada = null) {
    dentroDelTrabajo = dentro;
    timestampEntrada = tsEntrada;

    const btn        = document.getElementById("btn-registro");
    const badge      = document.getElementById("estado-badge");
    const emoji      = document.getElementById("estado-emoji");
    const texto      = document.getElementById("estado-texto");

    if (!btn) return;

    if (dentro) {
        btn.className = "btn-registro salida";
        btn.querySelector(".btn-registro__emoji").textContent = "🔴";
        btn.querySelector(".btn-registro__texto").textContent = "Registrar salida";
        badge.className   = "estado-badge dentro";
        emoji.textContent = "🟢";
        texto.textContent = "Estás trabajando";
    } else {
        btn.className = "btn-registro entrada";
        btn.querySelector(".btn-registro__emoji").textContent = "🟢";
        btn.querySelector(".btn-registro__texto").textContent = "Registrar entrada";
        badge.className   = "estado-badge fuera";
        emoji.textContent = "⚪";
        texto.textContent = "Fuera del trabajo";
        const elTiempo = document.getElementById("tiempo-transcurrido");
        if (elTiempo) elTiempo.textContent = "";
    }
    btn.disabled = false;
}

// ── Consultar estado ───────────────────────────────────────────
async function consultarEstado() {
    try {
        const res = await fetch(`${API}/registros/estado`);
        if (!res.ok) { aplicarEstado(false); return; }
        const data = await res.json();
        let tsEntrada = data.timestamp_entrada || null;
        alert("timestamp del servidor: " + tsEntrada); // <- temporal
        aplicarEstado(data.dentro, tsEntrada);
    } catch (e) {
        aplicarEstado(false);
    }
}

// ── Click del botón ────────────────────────────────────────────
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btn-registro");
    if (!btn) return;

    btn.disabled = true;
    const endpoint = dentroDelTrabajo ? "salida" : "entrada";

    try {
        const res  = await fetch(`${API}/registros/${endpoint}`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Error al registrar.");
            btn.disabled = false;
            return;
        }

        if (endpoint === "entrada") {
            aplicarEstado(true, new Date().toISOString());
        } else {
            const d = data.detalle;
            if (d) {
                alert(
                    `✅ Salida registrada\n\n` +
                    `⏱ ${d.horas_validas} horas válidas\n` +
                    `💵 $${d.pago_calculado} MXN${d.es_festivo ? " 🎉 (festivo x3)" : ""}`
                );
            }
            aplicarEstado(false);
        }
    } catch (e) {
        btn.disabled = false;
    }
});

// ── Init — solo el reloj, el estado lo llama auth.js ──────────
actualizarReloj();
setInterval(actualizarReloj, 1000);