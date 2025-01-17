const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getUserWalletAddress } = require("../handler/userHandler");

const walletAddress = process.env.WALLET_ADDRESS;

router.get(`/get_data/:userEmail`, async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    req.token = token;
  }

  const { userEmail } = req.params;
  //const address = await getUserWalletAddress(userEmail);
  const address = process.env.WALLET_ADDRESS;

  try {
    const externalTxResponse = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: "account",
        action: "txlist",
        address: address,
        startblock: 0,
        endblock: 99999999,
        sort: "asc",
        apikey: process.env.ETHERSCAN_API_KEY,
      },
    });

    const internalTxResponse = await axios.get('https://api.etherscan.io/api', {
      params: {
        module: "account",
        action: "txlistinternal",
        address: address,
        startblock: 0,
        endblock: 99999999,
        sort: "asc",
        apikey: process.env.ETHERSCAN_API_KEY,
      },
    });

    const transactions = [
      ...externalTxResponse.data.result,
      ...internalTxResponse.data.result,
    ].sort((a, b) => a.timeStamp - b.timeStamp); // Sort by timestamp

    if (transactions.length === 0) {
      return res.json({ transactions: [] });
    }

    const earliestTimestamp = transactions[0].timeStamp;
    const latestTimestamp = transactions[transactions.length - 1].timeStamp;

    const firstDate = Math.min(...transactions.map((entry) => entry.timeStamp));
    const lastDate = Math.max(...transactions.map((entry) => entry.timeStamp));
    const limit = Math.min(2000, Math.ceil((lastDate - firstDate) / (24 * 60 * 60)) + 1);

    const priceResponse = await axios.get('https://min-api.cryptocompare.com/data/v2/histoday', {
      params: {
        fsym: "ETH",
        tsym: 'EUR',
        limit,
        toTs: lastDate,
        api_key: process.env.CRYPTOCOMPARE_API_KEY,
      },
    });

    const priceData = priceResponse.data.Data.Data;

    let cumulativeBalance = 0n; // Balance in Wei using BigInt
    const result = [];

    for (const tx of transactions) {
      const value = BigInt(tx.value);

      if (tx.from.toLowerCase() === address.toLowerCase()) {
        cumulativeBalance -= value;
        if (tx.gasUsed && tx.gasPrice) {
          const gasUsed = BigInt(tx.gasUsed);
          const gasPrice = BigInt(tx.gasPrice);
          const gasCost = gasUsed * gasPrice;
          cumulativeBalance -= gasCost;
        }
      } else if (tx.to.toLowerCase() === address.toLowerCase()) {
        cumulativeBalance += value;
      }

      const date = new Date(tx.timeStamp * 1000).toISOString().split("T")[0];
      const priceEntry = priceData.find((p) => {
        const priceDate = new Date(p.time * 1000).toISOString().split("T")[0];
        return priceDate === date;
      });
      const price = priceEntry ? priceEntry.close : 0;

      const balanceEth = parseFloat(cumulativeBalance) / 1e18;
      const walletValueEur = balanceEth * price;

      result.push({
        date,
        balance: balanceEth,
        price: walletValueEur,
      });
    }

    res.json({
      data: result
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "An error occurred",
      error: error.message,
    });
  }
});

module.exports = router;