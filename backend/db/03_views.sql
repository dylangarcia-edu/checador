-- =============================================================
-- CHECADOR — 03_views.sql
-- pago_total = horas completas de la semana x tarifa
--            + bono festivo (primeras 8 h de cada turno festivo, otra vez)
-- Vistas con zona horaria de México (UTC-6, sin horario de verano)
--
-- La base de datos guarda todas las horas en UTC (CURRENT_TIMESTAMP
-- en Railway es UTC). Aquí se convierten a hora local con
-- CONVERT_TZ(x, '+00:00', '-06:00') para que fechas, horas y el
-- corte de semana (lunes a domingo) coincidan con la hora real.
-- =============================================================

USE checador;

-- -------------------------------------------------------------
-- vista_semana_actual
-- -------------------------------------------------------------
DROP VIEW IF EXISTS vista_semana_actual;
CREATE VIEW vista_semana_actual AS
SELECT
    t.usuario_id,
    t.semana_inicio,
    t.semana_inicio + INTERVAL 6 DAY                         AS semana_fin,
    COUNT(*)                                                 AS total_salidas,
    SUM(t.minutos_validos)                                   AS minutos_validos_total,
    FLOOR(SUM(t.minutos_validos) / 60)                       AS horas_validas_total,
    FLOOR(SUM(t.minutos_validos) / 60) * MAX(c.tarifa_hora)
      + ROUND(SUM(IF(t.es_festivo, LEAST(t.minutos_validos, 480), 0)) / 60
              * MAX(c.tarifa_hora), 2)                       AS pago_total,
    MAX(t.es_festivo)                                        AS tuvo_festivo,
    t.semana_inicio + INTERVAL 9 DAY                         AS fecha_pago_estimada
FROM (
    SELECT
        r.usuario_id,
        r.minutos_validos,
        r.es_festivo,
        DATE(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00')
             - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00'))) DAY) AS semana_inicio
    FROM registros r
    WHERE r.tipo = 'SALIDA' AND r.pago_calculado IS NOT NULL AND r.minutos_validos > 0
) t
JOIN configuracion c ON t.usuario_id = c.usuario_id
WHERE t.semana_inicio = DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')
                             - INTERVAL (WEEKDAY(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00'))) DAY)
GROUP BY t.usuario_id, t.semana_inicio;


-- -------------------------------------------------------------
-- vista_historial_semanal
-- -------------------------------------------------------------
DROP VIEW IF EXISTS vista_historial_semanal;
CREATE VIEW vista_historial_semanal AS
SELECT
    t.usuario_id,
    t.semana_inicio,
    t.semana_inicio + INTERVAL 6 DAY                         AS semana_fin,
    COUNT(*)                                                 AS total_salidas,
    SUM(t.minutos_validos)                                   AS minutos_validos_total,
    FLOOR(SUM(t.minutos_validos) / 60)                       AS horas_validas_total,
    FLOOR(SUM(t.minutos_validos) / 60) * MAX(c.tarifa_hora)
      + ROUND(SUM(IF(t.es_festivo, LEAST(t.minutos_validos, 480), 0)) / 60
              * MAX(c.tarifa_hora), 2)                       AS pago_total,
    MAX(t.es_festivo)                                        AS tuvo_festivo,
    t.semana_inicio + INTERVAL 9 DAY                         AS fecha_pago_estimada
FROM (
    SELECT
        r.usuario_id,
        r.minutos_validos,
        r.es_festivo,
        DATE(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00')
             - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento, '+00:00', '-06:00'))) DAY) AS semana_inicio
    FROM registros r
    WHERE r.tipo = 'SALIDA' AND r.pago_calculado IS NOT NULL AND r.minutos_validos > 0
) t
JOIN configuracion c ON t.usuario_id = c.usuario_id
WHERE t.semana_inicio < DATE(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00')
                             - INTERVAL (WEEKDAY(CONVERT_TZ(UTC_TIMESTAMP(), '+00:00', '-06:00'))) DAY)
GROUP BY t.usuario_id, t.semana_inicio
ORDER BY t.semana_inicio DESC;


-- -------------------------------------------------------------
-- vista_registros_detalle
-- -------------------------------------------------------------
DROP VIEW IF EXISTS vista_registros_detalle;
CREATE VIEW vista_registros_detalle AS
SELECT
    s.id                                                                       AS salida_id,
    e.id                                                                       AS entrada_id,
    s.usuario_id,
    DATE(CONVERT_TZ(e.timestamp_evento, '+00:00', '-06:00'))                   AS fecha,
    TIME(CONVERT_TZ(e.timestamp_evento, '+00:00', '-06:00'))                   AS hora_entrada,
    TIME(CONVERT_TZ(s.timestamp_evento, '+00:00', '-06:00'))                   AS hora_salida,
    DAYNAME(CONVERT_TZ(e.timestamp_evento, '+00:00', '-06:00'))                AS dia_semana,
    s.minutos_trabajados                                                       AS minutos_brutos,
    s.minutos_validos,
    ROUND(s.minutos_validos / 60.0, 2)                                         AS horas_validas,
    s.es_festivo,
    s.pago_calculado,
    DATE(CONVERT_TZ(e.timestamp_evento, '+00:00', '-06:00')
         - INTERVAL (WEEKDAY(CONVERT_TZ(e.timestamp_evento, '+00:00', '-06:00'))) DAY) AS semana_inicio
FROM registros s
JOIN registros e ON s.entrada_id = e.id
WHERE s.tipo = 'SALIDA' AND s.minutos_validos > 0
ORDER BY e.timestamp_evento DESC;
