const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            mensaje: "Token requerido"
        });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            mensaje: "Formato de token inválido"
        });
    }

    try {
        // Verificar que el JWT sea válido
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        //  Comprobar que la sesión todavía existe
        const result = await pool.query(
            `SELECT id, user_id, expira_en
             FROM user_sessions
             WHERE token = $1`,
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                mensaje: "La sesión no es válida o ya fue cerrada"
            });
        }

        // 3. Comprobar que la sesión no haya expirado
        if (new Date(result.rows[0].expira_en) < new Date()) {
            return res.status(401).json({
                mensaje: "La sesión ha expirado"
            });
        }

        // Guardamos la información del usuario
        req.usuario = usuario;

        // Guardamos también la sesión
        req.sesion = result.rows[0];

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });
    }
};

module.exports = authMiddleware;