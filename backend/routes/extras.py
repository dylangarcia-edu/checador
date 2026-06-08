# ================================================================
# CHECADOR — routes/extras.py
# ================================================================

from flask import Blueprint, jsonify, request, session
from database import get_db

bp = Blueprint("extras", __name__, url_prefix="/extras")

def usuario_activo():
    return session.get("usuario_id")


@bp.route("/semana/<fecha_inicio>", methods=["GET"])
def listar_extras(fecha_inicio):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nombre, monto, fecha FROM extras
            WHERE usuario_id = %s AND fecha >= %s AND fecha <= DATE_ADD(%s, INTERVAL 6 DAY)
            ORDER BY fecha ASC
        """, (uid, fecha_inicio, fecha_inicio))
        extras = cursor.fetchall()
        cursor.close()
        conn.close()
        for e in extras:
            e["fecha"] = str(e["fecha"])
            e["monto"] = float(e["monto"])
        return jsonify(extras), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("", methods=["POST"])
def agregar_extra():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        datos  = request.get_json()
        nombre = datos.get("nombre", "").strip()
        monto  = datos.get("monto")
        fecha  = datos.get("fecha")
        if not nombre or monto is None or not fecha:
            return jsonify({"error": "Nombre, monto y fecha requeridos."}), 400
        if float(monto) <= 0:
            return jsonify({"error": "El monto debe ser mayor a 0."}), 422
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO extras (usuario_id, nombre, monto, fecha) VALUES (%s, %s, %s, %s)",
            (uid, nombre, float(monto), fecha)
        )
        conn.commit()
        nuevo_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Extra agregado.", "id": nuevo_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/<int:extra_id>", methods=["DELETE"])
def eliminar_extra(extra_id):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM extras WHERE id = %s AND usuario_id = %s", (extra_id, uid))
        conn.commit()
        eliminados = cursor.rowcount
        cursor.close()
        conn.close()
        if eliminados == 0:
            return jsonify({"error": "Extra no encontrado."}), 404
        return jsonify({"mensaje": "Extra eliminado."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/semanas-sin-extras", methods=["GET"])
def semanas_sin_extras():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DISTINCT
                DATE(r.timestamp_evento - INTERVAL (WEEKDAY(r.timestamp_evento)) DAY) AS semana_inicio
            FROM registros r
            WHERE r.tipo = 'SALIDA'
              AND r.usuario_id = %s
              AND r.minutos_validos > 0
              AND DATE(r.timestamp_evento - INTERVAL (WEEKDAY(r.timestamp_evento)) DAY)
                  < DATE(NOW()) - INTERVAL (WEEKDAY(NOW())) DAY
              AND DATE(r.timestamp_evento - INTERVAL (WEEKDAY(r.timestamp_evento)) DAY)
                  NOT IN (
                      SELECT DISTINCT DATE(fecha - INTERVAL (WEEKDAY(fecha)) DAY)
                      FROM extras WHERE usuario_id = %s
                  )
        """, (uid, uid))
        semanas = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify([str(s["semana_inicio"]) for s in semanas]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500