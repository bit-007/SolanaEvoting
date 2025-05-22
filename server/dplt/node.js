// server/dplt/node.js
const crypto = require('crypto');
const EventEmitter = require('events');

class Node {
  constructor(id) {
    this.id = id;
    this.transactions = [];
    this.blocks = [];
    this.peers = [];
    this.eventBus = new EventEmitter();
    this.version = '1.0.0';
    
    // Initialize genesis block
    if (this.blocks.length === 0) {
      this.blocks.push(this._createGenesisBlock());
    }
    
    console.log(`DPLT Node ${id} initialized`);
  }
  
  // Connect to other nodes
  connectToPeer(peer) {
    if (this.peers.findIndex(p => p.id === peer.id) === -1) {
      this.peers.push(peer);
      // Subscribe to peer's transaction events
      peer.eventBus.on('transaction', (transaction) => {
        this._onTransactionReceived(transaction);
      });
      // Subscribe to peer's block events
      peer.eventBus.on('block', (block) => {
        this._onBlockReceived(block);
      });
      console.log(`Node ${this.id} connected to peer ${peer.id}`);
    }
  }
  
  // Add a transaction to the pool
  addTransaction(transaction) {
    // Generate transaction ID if not present
    if (!transaction.id) {
      transaction.id = this._generateTransactionId(transaction);
    }
    
    // Add timestamp if not present
    if (!transaction.timestamp) {
      transaction.timestamp = Date.now();
    }
    
    // Add node ID to track origin
    transaction.originNode = this.id;
    
    // Validate transaction
    if (this._validateTransaction(transaction)) {
      // Add to local pool
      this.transactions.push(transaction);
      console.log(`Node ${this.id} added transaction ${transaction.id}`);
      
      // Broadcast to peers
      this.eventBus.emit('transaction', transaction);
      
      return transaction;
    } else {
      console.warn(`Node ${this.id} rejected invalid transaction`);
      return null;
    }
  }
  
  // Create a new block with current transactions
  createBlock() {
    if (this.transactions.length === 0) {
      console.log(`Node ${this.id} has no transactions to create block`);
      return null;
    }
    
    const previousBlock = this.getLatestBlock();
    const blockNumber = previousBlock.index + 1;
    const timestamp = Date.now();
    const transactions = [...this.transactions];
    const previousHash = previousBlock.hash;
    
    // Create the new block
    const block = {
      index: blockNumber,
      timestamp,
      transactions,
      previousHash,
      hash: null,
      createdBy: this.id
    };
    
    // Calculate and set the block hash
    block.hash = this._calculateBlockHash(block);
    
    // Validate and add the block
    if (this._validateBlock(block)) {
      this.blocks.push(block);
      // Clear transaction pool
      this.transactions = [];
      
      console.log(`Node ${this.id} created block #${blockNumber} with ${transactions.length} transactions`);
      
      // Broadcast to peers
      this.eventBus.emit('block', block);
      
      return block;
    } else {
      console.warn(`Node ${this.id} failed to create valid block`);
      return null;
    }
  }
  
  // Get the latest block
  getLatestBlock() {
    return this.blocks[this.blocks.length - 1];
  }
  
  // Get all blocks
  getBlockchain() {
    return this.blocks;
  }
  
  // Validate the entire blockchain
  validateChain() {
    for (let i = 1; i < this.blocks.length; i++) {
      const currentBlock = this.blocks[i];
      const previousBlock = this.blocks[i - 1];
      
      // Check hash integrity
      if (currentBlock.hash !== this._calculateBlockHash(currentBlock)) {
        console.error(`Node ${this.id}: Invalid block hash at index ${i}`);
        return false;
      }
      
      // Check chain link integrity
      if (currentBlock.previousHash !== previousBlock.hash) {
        console.error(`Node ${this.id}: Invalid previous hash at index ${i}`);
        return false;
      }
    }
    
    console.log(`Node ${this.id}: Blockchain validated successfully`);
    return true;
  }
  
  // Roll back chain to a specific block index
  rollbackToBlock(index) {
    // Ensure we never roll back before genesis block (index 0)
    if (index < 0) index = 0;
    
    if (index < this.blocks.length) {
      console.log(`Node ${this.id}: Rolling back from block ${this.blocks.length - 1} to block ${index}`);
      
      // Restore transactions from removed blocks
      for (let i = index + 1; i < this.blocks.length; i++) {
        const block = this.blocks[i];
        // Return transactions to the pool, marking them as not yet processed
        this.transactions.push(...block.transactions);
      }
      
      // Truncate the blockchain
      this.blocks = this.blocks.slice(0, index + 1);
      console.log(`Node ${this.id}: Rolled back to block ${index}, chain length is now ${this.blocks.length}`);
    } else {
      console.log(`Node ${this.id}: No rollback needed, already at or before block ${index}`);
    }
  }
  
  // Directly add a block (used during synchronization)
  addBlock(block, isSync = false) {
    // Create a deep copy to avoid modifying the original
    const blockCopy = this._deepCopyBlock(block);
    
    // Validate the block with isSync flag
    if (this._validateBlock(blockCopy, isSync)) {
      // Remove any transactions that are in this block from the transaction pool
      this._removeProcessedTransactions(blockCopy.transactions);
      
      // Add the block to the chain
      this.blocks.push(blockCopy);
      console.log(`Node ${this.id}: Added block #${blockCopy.index} ${isSync ? 'during synchronization' : 'normally'}`);
      return true;
    } else {
      console.warn(`Node ${this.id}: Invalid block provided ${isSync ? 'during synchronization' : ''}`);
      return false;
    }
  }
  
  // Receive a block from another node
  receiveBlock(block) {
    // Skip if we already have this block
    if (this.blocks.some(b => b.hash === block.hash)) {
      return false;
    }
    
    // Validate that this block connects to our chain
    if (block.index === this.blocks.length && block.previousHash === this.getLatestBlock().hash) {
      return this.addBlock(block);
    } else {
      console.warn(`Node ${this.id}: Received block #${block.index} doesn't connect to our chain`);
      return false;
    }
  }
  
  // Add a method to completely rebuild the chain from scratch
  rebuildChain(sourceChain) {
    console.log(`Node ${this.id}: Rebuilding entire chain from external source`);
    
    // Keep only the genesis block
    this.blocks = [this._deepCopyBlock(this.blocks[0])];
    
    // Add all blocks from the source chain except the genesis
    let success = true;
    for (let i = 1; i < sourceChain.length; i++) {
      success = success && this.addBlock(sourceChain[i], true);
    }
    
    console.log(`Node ${this.id}: Chain rebuild ${success ? 'successful' : 'failed'}, new length: ${this.blocks.length}`);
    return success;
  }
  
  // Private: Deep copy a block to avoid reference issues
  _deepCopyBlock(block) {
    return JSON.parse(JSON.stringify(block));
  }
  
  // Private: Handle receiving transaction from peers
  _onTransactionReceived(transaction) {
    // Check if transaction already exists
    if (this.transactions.some(t => t.id === transaction.id)) {
      return; // Ignore duplicates
    }
    
    // Validate and add to pool
    if (this._validateTransaction(transaction)) {
      this.transactions.push(transaction);
      console.log(`Node ${this.id} received valid transaction ${transaction.id} from peer`);
      
      // Forward to other peers
      this.eventBus.emit('transaction', transaction);
    } else {
      console.warn(`Node ${this.id} rejected invalid transaction from peer`);
    }
  }
  
  // Private: Handle receiving block from peers
  _onBlockReceived(block) {
    // Check if block already exists
    if (this.blocks.some(b => b.hash === block.hash)) {
      return; // Ignore duplicates
    }
    
    // Validate and add block
    if (this._validateBlock(block)) {
      // Check if this is the next block in sequence
      const latestBlock = this.getLatestBlock();
      if (block.index === latestBlock.index + 1) {
        this.blocks.push(block);
        
        // Remove transactions included in this block from the pool
        this._removeProcessedTransactions(block.transactions);
        
        console.log(`Node ${this.id} added valid block #${block.index} from peer`);
        
        // Forward to other peers
        this.eventBus.emit('block', block);
      } else if (block.index > latestBlock.index + 1) {
        // We're behind, need to sync
        console.log(`Node ${this.id} is behind, requesting chain sync`);
        // In a real implementation, this would trigger a chain sync protocol
      }
    } else {
      console.warn(`Node ${this.id} rejected invalid block from peer`);
    }
  }
  
  // Private: Remove transactions that are included in a block
  _removeProcessedTransactions(processedTransactions) {
    const processedIds = processedTransactions.map(t => t.id);
    this.transactions = this.transactions.filter(t => !processedIds.includes(t.id));
  }
  
  // Private: Create genesis block
  _createGenesisBlock() {
    const block = {
      index: 0,
      timestamp: Date.now(),
      transactions: [],
      previousHash: "0",
      hash: null,
      createdBy: this.id
    };
    
    block.hash = this._calculateBlockHash(block);
    
    console.log(`Node ${this.id} created genesis block`);
    return block;
  }
  
  // Private: Generate transaction ID
  _generateTransactionId(transaction) {
    const data = JSON.stringify(transaction);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Private: Calculate block hash
  _calculateBlockHash(block) {
    // Create a copy without the hash field
    const blockData = { ...block, hash: null };
    const data = JSON.stringify(blockData);
    return crypto.createHash('sha256').update(data).digest('hex');
  }
  
  // Private: Validate transaction
  _validateTransaction(transaction) {
    // Basic validation
    if (!transaction || typeof transaction !== 'object') {
      return false;
    }
    
    // Must have required fields
    if (!transaction.type || !transaction.id) {
      return false;
    }
    
    // Additional validation based on transaction type
    switch (transaction.type) {
      case 'VOTE':
        return this._validateVoteTransaction(transaction);
      case 'ELECTION_CREATED':
        return this._validateElectionCreatedTransaction(transaction);
      case 'ELECTION_ENDED':
        return this._validateElectionEndedTransaction(transaction);
      default:
        console.warn(`Unknown transaction type: ${transaction.type}`);
        return false;
    }
  }
  
  // Private: Validate vote transaction
  _validateVoteTransaction(transaction) {
    return (
      transaction.electionId && 
      transaction.candidateIndex !== undefined &&
      transaction.voter
    );
  }
  
  // Private: Validate election created transaction
  _validateElectionCreatedTransaction(transaction) {
    return (
      transaction.electionId &&
      transaction.electionName &&
      Array.isArray(transaction.candidates) &&
      transaction.candidates.length >= 2 &&
      transaction.startTime &&
      transaction.endTime &&
      transaction.createdBy
    );
  }
  
  // Private: Validate election ended transaction
  _validateElectionEndedTransaction(transaction) {
    return (
      transaction.electionId &&
      transaction.endedBy
    );
  }
  
  // Private: Validate block with option for synchronization
  _validateBlock(block, isSync = false) {
    // Check block structure
    if (!block || typeof block !== 'object') {
      console.log(`Node ${this.id}: Block validation failed - invalid block object`);
      return false;
    }
    
    // Must have required fields
    if (
      block.index === undefined ||
      !block.timestamp ||
      !Array.isArray(block.transactions) ||
      !block.previousHash ||
      !block.hash ||
      !block.createdBy
    ) {
      console.log(`Node ${this.id}: Block validation failed - missing required fields`);
      return false;
    }
    
    // Verify hash
    const calculatedHash = this._calculateBlockHash(block);
    if (calculatedHash !== block.hash) {
      console.log(`Node ${this.id}: Block validation failed - hash mismatch`);
      return false;
    }
    
    // Special handling for synchronization
    if (isSync) {
      // During synchronization, we're more permissive about index and previous hash
      // because we're trying to rebuild the chain
      return true;
    }
    
    // Verify link to previous block (for normal operation)
    if (block.index > 0) {
      const latestBlock = this.getLatestBlock();
      if (block.previousHash !== latestBlock.hash) {
        console.log(`Node ${this.id}: Block validation failed - previous hash doesn't match latest block`);
        return false;
      }
      
      // Check block index continuity
      if (block.index !== latestBlock.index + 1) {
        console.log(`Node ${this.id}: Block validation failed - index discontinuity`);
        return false;
      }
    }
    
    // Validate all transactions in the block
    for (const transaction of block.transactions) {
      if (!this._validateTransaction(transaction)) {
        console.log(`Node ${this.id}: Block validation failed - invalid transaction`);
        return false;
      }
    }
    
    return true;
  }
}

module.exports = Node;