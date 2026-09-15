-- =========================================================
-- FarmaSync - Módulo M1: Autenticación y gestión de usuarios
-- Migración: 001_init_auth_module
-- Basado en: RF-001, RF-002, RF-003, RF-004, RF-015, RF-016, RF-017
--            RNF-002 (contraseñas con hash, nunca en texto plano)
--
-- Cambio respecto al script original: la columna de
-- user_sessions que antes se llamaba "token" ahora se llama
-- "token_hash" porque guarda un hash SHA-256 del JWT, no el
-- token en texto plano (mismo motivo que password_hash: si se
-- filtra la BD, no quedan tokens de sesión usables).
-- =========================================================

BEGIN;

-- ---------------------------------------------------------
-- 1. Tabla de roles
-- Roles definidos en RF-001: paciente, cuidador, farmacéutico,
-- administrador EPS. Se usa tabla en vez de ENUM por si el
-- equipo necesita agregar/editar roles sin migrar tipos.
-- ---------------------------------------------------------
CREATE TABLE roles (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) UNIQUE NOT NULL
);

INSERT INTO roles (nombre) VALUES
    ('paciente'),
    ('cuidador'),
    ('farmaceutico'),
    ('administrador_eps');

-- ---------------------------------------------------------
-- 2. Tabla de usuarios
-- RF-001: nombre completo, documento, correo, teléfono,
--         password (hash, nunca texto plano - RNF-002)
-- RF-002: bloqueo temporal tras 5 intentos fallidos (15 min)
-- RF-016: edición de perfil
-- ---------------------------------------------------------
CREATE TABLE users (
    id                  SERIAL PRIMARY KEY,
    nombre_completo     VARCHAR(150) NOT NULL,
    numero_documento    VARCHAR(20)  UNIQUE NOT NULL,
    correo              VARCHAR(150) UNIQUE NOT NULL,
    telefono            VARCHAR(20),
    password_hash       VARCHAR(255) NOT NULL,
    role_id             INTEGER NOT NULL REFERENCES roles(id),

    -- control de intentos de login (RF-002)
    intentos_fallidos   SMALLINT NOT NULL DEFAULT 0,
    bloqueado_hasta     TIMESTAMP NULL,

    activo              BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_correo ON users (correo);
CREATE INDEX idx_users_documento ON users (numero_documento);

-- Trigger para mantener actualizado_en al día en cada UPDATE
CREATE OR REPLACE FUNCTION set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_actualizado_en
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_actualizado_en();

-- ---------------------------------------------------------
-- 3. Recuperación de contraseña
-- RF-003: enlace de recuperación con vigencia de 30 minutos
-- ---------------------------------------------------------
CREATE TABLE password_reset_tokens (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       VARCHAR(255) UNIQUE NOT NULL,
    expira_en   TIMESTAMP NOT NULL,
    usado       BOOLEAN NOT NULL DEFAULT FALSE,
    creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens (token);

-- ---------------------------------------------------------
-- 4. Sesiones activas
-- RF-004: cierre automático a los 15 min de inactividad
-- RF-017: logout invalida el token de sesión
-- (si el backend usa JWT stateless, esta tabla sirve para
--  poder invalidar/forzar el cierre de sesiones activas)
-- ---------------------------------------------------------
CREATE TABLE user_sessions (
    id                  SERIAL PRIMARY KEY,
    user_id             INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash          VARCHAR(500) UNIQUE NOT NULL,
    ip_address          VARCHAR(45),
    user_agent          TEXT,
    ultima_actividad    TIMESTAMP NOT NULL DEFAULT NOW(),
    expira_en           TIMESTAMP NOT NULL,
    creado_en           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_sessions_token_hash ON user_sessions (token_hash);

COMMIT;
