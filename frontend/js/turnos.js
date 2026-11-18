// ================================================================
// CHECADOR — turnos.js
// Filas de turno + modal para agregar, editar, eliminar turnos
// y cerrar una salida olvidada.
// ================================================================

let modoTurno       = "agregar";   // agregar | editar | cerrar
let turnoActual     = null;        // fila que se está editando
let alCambiarTurno  = null;        // función para refrescar la vista

// ── Utilidades de fecha ────────────────────────────────────────
function diaSemana(fechaStr) {
    const fecha = new Date(fechaStr + "T00:00:00");
    return capitalizar(fecha.toLocaleDateString("es-MX", { weekday: "long" }));
}

// "9:44:25" -> "9:44"
function horaCorta(hora) {
    if (!hora) return "—";
    const partes = String(hora).split(":");
    return `${partes[0]}:${partes[1]}`;
}

// Date -> "2026-11-17T09:00" (para <input type="datetime-local">)
function aInputLocal(fecha) {
    const p = n => String(n).padStart(2, "0");
    return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}` +
           `T${p(fecha.getHours())}:${p(fecha.getMinutes())}`;
}

function hoyISO() {
    return aInputLocal(new Date()).slice(0, 10);
}

// ── Fila de un turno (Semana e Historial) ──────────────────────
function crearFilaTurno(r, alCambiar) {
    const fila = document.createElement("button");
    fila.type = "button";
    fila.className = "detalle-fila detalle-fila--editable";
    fila.innerHTML = `
        <div class="detalle-fila__izq">
            <div class="detalle-fila__dia">
                ${diaSemana(r.fecha)} ${formatearFechaCorta(r.fecha)}
                ${r.es_festivo ? "🎉" : ""}
                ${r.editado_manual ? '<span class="etiqueta-manual">✏️ Editado</span>' : ""}
            </div>
            <div class="detalle-fila__horas">
                ${horaCorta(r.hora_entrada)} → ${horaCorta(r.hora_salida)} · ${r.horas_validas} h
            </div>
        </div>
        <div class="detalle-fila__pago">$${Number(r.pago_calculado).toFixed(2)}</div>
    `;
    fila.addEventListener("click", () => abrirModalTurno("editar", r, alCambiar));
    return fila;
}

// ── Modal ──────────────────────────────────────────────────────
const modalTurno    = document.getElementById("modal-turno");
const inputEntrada  = document.getElementById("turno-entrada");
const inputSalida   = document.getElementById("turno-salida");
const msgTurno      = document.getElementById("turno-mensaje");
const btnEliminar   = document.getElementById("btn-eliminar-turno");
const btnGuardarT   = document.getElementById("btn-guardar-turno");

function abrirModalTurno(modo, datos, alCambiar) {
    modoTurno      = modo;
    turnoActual    = datos || null;
    alCambiarTurno = alCambiar || null;

    msgTurno.classList.add("oculto");
    inputEntrada.disabled = false;
    btnEliminar.classList.add("oculto");
    const ahora = aInputLocal(new Date());
    inputEntrada.max = ahora;
    inputSalida.max  = ahora;

    if (modo === "editar") {
        document.getElementById("turno-titulo").textContent = "✏️ Editar turno";
        inputEntrada.value = datos.entrada_local;
        inputSalida.value  = datos.salida_local;
        btnEliminar.classList.remove("oculto");
        btnGuardarT.textContent = "Guardar";
    } else if (modo === "cerrar") {
        document.getElementById("turno-titulo").textContent = "🕐 ¿A qué hora saliste?";
        inputEntrada.value    = datos.entrada_local;
        inputEntrada.disabled = true;
        inputSalida.value     = "";
        btnGuardarT.textContent = "Registrar salida";
    } else {
        document.getElementById("turno-titulo").textContent = "➕ Agregar turno";
        const fecha = (datos && datos.fecha) || hoyISO();
        inputEntrada.value = `${fecha}T09:00`;
        inputSalida.value  = `${fecha}T17:00`;
        btnGuardarT.textContent = "Agregar";
    }

    modalTurno.classList.remove("oculto");
}

function cerrarModalTurno() {
    modalTurno.classList.add("oculto");
}

function errorTurno(texto) {
    msgTurno.textContent = texto;
    msgTurno.classList.remove("oculto");
}

async function guardarTurno() {
    if (!inputSalida.value || (!inputEntrada.disabled && !inputEntrada.value)) {
        errorTurno("Completa la hora de entrada y de salida.");
        return;
    }

    let url = `${API}/turnos`, metodo = "POST";
    let cuerpo = { entrada: inputEntrada.value, salida: inputSalida.value };

    if (modoTurno === "editar") {
        url = `${API}/turnos/${turnoActual.salida_id}`;
        metodo = "PUT";
    } else if (modoTurno === "cerrar") {
        url = `${API}/turnos/cerrar`;
        cuerpo = { salida: inputSalida.value };
    }

    btnGuardarT.disabled = true;
    try {
        const res  = await fetch(url, {
            method: metodo,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cuerpo)
        });
        const data = await res.json();
        if (!res.ok) { errorTurno(data.error || "No se pudo guardar."); return; }
        cerrarModalTurno();
        if (alCambiarTurno) await alCambiarTurno();
    } catch (e) {
        errorTurno("No se pudo conectar con el servidor.");
    } finally {
        btnGuardarT.disabled = false;
    }
}

async function eliminarTurno() {
    if (!turnoActual) return;
    if (!confirm("¿Eliminar este turno? No se puede deshacer.")) return;
    try {
        const res  = await fetch(`${API}/turnos/${turnoActual.salida_id}`, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) { errorTurno(data.error || "No se pudo eliminar."); return; }
        cerrarModalTurno();
        if (alCambiarTurno) await alCambiarTurno();
    } catch (e) {
        errorTurno("No se pudo conectar con el servidor.");
    }
}

document.getElementById("btn-cancelar-turno").addEventListener("click", cerrarModalTurno);
btnGuardarT.addEventListener("click", guardarTurno);
btnEliminar.addEventListener("click", eliminarTurno);
modalTurno.addEventListener("click", e => { if (e.target === modalTurno) cerrarModalTurno(); });
