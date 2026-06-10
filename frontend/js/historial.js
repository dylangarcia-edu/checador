// ================================================================
// CHECADOR — historial.js
// ================================================================

async function cargarHistorial() {
    const lista = document.getElementById("historial-lista");
    lista.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const [resSemanas, resSinExtras, resSinPago] = await Promise.all([
            fetch(`${API}/semanas/historial`),
            fetch(`${API}/extras/semanas-sin-extras`),
            fetch(`${API}/pagos/semanas-sin-pago`)
        ]);
        const semanas   = await resSemanas.json();
        const sinExtras = await resSinExtras.json();
        const sinPago   = await resSinPago.json();

        const dot = document.getElementById("historial-dot");
        (sinExtras.length > 0 || sinPago.length > 0)
            ? dot.classList.remove("oculto")
            : dot.classList.add("oculto");

        if (!semanas.length) {
            lista.innerHTML = `<p class="vacio-msg">Sin semanas anteriores aún.</p>`;
            return;
        }

        lista.innerHTML = "";

        semanas.forEach(s => {
            const tienePropina = !sinExtras.includes(s.semana_inicio);
            const tienePago    = !sinPago.includes(s.semana_inicio);
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
                    <div class="historial-card__badges">
                        ${tienePropina
                            ? `<span class="badge-propina ok">✅ Propina</span>`
                            : `<span class="badge-propina pendiente">⚠️ Sin propina</span>`
                        }
                        ${tienePago
                            ? `<span class="badge-propina ok">✅ Pago registrado</span>`
                            : `<span class="badge-propina pendiente">⚠️ Sin pago real</span>`
                        }
                    </div>
                </div>
                <div class="historial-card__der">
                    <div class="historial-card__pago">$${s.monto_real !== null ? s.monto_real.toFixed(2) : Number(s.pago_total).toFixed(2)}</div>
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
        `Estimado app: ${formatearFechaMedia(semana.fecha_pago_estimada)}`;
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

    await Promise.all([
        cargarExtrasHistorial(semana.semana_inicio),
        cargarPagoReal(semana.semana_inicio, semana.pago_total)
    ]);
}

// ── Extras ────────────────────────────────────────────────────
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

// ── Pago real ─────────────────────────────────────────────────
async function cargarPagoReal(semana_inicio, pago_estimado) {
    const seccion     = document.getElementById("detalle-pago-real-seccion");
    const estado      = document.getElementById("detalle-pago-real-estado");
    const comparacion = document.getElementById("detalle-pago-comparacion");
    const inputRow    = document.getElementById("pago-real-input-row");
    const input       = document.getElementById("pago-real-input");
    const btn         = document.getElementById("btn-guardar-pago-real");

    btn.dataset.semana   = semana_inicio;
    btn.dataset.estimado = pago_estimado;
    seccion.classList.remove("oculto");

    try {
        const res  = await fetch(`${API}/pagos/${semana_inicio}`);
        const data = await res.json();

        if (!data.registrado) {
            estado.innerHTML      = `<span class="extras-estado pendiente">⚠️ Pago real no registrado</span>`;
            comparacion.innerHTML = `<span class="pago-estimado-hint">Estimado app: $${Number(pago_estimado).toFixed(2)}</span>`;
            input.value = "";
            inputRow.classList.remove("oculto");
        } else {
            const diff    = data.monto_real - pago_estimado;
            const diffStr = diff >= 0
                ? `<span style="color:var(--verde)">+$${diff.toFixed(2)} más de lo esperado</span>`
                : `<span style="color:var(--rojo)">-$${Math.abs(diff).toFixed(2)} menos de lo esperado</span>`;

            estado.innerHTML = `<span class="extras-estado ok">✅ Pago real registrado</span>`;
            comparacion.innerHTML = `
                <div class="pago-comparacion">
                    <div class="pago-comp-row">
                        <span class="pago-comp-label">Estimado app</span>
                        <span class="pago-comp-val">$${Number(pago_estimado).toFixed(2)}</span>
                    </div>
                    <div class="pago-comp-row">
                        <span class="pago-comp-label">Pago real</span>
                        <div class="extra-item__der">
                            <span class="pago-comp-val" style="color:var(--ambar)">$${data.monto_real.toFixed(2)}</span>
                            <button class="extra-item__del" onclick="eliminarPagoReal('${semana_inicio}', ${pago_estimado})">✕</button>
                        </div>
                    </div>
                    <div class="pago-comp-row pago-comp-diff">
                        <span class="pago-comp-label">Diferencia</span>
                        <span>${diffStr}</span>
                    </div>
                </div>
            `;
            inputRow.classList.add("oculto");
        }
    } catch (e) {
        console.error("Error pago real:", e);
    }
}

async function eliminarPagoReal(semana_inicio, pago_estimado) {
    try {
        await fetch(`${API}/pagos/${semana_inicio}`, { method: "DELETE" });
        await cargarPagoReal(semana_inicio, pago_estimado);
        await verificarPuntoHistorial();
        cargarHistorial().then(() => {
            document.getElementById("vista-historial-lista").style.display   = "none";
            document.getElementById("vista-historial-detalle").style.display = "flex";
        });
    } catch (e) {
        console.error("Error eliminando pago real:", e);
    }
}

document.getElementById("btn-guardar-pago-real").addEventListener("click", async () => {
    const btn           = document.getElementById("btn-guardar-pago-real");
    const semana_inicio = btn.dataset.semana;
    const pago_estimado = parseFloat(btn.dataset.estimado);
    const monto_real    = parseFloat(document.getElementById("pago-real-input").value);
    if (isNaN(monto_real) || monto_real < 0) return;
    try {
        await fetch(`${API}/pagos`, {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify({ semana_inicio, monto_real })
        });
        await cargarPagoReal(semana_inicio, pago_estimado);
        await verificarPuntoHistorial();
        cargarHistorial().then(() => {
            document.getElementById("vista-historial-lista").style.display   = "none";
            document.getElementById("vista-historial-detalle").style.display = "flex";
        });
    } catch (e) {
        console.error("Error guardando pago real:", e);
    }
});

// ── Cerrar detalle ─────────────────────────────────────────────
function cerrarDetalleHistorial() {
    document.getElementById("vista-historial-lista").style.display   = "";
    document.getElementById("vista-historial-detalle").style.display = "none";
}

// ── Modal extra ────────────────────────────────────────────────
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
        cargarHistorial().then(() => {
            document.getElementById("vista-historial-lista").style.display   = "none";
            document.getElementById("vista-historial-detalle").style.display = "flex";
        });
    } catch (e) {
        console.error("Error agregando extra:", e);
    }
});