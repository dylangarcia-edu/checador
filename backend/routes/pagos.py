# ================================================================
# CHECADOR — routes/pagos.py
# Endpoints para registrar el pago real recibido por semana
# ================================================================

from flask import Blueprint, jsonify, request, session
from database import get_db

bp = Blueprint("pagos", __name__, url_prefix="/pagos")

def usuario_activo():
    return session.get("usuario_id")

# ----------------------------------------------------------------
# GET /pagos/semanas-sin-pago
# Retorna las semanas del historial sin pago real registrado
# ----------------------------------------------------------------
@bp.route("/semanas-sin-pago", methods=["GET"])
def semanas_sin_pago():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT DISTINCT
                DATE(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00'))) DAY) AS semana_inicio
            FROM registros r
            WHERE r.tipo = 'SALIDA'
              AND r.usuario_id = %s
              AND r.minutos_validos > 0
              AND DATE(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00'))) DAY)
                  < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')) - INTERVAL (WEEKDAY(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00'))) DAY
              AND DATE(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00'))) DAY)
                  NOT IN (
                      SELECT semana_inicio FROM pagos_reales WHERE usuario_id = %s
                  )
        """, (uid, uid))
        semanas = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify([str(s["semana_inicio"]) for s in semanas]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ----------------------------------------------------------------
# GET /pagos/<semana_inicio>
# Obtiene el pago real de una semana
# ----------------------------------------------------------------
@bp.route("/<semana_inicio>", methods=["GET"])
def obtener_pago(semana_inicio):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT id, monto_real, nota, creado_en
            FROM   pagos_reales
            WHERE  usuario_id = %s AND semana_inicio = %s
        """, (uid, semana_inicio))
        pago = cursor.fetchone()
        cursor.close()
        conn.close()

        if not pago:
            return jsonify({"registrado": False}), 200

        pago["monto_real"] = float(pago["monto_real"])
        pago["creado_en"]  = str(pago["creado_en"])
        pago["registrado"] = True
        return jsonify(pago), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------
# POST /pagos
# Registra o actualiza el pago real de una semana
# Body: { "semana_inicio": "2026-06-01", "monto_real": 420, "nota": "..." }
# ----------------------------------------------------------------
@bp.route("", methods=["POST"])
def registrar_pago():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        datos         = request.get_json()
        semana_inicio = datos.get("semana_inicio")
        monto_real    = datos.get("monto_real")
        nota          = datos.get("nota", None)

        if not semana_inicio or monto_real is None:
            return jsonify({"error": "semana_inicio y monto_real requeridos."}), 400
        if float(monto_real) < 0:
            return jsonify({"error": "El monto no puede ser negativo."}), 422

        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO pagos_reales (usuario_id, semana_inicio, monto_real, nota)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                monto_real     = VALUES(monto_real),
                nota           = VALUES(nota),
                actualizado_en = CURRENT_TIMESTAMP
        """, (uid, semana_inicio, float(monto_real), nota))
        conn.commit()
        cursor.close()
        conn.close()

        return jsonify({"mensaje": "Pago registrado."}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# DELETE /pagos/<semana_inicio>
@bp.route("/<semana_inicio>", methods=["DELETE"])
def eliminar_pago(semana_inicio):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM pagos_reales WHERE usuario_id = %s AND semana_inicio = %s",
            (uid, semana_inicio)
        )
        conn.commit()
        cursor.close()
        conn.close()
        return jsonify({"mensaje": "Pago eliminado."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500