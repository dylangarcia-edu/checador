-- =============================================================
-- CHECADOR — 01_schema.sql
-- Creación de base de datos y tablas
-- =============================================================

CREATE DATABASE IF NOT EXISTS checador
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE checador;

-- -------------------------------------------------------------
-- USUARIOS
-- Cada persona tiene su propia cuenta con tarifa individual
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(50)      NOT NULL,
    password    VARCHAR(255)     NOT NULL    COMMENT 'Hash bcrypt',
    creado_en   DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_usuarios          PRIMARY KEY (id),
    CONSTRAINT uq_usuarios_nombre   UNIQUE (nombre)
) ENGINE=InnoDB COMMENT='Cuentas de usuario';


-- -------------------------------------------------------------
-- CONFIGURACION
-- Una fila por usuario — tarifa y tolerancia individuales
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuracion (
    usuario_id          INT UNSIGNED     NOT NULL,
    tarifa_hora         DECIMAL(8, 2)    NOT NULL DEFAULT 60.00   COMMENT 'Pago base por hora en MXN',
    tolerancia_minutos  TINYINT UNSIGNED NOT NULL DEFAULT 15       COMMENT 'Minutos de gracia antes de descontar hora completa',
    creado_en           DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_configuracion         PRIMARY KEY (usuario_id),
    CONSTRAINT fk_config_usuario        FOREIGN KEY (usuario_id)
                                            REFERENCES usuarios(id)
                                            ON DELETE CASCADE
) ENGINE=InnoDB COMMENT='Configuración individual por usuario';


-- -------------------------------------------------------------
-- FESTIVOS
-- Días que se pagan a tarifa triple — compartidos por todos
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS festivos (
    id          SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    fecha       DATE              NOT NULL,
    nombre      VARCHAR(100)      NOT NULL    COMMENT 'Nombre del día festivo',
    creado_en   DATETIME          NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_festivos          PRIMARY KEY (id),
    CONSTRAINT uq_festivos_fecha    UNIQUE (fecha)
) ENGINE=InnoDB COMMENT='Días festivos oficiales — pago triple';


-- -------------------------------------------------------------
-- REGISTROS
-- Cada fila es un evento: ENTRADA o SALIDA
-- Los campos de pago se calculan automáticamente vía trigger
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registros (
    id                  INT UNSIGNED                  NOT NULL AUTO_INCREMENT,
    tipo                ENUM('ENTRADA', 'SALIDA')     NOT NULL,
    usuario_id          INT UNSIGNED                  NOT NULL,
    timestamp_evento    DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Campos calculados por trigger al insertar SALIDA
    minutos_trabajados  SMALLINT UNSIGNED             DEFAULT NULL    COMMENT 'Minutos brutos entre entrada y salida',
    minutos_validos     SMALLINT UNSIGNED             DEFAULT NULL    COMMENT 'Minutos tras aplicar tolerancia',
    es_festivo          BOOLEAN                       DEFAULT NULL    COMMENT 'TRUE si el día cae en tabla festivos',
    pago_calculado      DECIMAL(10, 2)                DEFAULT NULL    COMMENT 'Pago en MXN para este par entrada-salida',

    -- Referencia al registro de ENTRADA que cierra esta SALIDA
    entrada_id          INT UNSIGNED                  DEFAULT NULL,
    creado_en           DATETIME                      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_registros             PRIMARY KEY (id),
    CONSTRAINT fk_registros_usuario     FOREIGN KEY (usuario_id)
                                            REFERENCES usuarios(id),
    CONSTRAINT fk_registros_entrada     FOREIGN KEY (entrada_id)
                                            REFERENCES registros(id)
                                            ON DELETE SET NULL
                                            ON UPDATE CASCADE
) ENGINE=InnoDB COMMENT='Eventos de entrada y salida del trabajador';

-- -------------------------------------------------------------
-- Pagos reales
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pagos_reales (
    id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
    usuario_id      INT UNSIGNED     NOT NULL,
    semana_inicio   DATE             NOT NULL,
    monto_real      DECIMAL(10, 2)   NOT NULL,
    nota            VARCHAR(255)     DEFAULT NULL,
    creado_en       DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en  DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT pk_pagos_reales      PRIMARY KEY (id),
    CONSTRAINT uq_pago_semana       UNIQUE (usuario_id, semana_inicio),
    CONSTRAINT fk_pagos_usuario     FOREIGN KEY (usuario_id)
                                        REFERENCES usuarios(id)
                                        ON DELETE CASCADE
) ENGINE=InnoDB;

-- -------------------------------------------------------------
-- ÍNDICES
-- -------------------------------------------------------------
CREATE INDEX idx_registros_usuario          ON registros (usuario_id);
CREATE INDEX idx_registros_tipo             ON registros (tipo);
CREATE INDEX idx_registros_timestamp        ON registros (timestamp_evento);
CREATE INDEX idx_registros_usuario_tipo     ON registros (usuario_id, tipo, timestamp_evento);