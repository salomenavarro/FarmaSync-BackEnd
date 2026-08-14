const {
    registerUser,
    loginUser,
    logoutUser
} = require("./auth.service");

const register = async (req, res) => {
    try {
        const usuario = await registerUser(req.body);

        res.status(201).json({
            mensaje: "Usuario registrado correctamente",
            usuario
        });

    } catch (error) {
        console.error("Error en registro:", error.message);

        res.status(error.status || 500).json({
            mensaje: error.message || "Error interno del servidor"
        });
    }
};

const login = async (req, res) => {
    try {
       const resultado = await loginUser(req.body, {
    ip_address: req.ip,
    user_agent: req.get("user-agent")
    });

        res.status(200).json({
            mensaje: "Inicio de sesión exitoso",
            ...resultado
        });

    } catch (error) {
        console.error("Error en login:", error.message);

        res.status(error.status || 500).json({
            mensaje: error.message || "Error interno del servidor"
        });
    }
};

const logout = async (req, res) => {
    try {
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

        await logoutUser(token);

        res.status(200).json({
            mensaje: "Sesión cerrada correctamente"
        });

    } catch (error) {
        console.error("Error en logout:", error.message);

        res.status(500).json({
            mensaje: "Error interno del servidor"
        });
    }
};

module.exports = {
    register,
    login,
    logout
};