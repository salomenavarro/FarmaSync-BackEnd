const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "FarmaSync Backend funcionando"
    });
});
const apiRoutes = require("./routes");

app.use("/api", apiRoutes);

module.exports = app;