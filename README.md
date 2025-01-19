# 🚀 Crypto Portfolio Tracker

Application fullstack permettant de suivre l'évolution de la valeur d'un portefeuille Ethereum, avec visualisation graphique et historique des transactions.

## 📑 Table des Matières

- [Aperçu](#-aperçu)
- [Technologies](#-technologies)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Utilisation](#-utilisation)
- [API Endpoints](#-api-endpoints)
- [Docker](#-docker)
- [Base de données](#-base-de-données)

## 🎯 Aperçu

Cette application permet de :

- Suivre la valeur d'un portefeuille Ethereum en temps réel
- Visualiser l'historique des transactions
- Convertir automatiquement les valeurs ETH en EUR
- Gérer plusieurs portefeuilles par utilisateur
- Authentifier les utilisateurs de manière sécurisée

## 💻 Technologies

### Frontend

- React 18 avec TypeScript
- Chart.js pour les graphiques
- Axios pour les requêtes HTTP
- TailwindCSS pour le styling
- JWT pour l'authentification

### Backend

- Node.js avec Express
- Prisma comme ORM
- PostgreSQL pour la base de données
- JWT pour l'authentification
- Etherscan API pour les données blockchain
- CryptoCompare API pour les prix

## 📥 Installation

### Cloner les repositories

```bash
# Frontend
git clone https://github.com/johannes60-sk/front-project-crypto.git
cd front-project-crypto
npm install

# Backend
git clone https://github.com/Mehdi-Mah/server-project-crypto.git
cd server-project-crypto
npm install
```

### Configuration des variables d'environnement
```bash
REACT_APP_API_BASE_URL=http://localhost:8081/api/v1
DATABASE_URL=postgresql://admin:password@localhost:5432/db_project
PORT=8081
ACCESS_TOKEN_SECRET=your_secret_access_token
REFRESH_TOKEN_SECRET=your_secret_refresh_token
WALLET_ADDRESS=your_wallet_address
ETHERSCAN_API_KEY=your_etherscan_api_key
CRYPTOCOMPARE_API_KEY=your_cryptocompare_api_key
```

## 🐳 Docker
Le fichier docker-compose.yml est déjà inclus dans le projet backend. Pour le démarrer, utilisez :
```bash
docker-compose up -d
```

## 📧 Installation de MailDev
MailDev est utilisé pour tester les emails en local.

#### Installation de MailDev
```bash
npm install -g maildev  # Utilisez sudo si nécessaire
```
#### Lancer MailDev
```bash
maildev
```
L'interface web de MailDev est disponible sur http://localhost:1080.

## 🗄️ Base de données
Initialiser Prisma
```bash
npx prisma generate
npx prisma migrate dev --name init
```

#### Schéma Prisma
```bash
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            Int             @id @default(autoincrement())
  email         String          @unique
  password      String
  wallet        String
  validateAccount Boolean
  failedLoginAttempts Int       @default(0)
  accountLockedUntil  DateTime?
}

model RefreshToken {
  id        Int      @id @default(autoincrement())
  token     String
  expiredAt DateTime
}
```

## 🔌 API Endpoints
Authentification
```bash
POST /api/v1/auth/register        - Inscription utilisateur
POST /api/v1/auth/login           - Connexion utilisateur
POST /api/v1/auth/refresh         - Rafraîchir le token
DELETE /api/v1/auth/logout        - Déconnexion
POST /api/v1/auth/validate-email  - Validation de l'email
POST /api/v1/auth/resend-email    - Renvoyer le lien de validation
```
Wallet
```bash
GET  /api/v1/user/get_data/:email - Récupération des données de wallet
GET  /api/v1/profile/get_wallet   - Obtenir l'adresse du wallet
PUT  /api/v1/profile/update_wallet - Mettre à jour l'adresse du wallet
```

## 📱 Utilisation
Démarrer l'application

```bash
# Backend
cd server-project-crypto
npm run dev

# Frontend
cd front-project-crypto
npm start
```
