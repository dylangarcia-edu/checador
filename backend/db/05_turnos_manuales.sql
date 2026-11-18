-- =============================================================
-- CHECADOR — 05_turnos_manuales.sql
-- Agrega la marca de "turno editado a mano".
-- Correr UNA sola vez en la base existente (en Workbench),
-- y después volver a correr 02_triggers.sql y 03_views.sql.
-- =============================================================

USE checador;

ALTER TABLE registros
    ADD COLUMN editado_manual BOOLEAN NOT NULL DEFAULT FALSE
        COMMENT 'TRUE si el turno se agregó o corrigió a mano'
        AFTER entrada_id;
