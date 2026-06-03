# ================================================================
# CHECADOR — routes/auth.py
# ================================================================

from flask import Blueprint, request, jsonify, session
from database import get_db
import bcrypt

bp = Blueprint("auth", __name__, url_prefix="/auth")


@bp.route("/registro", methods=["POST"])
def registro():
    try:
        datos    = request.get_json()
        nombre   = datos.get("nombre", "").strip()
        password = datos.get("password", "")

        if not nombre or not password:
            return jsonify({"error": "Nombre y contraseña requeridos."}), 400
        if len(nombre) < 3:
            return jsonify({"error": "El nombre debe tener al menos 3 caracteres."}), 422
        if len(password) < 4:
            return jsonify({"error": "La contraseña debe tener al menos 4 caracteres."}), 422

        hash_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        conn   = get_db()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM usuarios WHERE nombre = %s", (nombre,))
        if cursor.fetchone():
            cursor.close()
            conn.close()
            return jsonify({"error": "Ese nombre de usuario ya está en uso."}), 409

        # Crear usuario
        cursor.execute(
            "INSERT INTO usuarios (nombre, password) VALUES (%s, %s)",
            (nombre, hash_pw.decode("utf-8"))
        )
        conn.commit()
        usuario_id = cursor.lastrowid

        # Crear configuración por defecto para este usuario
        cursor.execute(
            "INSERT INTO configuracion (usuario_id, tarifa_hora, tolerancia_minutos) VALUES (%s, 60.00, 15)",
            (usuario_id,)
        )
        conn.commit()

        cursor.close()
        conn.close()

        session["usuario_id"] = usuario_id
        session["nombre"]     = nombre

        return jsonify({"mensaje": "Cuenta creada.", "usuario_id": usuario_id, "nombre": nombre}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/login", methods=["POST"])
def login():
    try:
        datos    = request.get_json()
        nombre   = datos.get("nombre", "").strip()
        password = datos.get("password", "")

        if not nombre or not password:
            return jsonify({"error": "Nombre y contraseña requeridos."}), 400

        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM usuarios WHERE nombre = %s", (nombre,))
        usuario = cursor.fetchone()
        cursor.close()
        conn.close()

        if not usuario or not bcrypt.checkpw(password.encode("utf-8"), usuario["password"].encode("utf-8")):
            return jsonify({"error": "Usuario o contraseña incorrectos."}), 401

        session["usuario_id"] = usuario["id"]
        session["nombre"]     = usuario["nombre"]

        return jsonify({"mensaje": "Sesión iniciada.", "usuario_id": usuario["id"], "nombre": usuario["nombre"]}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"mensaje": "Sesión cerrada."}), 200


@bp.route("/me", methods=["GET"])
def me():
    if "usuario_id" in session:
        return jsonify({"logueado": True, "usuario_id": session["usuario_id"], "nombre": session["nombre"]}), 200
    return jsonify({"logueado": False}), 200