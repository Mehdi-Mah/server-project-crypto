const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware pour parser les requêtes JSON
app.use(express.json());

// Exemple de route
app.get('/', (req, res) => {
    res.send('Bienvenue sur l\'API Node.js !');
});

// Démarrer le serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur le port ${PORT}`);
});
