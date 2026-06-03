USE checador;

DROP VIEW IF EXISTS vista_semana_actual;
CREATE VIEW vista_semana_actual AS
SELECT
    usuario_id,
    DATE(timestamp_evento - INTERVAL (WEEKDAY(timestamp_evento)) DAY)                    AS semana_inicio,
    DATE(timestamp_evento - INTERVAL (WEEKDAY(timestamp_evento)) DAY + INTERVAL 6 DAY)   AS semana_fin,
    COUNT(*)                                                                              AS total_salidas,
    SUM(minutos_validos)                                                                  AS minutos_validos_total,
    FLOOR(SUM(minutos_validos) / 60)                                                      AS horas_validas_total,
    FLOOR(SUM(minutos_validos) / 60) * MAX(tarifa_hora)                                   AS pago_total,
    MAX(es_festivo)                                                                       AS tuvo_festivo,
    DATE(timestamp_evento - INTERVAL (WEEKDAY(timestamp_evento)) DAY + INTERVAL 9 DAY)   AS fecha_pago_estimada
FROM registros r
JOIN configuracion c ON r.usuario_id = c.usuario_id
WHERE r.tipo = 'SALIDA' AND r.pago_calculado IS NOT NULL AND r.minutos_validos > 0
  AND r.timestamp_evento >= DATE(NOW()) - INTERVAL (WEEKDAY(NOW())) DAY
  AND r.timestamp_evento <  DATE(NOW()) - INTERVAL (WEEKDAY(NOW())) DAY + INTERVAL 7 DAY
GROUP BY r.usuario_id, semana_inicio, semana_fin, fecha_pago_estimada;


DROP VIEW IF EXISTS vista_historial_semanal;
CREATE VIEW vista_historial_semanal AS
SELECT
    r.usuario_id,
    DATE(timestamp_evento - INTERVAL (WEEKDAY(timestamp_evento)) DAY)                    AS semana_inicio,
    DATE(timestamp_evento - INTERVAL (WEEKDAY(timestamp_evento)) DAY + INTERVAL 6 DAY)   AS semana_fin,
    COUNT(*)                                                                              AS total_salidas,
    SUM(minutos_validos)                                                                  AS minutos_validos_total,
    FLOOR(SUM(minutos_validos) / 60)                                                      AS horas_validas_total,
    FLOOR(SUM(minutos_validos) / 60) * MAX(c.tarifa_hora)                                 AS pago_total,
    MAX(es_festivo)                                                                       AS tuvo_festivo,
    DATE(timestamp_evento - INTERVAL (WEEKDAY(timestamp_evento)) DAY + INTERVAL 9 DAY)   AS fecha_pago_estimada
FROM registros r
JOIN configuracion c ON r.usuario_id = c.usuario_id
WHERE r.tipo = 'SALIDA' AND r.pago_calculado IS NOT NULL AND r.minutos_validos > 0
GROUP BY r.usuario_id, semana_inicio, semana_fin, fecha_pago_estimada
ORDER BY semana_inicio DESC;



DROP VIEW IF EXISTS vista_registros_detalle;
CREATE VIEW vista_registros_detalle AS
SELECT
    s.id                                                                                  AS salida_id,
    e.id                                                                                  AS entrada_id,
    s.usuario_id,
    DATE(e.timestamp_evento)                                                              AS fecha,
    TIME(e.timestamp_evento)                                                              AS hora_entrada,
    TIME(s.timestamp_evento)                                                              AS hora_salida,
    DAYNAME(e.timestamp_evento)                                                           AS dia_semana,
    s.minutos_trabajados                                                                  AS minutos_brutos,
    s.minutos_validos,
    ROUND(s.minutos_validos / 60.0, 2)                                                   AS horas_validas,
    s.es_festivo,
    s.pago_calculado,
    DATE(e.timestamp_evento - INTERVAL (WEEKDAY(e.timestamp_evento)) DAY)                AS semana_inicio
FROM registros s
JOIN registros e ON s.entrada_id = e.id
WHERE s.tipo = 'SALIDA' AND s.minutos_validos > 0
ORDER BY e.timestamp_evento DESC;