// ================================================================
// CHECADOR — config.js
// ================================================================

const btnGuardar = document.getElementById("btn-guardar-config");
const msgConfig  = document.getElementById("config-mensaje");

async function cargarConfig() {
    try {
        const res    = await fetch(`${API}/configuracion`);
        const config = await res.json();
        document.getElementById("config-tarifa").value = config.tarifa_hora;
    } catch (e) {
        console.error("Error cargando configuración:", e);
    }
}

btnGuardar.addEventListener("click", async () => {
    const tarifa = parseFloat(document.getElementById("config-tarifa").value);
    if (isNaN(tarifa) || tarifa <= 0) {
        mostrarMensaje("La tarifa debe ser mayor a 0.", "error");
        return;
    }
    try {
        const res  = await fetch(`${API}/configuracion`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tarifa_hora: tarifa })
        });
        const data = await res.json();
        if (res.ok) mostrarMensaje("✅ Configuración guardada.", "ok");
        else mostrarMensaje(data.error || "Error al guardar.", "error");
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor.", "error");
    }
});

function mostrarMensaje(texto, tipo) {
    msgConfig.textContent = texto;
    msgConfig.className   = `config-mensaje ${tipo}`;
    msgConfig.classList.remove("oculto");
    setTimeout(() => msgConfig.classList.add("oculto"), 3000);
}