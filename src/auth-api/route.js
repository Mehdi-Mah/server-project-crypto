const express = require("express");
const router = express.Router();
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { accessTokenSecret, refreshTokenSecret } = require("../constante/const");

const fakeUser = {
  email: "houenoujohannes60@gmail.com",
  password: "johannes",
};

const walletAdress = process.env.WALLET_ADDRESS;

const newWalletAdress = process.env.NEW_WALLET_ADDRESS;

router.get("/profile/get_wallet", async (req, res) => {
  // recuperer l'adresse de la db plus tard

  return res.json({
    wallet: walletAdress,
  });
});

router.put("/profile/update_wallet", async (req, res) => {
  // update wallet dans la db plus tard

  const { wallet } = req.body;
  console.log("wallet updated", wallet);

  return res.json({
    wallet: wallet,
  });
});

let refreshTokens = []; // a mettre dans la db plus tard

router.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // register fake user

  return res.json({
    message: "Utilisateur enregistré avec succès",
    user: { fakeUser },
  });

  // saving user in database with prisma
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = fakeUser.email === email ? fakeUser : null;
  if (!user) return res.status(401).json({ message: "Utilisateur non trouvé" });

  // Vérifie le mot de passe
  const isPasswordValid = password === user.password;
  if (!isPasswordValid)
    return res.status(401).json({ message: "Mot de passe incorrect" });

  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    accessTokenSecret,
    {
      expiresIn: "15m",
    }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email },
    refreshTokenSecret,
    {
      expiresIn: "7d",
    }
  );

  refreshTokens.push(refreshToken);

  res.json({
    accessToken,
    refreshToken,
  });
});

router.post("/refresh", (req, res) => {
  const { token } = req.body;

  if (!token) return res.status(401).json({ message: "Token manquant" });
  if (!refreshTokens.includes(token))
    return res.status(403).json({ message: "Token invalide" });

  // Génère un nouveau access token
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    accessTokenSecret,
    {
      expiresIn: "15m",
    }
  );

  res.json({ accessToken });
});

router.delete("/logout", (req, res) => {
  //   const { token } = req.body;
  //   refreshTokens = refreshTokens.filter((t) => t !== token);
  res.json({ message: "Déconnecté avec succès" });
});

module.exports = router;
