# ================================================================
# CHECADOR — routes/registros.py
# ================================================================

from flask import Blueprint, jsonify, session
from database import get_db

bp = Blueprint("registros", __name__, url_prefix="/registros")

def usuario_activo():
    return session.get("usuario_id")


@bp.route("/estado", methods=["GET"])
def estado():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, timestamp_evento
            FROM   registros
            WHERE  tipo = 'ENTRADA'
              AND  usuario_id = %s
              AND  id NOT IN (
                       SELECT entrada_id FROM registros
                       WHERE  entrada_id IS NOT NULL
                         AND  usuario_id = %s
                   )
            ORDER  BY timestamp_evento DESC
            LIMIT  1
        """, (uid, uid))
        entrada = cursor.fetchone()
        cursor.close()
        conn.close()
        if entrada:
            return jsonify({
                "dentro"           : True,
                "entrada_id"       : entrada["id"],
                "timestamp_entrada": str(entrada["timestamp_evento"]),
            }), 200
        return jsonify({"dentro": False}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/entrada", methods=["POST"])
def registrar_entrada():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT COUNT(*) AS abiertas
            FROM   registros
            WHERE  tipo = 'ENTRADA'
              AND  usuario_id = %s
              AND  id NOT IN (
                       SELECT entrada_id FROM registros
                       WHERE  entrada_id IS NOT NULL
                         AND  usuario_id = %s
                   )
        """, (uid, uid))
        if cursor.fetchone()["abiertas"] > 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "Ya hay una entrada registrada sin salida."}), 409

        cursor.execute(
            "INSERT INTO registros (tipo, usuario_id) VALUES ('ENTRADA', %s)", (uid,)
        )
        conn.commit()
        nuevo_id = cursor.lastrowid
        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Entrada registrada.", "registro_id": nuevo_id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/salida", methods=["POST"])
def registrar_salida():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT COUNT(*) AS abiertas
            FROM   registros
            WHERE  tipo = 'ENTRADA'
              AND  usuario_id = %s
              AND  id NOT IN (
                       SELECT entrada_id FROM registros
                       WHERE  entrada_id IS NOT NULL
                         AND  usuario_id = %s
                   )
        """, (uid, uid))
        if cursor.fetchone()["abiertas"] == 0:
            cursor.close()
            conn.close()
            return jsonify({"error": "No hay una entrada activa para cerrar."}), 409

        cursor.execute(
            "INSERT INTO registros (tipo, usuario_id) VALUES ('SALIDA', %s)", (uid,)
        )
        conn.commit()
        nuevo_id = cursor.lastrowid

        cursor.execute("""
            SELECT * FROM vista_registros_detalle
            WHERE  salida_id = %s AND usuario_id = %s
        """, (nuevo_id, uid))
        detalle = cursor.fetchone()
        cursor.close()
        conn.close()

        if detalle:
            detalle["hora_entrada"]  = str(detalle["hora_entrada"])
            detalle["hora_salida"]   = str(detalle["hora_salida"])
            detalle["fecha"]         = str(detalle["fecha"])
            detalle["semana_inicio"] = str(detalle["semana_inicio"])

        return jsonify({"mensaje": "Salida registrada.", "detalle": detalle}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500