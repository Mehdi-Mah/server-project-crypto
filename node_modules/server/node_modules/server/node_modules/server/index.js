const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const walletRoutes = require("./src/transaction-api/route");
const authRoutes = require("./src/auth-api/route");

app.use(express.json());

const corsOptions = {
  origin: "http://localhost:3000",
  credentials: true,
};
app.use(cors(corsOptions));

app.use("/api/v1/user", walletRoutes);
app.use("/api/v1/auth", authRoutes);

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
