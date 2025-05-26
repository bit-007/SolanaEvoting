// server/api/controllers.js
const { PublicKey } = require('@solana/web3.js');
const SolanaClient = require('../blockchain/client');
const Node = require('../dplt/node');
const Validator = require('../dplt/validator');
const Consensus = require('../dplt/consensus');
const voterRegistry = require('../models/Voter');
const { isAuthorizedAdmin } = require('../config/admins');
const { ZKPVoteValidator } = require('../zkp');

// Initialize DPLT layer
const validators = [
  new Validator('validator1'),
  new Validator('validator2'),
  new Validator('validator3')
];

const nodes = [
  new Node('node1', [validators[0]]),
  new Node('node2', [validators[1]]),
  new Node('node3', [validators[2]])
];

// Connect nodes in a mesh network
nodes[0].connectToPeer(nodes[1]);
nodes[0].connectToPeer(nodes[2]);
nodes[1].connectToPeer(nodes[0]);
nodes[1].connectToPeer(nodes[2]);
nodes[2].connectToPeer(nodes[0]);
nodes[2].connectToPeer(nodes[1]);

const consensus = new Consensus(nodes);
const zkpValidator = new ZKPVoteValidator();

// Initialize Solana client
const solanaClient = new SolanaClient();

// Force an initial synchronization
setTimeout(() => {
  console.log("Performing initial network synchronization...");
  consensus._synchronizeNodes();
}, 1000);

// Create a new election
const createElection = async (req, res) => {
  try {
    console.log("Creating election with data:", req.body);
    
    const { electionName, candidates, startTime, endTime, authority } = req.body;
    
    // Input validation
    if (!electionName || !candidates || !Array.isArray(candidates) || candidates.length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid election data. Name and at least two candidates are required.' 
      });
    }
    
    if (!startTime || !endTime || startTime >= endTime) {
      return res.status(400).json({
        success: false,
        error: 'Invalid time range. End time must be after start time.'
      });
    }
    
    // Try to use Solana client
    try {
      const result = await solanaClient.initializeElection(
        electionName,
        candidates,
        startTime,
        endTime
      );
      
      if (result.success) {
        // Record in DPLT layer for transparency
        const transaction = {
          type: 'ELECTION_CREATED',
          electionId: result.electionId,
          electionName,
          candidates,
          startTime,
          endTime,
          createdBy: authority || 'ADMIN',
          timestamp: Date.now()
        };
        
        // Add transaction to the first node (it will propagate)
        nodes[0].addTransaction(transaction);
        
        // Trigger consensus to create a block
        const block = consensus.createNextBlock();
        
        return res.status(201).json({
          success: true,
          electionId: result.electionId,
          tx: result.tx,
          dplt: {
            transactionId: transaction.id,
            block: block ? block.hash : null
          }
        });
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      // If Solana client fails, fallback to mock
      console.error("Error using Solana client, using mock implementation:", error);
      
      // Create a mock election
      const mockElectionId = `mock-${Date.now()}`;
      
      // Create mock election in DPLT anyway
      const transaction = {
        type: 'ELECTION_CREATED',
        electionId: mockElectionId,
        electionName,
        candidates,
        startTime,
        endTime,
        createdBy: authority || 'ADMIN',
        timestamp: Date.now()
      };
      
      // Add transaction to the first node
      nodes[0].addTransaction(transaction);
      consensus.createNextBlock();
      
      return res.status(201).json({
        success: true,
        electionId: mockElectionId,
        message: "Election created successfully (mock mode)",
        warning: "Using mock implementation due to Solana client error"
      });
    }
  } catch (error) {
    console.error('Error creating election:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get all elections
const getAllElections = async (req, res) => {
  try {
    console.log("Fetching all elections");
    
    const result = await solanaClient.getAllElections();
    
    // Debug the timestamps
    if (result.success && result.elections) {
      console.log("Election timestamps:");
      result.elections.forEach(election => {
        console.log(`Election ${election.id}:`);
        console.log(`- startTime: ${election.startTime}`);
        console.log(`- startTime formatted: ${new Date(election.startTime * 1000).toISOString()}`);
        console.log(`- endTime: ${election.endTime}`);
        console.log(`- endTime formatted: ${new Date(election.endTime * 1000).toISOString()}`);
      });
    }
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    // Map blockchain data to a more frontend-friendly format
    const elections = result.elections.map(election => ({
      id: election.id,
      name: election.name || election.electionName,
      candidates: election.candidates,
      startTime: typeof election.startTime === 'number' && election.startTime < 10000000000 
        ? election.startTime * 1000 // Convert seconds to milliseconds if needed
        : election.startTime,
      endTime: typeof election.endTime === 'number' && election.endTime < 10000000000 
        ? election.endTime * 1000 // Convert seconds to milliseconds if needed
        : election.endTime,
      status: election.isActive || election.status === 'active' ? 'active' : 'completed',
      totalVoters: election.totalVoters,
      votes: election.votes
    }));
    
    res.json({ success: true, elections });
  } catch (error) {
    console.error('Error fetching elections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get election by ID
const getElection = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await solanaClient.getElection(id);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }
    
    // Format for frontend
    const election = {
      id,
      name: result.electionName || result.name,
      candidates: result.candidates,
      startTime: typeof result.startTime === 'number' && result.startTime < 10000000000 
        ? result.startTime * 1000 // Convert seconds to milliseconds if needed
        : result.startTime,
      endTime: typeof result.endTime === 'number' && result.endTime < 10000000000 
        ? result.endTime * 1000 // Convert seconds to milliseconds if needed
        : result.endTime,
      status: result.isActive || result.status === 'active' ? 'active' : 'completed',
      totalVoters: result.totalVoters,
      votes: result.votes
    };
    
    res.json({ success: true, election });
  } catch (error) {
    console.error('Error fetching election:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// End an election
const endElection = async (req, res) => {
  try {
    const { id } = req.params;
    const { authority } = req.body;
    
    // Check admin authorization first
    if (!isAuthorizedAdmin(authority)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only authorized administrators can end elections.'
      });
    }
    
    // End election on blockchain
    const result = await solanaClient.endElection(id);
    
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }
    
    // Record in DPLT layer
    const transaction = {
      type: 'ELECTION_ENDED',
      electionId: id,
      endedBy: authority || 'ADMIN',
      timestamp: Date.now()
    };
    
    nodes[0].addTransaction(transaction);
    const block = consensus.createNextBlock();
    
    // Update local election data to ensure it's marked as ended immediately
    if (solanaClient.elections) {
      const election = solanaClient.elections.find(e => e.id === id);
      if (election) {
        election.isActive = false;
        election.status = 'completed';
      }
    }
    
    res.json({
      success: true,
      status: 'completed',
      tx: result.tx,
      explorerUrl: result.explorerUrl,
      dplt: {
        transactionId: transaction.id,
        block: block ? block.hash : null
      }
    });
  } catch (error) {
    console.error('Error ending election:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Cast a vote
// In server/api/controllers.js - Update the castVote function

// In server/api/controllers.js - Update the castVote function

const castVote = async (req, res) => {
  try {
    const { electionId, candidateIndex, voter } = req.body;
    
    // Input validation
    if (!electionId || candidateIndex === undefined || !voter) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Check if voter is registered
    if (!voterRegistry.isRegistered(voter)) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must be a registered voter to cast a vote. Please register first.' 
      });
    }
    
    // Check if voter is eligible
    if (!voterRegistry.isEligible(voter)) {
      return res.status(400).json({ 
        success: false, 
        error: 'You are not eligible to vote in this election.' 
      });
    }
    
    // Check if voter has already voted in this election
    if (voterRegistry.hasVoted(voter, electionId)) {
      return res.status(400).json({ success: false, error: 'You have already voted in this election' });
    }
    
    // Process through DPLT layer first
    const voteTransaction = {
      type: 'VOTE',
      voter,
      electionId,
      candidateIndex,
      timestamp: Date.now()
    };
    
    // Add transaction to DPLT layer
    const transaction = nodes[0].addTransaction(voteTransaction);
    
    // Create block to validate the transaction
    const block = consensus.createNextBlock();
    
    if (!block) {
      console.warn("Vote transaction added but block not created yet");
    }
    
    // Generate verification hash
    const verificationHash = validators[0].generateVerificationHash(voteTransaction);
    console.log(`Generated verification hash for vote: ${verificationHash}`);
    
    // Record the vote in voter registry FIRST with the verification hash
    const voteRecorded = voterRegistry.recordVote(voter, electionId, Date.now(), verificationHash);
    console.log(`Vote recorded in registry: ${voteRecorded}`);
    
    // Submit vote to blockchain - need to handle potential non-base58 voter IDs
    try {
      // For test wallets that aren't valid Solana addresses, we'll use a fallback
      let actualVoter = voter;
      let isMockVoter = false;
      
      // Check if this is a test wallet (non-base58)
      try {
        // Try to create a PublicKey - this will fail for non-base58 strings
        new PublicKey(voter);
      } catch (e) {
        // If it fails, use the admin wallet address instead
        console.log(`Using admin wallet for non-base58 voter ID: ${voter}`);
        actualVoter = solanaClient.walletPublicKey.toString();
        isMockVoter = true;
      }
      
      const result = await solanaClient.castVote(
        electionId,
        candidateIndex,
        actualVoter,
        verificationHash || 'mock-hash'
      );
      
      if (!result.success) {
        return res.status(500).json({ success: false, error: result.error });
      }
      
      // After successful blockchain transaction, store the verification hash in localStorage
      // on the client side (this is handled in the client code)
      
      res.json({
        success: true,
        tx: result.tx,
        verificationHash,
        explorerUrl: result.explorerUrl,
        isMockVoter,
        dplt: {
          transactionId: transaction?.id,
          block: block ? block.hash : null
        }
      });
    } catch (error) {
      console.error("Error casting vote to blockchain, using DPLT only:", error);
      
      // Return success with DPLT only
      res.json({
        success: true,
        message: "Vote recorded in DPLT layer only due to blockchain error",
        verificationHash,
        dplt: {
          transactionId: transaction?.id,
          block: block ? block.hash : null
        },
        warning: "Blockchain record failed, vote is only in DPLT"
      });
    }
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get election results
const getResults = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    const result = await solanaClient.getElection(electionId);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }
    
    // Format results
    const formattedResults = result.candidates.map((candidate, index) => ({
      candidate,
      votes: result.votes ? result.votes[index] : 0
    }));
    
    res.json({
      success: true,
      electionName: result.electionName || result.name,
      isActive: result.isActive || result.status === 'active',
      totalVoters: result.totalVoters || 0,
      results: formattedResults
    });
  } catch (error) {
    console.error('Error getting results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get network status
const getNetworkStatus = async (req, res) => {
  try {
    // Get DPLT stats
    const dpltStats = {
      nodes: nodes.length,
      validators: validators.length,
      pendingTransactions: nodes.reduce((total, node) => total + node.transactions.length, 0),
      processedTransactions: nodes.reduce((total, node) => {
        return total + node.blocks.reduce((blockTotal, block) => blockTotal + block.transactions.length, 0);
      }, 0),
      blocks: nodes[0].blocks.length,
      latestBlock: nodes[0].getLatestBlock()
    };
    
    // Get blockchain stats
    let blockchainStats = {
      network: process.env.SOLANA_NETWORK || 'devnet',
      programId: solanaClient.programId ? solanaClient.programId.toString() : 'Unknown',
      connected: true,
      mode: solanaClient.mode || 'fallback'
    };
    
    // Try to get more detailed blockchain status if available
    try {
      const solanaStatus = await solanaClient.getNetworkStatus();
      if (solanaStatus.success) {
        blockchainStats = { ...blockchainStats, ...solanaStatus };
      }
    } catch (error) {
      console.warn("Failed to get detailed Solana status:", error.message);
    }
    
    res.json({
      success: true,
      status: {
        blockchain: blockchainStats,
        dplt: dpltStats
      }
    });
  } catch (error) {
    console.error('Error getting network status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get DPLT status - detailed view of DPLT layer
const getDPLTStatus = async (req, res) => {
  try {
    // Get stats from each node
    const nodeData = nodes.map(node => {
      const latestBlock = node.getLatestBlock();
      return {
        id: node.id,
        transactionCount: node.transactions.length,
        blockCount: node.blocks.length,
        latestBlock: {
          index: latestBlock.index,
          hash: latestBlock.hash,
          transactions: latestBlock.transactions.length,
          timestamp: latestBlock.timestamp,
          createdBy: latestBlock.createdBy
        }
      };
    });
    
    // Get validator stats
    const validatorData = validators.map(validator => {
      const validations = Object.values(validator.validatedTransactions || {});
      return {
        id: validator.id,
        validationCount: validations.length,
        approvedCount: validations.filter(v => v.isValid).length,
        rejectedCount: validations.filter(v => !v.isValid).length
      };
    });
    
    // Get consensus stats
    const consensusData = {
      blockInterval: consensus.blockInterval,
      nextBlockIn: Math.max(0, consensus.blockInterval - (Date.now() - consensus.lastBlockTime)),
      nodeCount: nodes.length,
      consistent: consensus._verifyConsistency ? consensus._verifyConsistency() : true
    };
    
    res.json({
      success: true,
      network: {
        nodes: nodeData,
        validators: validatorData,
        consensus: consensusData,
        totalBlocks: nodes[0].blocks.length,
        totalTransactions: nodes.reduce((total, node) => {
          return total + node.blocks.reduce((blockTotal, block) => blockTotal + block.transactions.length, 0);
        }, 0)
      }
    });
  } catch (error) {
    console.error('Error getting DPLT status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
const requestAirdrop = async (req, res) => {
  try {
    const { wallet } = req.body;
    
    if (!wallet) {
      return res.status(400).json({ success: false, error: 'Wallet address is required' });
    }
    
    // Create a PublicKey from the wallet address
    const walletPubkey = new PublicKey(wallet);
    
    // Request airdrop of 1 SOL (1 billion lamports)
    const signature = await solanaClient.connection.requestAirdrop(walletPubkey, 1000000000);
    
    // Wait for confirmation
    await solanaClient.connection.confirmTransaction(signature);
    
    // Get updated balance
    const balance = await solanaClient.connection.getBalance(walletPubkey);
    
    res.json({
      success: true,
      signature,
      balance: balance / 1000000000
    });
  } catch (error) {
    console.error('Error requesting airdrop:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};
// Register a new voter
const registerVoter = async (req, res) => {
  try {
    const { name, email, dateOfBirth, walletAddress } = req.body;
    
    // Basic validation
    if (!name || !email || !dateOfBirth || !walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Validate date of birth to check age (example: must be 18+)
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      return res.status(400).json({
        success: false,
        error: 'Voter must be at least 18 years old'
      });
    }
    
    // Register the voter
    const result = voterRegistry.registerVoter({
      name,
      email,
      dateOfBirth,
      walletAddress
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error registering voter:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get voter status
const getVoterStatus = async (req, res) => {
  try {
    const { voterId } = req.params;
    
    if (!voterRegistry.isRegistered(voterId)) {
      return res.status(404).json({
        success: false,
        error: 'Voter not found'
      });
    }
    
    // Get voter's registration status
    const isEligible = voterRegistry.isEligible(voterId);
    
    res.json({
      success: true,
      voterId,
      isRegistered: true,
      isEligible,
      canVote: isEligible
    });
  } catch (error) {
    console.error('Error getting voter status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Get all registered voters (admin endpoint)
const getAllVoters = async (req, res) => {
  try {
    const voters = voterRegistry.getAllVoters();
    
    res.json({
      success: true,
      voters
    });
  } catch (error) {
    console.error('Error getting voters:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// server/api/controllers.js - Update the verifyVote function

// In server/api/controllers.js - Update just the verifyVote function

const verifyVote = async (req, res) => {
  try {
    console.log("Verifying vote with data:", req.body);
    const { voterId, electionId, verificationHash } = req.body;
    
    // Input validation
    if (!voterId || !electionId || !verificationHash) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields. Please provide wallet address, election ID, and verification hash.' 
      });
    }
    
    // Debug information to help diagnose issues
    console.log("All voters:", Object.keys(voterRegistry.voters));
    console.log(`Looking for voter: ${voterId}`);
    const voter = voterRegistry.voters[voterId];
    if (voter) {
      console.log("Voter found:", voter.id);
      console.log("Voting history:", voter.votingHistory);
    } else {
      console.log("Voter not found!");
    }
    
    // Verify the vote using the updated verifyVote method
    const verification = voterRegistry.verifyVote(voterId, electionId, verificationHash);
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: verification.error
      });
    }
    
    // Get election details
    const electionResult = await solanaClient.getElection(electionId);
    
    let electionName = "Election";
    let electionDate = new Date().toLocaleDateString();
    
    if (electionResult.success) {
      electionName = electionResult.electionName || electionResult.name || "Election";
      electionDate = new Date(
        typeof electionResult.startTime === 'number' && electionResult.startTime < 10000000000 
          ? electionResult.startTime * 1000 
          : electionResult.startTime
      ).toLocaleDateString();
    }
    
    res.json({
      success: true,
      verified: true,
      message: 'Vote successfully verified',
      election: {
        id: electionId,
        name: electionName,
        date: electionDate
      },
      votedAt: verification.record.votedAt ? new Date(verification.record.votedAt).toLocaleString() : 'Unknown'
    });
  } catch (error) {
    console.error('Error verifying vote:', error);
    res.status(500).json({ 
      success: false, 
      error: 'An internal server error occurred. Please try again later.' 
    });
  }
};

const recoverDPLTNetwork = async (req, res) => {
  try {
    console.log("Force recovering DPLT network...");
    
    // Find the node with the most blocks and valid chain
    let referenceNode = null;
    let maxValidLength = 0;
    
    for (const node of nodes) {
      if (node.validateChain() && node.blocks.length > maxValidLength) {
        maxValidLength = node.blocks.length;
        referenceNode = node;
      }
    }
    
    if (!referenceNode) {
      // If no valid node found, reset all nodes to genesis
      console.log("No valid node found, resetting all nodes to genesis block");
      
      for (const node of nodes) {
        // Reset to just the genesis block
        node.blocks = [node.blocks[0]];
      }
      
      res.json({
        success: true,
        message: "All nodes reset to genesis block",
        nodeStatuses: nodes.map(node => ({
          id: node.id,
          blocks: node.blocks.length,
          status: "reset to genesis"
        }))
      });
    } else {
      // Use the reference node to rebuild all other nodes
      const referenceChain = referenceNode.getBlockchain();
      console.log(`Using node ${referenceNode.id} with ${referenceChain.length} blocks as reference`);
      
      const nodeStatuses = [];
      
      for (const node of nodes) {
        if (node.id !== referenceNode.id) {
          const success = node.rebuildChain(referenceChain);
          nodeStatuses.push({
            id: node.id,
            blocks: node.blocks.length,
            status: success ? "synchronized" : "failed"
          });
        } else {
          nodeStatuses.push({
            id: node.id,
            blocks: node.blocks.length,
            status: "reference node"
          });
        }
      }
      
      res.json({
        success: true,
        message: "Network recovery attempted",
        referenceNode: referenceNode.id,
        referenceChainLength: referenceChain.length,
        nodeStatuses
      });
    }
  } catch (error) {
    console.error('Error recovering DPLT network:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

const debugGetAllVoterRecords = (req, res) => {
  try {
    // Restrict to development
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({
        success: false,
        error: 'Debug endpoints are only available in development mode'
      });
    }
    
    const allRecords = voterRegistry._debugGetAllRecords();
    
    res.json({
      success: true,
      data: allRecords
    });
  } catch (error) {
    console.error('Error getting debug voter records:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Check and auto-end expired elections
const checkAndEndExpiredElections = async () => {
  try {
    console.log("Checking for expired elections...");
    
    // Get all elections
    const result = await solanaClient.getAllElections();
    
    if (!result.success) {
      console.error("Failed to fetch elections:", result.error);
      return;
    }
    
    const now = Date.now();
    let endedCount = 0;
    
    // Check each active election
    for (const election of result.elections) {
      // Skip if already ended
      if (!election.isActive && election.status !== 'active') {
        continue;
      }
      
      // Convert endTime to milliseconds if needed
      const endTime = typeof election.endTime === 'number' && election.endTime < 10000000000
        ? election.endTime * 1000 // Convert seconds to milliseconds
        : election.endTime;
      
      // Check if election has ended
      if (now > endTime) {
        console.log(`Election ${election.id} (${election.name}) has expired. Auto-ending...`);
        
        try {
          // End the election on blockchain
          const endResult = await solanaClient.endElection(election.id);
          
          if (endResult.success) {
            // Record in DPLT layer
            const transaction = {
              type: 'ELECTION_ENDED',
              electionId: election.id,
              endedBy: 'SYSTEM',
              timestamp: Date.now(),
              reason: 'AUTO_EXPIRED'
            };
            
            nodes[0].addTransaction(transaction);
            consensus.createNextBlock();
            
            console.log(`Successfully ended expired election: ${election.id}`);
            endedCount++;
          } else {
            console.error(`Failed to end expired election ${election.id}:`, endResult.error);
          }
        } catch (error) {
          console.error(`Error ending expired election ${election.id}:`, error);
        }
      }
    }
    
    if (endedCount > 0) {
      console.log(`Auto-ended ${endedCount} expired elections`);
    } else {
      console.log("No expired elections found");
    }
  } catch (error) {
    console.error("Error checking for expired elections:", error);
  }
};

// Set up periodic checking for expired elections
const startExpirationChecker = () => {
  // Initial check after 5 seconds
  setTimeout(checkAndEndExpiredElections, 5000);
  
  // Then check every 30 seconds
  setInterval(checkAndEndExpiredElections, 30000);
};

const requireAdmin = (req, res, next) => {
  const { authority } = req.body;
  const adminAddress = req.headers['x-admin-address']; // We'll send this from frontend
  
  const walletAddress = authority || adminAddress;
  
  if (!walletAddress) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required'
    });
  }
  
  if (!isAuthorizedAdmin(walletAddress)) {
    return res.status(403).json({
      success: false,
      error: 'Access denied. You are not an authorized administrator.'
    });
  }
  
  next();
};

const checkAdminStatus = (req, res) => {
  try {
    const { walletAddress } = req.params;
    
    const isAdmin = isAuthorizedAdmin(walletAddress);
    
    res.json({
      success: true,
      isAdmin,
      walletAddress
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};


// ZKP Vote casting function
const castVoteWithZKP = async (req, res) => {
  try {
    console.log('ZKP Vote request received:', req.body);
    
    const { electionId, candidateIndex, voter, useZKP = true } = req.body;
    
    // Input validation
    if (!electionId || candidateIndex === undefined || !voter) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    
    // Check if voter is registered
    if (!voterRegistry.isRegistered(voter)) {
      return res.status(400).json({ 
        success: false, 
        error: 'You must be a registered voter to cast a vote. Please register first.' 
      });
    }
    
    // Check if voter has already voted
    if (voterRegistry.hasVoted(voter, electionId)) {
      return res.status(400).json({ success: false, error: 'You have already voted in this election' });
    }
    
    // Get election details
    const electionResult = await solanaClient.getElection(electionId);
    if (!electionResult.success) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }
    
    const totalCandidates = electionResult.candidates.length;
    
    // Validate candidate index
    if (candidateIndex < 0 || candidateIndex >= totalCandidates) {
      return res.status(400).json({ success: false, error: 'Invalid candidate index' });
    }
    
    console.log('Creating ZKP proof...');
    
    // Create ZKP vote
    const zkpData = zkpValidator.createZKPVote(voter, candidateIndex, totalCandidates);
    const zkpValid = zkpValidator.verifyZKPVote(zkpData);
    
    if (!zkpValid) {
      return res.status(400).json({ success: false, error: 'Invalid ZKP proof generated' });
    }
    
    // Generate verification hash
    const verificationHash = zkpValidator.generateZKPVerificationHash(voter, electionId, zkpData);
    
    console.log('ZKP vote created and verified for voter:', voter);
    
    // Record the vote in voter registry
    const voteRecorded = voterRegistry.recordVote(voter, electionId, Date.now(), verificationHash);
    console.log(`Vote recorded in registry: ${voteRecorded}`);
    
    // Try to submit to blockchain
    try {
      const result = await solanaClient.castVote(electionId, -1, voter, verificationHash);
      
      if (result.success) {
        res.json({
          success: true,
          tx: result.tx,
          verificationHash,
          zkpEnabled: true,
          explorerUrl: result.explorerUrl,
          message: 'ZKP vote cast successfully - your vote choice is private'
        });
      } else {
        res.json({
          success: true,
          verificationHash,
          zkpEnabled: true,
          message: 'Vote recorded locally (blockchain failed)',
          warning: result.error
        });
      }
    } catch (error) {
      console.error("Blockchain error:", error);
      res.json({
        success: true,
        verificationHash,
        zkpEnabled: true,
        message: 'Vote recorded locally (blockchain connection failed)',
        warning: 'Vote stored in DPLT only'
      });
    }
    
  } catch (error) {
    console.error('Error casting ZKP vote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// ZKP Vote verification function
const verifyZKPVote = async (req, res) => {
  try {
    const { voterId, electionId, verificationHash } = req.body;
    
    if (!voterId || !electionId || !verificationHash) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }
    
    // Use existing verification function
    const verification = voterRegistry.verifyVote(voterId, electionId, verificationHash);
    
    if (!verification.success) {
      return res.status(400).json({
        success: false,
        error: verification.error
      });
    }
    
    res.json({
      success: true,
      verified: true,
      message: 'ZKP vote verified - your vote choice remains private',
      votedAt: verification.record.votedAt ? new Date(verification.record.votedAt).toLocaleString() : 'Unknown'
    });
    
  } catch (error) {
    console.error('Error verifying ZKP vote:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Get ZKP Results function
const getZKPResults = async (req, res) => {
  try {
    const { electionId } = req.params;
    
    // For now, just return regular results with ZKP note
    const result = await solanaClient.getElection(electionId);
    
    if (!result.success) {
      return res.status(404).json({ success: false, error: 'Election not found' });
    }
    
    res.json({
      success: true,
      electionId,
      message: 'ZKP results - vote choices are private',
      note: 'Individual vote choices are cryptographically hidden'
    });
    
  } catch (error) {
    console.error('Error getting ZKP results:', error);
    res.status(500).json({ success: false, error: error.message });
  }
};




module.exports = {
  createElection,
  getAllElections,
  getElection,
  endElection,
  castVote,
  getResults,
  getNetworkStatus,
  getDPLTStatus,
  requestAirdrop,
  registerVoter,
  getVoterStatus,
  getAllVoters,
  verifyVote,
  recoverDPLTNetwork,
  debugGetAllVoterRecords,
  checkAndEndExpiredElections,
  startExpirationChecker,
  checkAdminStatus,
  requireAdmin,
  castVoteWithZKP,
  verifyZKPVote,
  getZKPResults
};