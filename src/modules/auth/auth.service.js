const bcrypt = require("bcryptjs");

const {
    findUserByEmail,
    findUserByDocument,
    createUser
} = require("./auth.repository");

const registerUser = async ({
    nombre_completo,
    numero_documento,
    correo,
    telefono,
    password,
    role_id
}) => {

    const usuarioPorCorreo = await findUserByEmail(correo);

    if (usuarioPorCorreo) {
        const error = new Error("El correo ya está registrado");
        error.status = 409;
        throw error;
    }

    const usuarioPorDocumento = await findUserByDocument(numero_documento);

    if (usuarioPorDocumento) {
        const error = new Error("El número de documento ya está registrado");
        error.status = 409;
        throw error;
    }

    const password_hash = await bcrypt.hash(password, 10);

    const usuario = await createUser({
        nombre_completo,
        numero_documento,
        correo,
        telefono,
        password_hash,
        role_id
    });

    return usuario;
};

module.exports = {
    registerUser
};