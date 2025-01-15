const express = require("express");
const router = express.Router();
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { accessTokenSecret, refreshTokenSecret } = require("../constante/const");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// let refreshTokens = [];

const walletAdress = process.env.WALLET_ADDRESS;

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        wallet: walletAdress,
      },
    });

    console.log("user", user);
    res.status(201).json({ message: "Utilisateur créé avec succès", user });
  } catch (error) {
    console.error("Erreur lors de l'inscription :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Connexion (Login)
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Mot de passe incorrect" });
    }

    // Générer les tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      accessTokenSecret,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      refreshTokenSecret,
      { expiresIn: "7d" }
    );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

router.get("/profile/get_wallet", async (req, res) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization) {
      return res.status(401).json({ message: "Authorization header missing" });
    }

    const token = authorization.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token missing" });
    }

    const payload = jwt.verify(token, accessTokenSecret);

    console.log("payload", payload);

    const user = await prisma.user.findUnique({
      where: {
        id: payload.id,
      },
      select: {
        wallet: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    return res.json({ wallet: user.wallet });
  } catch (error) {
    console.error("Erreur lors de la récupération du portefeuille :", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

// Mettre à jour l'adresse du portefeuille
router.put("/profile/update_wallet", async (req, res) => {
  try {
    const { email, wallet } = req.body;

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { wallet },
    });

    return res.json({ wallet: updatedUser.wallet });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du portefeuille :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Rafraîchir le token
router.post("/refresh", (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: "Token manquant" });
  if (!refreshTokens.includes(token)) {
    return res.status(403).json({ message: "Token invalide" });
  }

  // Vérifier et générer un nouveau token
  try {
    const payload = jwt.verify(token, refreshTokenSecret);
    const accessToken = jwt.sign(
      { id: payload.id, email: payload.email },
      accessTokenSecret,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token :", error);
    res.status(403).json({ message: "Token invalide" });
  }
});

// Déconnexion
router.delete("/logout", (req, res) => {
  const { token } = req.body;

  refreshTokens = refreshTokens.filter((t) => t !== token);
  res.json({ message: "Déconnecté avec succès" });
});

module.exports = router;
