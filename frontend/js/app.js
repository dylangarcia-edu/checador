// ================================================================
// CHECADOR — app.js
// Router de navegación + configuración global
// ================================================================

const API = "";

// ── Navegación ─────────────────────────────────────────────────
const botonesNav = document.querySelectorAll(".navbar__btn");
const pantallas  = document.querySelectorAll(".pantalla");

function navegar(id) {
    // Ocultar todas las pantallas
    pantallas.forEach(p => p.classList.remove("activa"));
    botonesNav.forEach(b => b.classList.remove("activo"));

    // Activar la pantalla y botón seleccionados
    document.getElementById(`pantalla-${id}`).classList.add("activa");
    document.querySelector(`[data-pantalla="${id}"]`).classList.add("activo");

    // Recargar datos al cambiar de pantalla
    if (id === "semana")    cargarSemana();
    if (id === "historial") cargarHistorial();
    if (id === "config")    cargarConfig();
}

botonesNav.forEach(btn => {
    btn.addEventListener("click", () => navegar(btn.dataset.pantalla));
});

// ── Utilidades globales ────────────────────────────────────────

// Formatea una fecha YYYY-MM-DD a "12 jun"
function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return "—";
    const fecha = new Date(fechaStr + "T00:00:00");
    return fecha.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

// Formatea una fecha YYYY-MM-DD a "lun 12 jun"
function formatearFechaMedia(fechaStr) {
    if (!fechaStr) return "—";
    const fecha = new Date(fechaStr + "T00:00:00");
    return fecha.toLocaleDateString("es-MX", { weekday: "short", day: "numeric", month: "short" });
}

// Capitaliza primera letra
function capitalizar(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}