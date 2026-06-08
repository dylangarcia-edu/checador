// ================================================================
// CHECADOR — historial.js
// ================================================================

async function cargarHistorial() {
    const lista = document.getElementById("historial-lista");
    lista.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const res     = await fetch(`${API}/semanas/historial`);
        const semanas = await res.json();

        if (!semanas.length) {
            lista.innerHTML = `<p class="vacio-msg">Sin semanas anteriores aún.</p>`;
            return;
        }

        lista.innerHTML = "";

        semanas.forEach(s => {
            const card = document.createElement("div");
            card.className = "historial-card";
            card.style.cursor = "pointer";
            card.innerHTML = `
                <div class="historial-card__izq">
                    <div class="historial-card__semana">
                        ${formatearFechaCorta(s.semana_inicio)} – ${formatearFechaCorta(s.semana_fin)}
                        ${s.tuvo_festivo ? "🎉" : ""}
                    </div>
                    <div class="historial-card__detalle">
                        ${s.total_salidas} día${s.total_salidas !== 1 ? "s" : ""} · ${Number(s.horas_validas_total).toFixed(1)} h
                    </div>
                </div>
                <div class="historial-card__der">
                    <div class="historial-card__pago">$${Number(s.pago_total).toFixed(2)}</div>
                    <div class="historial-card__fecha-pago">
                        Pago: ${formatearFechaCorta(s.fecha_pago_estimada)}
                    </div>
                </div>
            `;
            card.addEventListener("click", () => abrirDetalleHistorial(s));
            lista.appendChild(card);
        });

    } catch (e) {
        lista.innerHTML = `<p class="vacio-msg">Error al cargar el historial.</p>`;
        console.error("Error historial:", e);
    }
}

async function abrirDetalleHistorial(semana) {
    // Mostrar pantalla de detalle
    document.getElementById("pantalla-historial").style.display = "none";
    document.getElementById("pantalla-historial-detalle").style.display = "flex";

    // Header
    document.getElementById("detalle-rango").textContent =
        `${formatearFechaCorta(semana.semana_inicio)} – ${formatearFechaCorta(semana.semana_fin)}`;

    // Stats
    document.getElementById("detalle-pago").textContent =
        `$${Number(semana.pago_total).toFixed(2)}`;
    document.getElementById("detalle-pago-fecha").textContent =
        `Pago estimado: ${formatearFechaMedia(semana.fecha_pago_estimada)}`;
    document.getElementById("detalle-horas").textContent =
        `${Number(semana.horas_validas_total).toFixed(0)} h`;
    document.getElementById("detalle-dias").textContent =
        semana.total_salidas;

    // Festivo
    const aviso = document.getElementById("detalle-festivo-aviso");
    semana.tuvo_festivo ? aviso.classList.remove("oculto") : aviso.classList.add("oculto");

    // Cargar registros del día
    const lista = document.getElementById("detalle-lista");
    lista.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const res      = await fetch(`${API}/semanas/detalle/${semana.semana_inicio}`);
        const registros = await res.json();

        lista.innerHTML = "";

        if (!registros.length) {
            lista.innerHTML = `<p class="vacio-msg">Sin registros.</p>`;
            return;
        }

        registros.forEach(r => {
            const fila = document.createElement("div");
            fila.className = "detalle-fila";
            fila.innerHTML = `
                <div class="detalle-fila__izq">
                    <div class="detalle-fila__dia">
                        ${capitalizar(r.dia_semana)} ${formatearFechaCorta(r.fecha)}
                        ${r.es_festivo ? "🎉" : ""}
                    </div>
                    <div class="detalle-fila__horas">
                        ${r.hora_entrada} → ${r.hora_salida} · ${r.horas_validas} h
                    </div>
                </div>
                <div class="detalle-fila__pago">$${Number(r.pago_calculado).toFixed(2)}</div>
            `;
            lista.appendChild(fila);
        });

    } catch (e) {
        lista.innerHTML = `<p class="vacio-msg">Error al cargar registros.</p>`;
    }
}

function cerrarDetalleHistorial() {
    document.getElementById("pantalla-historial-detalle").style.display = "none";
    document.getElementById("pantalla-historial").style.display = "flex";
}