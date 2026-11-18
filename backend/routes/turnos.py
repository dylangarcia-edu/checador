# ================================================================
# CHECADOR — routes/turnos.py
# Agregar, editar y eliminar turnos a mano, y cerrar una entrada
# que se quedó abierta (salida olvidada).
#
# Las horas llegan del navegador en hora de México
# ("2026-11-16T09:44") y en la BD se guardan en UTC.
# Todo turno tocado a mano queda marcado con editado_manual = 1.
# ================================================================

from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request, session
from database import get_db
from config import Config

bp = Blueprint("turnos", __name__, url_prefix="/turnos")

MAX_HORAS_TURNO = 24


def usuario_activo():
    return session.get("usuario_id")


# ── Conversión de horas ────────────────────────────────────────
def local_a_utc(texto):
    """'2026-11-16T09:44' (hora México) -> datetime UTC sin zona."""
    if not texto:
        raise ValueError("Falta una fecha.")
    texto = texto.strip().replace(" ", "T")[:16]
    try:
        local = datetime.strptime(texto, "%Y-%m-%dT%H:%M")
    except ValueError:
        raise ValueError("Formato de fecha inválido.")
    return local - timedelta(hours=Config.UTC_OFFSET_HORAS)


def utc_a_local_texto(dt):
    return (dt + timedelta(hours=Config.UTC_OFFSET_HORAS)).strftime("%Y-%m-%dT%H:%M")


# ── Validaciones ───────────────────────────────────────────────
def validar_rango(entrada, salida):
    if salida <= entrada:
        return "La salida debe ser después de la entrada."
    if salida - entrada > timedelta(hours=MAX_HORAS_TURNO):
        return f"Un turno no puede durar más de {MAX_HORAS_TURNO} horas."
    if salida > datetime.utcnow() + timedelta(minutes=1):
        return "La salida no puede estar en el futuro."
    return None


def buscar_empalme(cursor, uid, entrada, salida, excluir_salida_id=None):
    """Devuelve un turno del usuario que se cruce con [entrada, salida)."""
    cursor.execute("""
        SELECT s.id
        FROM   registros s
        JOIN   registros e ON e.id = s.entrada_id
        WHERE  s.tipo = 'SALIDA'
          AND  s.usuario_id = %s
          AND  (%s IS NULL OR s.id <> %s)
          AND  e.timestamp_evento < %s
          AND  s.timestamp_evento > %s
        LIMIT 1
    """, (uid, excluir_salida_id, excluir_salida_id, salida, entrada))
    return cursor.fetchone()


def entrada_abierta(cursor, uid):
    cursor.execute("""
        SELECT id, timestamp_evento
        FROM   registros
        WHERE  tipo = 'ENTRADA'
          AND  usuario_id = %s
          AND  id NOT IN (
                   SELECT entrada_id FROM registros
                   WHERE  entrada_id IS NOT NULL AND usuario_id = %s
               )
        ORDER  BY timestamp_evento DESC
        LIMIT  1
    """, (uid, uid))
    return cursor.fetchone()


def obtener_turno(cursor, uid, salida_id):
    cursor.execute("""
        SELECT s.id AS salida_id, s.entrada_id
        FROM   registros s
        WHERE  s.id = %s AND s.tipo = 'SALIDA' AND s.usuario_id = %s
    """, (salida_id, uid))
    return cursor.fetchone()


def insertar_turno(cursor, uid, entrada, salida):
    """Inserta ENTRADA + SALIDA ligadas; el trigger calcula el pago."""
    cursor.execute("""
        INSERT INTO registros (tipo, usuario_id, timestamp_evento, editado_manual)
        VALUES ('ENTRADA', %s, %s, 1)
    """, (uid, entrada))
    entrada_id = cursor.lastrowid
    cursor.execute("""
        INSERT INTO registros (tipo, usuario_id, timestamp_evento, entrada_id, editado_manual)
        VALUES ('SALIDA', %s, %s, %s, 1)
    """, (uid, salida, entrada_id))
    return cursor.lastrowid


def leer_rango():
    datos = request.get_json(silent=True) or {}
    return local_a_utc(datos.get("entrada")), local_a_utc(datos.get("salida"))


def ejecutar(funcion):
    """Abre conexión + transacción; si algo falla, deshace todo."""
    uid = usuario_activo()
    if not uid:
        return jsonify({"error": "No autenticado."}), 401
    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    try:
        conn.start_transaction()
        respuesta = funcion(cursor, uid)
        if respuesta[1] < 400:
            conn.commit()
        else:
            conn.rollback()
        return respuesta
    except ValueError as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── POST /turnos — agregar turno a mano ────────────────────────
@bp.route("", methods=["POST"])
def agregar():
    def accion(cursor, uid):
        entrada, salida = leer_rango()
        error = validar_rango(entrada, salida)
        if error:
            return jsonify({"error": error}), 400
        abierta = entrada_abierta(cursor, uid)
        if abierta and abierta["timestamp_evento"] < salida:
            return jsonify({"error": "Se cruza con tu turno abierto. Registra primero su salida."}), 409
        if buscar_empalme(cursor, uid, entrada, salida):
            return jsonify({"error": "Ese horario se cruza con otro turno que ya tienes."}), 409
        salida_id = insertar_turno(cursor, uid, entrada, salida)
        return jsonify({"mensaje": "Turno agregado.", "salida_id": salida_id}), 201
    return ejecutar(accion)


# ── PUT /turnos/<salida_id> — editar horas de un turno ─────────
@bp.route("/<int:salida_id>", methods=["PUT"])
def editar(salida_id):
    def accion(cursor, uid):
        turno = obtener_turno(cursor, uid, salida_id)
        if not turno:
            return jsonify({"error": "Turno no encontrado."}), 404
        entrada, salida = leer_rango()
        error = validar_rango(entrada, salida)
        if error:
            return jsonify({"error": error}), 400
        abierta = entrada_abierta(cursor, uid)
        if abierta and abierta["timestamp_evento"] < salida:
            return jsonify({"error": "Se cruza con tu turno abierto. Registra primero su salida."}), 409
        if buscar_empalme(cursor, uid, entrada, salida, excluir_salida_id=salida_id):
            return jsonify({"error": "Ese horario se cruza con otro turno que ya tienes."}), 409
        # Se borra el par y se vuelve a crear para que el trigger
        # recalcule horas, festivo y pago.
        cursor.execute("DELETE FROM registros WHERE id = %s", (turno["salida_id"],))
        cursor.execute("DELETE FROM registros WHERE id = %s", (turno["entrada_id"],))
        nuevo_id = insertar_turno(cursor, uid, entrada, salida)
        return jsonify({"mensaje": "Turno actualizado.", "salida_id": nuevo_id}), 200
    return ejecutar(accion)


# ── DELETE /turnos/<salida_id> — eliminar turno ────────────────
@bp.route("/<int:salida_id>", methods=["DELETE"])
def eliminar(salida_id):
    def accion(cursor, uid):
        turno = obtener_turno(cursor, uid, salida_id)
        if not turno:
            return jsonify({"error": "Turno no encontrado."}), 404
        cursor.execute("DELETE FROM registros WHERE id = %s", (turno["salida_id"],))
        if turno["entrada_id"]:
            cursor.execute("DELETE FROM registros WHERE id = %s", (turno["entrada_id"],))
        return jsonify({"mensaje": "Turno eliminado."}), 200
    return ejecutar(accion)


# ── POST /turnos/cerrar — salida olvidada ──────────────────────
# Body: { "salida": "2026-11-17T17:00" }
@bp.route("/cerrar", methods=["POST"])
def cerrar_abierto():
    def accion(cursor, uid):
        abierta = entrada_abierta(cursor, uid)
        if not abierta:
            return jsonify({"error": "No tienes un turno abierto."}), 409
        datos = request.get_json(silent=True) or {}
        salida = local_a_utc(datos.get("salida"))
        error = validar_rango(abierta["timestamp_evento"], salida)
        if error:
            return jsonify({"error": error}), 400
        cursor.execute("""
            INSERT INTO registros (tipo, usuario_id, timestamp_evento, entrada_id, editado_manual)
            VALUES ('SALIDA', %s, %s, %s, 1)
        """, (uid, salida, abierta["id"]))
        return jsonify({"mensaje": "Salida registrada."}), 201
    return ejecutar(accion)
