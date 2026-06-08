// CHECADOR — semana.js v5

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