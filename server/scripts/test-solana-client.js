// server/scripts/test-solana.js
const SolanaClient = require('../blockchain/client');

async function testSolanaClient() {
  try {
    console.log("Testing SolanaClient...");
    
    // Create client instance
    console.log("\n1. Creating SolanaClient instance");
    const client = new SolanaClient();
    
    // Check wallet balance
    console.log("\n2. Checking wallet balance");
    const statusResult = await client.getNetworkStatus();
    console.log("Balance:", statusResult.wallet.balance, "SOL");
    
    // Request airdrop if balance is low
    if (statusResult.wallet.balance < 0.5) {
      console.log("\n3. Requesting airdrop");
      const airdropResult = await client.requestAirdrop();
      console.log("Airdrop result:", airdropResult);
    }
    
    // Create a test election
    console.log("\n4. Creating test election");
    const electionResult = await client.initializeElection(
      "Test Election",
      ["Candidate A", "Candidate B", "Candidate C"],
      Math.floor(Date.now() / 1000),          // Start now
      Math.floor(Date.now() / 1000) + 86400   // End in 24 hours
    );
    console.log("Election creation result:", electionResult);
    
    if (electionResult.success) {
      // Cast a test vote
      console.log("\n5. Casting test vote");
      const voteResult = await client.castVote(
        electionResult.electionId,
        0,  // Vote for first candidate
        client.walletPublicKey.toString(),
        "test-verification-hash"
      );
      console.log("Vote result:", voteResult);
      
      // Get election
      console.log("\n6. Fetching election");
      const election = await client.getElection(electionResult.electionId);
      console.log("Election data:", election);
      
      // End election
      console.log("\n7. Ending election");
      const endResult = await client.endElection(electionResult.electionId);
      console.log("End election result:", endResult);
    }
    
    console.log("\nAll tests completed successfully!");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

testSolanaClient();