# ================================================================
# CHECADOR — run.py
# Arranca el servidor y abre el navegador automáticamente
# Ejecutar desde la raíz del proyecto: python run.py
# ================================================================

import threading
import webbrowser
import time
import sys
import os

# Agregar /backend al path
BASE = os.path.dirname(__file__)
sys.path.insert(0, os.path.join(BASE, "backend"))

from app import app  # type: ignore
from config import Config  # type: ignore

URL = "http://localhost:5000"

def abrir_navegador():
    time.sleep(2)
    webbrowser.open(URL)

if __name__ == "__main__":
    print("🟢 Iniciando Checador...")
    print(f"   Servidor: {URL}")
    print("   Presiona Ctrl+C para detener\n")

    hilo = threading.Thread(target=abrir_navegador, daemon=True)
    hilo.start()

    app.run(
        host      = "0.0.0.0",
        port      = 5000,
        debug     = False,   # False evita el doble arranque del reloader
        use_reloader = False # Confirma que no recarga automáticamente
    )