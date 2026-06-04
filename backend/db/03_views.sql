-- =============================================================
-- CHECADOR — 03_views.sql
-- Vistas con zona horaria America/Monterrey (UTC-6)
-- =============================================================

USE checador;

-- -------------------------------------------------------------
-- vista_semana_actual
-- -------------------------------------------------------------
DROP VIEW IF EXISTS vista_semana_actual;
CREATE VIEW vista_semana_actual AS
SELECT
    r.usuario_id,
    DATE(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00'))) DAY)                  AS semana_inicio,
    DATE(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00'))) DAY + INTERVAL 6 DAY)  AS semana_fin,
    COUNT(*)                                                                                                                                             AS total_salidas,
    SUM(r.minutos_validos)                                                                                                                               AS minutos_validos_total,
    FLOOR(SUM(r.minutos_validos) / 60)                                                                                                                   AS horas_validas_total,
    FLOOR(SUM(r.minutos_validos) / 60) * MAX(c.tarifa_hora)                                                                                              AS pago_total,
    MAX(r.es_festivo)                                                                                                                                    AS tuvo_festivo,
    DATE(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00'))) DAY + INTERVAL 9 DAY)  AS fecha_pago_estimada
FROM registros r
JOIN configuracion c ON r.usuario_id = c.usuario_id
WHERE r.tipo = 'SALIDA' AND r.pago_calculado IS NOT NULL AND r.minutos_validos > 0
  AND CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') >= DATE(CONVERT_TZ(NOW(),'+00:00','-06:00')) - INTERVAL (WEEKDAY(DATE(CONVERT_TZ(NOW(),'+00:00','-06:00')))) DAY
  AND CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') <  DATE(CONVERT_TZ(NOW(),'+00:00','-06:00')) - INTERVAL (WEEKDAY(DATE(CONVERT_TZ(NOW(),'+00:00','-06:00')))) DAY + INTERVAL 7 DAY
GROUP BY r.usuario_id, semana_inicio, semana_fin, fecha_pago_estimada;


-- -------------------------------------------------------------
-- vista_historial_semanal
-- -------------------------------------------------------------
DROP VIEW IF EXISTS vista_historial_semanal;
CREATE VIEW vista_historial_semanal AS
SELECT
    r.usuario_id,
    DATE(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00'))) DAY)                  AS semana_inicio,
    DATE(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00'))) DAY + INTERVAL 6 DAY)  AS semana_fin,
    COUNT(*)                                                                                                                                             AS total_salidas,
    SUM(r.minutos_validos)                                                                                                                               AS minutos_validos_total,
    FLOOR(SUM(r.minutos_validos) / 60)                                                                                                                   AS horas_validas_total,
    FLOOR(SUM(r.minutos_validos) / 60) * MAX(c.tarifa_hora)                                                                                              AS pago_total,
    MAX(r.es_festivo)                                                                                                                                    AS tuvo_festivo,
    DATE(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(r.timestamp_evento,'+00:00','-06:00'))) DAY + INTERVAL 9 DAY)  AS fecha_pago_estimada
FROM registros r
JOIN configuracion c ON r.usuario_id = c.usuario_id
WHERE r.tipo = 'SALIDA' AND r.pago_calculado IS NOT NULL AND r.minutos_validos > 0
GROUP BY r.usuario_id, semana_inicio, semana_fin, fecha_pago_estimada
ORDER BY semana_inicio DESC;


-- -------------------------------------------------------------
-- vista_registros_detalle
-- -------------------------------------------------------------
DROP VIEW IF EXISTS vista_registros_detalle;
CREATE VIEW vista_registros_detalle AS
SELECT
    s.id                                                                                                AS salida_id,
    e.id                                                                                               AS entrada_id,
    s.usuario_id,
    DATE(CONVERT_TZ(e.timestamp_evento,'+00:00','-06:00'))                                            AS fecha,
    TIME(CONVERT_TZ(e.timestamp_evento,'+00:00','-06:00'))                                            AS hora_entrada,
    TIME(CONVERT_TZ(s.timestamp_evento,'+00:00','-06:00'))                                            AS hora_salida,
    DAYNAME(CONVERT_TZ(e.timestamp_evento,'+00:00','-06:00'))                                         AS dia_semana,
    s.minutos_trabajados                                                                               AS minutos_brutos,
    s.minutos_validos,
    ROUND(s.minutos_validos / 60.0, 2)                                                                AS horas_validas,
    s.es_festivo,
    s.pago_calculado,
    DATE(CONVERT_TZ(e.timestamp_evento,'+00:00','-06:00') - INTERVAL (WEEKDAY(CONVERT_TZ(e.timestamp_evento,'+00:00','-06:00'))) DAY) AS semana_inicio
FROM registros s
JOIN registros e ON s.entrada_id = e.id
WHERE s.tipo = 'SALIDA' AND s.minutos_validos > 0
ORDER BY e.timestamp_evento DESC;