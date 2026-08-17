const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({
  origin: "http://localhost:3001",
  credentials: true
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        mensaje: "FarmaSync Backend funcionando"
    });
});
const apiRoutes = require("./routes");

app.use("/api", apiRoutes);

module.exports = app;