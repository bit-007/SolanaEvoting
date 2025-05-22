// server/scripts/check-wallet.js
const { Keypair } = require('@solana/web3.js');
const fs = require('fs');
require('dotenv').config();

try {
  const walletPath = process.env.WALLET_PATH;
  
  if (!walletPath) {
    console.error("WALLET_PATH not defined in .env file");
    process.exit(1);
  }
  
  console.log("Checking wallet at path:", walletPath);
  
  // Check if file exists
  if (!fs.existsSync(walletPath)) {
    console.error("Wallet file not found");
    process.exit(1);
  }
  
  // Read wallet file
  const fileContent = fs.readFileSync(walletPath, 'utf8');
  console.log("File content length:", fileContent.length);
  
  // Try to parse as JSON
  let keypairData;
  try {
    keypairData = JSON.parse(fileContent);
    console.log("File successfully parsed as JSON");
  } catch (e) {
    console.error("File is not valid JSON:", e.message);
    process.exit(1);
  }
  
  // Check format
  if (Array.isArray(keypairData)) {
    console.log("Keypair is in array format with length:", keypairData.length);
    
    // Try to create a keypair
    try {
      const keypair = Keypair.fromSecretKey(
        Uint8Array.from(keypairData)
      );
      console.log("Successfully created keypair!");
      console.log("Public Key:", keypair.publicKey.toString());
    } catch (e) {
      console.error("Failed to create keypair from data:", e.message);
    }
  } else {
    console.log("Keypair is not in array format, checking for secretKey property");
    
    if (keypairData.secretKey && Array.isArray(keypairData.secretKey)) {
      console.log("Found secretKey property with length:", keypairData.secretKey.length);
      
      // Try to create a keypair
      try {
        const keypair = Keypair.fromSecretKey(
          Uint8Array.from(keypairData.secretKey)
        );
        console.log("Successfully created keypair!");
        console.log("Public Key:", keypair.publicKey.toString());
      } catch (e) {
        console.error("Failed to create keypair from secretKey:", e.message);
      }
    } else {
      console.error("Invalid wallet format: expected an array or an object with secretKey array");
    }
  }
} catch (error) {
  console.error("Error checking wallet:", error);
}