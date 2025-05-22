// server/dplt/validator.js
const crypto = require('crypto');

class Validator {
  constructor(id) {
    this.id = id;
    this.validatedTransactions = {};
    console.log(`Validator ${id} initialized`);
  }
  
  // Validate a transaction
  validateTransaction(transaction) {
    // Skip if already validated
    if (this.validatedTransactions[transaction.id]) {
      return this.validatedTransactions[transaction.id];
    }
    
    // Specific validation based on transaction type
    let isValid = false;
    switch (transaction.type) {
      case 'VOTE':
        isValid = this._validateVoteTransaction(transaction);
        break;
      case 'ELECTION_CREATED':
        isValid = this._validateElectionCreatedTransaction(transaction);
        break;
      case 'ELECTION_ENDED':
        isValid = this._validateElectionEndedTransaction(transaction);
        break;
      default:
        console.warn(`Validator ${this.id}: Unknown transaction type: ${transaction.type}`);
        isValid = false;
    }
    
    // Store validation result
    this.validatedTransactions[transaction.id] = {
      isValid,
      validatedAt: Date.now(),
      validatedBy: this.id
    };
    
    console.log(`Validator ${this.id} ${isValid ? 'approved' : 'rejected'} transaction ${transaction.id}`);
    
    return this.validatedTransactions[transaction.id];
  }
  
  // Generate verification hash for a validated transaction
  generateVerificationHash(transaction) {
    // Check if transaction is validated and valid
    const validation = this.validateTransaction(transaction);
    if (!validation || !validation.isValid) {
      console.warn(`Validator ${this.id} cannot generate hash for invalid transaction`);
      return null;
    }
    
    // Create hash based on transaction content and validation metadata
    const data = JSON.stringify({
      transaction,
      validation: {
        validatedAt: validation.validatedAt,
        validatedBy: validation.validatedBy
      }
    });
    
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    
    console.log(`Validator ${this.id} generated verification hash for transaction ${transaction.id}`);
    
    return hash;
  }
  
  // Private: Validate vote transaction
  _validateVoteTransaction(transaction) {
    // Basic field validation
    if (!transaction.electionId || 
        transaction.candidateIndex === undefined || 
        !transaction.voter) {
      return false;
    }
    
    // In a real system, additional validation would:
    // 1. Verify the election exists and is active
    // 2. Verify the candidate index is valid
    // 3. Verify the voter is eligible
    // 4. Verify the voter hasn't voted already
    
    // For demo purposes, consider it valid
    return true;
  }
  
  // Private: Validate election created transaction
  _validateElectionCreatedTransaction(transaction) {
    // Basic field validation
    if (!transaction.electionId || 
        !transaction.electionName || 
        !Array.isArray(transaction.candidates) || 
        transaction.candidates.length < 2 || 
        !transaction.startTime || 
        !transaction.endTime || 
        !transaction.createdBy) {
      return false;
    }
    
    // Additional validation
    const now = Date.now();
    
    // Start time should be in the future
    if (transaction.startTime < now) {
      return false;
    }
    
    // End time should be after start time
    if (transaction.endTime <= transaction.startTime) {
      return false;
    }
    
    return true;
  }
  
  // Private: Validate election ended transaction
  _validateElectionEndedTransaction(transaction) {
    // Basic field validation
    if (!transaction.electionId || !transaction.endedBy) {
      return false;
    }
    
    // In a real system, would verify:
    // 1. The election exists
    // 2. The endedBy is authorized
    
    return true;
  }
}

module.exports = Validator;