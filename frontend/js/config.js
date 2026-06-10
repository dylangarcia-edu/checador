// ================================================================
// CHECADOR — config.js
// ================================================================

const btnGuardar = document.getElementById("btn-guardar-config");
const msgConfig  = document.getElementById("config-mensaje");

async function cargarConfig() {
    try {
        const [resConfig, resAdmin] = await Promise.all([
            fetch(`${API}/configuracion`),
            fetch(`${API}/admin/me`)
        ]);
        const config = await resConfig.json();
        const admin  = await resAdmin.json();

        document.getElementById("config-tarifa").value = config.tarifa_hora;

        // Mostrar botón admin solo si es admin
        const btnAdmin = document.getElementById("btn-panel-admin");
        if (admin.es_admin) {
            btnAdmin.classList.remove("oculto");
        } else {
            btnAdmin.classList.add("oculto");
        }
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

document.getElementById("btn-panel-admin").addEventListener("click", () => {
    document.getElementById("vista-config-principal").style.display = "none";
    document.getElementById("vista-admin-usuarios").style.display   = "flex";
    cargarAdminUsuarios();
});

function mostrarMensaje(texto, tipo) {
    msgConfig.textContent = texto;
    msgConfig.className   = `config-mensaje ${tipo}`;
    msgConfig.classList.remove("oculto");
    setTimeout(() => msgConfig.classList.add("oculto"), 3000);
}