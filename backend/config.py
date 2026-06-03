# ================================================================
# CHECADOR — config.py
# Lee el .env y expone la configuración a toda la aplicación
# ================================================================
 
import os
from dotenv import load_dotenv
 
# Carga las variables del archivo .env
load_dotenv()
 
 
class Config:
    # --- Base de datos -------------------------------------------
    DB_HOST     = os.getenv("DB_HOST",     "localhost")
    DB_PORT     = int(os.getenv("DB_PORT", 3306))
    DB_NAME     = os.getenv("DB_NAME",     "checador")
    DB_USER     = os.getenv("DB_USER",     "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
 
    # --- Flask ---------------------------------------------------
    SECRET_KEY  = os.getenv("SECRET_KEY",  "dev-secret")
    DEBUG       = os.getenv("FLASK_DEBUG", "False") == "True"