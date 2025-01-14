# Utiliser une image officielle Node.js
FROM node:18

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers nécessaires pour installer les dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers de l'application
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Exposer le port utilisé par le backend
EXPOSE 8080

# Exécuter les migrations Prisma, puis démarrer le backend
CMD ["sh", "-c", "npm run migrate && npm start"]
