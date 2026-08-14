const express = require("express");
const router = express.Router();

const pool = require("../config/db");

router.get("/db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            mensaje: "Conexión con PostgreSQL funcionando",
            fecha: result.rows[0].now
        });
    } catch (error) {
        console.error("Error:", error.message);

        res.status(500).json({
            mensaje: "Error conectando con PostgreSQL",
            error: error.message
        });
    }
});

module.exports = router;