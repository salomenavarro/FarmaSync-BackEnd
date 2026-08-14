const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
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
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = usuario;

        next();

    } catch (error) {
        return res.status(401).json({
            mensaje: "Token inválido o expirado"
        });
    }
};

module.exports = authMiddleware;