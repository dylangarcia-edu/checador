-- =============================================================
-- CHECADOR — 04_seed.sql
-- Datos iniciales
-- =============================================================

USE checador;

-- -------------------------------------------------------------
-- Días festivos oficiales México — Ley Federal del Trabajo
-- 2025 y 2026
-- -------------------------------------------------------------
INSERT INTO festivos (fecha, nombre) VALUES

    -- 2025
    ('2025-01-01', 'Año Nuevo'),
    ('2025-02-03', 'Día de la Constitución'),
    ('2025-03-17', 'Natalicio de Benito Juárez'),
    ('2025-05-01', 'Día del Trabajo'),
    ('2025-09-16', 'Día de la Independencia'),
    ('2025-11-17', 'Día de la Revolución'),
    ('2025-12-25', 'Navidad'),

    -- 2026
    ('2026-01-01', 'Año Nuevo'),
    ('2026-02-02', 'Día de la Constitución'),
    ('2026-03-16', 'Natalicio de Benito Juárez'),
    ('2026-05-01', 'Día del Trabajo'),
    ('2026-09-16', 'Día de la Independencia'),
    ('2026-11-16', 'Día de la Revolución'),
    ('2026-12-25', 'Navidad')

ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);