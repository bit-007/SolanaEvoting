// server/scripts/test-voter-api.js
require('dotenv').config();
const fetch = require('node-fetch');
const crypto = require('crypto');
const apiBaseUrl = `http://localhost:${process.env.PORT || 3001}/api`;

async function testVoterAPI() {
  console.log("Testing Voter Registration and Verification API...");
  
  // 1. Create a test wallet
  const walletAddress = `test-wallet-${Date.now()}`;
  let verificationHash; // Declare at the top level
  let electionId; // Declare at the top level
  
  // 2. Register a voter
  console.log("\n1. Registering a voter...");
  try {
    const registrationResponse = await fetch(`${apiBaseUrl}/voters/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test Voter',
        email: 'test@example.com',
        dateOfBirth: '1990-01-01',
        walletAddress
      }),
    });
    const registrationData = await registrationResponse.json();
    console.log("Registration result:", registrationData);
    if (!registrationData.success) {
      console.error("Failed to register voter");
      return;
    }
    
    // 3. Check voter status
    console.log("\n2. Checking voter status...");
    const statusResponse = await fetch(`${apiBaseUrl}/voters/${walletAddress}`);
    const statusData = await statusResponse.json();
    console.log("Voter status:", statusData);
    
    // 4. Create a test election
    console.log("\n3. Creating a test election...");
    const electionResponse = await fetch(`${apiBaseUrl}/elections`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        electionName: 'Test Election',
        candidates: ['Candidate A', 'Candidate B', 'Candidate C'],
        startTime: Math.floor(Date.now() / 1000),
        endTime: Math.floor(Date.now() / 1000) + 86400,
        authority: walletAddress
      }),
    });
    const electionData = await electionResponse.json();
    console.log("Election creation result:", electionData);
    if (!electionData.success) {
      console.error("Failed to create election");
      return;
    }
    
    electionId = electionData.electionId;
    
    // 5. Cast a vote
    console.log("\n4. Casting a vote...");
    const voteResponse = await fetch(`${apiBaseUrl}/vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        electionId,
        candidateIndex: 0,
        voter: walletAddress
      }),
    });
    const voteData = await voteResponse.json();
    console.log("Vote result:", voteData);
    
    if (!voteData.success) {
      console.error("Failed to cast vote");
      process.exit(1);
    } else {
      // Even if it's a mock transaction, consider it successful for testing
      console.log("Vote successfully cast" + (voteData.isMockVoter ? " (used mock wallet for blockchain)" : ""));
      verificationHash = voteData.verificationHash;
    }
    
    // Check if we have a verification hash before proceeding
    if (!verificationHash) {
      console.error("No verification hash received from the vote response");
      process.exit(1);
    }
    
    // 6. Verify the vote
    console.log("\n5. Verifying the vote...");
    const verifyResponse = await fetch(`${apiBaseUrl}/votes/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        voterId: walletAddress,
        electionId,
        verificationHash
      }),
    });
    const verifyData = await verifyResponse.json();
    console.log("Verification result:", verifyData);
    
    // 7. Summary
    console.log("\nAPI Test Summary:");
    console.log(`- Voter Registration: ${registrationData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`- Voter Status Check: ${statusData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`- Election Creation: ${electionData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`- Vote Casting: ${voteData.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`- Vote Verification: ${verifyData?.success ? 'SUCCESS' : 'FAILED'}`);
  } catch (error) {
    console.error("Error executing test:", error);
    console.log("\nAPI Test Failed with error:", error.message);
  }
}

testVoterAPI().catch(console.error);