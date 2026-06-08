// ================================================================
// CHECADOR — app.js
// ================================================================

const API = "";

const botonesNav = document.querySelectorAll(".navbar__btn");
const pantallas  = document.querySelectorAll(".pantalla");

function navegar(id) {
    pantallas.forEach(p => p.classList.remove("activa"));
    botonesNav.forEach(b => b.classList.remove("activo"));

    // Si estamos en detalle historial y navegamos a otra pestaña, cerramos el detalle
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