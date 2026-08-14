const express = require("express");
const router = express.Router();

const pool = require("../config/db");

router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM roles ORDER BY id");

        res.json(result.rows);
    } catch (error) {
        console.error("Error al consultar roles:", error.message);

        res.status(500).json({
            mensaje: "Error al consultar los roles"
        });
    }
});

module.exports = router;