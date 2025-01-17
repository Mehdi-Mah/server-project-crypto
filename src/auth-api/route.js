const express = require("express");
const router = express.Router();
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
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
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    // Générer les tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken });
  } catch (error) {
    console.error("Erreur lors de la connexion :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Rafraîchir le token
router.post("/refresh_token", async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(403).json({ message: "Refresh token manquant" });
    }

    // Vérification de l'existence en base
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      return res.status(403).json({ message: "Token invalide ou révoqué" });
    }

    // Vérification de la validité du token
    let payload;
    try {
      payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(403).json({ message: "Token expiré" });
      }
      return res.status(403).json({ message: "Token invalide" });
    }

    // Vérification de l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return res.status(403).json({ message: "Utilisateur non trouvé" });
    }

    // Génération d'un nouvel access token
    const newAccessToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    // régénération du refresh token
    const newRefreshToken = jwt.sign(
      { id: user.id, email: user.email },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Mise à jour du refresh token en base
    await prisma.refreshToken.update({
      where: { token: refreshToken },
      data: {
        token: newRefreshToken,
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Vérification de l'email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

    console.log(token);

    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      return res.status(400).json({ message: "Token invalide" });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
    });

    if (!user) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    res.json({ message: "Email vérifié avec succès", isEmailVerified: true });
  } catch (error) {
    console.error("Erreur lors de la vérification de l'email :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Mot de passe oublié
router.post("/forgot_password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    console.log(email, newPassword);

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du mot de passe :", error);
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

    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

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

router.put("/profile/update_wallet", async (req, res) => {
  try {
    const accessToken = req.headers.authorization.split(" ")[1];
    const { wallet } = req.body;

    const payload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);

    console.log("payload", payload);

    const updatedUser = await prisma.user.update({
      where: {
        id: payload.id,
      },
      data: {
        wallet,
      },
      select: {
        wallet: true,
      },
    });

    return res.json({ wallet: updatedUser.wallet });
  } catch (error) {
    console.error("Erreur lors de la mise à jour du portefeuille :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// Déconnexion
router.delete("/logout", (req, res) => {
 
  res.clearCookie("refreshToken");
  res.json({ message: "Déconnecté avec succès" });
});

module.exports = router;
