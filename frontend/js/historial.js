// ================================================================
// CHECADOR — historial.js
// ================================================================

async function cargarHistorial() {
    const lista = document.getElementById("historial-lista");
    lista.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const [resSemanas, resSinExtras] = await Promise.all([
            fetch(`${API}/semanas/historial`),
            fetch(`${API}/extras/semanas-sin-extras`)
        ]);
        const semanas   = await resSemanas.json();
        const sinExtras = await resSinExtras.json();

        // Actualizar punto rojo
        const dot = document.getElementById("historial-dot");
        sinExtras.length > 0 ? dot.classList.remove("oculto") : dot.classList.add("oculto");

        if (!semanas.length) {
            lista.innerHTML = `<p class="vacio-msg">Sin semanas anteriores aún.</p>`;
            return;
        }

        lista.innerHTML = "";

        semanas.forEach(s => {
            const tienePropina = !sinExtras.includes(s.semana_inicio);
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
                    ${tienePropina
                        ? `<span class="badge-propina ok">✅ Propina registrada</span>`
                        : `<span class="badge-propina pendiente">⚠️ Sin propina</span>`
                    }
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
    }
}

async function abrirDetalleHistorial(semana) {
    document.getElementById("vista-historial-lista").style.display   = "none";
    document.getElementById("vista-historial-detalle").style.display = "flex";

    document.getElementById("detalle-rango").textContent =
        `${formatearFechaCorta(semana.semana_inicio)} – ${formatearFechaCorta(semana.semana_fin)}`;
    document.getElementById("detalle-pago").textContent =
        `$${Number(semana.pago_total).toFixed(2)}`;
    document.getElementById("detalle-pago-fecha").textContent =
        `Pago estimado: ${formatearFechaMedia(semana.fecha_pago_estimada)}`;
    document.getElementById("detalle-horas").textContent =
        `${Number(semana.horas_validas_total).toFixed(0)} h`;
    document.getElementById("detalle-dias").textContent = semana.total_salidas;

    const aviso = document.getElementById("detalle-festivo-aviso");
    semana.tuvo_festivo ? aviso.classList.remove("oculto") : aviso.classList.add("oculto");

    const lista = document.getElementById("detalle-lista");
    lista.innerHTML = `<p class="vacio-msg">Cargando...</p>`;
    try {
        const res       = await fetch(`${API}/semanas/detalle/${semana.semana_inicio}`);
        const registros = await res.json();
        lista.innerHTML = "";
        if (!registros.length) {
            lista.innerHTML = `<p class="vacio-msg">Sin registros.</p>`;
        } else {
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
        }
    } catch (e) {
        lista.innerHTML = `<p class="vacio-msg">Error al cargar registros.</p>`;
    }

    await cargarExtrasHistorial(semana.semana_inicio);
}

async function cargarExtrasHistorial(semana_inicio) {
    const lista      = document.getElementById("detalle-extras-lista");
    const total      = document.getElementById("detalle-extras-total");
    const estado     = document.getElementById("detalle-extras-estado");
    const btnAgregar = document.getElementById("btn-agregar-extra-historial");

    lista.innerHTML   = "";
    total.textContent = "";
    btnAgregar.dataset.semana = semana_inicio;

    try {
        const res    = await fetch(`${API}/extras/semana/${semana_inicio}`);
        const extras = await res.json();

        if (extras.length === 0) {
            estado.innerHTML     = `<span class="extras-estado pendiente">⚠️ Sin propina registrada</span>`;
            btnAgregar.className = "btn-agregar-extra pendiente";
        } else {
            estado.innerHTML     = `<span class="extras-estado ok">✅ Propina registrada</span>`;
            btnAgregar.className = "btn-agregar-extra";
            let suma = 0;
            extras.forEach(e => {
                suma += e.monto;
                const item = document.createElement("div");
                item.className = "extra-item";
                item.innerHTML = `
                    <div class="extra-item__izq">
                        <span class="extra-item__nombre">${e.nombre}</span>
                        <span class="extra-item__fecha">${formatearFechaCorta(e.fecha)}</span>
                    </div>
                    <div class="extra-item__der">
                        <span class="extra-item__monto">+$${e.monto.toFixed(2)}</span>
                        <button class="extra-item__del" onclick="eliminarExtraHistorial(${e.id}, '${semana_inicio}')">✕</button>
                    </div>
                `;
                lista.appendChild(item);
            });
            total.textContent = `Total extras: +$${suma.toFixed(2)}`;
        }
    } catch (e) {
        console.error("Error extras historial:", e);
    }
}

async function eliminarExtraHistorial(id, semana_inicio) {
    try {
        await fetch(`${API}/extras/${id}`, { method: "DELETE" });
        await cargarExtrasHistorial(semana_inicio);
        await verificarPuntoHistorial();
    } catch (e) {
        console.error("Error eliminando extra:", e);
    }
}

function cerrarDetalleHistorial() {
    document.getElementById("vista-historial-lista").style.display   = "";
    document.getElementById("vista-historial-detalle").style.display = "none";
}

document.getElementById("btn-agregar-extra-historial").addEventListener("click", () => {
    document.getElementById("modal-extra-historial").classList.remove("oculto");
    document.getElementById("extra-h-nombre").value = "";
    document.getElementById("extra-h-monto").value  = "";
});

document.getElementById("btn-cancelar-extra-h").addEventListener("click", () => {
    document.getElementById("modal-extra-historial").classList.add("oculto");
});

document.getElementById("btn-confirmar-extra-h").addEventListener("click", async () => {
    const nombre        = document.getElementById("extra-h-nombre").value.trim();
    const monto         = parseFloat(document.getElementById("extra-h-monto").value);
    const semana_inicio = document.getElementById("btn-agregar-extra-historial").dataset.semana;
    if (!nombre || isNaN(monto) || monto <= 0) return;
    try {
        await fetch(`${API}/extras`, {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify({ nombre, monto, fecha: semana_inicio })
        });
        document.getElementById("modal-extra-historial").classList.add("oculto");
        await cargarExtrasHistorial(semana_inicio);
        await verificarPuntoHistorial();
        // Recargar lista en segundo plano para actualizar badges
        cargarHistorial().then(() => {
            document.getElementById("vista-historial-lista").style.display   = "none";
            document.getElementById("vista-historial-detalle").style.display = "flex";
        });
    } catch (e) {
        console.error("Error agregando extra:", e);
    }
});