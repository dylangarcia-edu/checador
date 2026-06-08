// ================================================================
// CHECADOR — app.js
// ================================================================

const API = "";

const botonesNav = document.querySelectorAll(".navbar__btn");
const pantallas  = document.querySelectorAll(".pantalla");

function navegar(id) {
    pantallas.forEach(p => p.classList.remove("activa"));
    botonesNav.forEach(b => b.classList.remove("activo"));

    document.getElementById("vista-historial-lista").style.display  = "";
    document.getElementById("vista-historial-detalle").style.display = "none";

    document.getElementById(`pantalla-${id}`).classList.add("activa");
    document.querySelector(`[data-pantalla="${id}"]`).classList.add("activo");

    if (id === "semana")    cargarSemana();
    if (id === "historial") cargarHistorial();
    if (id === "config")    cargarConfig();
}

botonesNav.forEach(btn => {
    btn.addEventListener("click", () => navegar(btn.dataset.pantalla));
});

async function verificarPuntoHistorial() {
    try {
        const res       = await fetch(`${API}/extras/semanas-sin-extras`);
        const sinExtras = await res.json();
        const dot = document.getElementById("historial-dot");
        sinExtras.length > 0
            ? dot.classList.remove("oculto")
            : dot.classList.add("oculto");
    } catch (e) {}
}

function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return "—";
    const fecha = new Date(fechaStr + "T00:00:00");
    return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

function formatearFechaMedia(fechaStr) {
    if (!fechaStr) return "—";
    const fecha = new Date(fechaStr + "T00:00:00");
    return fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

function capitalizar(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}