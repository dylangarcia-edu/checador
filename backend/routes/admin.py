# ================================================================
# CHECADOR — routes/admin.py
# Panel de administración — solo accesible para usuarios admin
# ================================================================

from flask import Blueprint, jsonify, session
from database import get_db

bp = Blueprint("admin", __name__, url_prefix="/admin")

def usuario_activo():
    return session.get("usuario_id")

def es_admin():
    uid = usuario_activo()
    if not uid:
        return False
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT es_admin FROM usuarios WHERE id = %s", (uid,))
        user = cursor.fetchone()
        cursor.close()
        conn.close()
        return bool(user and user["es_admin"])
    except:
        return False


# ----------------------------------------------------------------
# GET /admin/usuarios
# Lista todos los usuarios con su semana actual
# ----------------------------------------------------------------
@bp.route("/usuarios", methods=["GET"])
def listar_usuarios():
    if not es_admin():
        return jsonify({"error": "Sin permisos."}), 403
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT
                u.id,
                u.nombre,
                u.es_admin,
                u.creado_en,
                v.total_salidas,
                v.horas_validas_total,
                v.pago_total,
                v.semana_inicio,
                v.semana_fin,
                -- Estado: ¿está trabajando ahora?
                (SELECT COUNT(*) FROM registros r
                 WHERE r.tipo = 'ENTRADA'
                   AND r.usuario_id = u.id
                   AND r.id NOT IN (
                       SELECT entrada_id FROM registros
                       WHERE entrada_id IS NOT NULL AND usuario_id = u.id
                   )
                ) AS trabajando_ahora
            FROM usuarios u
            LEFT JOIN vista_semana_actual v ON v.usuario_id = u.id
            ORDER BY u.nombre ASC
        """)
        usuarios = cursor.fetchall()
        cursor.close()
        conn.close()

        for u in usuarios:
            u["creado_en"]         = str(u["creado_en"])
            u["semana_inicio"]     = str(u["semana_inicio"]) if u["semana_inicio"] else None
            u["semana_fin"]        = str(u["semana_fin"]) if u["semana_fin"] else None
            u["pago_total"]        = float(u["pago_total"]) if u["pago_total"] else 0.0
            u["horas_validas_total"] = float(u["horas_validas_total"]) if u["horas_validas_total"] else 0.0
            u["total_salidas"]     = u["total_salidas"] or 0
            u["trabajando_ahora"]  = bool(u["trabajando_ahora"])

        return jsonify(usuarios), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------
# GET /admin/usuarios/<uid>/semana
# Semana actual de un usuario específico
# ----------------------------------------------------------------
@bp.route("/usuarios/<int:uid>/semana", methods=["GET"])
def semana_usuario(uid):
    if not es_admin():
        return jsonify({"error": "Sin permisos."}), 403
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM vista_semana_actual WHERE usuario_id = %s", (uid,))
        semana = cursor.fetchone()
        cursor.close()
        conn.close()

        if not semana or semana["total_salidas"] is None:
            return jsonify({
                "total_salidas": 0, "horas_validas_total": 0.0,
                "pago_total": 0.0, "tuvo_festivo": False,
                "semana_inicio": None, "semana_fin": None,
                "fecha_pago_estimada": None,
            }), 200

        semana["semana_inicio"]       = str(semana["semana_inicio"]) if semana["semana_inicio"] else None
        semana["semana_fin"]          = str(semana["semana_fin"]) if semana["semana_fin"] else None
        semana["fecha_pago_estimada"] = str(semana["fecha_pago_estimada"]) if semana["fecha_pago_estimada"] else None
        semana["pago_total"]          = float(semana["pago_total"]) if semana["pago_total"] else 0.0
        semana["horas_validas_total"] = float(semana["horas_validas_total"]) if semana["horas_validas_total"] else 0.0
        return jsonify(semana), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------
# GET /admin/usuarios/<uid>/historial
# Historial de un usuario específico
# ----------------------------------------------------------------
@bp.route("/usuarios/<int:uid>/historial", methods=["GET"])
def historial_usuario(uid):
    if not es_admin():
        return jsonify({"error": "Sin permisos."}), 403
    try:
        conn   = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT v.*, p.monto_real
            FROM vista_historial_semanal v
            LEFT JOIN pagos_reales p
                ON p.usuario_id = v.usuario_id
               AND p.semana_inicio = v.semana_inicio
            WHERE v.usuario_id = %s
            ORDER BY v.semana_inicio DESC
        """, (uid,))
        semanas = cursor.fetchall()
        cursor.close()
        conn.close()

        for s in semanas:
            s["semana_inicio"]       = str(s["semana_inicio"]) if s["semana_inicio"] else None
            s["semana_fin"]          = str(s["semana_fin"]) if s["semana_fin"] else None
            s["fecha_pago_estimada"] = str(s["fecha_pago_estimada"]) if s["fecha_pago_estimada"] else None
            s["pago_total"]          = float(s["pago_total"]) if s["pago_total"] else 0.0
            s["horas_validas_total"] = float(s["horas_validas_total"]) if s["horas_validas_total"] else 0.0
            s["monto_real"]          = float(s["monto_real"]) if s["monto_real"] else None
        return jsonify(semanas), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------------
# GET /admin/me
# Verifica si el usuario actual es admin
# ----------------------------------------------------------------
@bp.route("/me", methods=["GET"])
def check_admin():
    if not es_admin():
        return jsonify({"es_admin": False}), 200
    return jsonify({"es_admin": True}), 200