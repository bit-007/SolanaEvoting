// server/models/Voter.js
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class VoterRegistry {
  constructor() {
    this.votersDbPath = path.join(__dirname, '../data/voters.json');
    this.voters = this._loadVoters();
    console.log(`Loaded ${Object.keys(this.voters).length} registered voters`);
  }
  
  // Load voters from JSON file
  _loadVoters() {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.votersDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      // Load voters if file exists, otherwise create empty object
      if (fs.existsSync(this.votersDbPath)) {
        const data = fs.readFileSync(this.votersDbPath, 'utf8');
        return JSON.parse(data);
      } else {
        return {};
      }
    } catch (error) {
      console.error('Error loading voters:', error);
      return {};
    }
  }
  
  // Save voters to JSON file
  _saveVoters() {
    try {
      fs.writeFileSync(this.votersDbPath, JSON.stringify(this.voters, null, 2));
    } catch (error) {
      console.error('Error saving voters:', error);
    }
  }
  
  // Register a new voter
  registerVoter(userData) {
    // Create voter ID (in a real system, this would be a government-issued ID)
    const voterId = userData.walletAddress;
    
    // Check if already registered
    if (this.voters[voterId]) {
      return {
        success: false,
        error: 'Voter already registered'
      };
    }
    
    // Generate verification key
    const verificationKey = crypto.randomBytes(32).toString('hex');
    
    // Create registration timestamp
    const registeredAt = Date.now();
    
    // Store voter data
    this.voters[voterId] = {
      id: voterId,
      name: userData.name,
      email: userData.email,
      dateOfBirth: userData.dateOfBirth,
      walletAddress: userData.walletAddress,
      verificationKey,
      registeredAt,
      eligibilityChecked: true, // Simplified - in a real system, this would be more complex
      isEligible: true,
      votingHistory: {}
    };
    
    // Save to persistent storage
    this._saveVoters();
    
    console.log(`Registered voter: ${voterId}`);
    return {
      success: true,
      voterId,
      registeredAt
    };
  }
  
  // Check if a voter is registered
  isRegistered(voterId) {
    return !!this.voters[voterId];
  }
  
  // Check voter eligibility
  isEligible(voterId) {
    const voter = this.voters[voterId];
    return voter && voter.isEligible;
  }
  
  // Record a vote in the voting history
  recordVote(voterId, electionId, timestamp, verificationHash = null) {
    if (!this.voters[voterId]) {
      console.log(`Cannot record vote: Voter ${voterId} not found`);
      return false;
    }
    
    // Generate verification hash if not provided
    const actualHash = verificationHash || this._generateVerificationHash(voterId, electionId, timestamp);
    
    console.log(`Recording vote for ${voterId} in election ${electionId}`);
    console.log(`Verification hash: ${actualHash}`);
    
    // Save in voting history
    this.voters[voterId].votingHistory[electionId] = {
      votedAt: timestamp,
      verificationHash: actualHash
    };
    
    // Save changes
    this._saveVoters();
    
    console.log(`Vote recorded successfully. Current voting history:`, this.voters[voterId].votingHistory);
    return true;
  }
  
  // Check if voter has already voted in a specific election
  hasVoted(voterId, electionId) {
    return !!(this.voters[voterId] && this.voters[voterId].votingHistory[electionId]);
  }
  
  // Get voter verification key
  getVerificationKey(voterId) {
    return this.voters[voterId]?.verificationKey;
  }
  
  // Generate a verification hash for a vote
  _generateVerificationHash(voterId, electionId, timestamp) {
    const data = `${voterId}-${electionId}-${timestamp}-${this.voters[voterId].verificationKey}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Get voting record
  getVoteRecord(voterId, electionId) {
    if (!this.voters[voterId]) return null;
    return this.voters[voterId].votingHistory[electionId] || null;
  }
  
  // Verify a vote using its hash
  verifyVote(voterId, electionId, verificationHash) {
    console.log(`Verifying vote for ${voterId} in election ${electionId}`);
    console.log(`Provided verification hash: ${verificationHash}`);
    
    const voter = this.voters[voterId];
    if (!voter) {
      console.log(`Verify failed: Voter ${voterId} not found`);
      return {
        success: false,
        error: `No voter found with ID: ${voterId}`
      };
    }
    
    const voteRecord = voter.votingHistory[electionId];
    if (!voteRecord) {
      console.log(`Verify failed: No vote record found for election ${electionId}`);
      return {
        success: false,
        error: `No vote record found for this wallet address in the specified election.`
      };
    }
    
    console.log(`Found vote record:`, voteRecord);
    console.log(`Stored hash: ${voteRecord.verificationHash}`);
    
    // Compare verification hashes
    const isValid = 
      verificationHash === voteRecord.verificationHash || 
      verificationHash.trim() === voteRecord.verificationHash || 
      verificationHash === voteRecord.verificationHash.trim();
    
    if (!isValid) {
      console.log(`Verify failed: Hash mismatch`);
      return {
        success: false,
        error: `Invalid verification hash. The provided hash does not match our records.`
      };
    }
    
    console.log(`Vote verified successfully!`);
    return {
      success: true,
      record: voteRecord
    };
  }
  
  // Get all registered voters (admin function)
  getAllVoters() {
    return Object.values(this.voters).map(voter => ({
      id: voter.id,
      name: voter.name,
      email: voter.email,
      registeredAt: voter.registeredAt,
      isEligible: voter.isEligible,
      voteCount: Object.keys(voter.votingHistory).length
    }));
  }
  
  // Debug function to get all data
  _debugGetAllRecords() {
    return {
      voters: this.voters,
      voterCount: Object.keys(this.voters).length,
      voteRecords: Object.entries(this.voters).reduce((acc, [voterId, voter]) => {
        if (voter.votingHistory) {
          Object.entries(voter.votingHistory).forEach(([electionId, voteData]) => {
            acc[`${electionId}-${voterId}`] = {
              voterId,
              electionId,
              ...voteData
            };
          });
        }
        return acc;
      }, {})
    };
  }
}

// Singleton instance
const voterRegistry = new VoterRegistry();
module.exports = voterRegistry;