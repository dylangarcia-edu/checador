// CHECADOR — semana.js v4

async function cargarSemana() {
    try {
        const resSemana = await fetch(`${API}/semanas/actual`);
        const semana = await resSemana.json();
        document.getElementById("semana-pago").textContent =
            `$${Number(semana.pago_total || 0).toFixed(2)}`;
        document.getElementById("semana-pago-fecha").textContent =
            semana.fecha_pago_estimada
                ? `Pago estimado: ${formatearFechaMedia(semana.fecha_pago_estimada)}`
                : "Sin registros esta semana";
        document.getElementById("semana-horas").textContent =
            `${Number(semana.horas_validas_total || 0).toFixed(2)} h`;
        document.getElementById("semana-dias").textContent =
            semana.total_salidas || 0;
        if (semana.semana_inicio && semana.semana_fin) {
            document.getElementById("semana-rango").textContent =
                `${formatearFechaCorta(semana.semana_inicio)} – ${formatearFechaCorta(semana.semana_fin)}`;
        }
        const avisoFestivo = document.getElementById("festivo-aviso");
        semana.tuvo_festivo
            ? avisoFestivo.classList.remove("oculto")
            : avisoFestivo.classList.add("oculto");
    } catch (e) {
        console.error("Error semana:", e);
    }

    try {
        const lunes = lunesActual();
        const resDetalle = await fetch(`${API}/semanas/detalle/${lunes}`);
        const detalle = await resDetalle.json();
        const lista = document.getElementById("semana-detalle");
        lista.innerHTML = "";
        if (!detalle || detalle.length === 0) {
            lista.innerHTML = `<p class="vacio-msg">Sin registros esta semana.</p>`;
        } else {
            detalle.forEach(r => {
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
        console.error("Error detalle:", e);
    }

    // Cargar extras de la semana
    await cargarExtras();
}

async function cargarExtras() {
    const lunes = lunesActual();
    try {
        const res    = await fetch(`${API}/extras/semana/${lunes}`);
        const extras = await res.json();
        renderizarExtras(extras);
    } catch (e) {
        console.error("Error extras:", e);
    }
}

function renderizarExtras(extras) {
    const seccion = document.getElementById("extras-seccion");
    const lista   = document.getElementById("extras-lista");
    const total   = document.getElementById("extras-total");

    lista.innerHTML = "";

    if (extras.length === 0) {
        seccion.querySelector(".extras-vacio").classList.remove("oculto");
    } else {
        seccion.querySelector(".extras-vacio").classList.add("oculto");
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
                    <button class="extra-item__del" onclick="eliminarExtra(${e.id})">✕</button>
                </div>
            `;
            lista.appendChild(item);
        });
        total.textContent = `+$${suma.toFixed(2)}`;
    }
}

async function eliminarExtra(id) {
    try {
        await fetch(`${API}/extras/${id}`, { method: "DELETE" });
        await cargarExtras();
    } catch (e) {
        console.error("Error eliminando extra:", e);
    }
}

// ── Modal agregar extra ────────────────────────────────────────
document.getElementById("btn-agregar-extra").addEventListener("click", () => {
    document.getElementById("modal-extra").classList.remove("oculto");
    document.getElementById("extra-nombre").value = "";
    document.getElementById("extra-monto").value  = "";
});

document.getElementById("btn-cancelar-extra").addEventListener("click", () => {
    document.getElementById("modal-extra").classList.add("oculto");
});

document.getElementById("btn-confirmar-extra").addEventListener("click", async () => {
    const nombre = document.getElementById("extra-nombre").value.trim();
    const monto  = parseFloat(document.getElementById("extra-monto").value);

    if (!nombre || isNaN(monto) || monto <= 0) return;

    try {
        await fetch(`${API}/extras`, {
            method : "POST",
            headers: { "Content-Type": "application/json" },
            body   : JSON.stringify({ nombre, monto, fecha: hoyLocal() })
        });
        document.getElementById("modal-extra").classList.add("oculto");
        await cargarExtras();
    } catch (e) {
        console.error("Error agregando extra:", e);
    }
});

function hoyLocal() {
    const hoy = new Date();
    const y = hoy.getFullYear();
    const m = String(hoy.getMonth() + 1).padStart(2, "0");
    const d = String(hoy.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

function lunesActual() {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diff = dia === 0 ? -6 : 1 - dia;
    const lunes = new Date(hoy);
    lunes.setDate(hoy.getDate() + diff);
    const y = lunes.getFullYear();
    const m = String(lunes.getMonth() + 1).padStart(2, "0");
    const d = String(lunes.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}