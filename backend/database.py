# ================================================================
# CHECADOR — database.py
# Pool de conexiones — separado de app.py para evitar
# importaciones circulares
# ================================================================

from mysql.connector import pooling
from config import Config

connection_pool = pooling.MySQLConnectionPool(
    pool_name    = "checador_pool",
    pool_size    = 20,
    host         = Config.DB_HOST,
    port         = Config.DB_PORT,
    database     = Config.DB_NAME,
    user         = Config.DB_USER,
    password     = Config.DB_PASSWORD,
    charset      = "utf8mb4",
    use_pure     = True,
    time_zone    = "-06:00",
)

def get_db():
    return connection_pool.get_connection()