// ================================================================
// CHECADOR — reloj.js
// ================================================================

let dentroDelTrabajo = false;
let timestampEntrada = null;

// Si una entrada lleva abierta más de esto, seguramente se olvidó
// registrar la salida (un doble de 9 am a 12 am son 15 h).
const HORAS_OLVIDO = 16;

function horasAbierto() {
    if (!dentroDelTrabajo || !timestampEntrada) return 0;
    return (Date.now() - new Date(timestampEntrada).getTime()) / 3600000;
}

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
            const diff    = Math.max(0, Math.floor((ahora - new Date(timestampEntrada)) / 1000));
            const horas   = Math.floor(diff / 3600);
            const minutos = Math.floor((diff % 3600) / 60);
            const segs    = diff % 60;
            elTiempo.textContent =
                `Llevas ${String(horas).padStart(2,"0")}:${String(minutos).padStart(2,"0")}:${String(segs).padStart(2,"0")} trabajando`;
        } else {
            elTiempo.textContent = "";
        }
    }
    actualizarAvisoOlvido();
}

// ── Aviso de salida olvidada ───────────────────────────────────
function actualizarAvisoOlvido() {
    const aviso = document.getElementById("aviso-olvido");
    if (!aviso) return;
    if (horasAbierto() < HORAS_OLVIDO) {
        aviso.classList.add("oculto");
        return;
    }
    const entrada = new Date(timestampEntrada);
    const cuando  = entrada.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "short" });
    const hora    = entrada.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" });
    const texto   = `Tu entrada del ${cuando} a las ${hora} sigue abierta. ` +
                    `¿Se te pasó registrar la salida? Pon la hora en que saliste y se guarda como turno editado.`;
    const elTexto = document.getElementById("aviso-olvido-texto");
    if (elTexto.textContent !== texto) elTexto.textContent = texto;
    aviso.classList.remove("oculto");
}

document.getElementById("btn-poner-salida").addEventListener("click", () => {
    if (!timestampEntrada) return;
    abrirModalTurno("cerrar", { entrada_local: aInputLocal(new Date(timestampEntrada)) }, async () => {
        await consultarEstado();
        cargarSemana();
    });
});

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
    actualizarAvisoOlvido();
}

// ── Consultar estado ───────────────────────────────────────────
async function consultarEstado() {
    try {
        const res = await fetch(`${API}/registros/estado`);
        if (!res.ok) { aplicarEstado(false); return; }
        const data = await res.json();
        let tsEntrada = data.timestamp_entrada || null;
        aplicarEstado(data.dentro, tsEntrada);
    } catch (e) {
        aplicarEstado(false);
    }
}

// ── Click del botón ────────────────────────────────────────────
document.addEventListener("click", async (e) => {
    const btn = e.target.closest("#btn-registro");
    if (!btn) return;

    const endpoint = dentroDelTrabajo ? "salida" : "entrada";

    // Salida después de muchas horas: confirmar antes de guardar
    if (endpoint === "salida" && horasAbierto() >= HORAS_OLVIDO) {
        const horas = Math.floor(horasAbierto());
        const seguir = confirm(
            `Llevas ${horas} horas con la entrada abierta.\n\n` +
            `Si de verdad sales ahora, presiona Aceptar.\n` +
            `Si se te olvidó checar, presiona Cancelar y usa "Poner hora de salida".`
        );
        if (!seguir) return;
    }

    btn.disabled = true;

    try {
        const res  = await fetch(`${API}/registros/${endpoint}`, { method: "POST" });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || "Error al registrar.");
            btn.disabled = false;
            return;
        }

        if (endpoint === "entrada") {
            // Pedimos la hora guardada en el servidor (puede ajustarse
            // a la hora en punto por la tolerancia) para que el contador
            // no cambie al volver a abrir la app.
            aplicarEstado(true, new Date().toISOString());
            consultarEstado();
        } else {
            const d = data.detalle;
            if (d) {
                alert(
                    `✅ Salida registrada\n\n` +
                    `⏱ ${d.horas_validas} horas válidas\n` +
                    `💵 $${d.pago_calculado} MXN${d.es_festivo ? " 🎉 (festivo: 8 h dobles)" : ""}`
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