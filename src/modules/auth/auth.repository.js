const pool = require("../../config/db");

const findUserByEmail = async (correo) => {
    const result = await pool.query(
        "SELECT id FROM users WHERE correo = $1",
        [correo]
    );

    return result.rows[0];
};

const findUserByDocument = async (numero_documento) => {
    const result = await pool.query(
        "SELECT id FROM users WHERE numero_documento = $1",
        [numero_documento]
    );

    return result.rows[0];
};

const createUser = async ({
    nombre_completo,
    numero_documento,
    correo,
    telefono,
    password_hash,
    role_id
}) => {
    const result = await pool.query(
        `INSERT INTO users (
            nombre_completo,
            numero_documento,
            correo,
            telefono,
            password_hash,
            role_id
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING
            id,
            nombre_completo,
            numero_documento,
            correo,
            telefono,
            role_id,
            activo,
            creado_en`,
        [
            nombre_completo,
            numero_documento,
            correo,
            telefono || null,
            password_hash,
            role_id
        ]
    );

    return result.rows[0];
};



const findUserForLogin = async (correo) => {
    const result = await pool.query(
        `SELECT
            id,
            nombre_completo,
            numero_documento,
            correo,
            telefono,
            password_hash,
            role_id,
            activo,
            intentos_fallidos,
            bloqueado_hasta
         FROM users
         WHERE correo = $1`,
        [correo]
    );

    return result.rows[0];
};

const createSession = async ({
    user_id,
    token,
    ip_address,
    user_agent,
    expira_en
}) => {
    const result = await pool.query(
        `INSERT INTO user_sessions (
            user_id,
            token,
            ip_address,
            user_agent,
            expira_en
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING
            id,
            user_id,
            token,
            ip_address,
            user_agent,
            ultima_actividad,
            expira_en,
            creado_en`,
        [
            user_id,
            token,
            ip_address || null,
            user_agent || null,
            expira_en
        ]
    );

    return result.rows[0];
};

const deleteSession = async (token) => {
    await pool.query(
        "DELETE FROM user_sessions WHERE token = $1",
        [token]
    );
};

module.exports = {
    findUserByEmail,
    findUserByDocument,
    createUser,
    findUserForLogin,
    createSession,
    deleteSession
};