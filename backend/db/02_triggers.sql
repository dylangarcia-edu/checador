-- =============================================================
-- CHECADOR — 02_triggers.sql
-- Lógica automática ejecutada por MySQL
-- =============================================================

USE checador;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_calcular_pago_salida$$

CREATE TRIGGER trg_calcular_pago_salida
BEFORE INSERT ON registros
FOR EACH ROW
BEGIN
    DECLARE v_entrada_id        INT UNSIGNED;
    DECLARE v_entrada_ts        DATETIME;
    DECLARE v_minutos_brutos    SMALLINT UNSIGNED;
    DECLARE v_minutos_validos   SMALLINT UNSIGNED;
    DECLARE v_tarifa            DECIMAL(8, 2);
    DECLARE v_tolerancia        TINYINT UNSIGNED;
    DECLARE v_es_festivo        BOOLEAN;
    DECLARE v_multiplicador     TINYINT UNSIGNED;

    IF NEW.tipo = 'SALIDA' THEN

        -- Leer la tarifa del MISMO usuario
        SELECT tarifa_hora, tolerancia_minutos
        INTO   v_tarifa, v_tolerancia
        FROM   configuracion
        WHERE  usuario_id = NEW.usuario_id;

        -- Buscar la entrada más reciente del mismo usuario sin salida
        SELECT r.id, r.timestamp_evento
        INTO   v_entrada_id, v_entrada_ts
        FROM   registros r
        WHERE  r.tipo = 'ENTRADA'
          AND  r.usuario_id = NEW.usuario_id
          AND  r.id NOT IN (
                   SELECT entrada_id FROM registros
                   WHERE  entrada_id IS NOT NULL
                     AND  usuario_id = NEW.usuario_id
               )
        ORDER  BY r.timestamp_evento DESC
        LIMIT  1;

        IF v_entrada_id IS NOT NULL AND v_tarifa IS NOT NULL THEN

            SET v_minutos_brutos = TIMESTAMPDIFF(MINUTE, v_entrada_ts, NEW.timestamp_evento);

            SET v_minutos_validos = (
                FLOOR(v_minutos_brutos / 60) * 60
                + IF(MOD(v_minutos_brutos, 60) > v_tolerancia, MOD(v_minutos_brutos, 60), 0)
            );

            SET v_es_festivo = EXISTS (
                SELECT 1 FROM festivos WHERE fecha = DATE(NEW.timestamp_evento)
            );

            SET v_multiplicador = IF(v_es_festivo, 3, 1);

            SET NEW.entrada_id         = v_entrada_id;
            SET NEW.minutos_trabajados = v_minutos_brutos;
            SET NEW.minutos_validos    = v_minutos_validos;
            SET NEW.es_festivo         = v_es_festivo;
            SET NEW.pago_calculado     = ROUND((v_minutos_validos / 60.0) * v_tarifa * v_multiplicador, 2);

        END IF;
    END IF;
END$$

DELIMITER ;