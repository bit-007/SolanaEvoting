// server/blockchain/client.js
const { Connection, PublicKey, Keypair, Transaction, SystemProgram, sendAndConfirmTransaction,TransactionInstruction  } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class SolanaClient {
  constructor() {
    console.log("Initializing SolanaClient with direct Solana web3.js...");
    this.elections = [];
    this.voters = {};
    
    // Initialize connection
    this._setupConnection();
    
    // Load wallet
    this._setupWallet();
    
    // Load program ID
    this._setupProgramId();
    
    console.log("SolanaClient initialization complete!");
  }
  
  _setupConnection() {
    try {
      const network = process.env.SOLANA_NETWORK || 'devnet';
      const endpoint = process.env.SOLANA_RPC_URL || `https://api.${network}.solana.com`;
      console.log(`Setting up connection to ${network} at ${endpoint}`);
      
      this.connection = new Connection(endpoint, 'confirmed');
      this.network = network;
      console.log("Connection established");
    } catch (error) {
      console.error("Error setting up connection:", error);
      throw new Error(`Connection setup failed: ${error.message}`);
    }
  }
  
  _setupWallet() {
    try {
      const walletPath = process.env.WALLET_PATH;
      if (!walletPath) {
        throw new Error("WALLET_PATH not defined in environment variables");
      }
      
      console.log("Loading wallet from:", walletPath);
      
      if (!fs.existsSync(walletPath)) {
        throw new Error(`Wallet file not found at: ${walletPath}`);
      }
      
      // Read keypair file
      const fileContent = fs.readFileSync(walletPath, 'utf8');
      const secretKey = Uint8Array.from(JSON.parse(fileContent));
      
      // Create keypair
      this.keypair = Keypair.fromSecretKey(secretKey);
      this.walletPublicKey = this.keypair.publicKey;
      console.log("Loaded keypair with public key:", this.walletPublicKey.toString());
    } catch (error) {
      console.error("Error setting up wallet:", error);
      throw new Error(`Wallet setup failed: ${error.message}`);
    }
  }
  
  _setupProgramId() {
    try {
      // Get program ID
      const programIdStr = process.env.PROGRAM_ID;
      if (!programIdStr) {
        throw new Error("PROGRAM_ID not defined in environment variables");
      }
      
      console.log("Using Program ID:", programIdStr);
      this.programId = new PublicKey(programIdStr);
    } catch (error) {
      console.error("Error setting up program ID:", error);
      throw new Error(`Program ID setup failed: ${error.message}`);
    }
  }
  
  // Airdrop SOL for testing (only on devnet/testnet)
  async requestAirdrop() {
    try {
      if (this.network !== 'devnet' && this.network !== 'testnet') {
        return { success: false, error: "Airdrop only available on devnet or testnet" };
      }
      
      const signature = await this.connection.requestAirdrop(this.walletPublicKey, 1000000000); // 1 SOL
      await this.connection.confirmTransaction(signature);
      
      const balance = await this.connection.getBalance(this.walletPublicKey);
      return {
        success: true,
        signature,
        balance: balance / 1000000000
      };
    } catch (error) {
      console.error("Error requesting airdrop:", error);
      return { success: false, error: error.message };
    }
  }
  
  // Initialize a new election (using direct Solana transaction)
// In server/blockchain/client.js
async initializeElection(electionName, candidates, startTime, endTime) {
  try {
    console.log(`Creating election "${electionName}" with ${candidates.length} candidates`);
    
    // Generate a new keypair for the election account
    const electionAccount = new Keypair();
    console.log("Election account:", electionAccount.publicKey.toString());
    
    // Get the latest blockhash
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('finalized');
    
    // Create a transaction
    const transaction = new Transaction({
      feePayer: this.walletPublicKey,
      blockhash,
      lastValidBlockHeight
    });
    
    // Instead of trying to create a custom program instruction,
    // just create a simple memo transaction for now
    const memoInstruction = new TransactionInstruction({
      keys: [],
      programId: new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr'),
      data: Buffer.from(`E-Voting Election: ${electionName}`)
    });
    
    transaction.add(memoInstruction);
    
    // Sign and send the transaction
    transaction.sign(this.keypair);
    const signature = await this.connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false, preflightCommitment: 'processed' }
    );
    
    // Record the election in memory
    const electionId = electionAccount.publicKey.toString();
    const newElection = {
      id: electionId,
      name: electionName,
      electionName: electionName,
      candidates: candidates,
      startTime: startTime,
      endTime: endTime,
      isActive: true,
      status: 'active',
      totalVoters: 0,
      votes: new Array(candidates.length).fill(0)
    };
    
    this.elections.push(newElection);
    
    return {
      success: true,
      electionId: electionId,
      tx: signature,
      electionName: electionName,
      candidates: candidates,
      startTime: startTime,
      endTime: endTime,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${this.network}`
    };
  } catch (error) {
    console.error("Error initializing election:", error);
    throw error;
  }
}

// Helper method for confirming transactions with retry
async confirmTransactionWithRetry(signature, blockhash, lastValidBlockHeight, maxRetries = 3) {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      console.log(`Confirmation attempt ${retries + 1} for ${signature}`);
      const confirmation = await this.connection.confirmTransaction({
        blockhash,
        lastValidBlockHeight,
        signature
      }, 'confirmed');
      
      console.log("Transaction confirmed:", confirmation);
      return confirmation;
    } catch (error) {
      console.warn(`Confirmation attempt ${retries + 1} failed: ${error.message}`);
      retries++;
      
      if (retries >= maxRetries) throw error;
      
      // Wait before retry (exponential backoff)
      const delay = 1000 * Math.pow(2, retries);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Helper method for signing transactions
async _signTransaction(transaction) {
  try {
    if (this.keypair) {
      transaction.sign(this.keypair);
      return transaction;
    } else if (this.wallet) {
      return await this.wallet.signTransaction(transaction);
    } else {
      throw new Error("No wallet or keypair available for signing");
    }
  } catch (error) {
    console.error("Error signing transaction:", error);
    throw error;
  }
}
  
  // Cast a vote
async castVote(electionId, candidateIndex, voter, verificationHash) {
  try {
    console.log(`Casting vote for election ${electionId}, candidate ${candidateIndex}`);
    
    // Find the election
    const election = this.elections.find(e => e.id === electionId);
    if (!election) {
      return { success: false, error: "Election not found" };
    }
    
    // Verify election is active
    if (!election.isActive) {
      return { success: false, error: "Election is not active" };
    }
    
    // Check if election is within timeframe
    const currentTime = Math.floor(Date.now() / 1000);
    if (election.startTime && election.endTime && 
        (currentTime < election.startTime || currentTime > election.endTime)) {
      return { success: false, error: "Election is not in progress" };
    }
    
    // Verify candidate index
    if (candidateIndex < 0 || candidateIndex >= election.candidates.length) {
      return { success: false, error: "Invalid candidate index" };
    }
    
    // Check if voter has already voted
    if (this.voters && this.voters[`${electionId}-${voter}`]?.hasVoted) {
      return { success: false, error: "Voter has already cast a vote in this election" };
    }
    
    // Create voter data - safely handle PublicKey creation
    let voterPubkey;
    try {
      voterPubkey = new PublicKey(voter);
    } catch (error) {
      console.warn(`Using admin wallet for non-base58 voter ID: ${voter}`);
      voterPubkey = this.walletPublicKey;
    }
    
    // Ensure connection is established
    if (!this.connection) {
      await this.connectToNetwork();
    }
    
    // Create transaction
    const transaction = new Transaction();
    
    // Add a simple SOL transfer that's enough to create a transaction record
    // This is a simpler approach that doesn't require TransactionInstruction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: this.walletPublicKey,
        toPubkey: this.walletPublicKey, // Self-transfer to create a transaction record
        lamports: 5000 // Small amount for transaction record
      })
    );
    
    // Get recent blockhash with retry logic
    let blockhash;
    let retries = 3;
    while (retries > 0) {
      try {
        const result = await this.connection.getLatestBlockhash('confirmed');
        blockhash = result.blockhash;
        break;
      } catch (error) {
        console.warn(`Failed to get blockhash, retrying... (${retries} attempts left)`);
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = this.walletPublicKey;
    
    // Sign with keypair
    if (!this.keypair) {
      return { success: false, error: "Wallet not initialized" };
    }
    transaction.sign(this.keypair);
    
    // Send the transaction
    let signature;
    try {
      const rawTransaction = transaction.serialize();
      signature = await this.connection.sendRawTransaction(rawTransaction, {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
    } catch (error) {
      console.error("Failed to send transaction:", error);
      return { 
        success: false, 
        error: `Transaction failed: ${error.message}`
      };
    }
    
    // Wait for confirmation with a reasonable timeout
    let confirmation;
    try {
      confirmation = await this.connection.confirmTransaction(signature, 'confirmed');
      console.log("Transaction confirmed:", confirmation);
    } catch (error) {
      console.warn("Transaction confirmation error:", error.message);
      // Continue anyway as the transaction might still be valid
    }
    
    console.log("Vote transaction signature:", signature);
    
    // Update local election data
    election.votes[candidateIndex]++;
    election.totalVoters++;
    
    // Track voter to prevent double voting
    if (!this.voters) {
      this.voters = {};
    }
    this.voters[`${electionId}-${voter}`] = {
      hasVoted: true,
      votedAt: Date.now(),
      candidateIndex,
      verificationHash: verificationHash || `hash-${Date.now()}`,
      transactionSignature: signature
    };
    
    // Optionally save vote data to a more persistent storage
    if (typeof this.saveVoteData === 'function') {
      try {
        await this.saveVoteData(electionId, voter, candidateIndex, signature);
      } catch (saveError) {
        console.warn("Failed to save vote data:", saveError);
        // Continue execution as the transaction was successful
      }
    }
    
    return {
      success: true,
      tx: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${this.network}`,
      confirmation: confirmation ? "Confirmed" : "Pending"
    };
  } catch (error) {
    console.error("Error casting vote:", error);
    
    return {
      success: false,
      error: error.message,
      context: {
        electionId,
        candidateIndex,
        time: new Date().toISOString()
      }
    };
  }
}
  
  // Check if voter has already voted
  async hasVoted(electionId, voter) {
    try {
      // Check our local tracking
      if (this.voters && this.voters[`${electionId}-${voter}`]) {
        return {
          success: true,
          hasVoted: true
        };
      }
      
      return {
        success: true,
        hasVoted: false
      };
    } catch (error) {
      console.error("Error checking voter status:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
// End an election
async endElection(electionId) {
  try {
    console.log(`Ending election ${electionId}`);
    
    // Find the election
    const election = this.elections.find(e => e.id === electionId);
    if (!election) {
      return { success: false, error: "Election not found" };
    }
    
    // Create transaction
    const transaction = new Transaction();
    
    // In a real implementation, we would call our Solana program
    // For now, just create a marker transaction
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: this.walletPublicKey,
        toPubkey: this.walletPublicKey, // Self-transfer
        lamports: 5000 // 0.000005 SOL
      })
    );
    
    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [this.keypair]
    );
    
    console.log("End election transaction signature:", signature);
    
    // Update local election data
    election.isActive = false;
    election.status = 'completed';
    
    return {
      success: true,
      tx: signature,
      explorerUrl: `https://explorer.solana.com/tx/${signature}?cluster=${this.network}`
    };
  } catch (error) {
    console.error("Error ending election:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
  
  // Get election details
  async getElection(electionId) {
    try {
      console.log(`Fetching election ${electionId}`);
      
      // Find the election
      const election = this.elections.find(e => e.id === electionId);
      if (!election) {
        return { success: false, error: "Election not found" };
      }
      
      return {
        success: true,
        ...election
      };
    } catch (error) {
      console.error("Error fetching election:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get all elections
  async getAllElections() {
    try {
      console.log("Fetching all elections");
      
      if (!this.elections || this.elections.length === 0) {
        return {
          success: true,
          elections: []
        };
      }
      
      return {
        success: true,
        elections: this.elections
      };
    } catch (error) {
      console.error("Error fetching all elections:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  // Get network status
  async getNetworkStatus() {
    try {
      // Get version info
      const version = await this.connection.getVersion();
      
      // Get recent block info
      const slot = await this.connection.getSlot();
      const blockTime = await this.connection.getBlockTime(slot);
      
      // Get balance
      const balance = await this.connection.getBalance(this.walletPublicKey);
      
      return {
        success: true,
        network: this.network,
        programId: this.programId.toString(),
        version: version["solana-core"],
        currentSlot: slot,
        currentBlockTime: blockTime,
        wallet: {
          publicKey: this.walletPublicKey.toString(),
          balance: balance / 1000000000 // Convert lamports to SOL
        }
      };
    } catch (error) {
      console.error("Error getting network status:", error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = SolanaClient;