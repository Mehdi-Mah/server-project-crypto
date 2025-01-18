const express = require("express");
const router = express.Router();
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const nodemailer = require("nodemailer");

const prisma = new PrismaClient();

// let refreshTokens = [];

if (!process.env.ACCESS_TOKEN_SECRET) {
  throw new Error("ACCESS TOKEN SECRET is missing");
}

const walletAdress = process.env.WALLET_ADDRESS;

router.post("/register", async (req, res) => {
  try {
    const { email, password, walletAdress } = req.body;
    // TODO: check password complexity

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        wallet: walletAdress,
        validateAccount: false,
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
  const MAX_FAILED_ATTEMPTS = 3; // Nombre maximum de tentatives autorisées
  const LOCK_TIME = 5 * 60 * 1000; // Durée de verrouillage en millisecondes (5 minutes)

  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    // Vérifiez si le compte est verrouillé
    if (user.accountLockedUntil && new Date(user.accountLockedUntil) > new Date()) {
      const remainingTime = Math.ceil(
        (new Date(user.accountLockedUntil) - new Date()) / 1000
      );
      return res.status(403).json({
        message: `Compte verrouillé. Réessayez dans ${remainingTime} secondes.`,
      });
    }

    // Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const failedAttempts = user.failedLoginAttempts + 1;

      // Si le nombre d'échecs atteint la limite, verrouillez le compte
      if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCK_TIME);
        await prisma.user.update({
          where: { email },
          data: {
            failedLoginAttempts: failedAttempts,
            accountLockedUntil: lockUntil,
          },
        });
        return res.status(403).json({
          message: `Compte verrouillé après ${MAX_FAILED_ATTEMPTS} tentatives échouées. Réessayez dans 5 minutes.`,
        });
      }

      // Sinon, mettez à jour le nombre d'échecs
      await prisma.user.update({
        where: { email },
        data: { failedLoginAttempts: failedAttempts },
      });

      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    // Si la connexion est réussie, réinitialisez les compteurs d'échecs et déverrouillez le compte
    await prisma.user.update({
      where: { email },
      data: {
        failedLoginAttempts: 0,
        accountLockedUntil: null,
      },
    });

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

    //TODO: hash refresh token before saving in db
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      accessToken,
      user: {
        email: user.email,
        validateAccount: user.validateAccount,
      },
    });
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
      where: { token: refreshToken }, //atention hash token before saving in db
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
        token: newRefreshToken, //atention hash token before saving in db
        expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true, //samesite strict
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Erreur lors du rafraîchissement du token :", error);
    res.status(500).json({ message: "Erreur serveur" });
  }
});

// route pour l'envoie de l'email

router.post("/send-email", async (req, res) => {
  const { token } = req.body;

  try {
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
      where: {
        id: payload.id,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!user) {
      return res.status(400).json({ message: "Utilisateur non trouvé" });
    }

    const verificationToken = jwt.sign(
      { id: user.id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );
    const verifcationLink = `http://localhost:3000/verify-email/${verificationToken}`;

    // Configurer le transport d'email
    const transporter = nodemailer.createTransport({
      host: "localhost",
      port: 1025,
      secure: false,
    });

    // send email

    const sendEmail = async () => {
      try {
        const info = await transporter.sendMail({
          from: '"CryptoScope" <no-reply@crypto-scope.com>',
          to: user.email,
          subject: "Vérification de votre adresse email",
          html: `
            <p>Bonjour,</p>
            <p>Merci de vérifier votre adresse email en cliquant sur le lien ci-dessous :</p>
            <a href="${verifcationLink}" style="color: red;">Vérifier mon email</a>
            <p>Ce lien expirera dans 1 heure.</p>
          `,
        });
        res
          .status(200)
          .json({ message: "Email de vérification envoyé avec succès" });
        console.log("Email envoyé:", info.messageId);
      } catch (error) {
        console.error("Erreur lors de l'envoi de l'email :", error);
        res.status(500).json({ message: "Erreur interne du serveur" });
      }
    };
    sendEmail();
  } catch (error) {
    console.error("Erreur lors de l'envoie de l'email :", error);
    res.status(500).json({ message: "Erreur interne du serveur" });
  }
});

// Vérification de l'email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = req.body;

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

    await prisma.user.update({
      where: { id: user.id },
      data: { validateAccount: true },
    });

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

    //TODO: Delete all refresh token of user in the db on password change

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

  // Delete refresh token from db
  // const cookie = req.cookies.refreshToken;
});

module.exports = router;
