# ================================================================
# CHECADOR — routes/semanas.py
# ================================================================

from flask import Blueprint, jsonify, session
from database import get_db

bp = Blueprint("semanas", __name__, url_prefix="/semanas")

def usuario_activo():
    return session.get("usuario_id")


@bp.route("/actual", methods=["GET"])
def semana_actual():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM vista_semana_actual WHERE usuario_id = %s", (uid,))
        semana = cursor.fetchone()
        cursor.close()
        conn.close()

        if not semana or semana["total_salidas"] is None:
            return jsonify({
                "total_salidas": 0, "minutos_validos_total": 0,
                "horas_validas_total": 0.0, "pago_total": 0.0,
                "tuvo_festivo": False, "semana_inicio": None,
                "semana_fin": None, "fecha_pago_estimada": None,
            }), 200

        semana["semana_inicio"]       = str(semana["semana_inicio"]) if semana["semana_inicio"] else None
        semana["semana_fin"]          = str(semana["semana_fin"]) if semana["semana_fin"] else None
        semana["fecha_pago_estimada"] = str(semana["fecha_pago_estimada"]) if semana["fecha_pago_estimada"] else None
        semana["pago_total"]          = float(semana["pago_total"]) if semana["pago_total"] else 0.0
        semana["horas_validas_total"] = float(semana["horas_validas_total"]) if semana["horas_validas_total"] else 0.0
        return jsonify(semana), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/historial", methods=["GET"])
def historial():
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM vista_historial_semanal WHERE usuario_id = %s", (uid,))
        semanas = cursor.fetchall()
        cursor.close()
        conn.close()

        for s in semanas:
            s["semana_inicio"]       = str(s["semana_inicio"]) if s["semana_inicio"] else None
            s["semana_fin"]          = str(s["semana_fin"]) if s["semana_fin"] else None
            s["fecha_pago_estimada"] = str(s["fecha_pago_estimada"]) if s["fecha_pago_estimada"] else None
            s["pago_total"]          = float(s["pago_total"]) if s["pago_total"] else 0.0
            s["horas_validas_total"] = float(s["horas_validas_total"]) if s["horas_validas_total"] else 0.0
        return jsonify(semanas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route("/detalle/<fecha_inicio>", methods=["GET"])
def detalle_semana(fecha_inicio):
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT * FROM vista_registros_detalle
            WHERE  semana_inicio = %s AND usuario_id = %s
            ORDER  BY fecha ASC
        """, (fecha_inicio, uid))
        registros = cursor.fetchall()
        cursor.close()
        conn.close()

        for r in registros:
            r["fecha"]          = str(r["fecha"])
            r["hora_entrada"]   = str(r["hora_entrada"])
            r["hora_salida"]    = str(r["hora_salida"])
            r["semana_inicio"]  = str(r["semana_inicio"])
            r["pago_calculado"] = float(r["pago_calculado"]) if r["pago_calculado"] else 0.0
            r["horas_validas"]  = float(r["horas_validas"]) if r["horas_validas"] else 0.0
        return jsonify(registros), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500