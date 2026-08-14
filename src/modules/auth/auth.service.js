const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const {
    findUserByEmail,
    findUserByDocument,
    createUser,
    findUserForLogin,
    createSession,
    deleteSession
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

const loginUser = async ({ correo, password }, sessionData = {}) => {
    const usuario = await findUserForLogin(correo);

    if (!usuario) {
        const error = new Error("Correo o contraseña incorrectos");
        error.status = 401;
        throw error;
    }

    if (!usuario.activo) {
        const error = new Error("El usuario está inactivo");
        error.status = 403;
        throw error;
    }

    const passwordCorrecta = await bcrypt.compare(
        password,
        usuario.password_hash
    );

    if (!passwordCorrecta) {
        const error = new Error("Correo o contraseña incorrectos");
        error.status = 401;
        throw error;
    }

    const token = jwt.sign(
        {
            id: usuario.id,
            role_id: usuario.role_id,
            correo: usuario.correo
        },
        process.env.JWT_SECRET,
        {
            expiresIn: "15m"
        }
    );
    const expira_en = new Date(Date.now() + 15 * 60 * 1000);

     await createSession({
     user_id: usuario.id,
     token,
     ip_address: sessionData.ip_address,
     user_agent: sessionData.user_agent,
     expira_en
    });

    return {
        token,
        usuario: {
            id: usuario.id,
            nombre_completo: usuario.nombre_completo,
            correo: usuario.correo,
            role_id: usuario.role_id
        }
    };
};

module.exports = {
    registerUser,
    loginUser
};
