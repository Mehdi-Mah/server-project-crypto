const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getUserWalletAddress(email) {
  try {
    console.log(email)

    if (!email) {
      throw new Error("Email is required to retrieve the wallet address");
    }

    // Récupérer le wallet de l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { email }, // Condition de recherche par email
      select: { wallet: true }, // Sélectionner uniquement le champ wallet
    });

    if (!user) {
      throw new Error("User not found with the provided email");
    }

    // Retourner l'adresse du wallet
    return user.wallet;
  } catch (error) {
    console.error("Error retrieving user wallet address:", error.message);
    throw new Error("Could not retrieve wallet address");
  }
}

module.exports = { getUserWalletAddress };
