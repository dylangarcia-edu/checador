// ================================================================
// CHECADOR — auth.js
// ================================================================

async function verificarSesion() {
    try {
        const res  = await fetch("/auth/me");
        const data = await res.json();
        if (data.logueado) mostrarApp(data.nombre);
        else mostrarLogin();
    } catch (e) {
        mostrarLogin();
    }
}

function mostrarApp(nombre) {
    document.getElementById("pantalla-auth").style.display = "none";
    document.getElementById("app-wrapper").style.display   = "flex";
    document.getElementById("usuario-nombre").textContent  = nombre;
    consultarEstado();
    cargarSemana();
    verificarPuntoHistorial();
}

function mostrarLogin() {
    document.getElementById("pantalla-auth").style.display = "flex";
    document.getElementById("app-wrapper").style.display   = "none";
}

document.getElementById("tab-login").addEventListener("click", () => {
    document.getElementById("tab-login").classList.add("activo");
    document.getElementById("tab-registro").classList.remove("activo");
    document.getElementById("form-login").classList.remove("oculto");
    document.getElementById("form-registro").classList.add("oculto");
    document.getElementById("auth-mensaje").classList.add("oculto");
});

document.getElementById("tab-registro").addEventListener("click", () => {
    document.getElementById("tab-registro").classList.add("activo");
    document.getElementById("tab-login").classList.remove("activo");
    document.getElementById("form-registro").classList.remove("oculto");
    document.getElementById("form-login").classList.add("oculto");
    document.getElementById("auth-mensaje").classList.add("oculto");
});

document.getElementById("btn-login").addEventListener("click", async () => {
    const nombre   = document.getElementById("login-nombre").value.trim();
    const password = document.getElementById("login-password").value;
    if (!nombre || !password) { mostrarAuthMensaje("Completa todos los campos.", "error"); return; }
    try {
        const res  = await fetch("/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, password }),
        });
        const data = await res.json();
        if (res.ok) mostrarApp(data.nombre);
        else mostrarAuthMensaje(data.error, "error");
    } catch (e) {
        mostrarAuthMensaje("Error de conexión.", "error");
    }
});

document.getElementById("btn-crear-cuenta").addEventListener("click", async () => {
    const nombre   = document.getElementById("reg-nombre").value.trim();
    const password = document.getElementById("reg-password").value;
    const confirm  = document.getElementById("reg-confirm").value;
    if (!nombre || !password || !confirm) { mostrarAuthMensaje("Completa todos los campos.", "error"); return; }
    if (password !== confirm) { mostrarAuthMensaje("Las contraseñas no coinciden.", "error"); return; }
    try {
        const res  = await fetch("/auth/registro", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nombre, password }),
        });
        const data = await res.json();
        if (res.ok) mostrarApp(data.nombre);
        else mostrarAuthMensaje(data.error, "error");
    } catch (e) {
        mostrarAuthMensaje("Error de conexión.", "error");
    }
});

document.getElementById("btn-logout").addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST" });
    mostrarLogin();
    document.getElementById("login-nombre").value   = "";
    document.getElementById("login-password").value = "";
});

function mostrarAuthMensaje(texto, tipo) {
    const msg = document.getElementById("auth-mensaje");
    msg.textContent = texto;
    msg.className   = `auth-mensaje ${tipo}`;
    msg.classList.remove("oculto");
}

verificarSesion();