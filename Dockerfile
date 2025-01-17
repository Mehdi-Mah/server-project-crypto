# Utiliser une image officielle Node.js
FROM node:20

# Définir le répertoire de travail
WORKDIR /app

# Copier uniquement les fichiers package.json et package-lock.json pour installer les dépendances
COPY package.json package-lock.json ./

# Installer les dépendances
RUN npm install

# Installer nodemon globalement pour un rechargement automatique
RUN npm install -g nodemon

# Copier le reste des fichiers de l'application
COPY . .

# Générer Prisma Client
RUN npx prisma generate

# Exposer le port utilisé par le backend
EXPOSE 8080

# Utiliser nodemon pour démarrer l'application en mode dev
CMD ["npm", "run", "dev"]  # Utilise npm run dev pour démarrer le serveur avec nodemon
