// server/dplt/consensus.js
class Consensus {
  constructor(nodes) {
    this.nodes = nodes;
    this.blockInterval = 10000; // 10 seconds between blocks
    this.lastBlockTime = 0;
    this.syncInterval = 5000; // Sync every 5 seconds
    
    console.log(`Consensus initialized with ${nodes.length} nodes`);
    
    // Start periodic synchronization
    this._startSyncProcess();
  }
  
  // Start a background process to keep nodes in sync
  _startSyncProcess() {
    setInterval(() => {
      this._synchronizeNodes();
    }, this.syncInterval);
  }
  
  // Synchronize all nodes in the network
  _synchronizeNodes() {
    console.log("Consensus: Synchronizing nodes...");
    
    // Find the node with the longest valid chain
    let referenceNode = this.nodes[0];
    let maxLength = referenceNode.blocks.length;
    
    for (let i = 1; i < this.nodes.length; i++) {
      const nodeChain = this.nodes[i].getBlockchain();
      if (nodeChain.length > maxLength && this.nodes[i].validateChain()) {
        maxLength = nodeChain.length;
        referenceNode = this.nodes[i];
      }
    }
    
    // Get the reference blockchain
    const referenceChain = referenceNode.getBlockchain();
    console.log(`Consensus: Reference chain from node ${referenceNode.id} has ${referenceChain.length} blocks`);
    
    // Synchronize all other nodes with the reference chain
    for (let i = 0; i < this.nodes.length; i++) {
      if (this.nodes[i].id !== referenceNode.id) {
        this._synchronizeNodeWithChain(this.nodes[i], referenceChain);
      }
    }
    
    // Verify consistency after synchronization
    const isConsistent = this._verifyConsistency();
    console.log(`Consensus: Network is ${isConsistent ? 'consistent' : 'inconsistent'} after synchronization`);
  }
  
  // Synchronize a specific node with the reference blockchain
_synchronizeNodeWithChain(node, referenceChain) {
  const nodeChain = node.getBlockchain();
  
  // If the chains match, nothing to do
  if (nodeChain.length === referenceChain.length) {
    const lastRefBlock = referenceChain[referenceChain.length - 1];
    const lastNodeBlock = nodeChain[nodeChain.length - 1];
    
    if (lastRefBlock.hash === lastNodeBlock.hash) {
      console.log(`Consensus: Node ${node.id} is already synchronized`);
      return true;
    }
  }
  
  console.log(`Consensus: Synchronizing node ${node.id} (${nodeChain.length} blocks) with reference chain (${referenceChain.length} blocks)`);
  
  // For severe desynchronization, do a full chain rebuild
  if (Math.abs(nodeChain.length - referenceChain.length) > 2 || 
      (nodeChain.length > 1 && referenceChain.length > 1 && nodeChain[1].hash !== referenceChain[1].hash)) {
    console.log(`Consensus: Deep desynchronization detected for node ${node.id}, performing full chain rebuild`);
    return node.rebuildChain(referenceChain);
  }
  
  // Find the fork point - the last block that matches in both chains
  let forkIndex = 0;
  const minLength = Math.min(nodeChain.length, referenceChain.length);
  
  for (let i = 1; i < minLength; i++) {
    if (nodeChain[i].hash !== referenceChain[i].hash) {
      break;
    }
    forkIndex = i;
  }
  
  // Remove blocks after the fork point from the node
  node.rollbackToBlock(forkIndex);
  
  // Add blocks from the reference chain
  let success = true;
  for (let i = forkIndex + 1; i < referenceChain.length; i++) {
    success = success && node.addBlock(referenceChain[i], true);
  }
  
  console.log(`Consensus: Node ${node.id} synchronized to ${node.blocks.length} blocks, success: ${success}`);
  return success;
}

// Create a new block if conditions are met - modified to be more robust
createNextBlock() {
  // Check if it's time for a new block
  const now = Date.now();
  if (now - this.lastBlockTime < this.blockInterval) {
    console.log(`Consensus: Not time for a new block yet (${Math.floor((this.blockInterval - (now - this.lastBlockTime)) / 1000)}s remaining)`);
    return null;
  }
  
  // Make sure the network is consistent before creating a new block
  const isConsistent = this._verifyConsistency();
  if (!isConsistent) {
    console.log("Consensus: Network is inconsistent, attempting synchronization before creating a block");
    this._synchronizeNodes();
  }
  
  // Select a leader node for this round
  const leaderNode = this._selectLeader();
  console.log(`Consensus: Selected node ${leaderNode.id} as leader`);
  
  // Create a block with the leader
  const block = leaderNode.createBlock();
  
  if (block) {
    this.lastBlockTime = now;
    console.log(`Consensus: Created block #${block.index} with ${block.transactions.length} transactions`);
    
    // Immediately propagate the new block to all nodes
    this._propagateBlock(block, leaderNode);
    
    // Verify all nodes have consistent state
    const consistent = this._verifyConsistency();
    if (!consistent) {
      console.log("Consensus: Network is still inconsistent after block creation, forcing synchronization");
      this._synchronizeNodes();
    }
    
    return block;
  } else {
    console.log(`Consensus: No block created (no transactions or validation failed)`);
    return null;
  }
}
  
  // Create a new block if conditions are met
  createNextBlock() {
    // Check if it's time for a new block
    const now = Date.now();
    if (now - this.lastBlockTime < this.blockInterval) {
      console.log(`Consensus: Not time for a new block yet (${Math.floor((this.blockInterval - (now - this.lastBlockTime)) / 1000)}s remaining)`);
      return null;
    }
    
    // Select a leader node for this round
    const leaderNode = this._selectLeader();
    console.log(`Consensus: Selected node ${leaderNode.id} as leader`);
    
    // Create a block with the leader
    const block = leaderNode.createBlock();
    
    if (block) {
      this.lastBlockTime = now;
      console.log(`Consensus: Created block #${block.index} with ${block.transactions.length} transactions`);
      
      // Immediately propagate the new block to all nodes
      this._propagateBlock(block, leaderNode);
      
      // Verify all nodes have consistent state
      this._verifyConsistency();
      
      return block;
    } else {
      console.log(`Consensus: No block created (no transactions or validation failed)`);
      return null;
    }
  }
  
  // Propagate a block to all nodes
  _propagateBlock(block, sourceNode) {
    for (const node of this.nodes) {
      if (node.id !== sourceNode.id) {
        node.receiveBlock(block);
      }
    }
  }
  
  // Private: Select a leader node for this round
  _selectLeader() {
  // Try each node in round-robin fashion until we find one that's valid
  const timestamp = Date.now();
  const nodeCount = this.nodes.length;
  
  for (let i = 0; i < nodeCount; i++) {
    const candidateIndex = (Math.floor(timestamp / this.blockInterval) + i) % nodeCount;
    const candidate = this.nodes[candidateIndex];
    
    // Check if this node is valid as a leader (has the latest blockchain)
    if (candidate.validateChain()) {
      return candidate;
    }
  }
  
  // If no valid node found, use the first one (shouldn't happen with proper synchronization)
  console.warn("Consensus: No valid leader found, using default node");
  return this.nodes[0];
}
  
  // Private: Verify consistency across all nodes
  _verifyConsistency() {
    // Get the blockchain from the first node
    const referenceChain = this.nodes[0].getBlockchain();
    
    // Compare with all other nodes
    let consistent = true;
    for (let i = 1; i < this.nodes.length; i++) {
      const nodeChain = this.nodes[i].getBlockchain();
      
      // Check length
      if (nodeChain.length !== referenceChain.length) {
        console.warn(`Consensus: Node ${this.nodes[i].id} has different chain length (${nodeChain.length} vs ${referenceChain.length})`);
        consistent = false;
        continue;
      }
      
      // Check last block hash
      const lastRefBlock = referenceChain[referenceChain.length - 1];
      const lastNodeBlock = nodeChain[nodeChain.length - 1];
      if (lastRefBlock.hash !== lastNodeBlock.hash) {
        console.warn(`Consensus: Node ${this.nodes[i].id} has different last block hash`);
        consistent = false;
      }
    }
    
    if (consistent) {
      console.log(`Consensus: All nodes have consistent state with ${referenceChain.length} blocks`);
    } else {
      console.warn("Consensus: Detected inconsistency between nodes");
      // This will now trigger the synchronization process
    }
    
    return consistent;
  }
  
  // Get statistics about the DPLT network
  getNetworkStats() {
    const latestBlock = this.nodes[0].getLatestBlock();
    
    return {
      nodeCount: this.nodes.length,
      blockCount: latestBlock.index + 1,
      lastBlockTime: latestBlock.timestamp,
      transactions: {
        pending: this.nodes.reduce((sum, node) => sum + node.transactions.length, 0),
        processed: this.nodes.reduce((sum, node) => {
          return sum + node.blocks.reduce((blockSum, block) => blockSum + block.transactions.length, 0);
        }, 0)
      },
      consensus: {
        consistent: this._verifyConsistency(),
        blockInterval: this.blockInterval,
        nextBlockIn: Math.max(0, this.blockInterval - (Date.now() - this.lastBlockTime)),
        syncInterval: this.syncInterval
      }
    };
  }
}

module.exports = Consensus;