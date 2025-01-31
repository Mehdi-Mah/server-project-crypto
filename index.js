const express = require("express");
const { PrismaClient } = require("@prisma/client");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const prisma = new PrismaClient();
const app = express();
const PORT = process.env.PORT || 5000;

const walletRoutes = require("./src/transaction-api/route");
const authRoutes = require("./src/auth-api/route");

app.use(express.json());
app.use(cookieParser());

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
