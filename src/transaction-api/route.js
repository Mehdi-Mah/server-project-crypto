const express = require("express");
const router = express.Router();
const axios = require("axios");

const walletAddress = process.env.WALLET_ADDRESS;

router.get(`/get_data/:address`, async (req, res) => {
  const { address } = req.params;
  const apiKey = process.env.ETHERSCAN_API_KEY;

  // Fonction pour récupérer toutes les transactions externes avec pagination
  async function fetchExternalTransactions(address, apiKey) {
    let page = 1;
    const transactions = [];
    while (true) {
      const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=asc&apikey=${apiKey}`;
      const response = await axios.get(url);
      if (response.data.status !== "1" || response.data.result.length === 0) {
        break;
      }
      transactions.push(...response.data.result);
      page++;
    }
    return transactions;
  }

  // Fonction pour récupérer toutes les transactions internes avec pagination
  async function fetchInternalTransactions(address, apiKey) {
    let page = 1;
    const transactions = [];
    while (true) {
      const url = `https://api.etherscan.io/api?module=account&action=txlistinternal&address=${address}&startblock=0&endblock=99999999&page=${page}&offset=10000&sort=asc&apikey=${apiKey}`;
      const response = await axios.get(url);
      if (response.data.status !== "1" || response.data.result.length === 0) {
        break;
      }
      transactions.push(...response.data.result);
      page++;
    }
    return transactions;
  }

  try {
    // Récupérer les transactions externes et internes
    const externalTransactions = await fetchExternalTransactions(address, apiKey);
    const internalTransactions = await fetchInternalTransactions(address, apiKey);

    // Combiner et trier les transactions par timestamp
    const allTransactions = [...externalTransactions, ...internalTransactions].sort((a, b) => a.timeStamp - b.timeStamp);

    // Calculer le solde en Wei avec BigInt
    let balance = BigInt(0);
    for (const tx of allTransactions) {
      const valueInWei = BigInt(tx.value);

      if (tx.from.toLowerCase() === address.toLowerCase()) {
        // Soustraire la valeur envoyée
        balance -= valueInWei;
        // Soustraire le coût du gas uniquement pour les transactions externes
        if (tx.gasUsed && tx.gasPrice) {
          const gasUsed = BigInt(tx.gasUsed);
          const gasPrice = BigInt(tx.gasPrice);
          const gasCost = gasUsed * gasPrice;
          balance -= gasCost;
        }
      } else if (tx.to.toLowerCase() === address.toLowerCase()) {
        // Ajouter la valeur reçue
        balance += valueInWei;
      }
    }

    // Récupérer le solde actuel via l'API Etherscan (en Wei)
    const balanceUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
    const balanceResponse = await axios.get(balanceUrl);
    const currentBalanceInWei = BigInt(balanceResponse.data.result);

    // Comparer les soldes en Wei
    const calculatedBalanceWei = balance.toString(); // Solde calculé en Wei
    const currentBalanceWei = currentBalanceInWei.toString(); // Solde actuel en Wei
    const match = calculatedBalanceWei === currentBalanceWei;

    // Retourner les résultats en Wei
    res.json({
      calculatedBalanceWei, // Solde calculé en Wei
      currentBalanceWei,   // Solde actuel en Wei
      match,               // Les soldes correspondent-ils ?
      transactions: allTransactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Une erreur est survenue",
      error: error.message
    });
  }
});

module.exports = router;