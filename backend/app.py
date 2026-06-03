# ================================================================
# CHECADOR — app.py
# ================================================================

from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from database import get_db
import os

FRONTEND = os.path.join(os.path.dirname(__file__), "..", "frontend")

app = Flask(__name__, static_folder=FRONTEND, static_url_path="")
app.config.from_object(Config)
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
app.config["SESSION_COOKIE_SAMESITE"]   = "Lax"
app.config["SESSION_COOKIE_HTTPONLY"]   = True
CORS(app, supports_credentials=True)

# ── Blueprints ─────────────────────────────────────────────────
from routes.auth          import bp as bp_auth
from routes.registros     import bp as bp_registros
from routes.semanas       import bp as bp_semanas
from routes.configuracion import bp as bp_configuracion

app.register_blueprint(bp_auth)
app.register_blueprint(bp_registros)
app.register_blueprint(bp_semanas)
app.register_blueprint(bp_configuracion)

# ── Frontend ───────────────────────────────────────────────────
@app.route("/")
def index():
    return send_from_directory(FRONTEND, "index.html")

# ── Salud ──────────────────────────────────────────────────────
@app.route("/ping")
def ping():
    try:
        conn   = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
        cursor.fetchall()
        cursor.close()
        conn.close()
        return {"status": "ok", "db": "conectada"}, 200
    except Exception as e:
        return {"status": "error", "detalle": str(e)}, 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=Config.DEBUG)