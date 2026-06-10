// ================================================================
// CHECADOR — admin.js
// Panel de administración
// ================================================================

async function cargarAdminUsuarios() {
    const lista = document.getElementById("admin-usuarios-lista");
    lista.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const res      = await fetch(`${API}/admin/usuarios`);
        const usuarios = await res.json();

        lista.innerHTML = "";

        usuarios.forEach(u => {
            const card = document.createElement("div");
            card.className = "historial-card";
            card.style.cursor = "pointer";
            card.innerHTML = `
                <div class="historial-card__izq">
                    <div class="historial-card__semana">
                        ${u.nombre} ${u.es_admin ? "👑" : ""}
                    </div>
                    <div class="historial-card__detalle">
                        ${u.trabajando_ahora ? "🟢 Trabajando ahora" : "⚪ Fuera"}
                    </div>
                    <div class="historial-card__detalle">
                        Esta semana: ${u.total_salidas} días · ${Number(u.horas_validas_total).toFixed(1)} h
                    </div>
                </div>
                <div class="historial-card__der">
                    <div class="historial-card__pago">$${Number(u.pago_total).toFixed(2)}</div>
                </div>
            `;
            card.addEventListener("click", () => abrirAdminUsuario(u));
            lista.appendChild(card);
        });

    } catch (e) {
        lista.innerHTML = `<p class="vacio-msg">Error al cargar usuarios.</p>`;
    }
}

async function abrirAdminUsuario(usuario) {
    document.getElementById("vista-admin-usuarios").style.display  = "none";
    document.getElementById("vista-admin-detalle").style.display   = "flex";

    document.getElementById("admin-detalle-nombre").textContent = usuario.nombre;

    // Cargar semana actual
    const semanaDiv = document.getElementById("admin-detalle-semana");
    semanaDiv.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const res    = await fetch(`${API}/admin/usuarios/${usuario.id}/semana`);
        const semana = await res.json();

        semanaDiv.innerHTML = `
            <div class="pago-hero" style="margin-bottom:12px;">
                <div class="pago-hero__label">Pago estimado esta semana</div>
                <div class="pago-hero__valor">$${Number(semana.pago_total).toFixed(2)}</div>
                <div class="pago-hero__sub">${semana.semana_inicio ? `${formatearFechaCorta(semana.semana_inicio)} – ${formatearFechaCorta(semana.semana_fin)}` : "Sin registros esta semana"}</div>
            </div>
            <div class="stat-grid">
                <div class="stat-card">
                    <div class="stat-card__emoji">⏱️</div>
                    <div class="stat-card__valor">${Number(semana.horas_validas_total).toFixed(0)} h</div>
                    <div class="stat-card__label">Horas</div>
                </div>
                <div class="stat-card">
                    <div class="stat-card__emoji">📅</div>
                    <div class="stat-card__valor">${semana.total_salidas}</div>
                    <div class="stat-card__label">Días</div>
                </div>
            </div>
        `;
    } catch (e) {
        semanaDiv.innerHTML = `<p class="vacio-msg">Error al cargar semana.</p>`;
    }

    // Cargar historial
    const historialDiv = document.getElementById("admin-detalle-historial");
    historialDiv.innerHTML = `<p class="vacio-msg">Cargando...</p>`;

    try {
        const res     = await fetch(`${API}/admin/usuarios/${usuario.id}/historial`);
        const semanas = await res.json();

        historialDiv.innerHTML = "";

        if (!semanas.length) {
            historialDiv.innerHTML = `<p class="vacio-msg">Sin historial.</p>`;
            return;
        }

        semanas.forEach(s => {
            const fila = document.createElement("div");
            fila.className = "historial-card";
            fila.innerHTML = `
                <div class="historial-card__izq">
                    <div class="historial-card__semana">
                        ${formatearFechaCorta(s.semana_inicio)} – ${formatearFechaCorta(s.semana_fin)}
                        ${s.tuvo_festivo ? "🎉" : ""}
                    </div>
                    <div class="historial-card__detalle">
                        ${s.total_salidas} días · ${Number(s.horas_validas_total).toFixed(1)} h
                    </div>
                </div>
                <div class="historial-card__der">
                    <div class="historial-card__pago">
                        $${s.monto_real !== null ? s.monto_real.toFixed(2) : Number(s.pago_total).toFixed(2)}
                    </div>
                    <div class="historial-card__fecha-pago">
                        ${s.monto_real !== null ? "Pago real" : "Estimado"}
                    </div>
                </div>
            `;
            historialDiv.appendChild(fila);
        });

    } catch (e) {
        historialDiv.innerHTML = `<p class="vacio-msg">Error al cargar historial.</p>`;
    }
}

function cerrarAdminDetalle() {
    document.getElementById("vista-admin-detalle").style.display  = "none";
    document.getElementById("vista-admin-usuarios").style.display = "flex";
}

function cerrarAdmin() {
    document.getElementById("vista-admin-usuarios").style.display  = "none";
    document.getElementById("vista-config-principal").style.display = "";
}