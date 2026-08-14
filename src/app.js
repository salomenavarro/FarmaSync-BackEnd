const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "FarmaSync Backend funcionando"
    });
});

const testRoutes = require("./routes/test.routes");

app.use("/api", testRoutes);

const rolesRoutes = require("./routes/roles.routes");

app.use("/api/roles", rolesRoutes);

module.exports = app;
