const express = require("express");

const router = express.Router();

const {
    register,
    login,
    logout
} = require("./auth.controller");


const {
    validateRegister,
    validateLogin
} = require("./auth.validation");

const authMiddleware = require("../../middlewares/authMiddleware");

router.post(
    "/register",
    validateRegister,
    register
);

router.post(
    "/login",
    validateLogin,
    login
);

router.get(
    "/me",
    authMiddleware,
    (req, res) => {
        res.json({
            mensaje: "Autenticación correcta",
            usuario: req.usuario
        });
    }
);

router.post(
    "/logout",
    authMiddleware,
    logout
);

module.exports = router;