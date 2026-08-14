const { registerUser, loginUser } = require("./auth.service");

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
        const resultado = await loginUser(req.body);

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

module.exports = {
    register,
    login
};