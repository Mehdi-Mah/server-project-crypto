const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function getUserWalletAddress(email) {
  try {
    if (!email) {
      throw new Error("Email is required to retrieve the wallet address");
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { wallet: true },
    });

    if (!user) {
      throw new Error("User not found with the provided email");
    }

    return user.wallet;
  } catch (error) {
    console.error("Error retrieving user wallet address:", error.message);
    throw new Error("Could not retrieve wallet address");
  }
}

module.exports = { getUserWalletAddress };
