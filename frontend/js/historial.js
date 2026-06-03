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
            lista.appendChild(card);
        });

    } catch (e) {
        lista.innerHTML = `<p class="vacio-msg">Error al cargar el historial.</p>`;
        console.error("Error historial:", e);
    }
}