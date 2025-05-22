const { Connection, clusterApiUrl } = require('@solana/web3.js');
require('dotenv').config();

// Create a connection to Solana network
const getConnection = () => {
  const network = process.env.SOLANA_NETWORK || 'devnet';
  const endpoint = process.env.SOLANA_RPC_URL || clusterApiUrl(network);
  
  console.log(`Connecting to Solana ${network} at ${endpoint}`);
  
  // Create and return the connection
  const connection = new Connection(endpoint, 'confirmed');
  return connection;
};

module.exports = {
  getConnection
};