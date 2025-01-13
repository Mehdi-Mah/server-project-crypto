const express = require("express");
const router = express.Router();
const axios = require("axios");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { accessTokenSecret, refreshTokenSecret } = require("../constante/const"); // Ensure the correct file extension

const fakeUser = {
  email: "houenoujohannes60@gmail.com",
  password: "johannes",
};

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

  console.log(
    "accessTokenSecret",
    accessTokenSecret,
    "refreshTokenSecret",
    refreshTokenSecret
  );

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

module.exports = router;
