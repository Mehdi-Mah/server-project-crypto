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
  const address = await getUserWalletAddress(userEmail);

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

    // Step 1: Determine the date range of transactions
    if (transactions.length === 0) {
      return res.json({ transactions: [] });
    }

    const earliestTimestamp = transactions[0].timeStamp;
    const latestTimestamp = transactions[transactions.length - 1].timeStamp;

    const startDate = new Date(earliestTimestamp * 1000).toISOString().split('T')[0];
    const endDate = new Date(latestTimestamp * 1000).toISOString().split('T')[0];

    // Step 2: Fetch daily price data for the date range
    const firstDate = Math.min(...transactions.map((entry) => entry.timeStamp)); // Earliest timestamp
    const lastDate = Math.max(...transactions.map((entry) => entry.timeStamp)); // Latest timestamp
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

    const priceData = priceResponse.data.Data;
    console.log(priceResponse.data)

    // Step 4: Map balances to prices
    const result = transactions.map((entry) => {
        const date = new Date(entry.timeStamp * 1000).toISOString().split("T")[0];
      
        const priceEntry = priceData.find((p) => {
            const priceDate = new Date(p.time * 1000).toISOString().split("T")[0];
            return priceDate === date;
        });
        const price = priceEntry?.close || 0;

        return {
            date,
            balance: entry.balance, // Wallet balance in Ether
            price: entry.balance * price, // Wallet value in specified currency
        };
    });

    res.json(result);

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