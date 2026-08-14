const validateRegister = (req, res, next) => {
    const {
        nombre_completo,
        numero_documento,
        correo,
        telefono,
        password,
        role_id
    } = req.body;

    if (!nombre_completo || !numero_documento || !correo || !password || !role_id) {
        return res.status(400).json({
            mensaje: "Faltan campos obligatorios"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            mensaje: "La contraseña debe tener mínimo 8 caracteres"
        });
    }

    const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!correoValido.test(correo)) {
        return res.status(400).json({
            mensaje: "El correo no tiene un formato válido"
        });
    }

    next();
};

module.exports = {
    validateRegister
};