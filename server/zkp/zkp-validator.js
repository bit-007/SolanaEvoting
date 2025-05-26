// server/zkp/zkp-validator.js
const SimpleZKPVoting = require('./zkp-voting');
const crypto = require('crypto');

class ZKPVoteValidator {
  constructor() {
    this.zkp = new SimpleZKPVoting();
    this.voteCommitments = new Map();
    this.voteProofs = new Map();
  }
  
  createZKPVote(voterId, candidateIndex, totalCandidates) {
    console.log(`Creating ZKP vote for ${voterId}, candidate ${candidateIndex}, total candidates: ${totalCandidates}`);
    
    const binaryVotes = [];
    for (let i = 0; i < totalCandidates; i++) {
      binaryVotes.push(i === candidateIndex ? 1 : 0);
    }
    
    const commitments = [];
    const proofs = [];
    
    for (const vote of binaryVotes) {
      const commitment = this.zkp.createCommitment(vote);
      const proof = this.zkp.proveValidVote(commitment);
      
      commitments.push(commitment);
      proofs.push(proof);
    }
    
    this.voteCommitments.set(voterId, commitments);
    this.voteProofs.set(voterId, proofs);
    
    return {
      commitments: commitments.map(c => ({
        commitment: c.commitment.encode('hex'),
      })),
      proofs: proofs.map(p => ({
        A: p.A.encode('hex'),
        challenge: p.challenge.toString(16),
        z: p.z.toString(16),
        claimedVote: p.claimedVote
      }))
    };
  }
  
  verifyZKPVote(zkpVote) {
    try {
      const { commitments, proofs } = zkpVote;
      
      for (let i = 0; i < commitments.length; i++) {
        const commitment = this.zkp.ec.curve.decodePoint(commitments[i].commitment, 'hex');
        const proof = {
          A: this.zkp.ec.curve.decodePoint(proofs[i].A, 'hex'),
          challenge: this.zkp.ec.keyFromPrivate(proofs[i].challenge, 'hex').getPrivate(),
          z: this.zkp.ec.keyFromPrivate(proofs[i].z, 'hex').getPrivate(),
          claimedVote: proofs[i].claimedVote
        };
        
        if (!this.zkp.verifyValidVote(commitment, proof)) {
          return false;
        }
      }
      
      // Check that exactly one vote is 1, others are 0
      const voteSum = proofs.reduce((sum, p) => sum + p.claimedVote, 0);
      if (voteSum !== 1) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error verifying ZKP vote:', error);
      return false;
    }
  }
  
  generateZKPVerificationHash(voterId, electionId, zkpData) {
    const commitmentHashes = zkpData.commitments.map(c => c.commitment).join('');
    return crypto.createHash('sha256')
      .update(voterId + electionId + commitmentHashes)
      .digest('hex');
  }
  
  // Homomorphic tally for a specific candidate
  tallyCandidate(zkpVotes, candidateIndex) {
    let sumCommitment = this.zkp.ec.g.mul(0); // Identity element
    
    for (const zkpVote of zkpVotes) {
      const commitment = this.zkp.ec.curve.decodePoint(
        zkpVote.commitments[candidateIndex].commitment, 
        'hex'
      );
      sumCommitment = sumCommitment.add(commitment);
    }
    
    return {
      candidateIndex,
      commitmentSum: sumCommitment.encode('hex'),
      totalVotes: zkpVotes.length
    };
  }
}

module.exports = ZKPVoteValidator;