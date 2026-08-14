const express = require("express");

const router = express.Router();

const authRoutes = require("../modules/auth/auth.routes");
const rolesRoutes = require("./roles.routes");

router.use("/auth", authRoutes);
router.use("/roles", rolesRoutes);

module.exports = router;