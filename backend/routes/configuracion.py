# ================================================================
# CHECADOR — routes/configuracion.py
# ================================================================

from flask import Blueprint, jsonify, request, session
from database import get_db

bp = Blueprint("configuracion", __name__, url_prefix="/configuracion")

def usuario_activo():
    return session.get("usuario_id")


@bp.route("", methods=["GET"])
def obtener_configuracion():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM configuracion WHERE usuario_id = %s", (uid,))
        config = cursor.fetchone()
        cursor.close()
        conn.close()

        if not config:
            return jsonify({"error": "Configuración no encontrada."}), 404

        config["tarifa_hora"]    = float(config["tarifa_hora"])
        config["creado_en"]      = str(config["creado_en"])
        config["actualizado_en"] = str(config["actualizado_en"])
        return jsonify(config), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("", methods=["PUT"])
def actualizar_configuracion():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        datos = request.get_json()
        if not datos:
            return jsonify({"error": "Body JSON requerido."}), 400

        tarifa     = datos.get("tarifa_hora")
        tolerancia = datos.get("tolerancia_minutos")

        if tarifa is not None and float(tarifa) <= 0:
            return jsonify({"error": "La tarifa debe ser mayor a 0."}), 422
        if tolerancia is not None and not (0 <= int(tolerancia) <= 60):
            return jsonify({"error": "La tolerancia debe estar entre 0 y 60 minutos."}), 422

        campos  = []
        valores = []

        if tarifa is not None:
            campos.append("tarifa_hora = %s")
            valores.append(float(tarifa))
        if tolerancia is not None:
            campos.append("tolerancia_minutos = %s")
            valores.append(int(tolerancia))

        if not campos:
            return jsonify({"error": "No se enviaron campos para actualizar."}), 400

        valores.append(uid)
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute(
            f"UPDATE configuracion SET {', '.join(campos)} WHERE usuario_id = %s",
            valores
        )
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"mensaje": "Configuración actualizada correctamente."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/festivos", methods=["GET"])
def listar_festivos():
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM festivos ORDER BY fecha ASC")
        festivos = cursor.fetchall()
        cursor.close()
        conn.close()

        for f in festivos:
            f["fecha"]     = str(f["fecha"])
            f["creado_en"] = str(f["creado_en"])
        return jsonify(festivos), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/festivos", methods=["POST"])
def agregar_festivo():
    if not usuario_activo():
        return jsonify({"error": "No autenticado."}), 401
    try:
        datos  = request.get_json()
        fecha  = datos.get("fecha")
        nombre = datos.get("nombre")

        if not fecha or not nombre:
            return jsonify({"error": "Se requieren 'fecha' y 'nombre'."}), 400

        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO festivos (fecha, nombre) VALUES (%s, %s)", (fecha, nombre))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"mensaje": f"Festivo '{nombre}' agregado para {fecha}."}), 201

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/festivos/<int:festivo_id>", methods=["DELETE"])
def eliminar_festivo(festivo_id):
    if not usuario_activo():
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM festivos WHERE id = %s", (festivo_id,))
        conn.commit()
        eliminados = cursor.rowcount
        cursor.close()
        conn.close()

        if eliminados == 0:
            return jsonify({"error": "Festivo no encontrado."}), 404
        return jsonify({"mensaje": "Festivo eliminado."}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500