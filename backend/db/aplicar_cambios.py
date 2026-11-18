# ================================================================
# CHECADOR — db/aplicar_cambios.py
# Vuelve a crear el trigger y las vistas en la base de datos que
# esté configurada en backend/.env (local o la de Railway).
#
# No borra ni modifica tus registros: solo reemplaza el trigger
# trg_calcular_pago_salida y las 3 vistas.
#
# Uso, desde la raíz del proyecto:
#     python backend/db/aplicar_cambios.py
# ================================================================

import os
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(AQUI))   # carpeta backend/

import mysql.connector          # noqa: E402
from config import Config       # noqa: E402  # type: ignore

ARCHIVOS = ["02_triggers.sql", "03_views.sql"]


def sentencias(ruta):
    """Separa un .sql en sentencias, respetando DELIMITER $$."""
    delim, actual = ";", []
    with open(ruta, encoding="utf-8") as f:
        for linea in f:
            limpia = linea.strip()
            if limpia.upper().startswith("DELIMITER"):
                delim = limpia.split()[1]
                continue
            # El nombre de la BD lo pone .env (en Railway suele ser "railway")
            if limpia.upper().startswith("USE "):
                continue
            actual.append(linea)
            if limpia.endswith(delim):
                sql = "".join(actual).strip()
                sql = sql[: -len(delim)].strip()
                actual = []
                if sql and not all(l.strip().startswith("--") for l in sql.splitlines()):
                    yield sql


def main():
    print(f"Conectando a {Config.DB_HOST}:{Config.DB_PORT}/{Config.DB_NAME} ...")
    conn = mysql.connector.connect(
        host=Config.DB_HOST, port=Config.DB_PORT, database=Config.DB_NAME,
        user=Config.DB_USER, password=Config.DB_PASSWORD, charset="utf8mb4",
    )
    cur = conn.cursor()

    cur.execute("SELECT NOW(), UTC_TIMESTAMP()")
    ahora, utc = cur.fetchone()
    print(f"  Hora del servidor MySQL: {ahora}  |  UTC: {utc}")
    if ahora != utc:
        print("  ⚠️  El servidor MySQL NO está en UTC. Las vistas asumen UTC;")
        print("     avísale a quien te ayude con el proyecto antes de seguir.")
        sys.exit(1)

    for nombre in ARCHIVOS:
        for sql in sentencias(os.path.join(AQUI, nombre)):
            cur.execute(sql)
        print(f"  ✅ {nombre} aplicado")

    conn.commit()
    cur.close()
    conn.close()
    print("Listo.")


if __name__ == "__main__":
    main()
