# ================================================================
# CHECADOR — routes/extras.py
# Endpoints para extras: propinas, bonos, etc.
# ================================================================

from flask import Blueprint, jsonify, request, session
from database import get_db

bp = Blueprint("extras", __name__, url_prefix="/extras")

def usuario_activo():
    return session.get("usuario_id")


# ----------------------------------------------------------------
# GET /extras/semana/<fecha_inicio>
# Lista los extras de una semana específica
# ----------------------------------------------------------------
@bp.route("/semana/<fecha_inicio>", methods=["GET"])
def listar_extras(fecha_inicio):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, nombre, monto, fecha
            FROM   extras
            WHERE  usuario_id = %s
              AND  fecha >= %s
              AND  fecha <= DATE_ADD(%s, INTERVAL 6 DAY)
            ORDER  BY fecha ASC
        """, (uid, fecha_inicio, fecha_inicio))
        extras = cursor.fetchall()
        cursor.close()
        conn.close()

        for e in extras:
            e["fecha"]  = str(e["fecha"])
            e["monto"]  = float(e["monto"])

        return jsonify(extras), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------
# POST /extras
# Agrega un extra
# Body: { "nombre": "Propina", "monto": 150, "fecha": "2026-06-08" }
# ----------------------------------------------------------------
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


# ----------------------------------------------------------------
# DELETE /extras/<id>
# Elimina un extra
# ----------------------------------------------------------------
@bp.route("/<int:extra_id>", methods=["DELETE"])
def eliminar_extra(extra_id):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM extras WHERE id = %s AND usuario_id = %s",
            (extra_id, uid)
        )
        conn.commit()
        eliminados = cursor.rowcount
        cursor.close()
        conn.close()

        if eliminados == 0:
            return jsonify({"error": "Extra no encontrado."}), 404
        return jsonify({"mensaje": "Extra eliminado."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500