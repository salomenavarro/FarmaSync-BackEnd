const express = require("express");

const router = express.Router();

const { register, login } = require("./auth.controller");

const {
    validateRegister,
    validateLogin
} = require("./auth.validation");

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

module.exports = router;