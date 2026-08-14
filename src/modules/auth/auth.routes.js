const express = require("express");

const router = express.Router();

const { register } = require("./auth.controller");
const { validateRegister } = require("./auth.validation");

router.post(
    "/register",
    validateRegister,
    register
);

module.exports = router;