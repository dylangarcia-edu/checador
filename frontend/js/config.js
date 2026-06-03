// ================================================================
// CHECADOR — config.js
// Pantalla de configuración
// ================================================================

const btnGuardar    = document.getElementById("btn-guardar-config");
const msgConfig     = document.getElementById("config-mensaje");

// ── Cargar config actual ───────────────────────────────────────
async function cargarConfig() {
    try {
        const [resConfig, resFestivos] = await Promise.all([
            fetch(`${API}/configuracion`),
            fetch(`${API}/configuracion/festivos`)
        ]);

        const config   = await resConfig.json();
        const festivos = await resFestivos.json();

        document.getElementById("config-tarifa").value      = config.tarifa_hora;
        document.getElementById("config-tolerancia").value  = config.tolerancia_minutos;

        renderizarFestivos(festivos);

    } catch (e) {
        console.error("Error cargando configuración:", e);
    }
}

// ── Guardar cambios ────────────────────────────────────────────
btnGuardar.addEventListener("click", async () => {
    const tarifa     = parseFloat(document.getElementById("config-tarifa").value);
    const tolerancia = parseInt(document.getElementById("config-tolerancia").value);

    if (isNaN(tarifa) || tarifa <= 0) {
        mostrarMensaje("La tarifa debe ser mayor a 0.", "error");
        return;
    }

    if (isNaN(tolerancia) || tolerancia < 0 || tolerancia > 60) {
        mostrarMensaje("La tolerancia debe estar entre 0 y 60 minutos.", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/configuracion`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tarifa_hora: tarifa, tolerancia_minutos: tolerancia })
        });

        const data = await res.json();

        if (res.ok) {
            mostrarMensaje("✅ Configuración guardada.", "ok");
        } else {
            mostrarMensaje(data.error || "Error al guardar.", "error");
        }
    } catch (e) {
        mostrarMensaje("No se pudo conectar con el servidor.", "error");
    }
});

// ── Renderizar lista de festivos ───────────────────────────────
function renderizarFestivos(festivos) {
    const lista = document.getElementById("festivos-lista");
    lista.innerHTML = "";

    if (!festivos.length) {
        lista.innerHTML = `<p class="vacio-msg" style="padding:16px 0">Sin festivos registrados.</p>`;
        return;
    }

    festivos.forEach(f => {
        const item = document.createElement("div");
        item.className = "festivo-item";
        item.innerHTML = `
            <span class="festivo-item__nombre">🗓 ${f.nombre}</span>
            <span class="festivo-item__fecha">${formatearFechaMedia(f.fecha)}</span>
        `;
        lista.appendChild(item);
    });
}

// ── Mensaje de feedback ────────────────────────────────────────
function mostrarMensaje(texto, tipo) {
    msgConfig.textContent = texto;
    msgConfig.className   = `config-mensaje ${tipo}`;
    msgConfig.classList.remove("oculto");
    setTimeout(() => msgConfig.classList.add("oculto"), 3000);
}