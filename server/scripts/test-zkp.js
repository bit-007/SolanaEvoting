// server/scripts/test-zkp.js
const { SimpleZKPVoting, ZKPVoteValidator } = require('../zkp');

function testZKPSystem() {
  console.log('=== Testing ZKP Voting System ===\n');
  
  const zkp = new SimpleZKPVoting();
  const validator = new ZKPVoteValidator();
  
  // Test 1: Basic commitment and proof
  console.log('1. Testing basic ZKP proof generation...');
  
  const vote = 1; // Vote for candidate 1
  const commitment = zkp.createCommitment(vote);
  const proof = zkp.proveValidVote(commitment);
  const isValid = zkp.verifyValidVote(commitment.commitment, proof);
  
  console.log(`Vote: ${vote}`);
  console.log(`Proof valid: ${isValid ? 'YES' : 'NO'}`);
  console.log(`Commitment: ${commitment.commitment.encode('hex').substring(0, 20)}...`);
  
  // Test vote=0 as well
  const vote0 = 0;
  const commitment0 = zkp.createCommitment(vote0);
  const proof0 = zkp.proveValidVote(commitment0);
  const isValid0 = zkp.verifyValidVote(commitment0.commitment, proof0);
  
  console.log(`Vote: ${vote0}`);
  console.log(`Proof valid: ${isValid0 ? 'YES' : 'NO'}`);
  
  // Test 2: Multi-candidate vote
  console.log('\n2. Testing multi-candidate ZKP vote...');
  
  const voterId = 'test-voter-1';
  const candidateIndex = 1;
  const totalCandidates = 3;
  
  const zkpVote = validator.createZKPVote(voterId, candidateIndex, totalCandidates);
  const zkpValid = validator.verifyZKPVote(zkpVote);
  
  console.log(`Voter: ${voterId}`);
  console.log(`Voted for candidate: ${candidateIndex}`);
  console.log(`Total candidates: ${totalCandidates}`);
  console.log(`ZKP vote valid: ${zkpValid ? 'YES' : 'NO'}`);
  console.log(`Commitments generated: ${zkpVote.commitments.length}`);
  
  // Test 3: Verification hash
  console.log('\n3. Testing verification hash...');
  
  const electionId = 'test-election-1';
  const verificationHash = validator.generateZKPVerificationHash(voterId, electionId, zkpVote);
  
  console.log(`Election ID: ${electionId}`);
  console.log(`Verification hash: ${verificationHash.substring(0, 16)}...`);
  
  // Test 4: Multiple voters simulation
  console.log('\n4. Testing multiple voters...');
  
  const voters = [
    { id: 'voter1', vote: 0 },
    { id: 'voter2', vote: 1 },
    { id: 'voter3', vote: 1 },
    { id: 'voter4', vote: 2 }
  ];
  
  const allZKPVotes = [];
  let allValid = true;
  
  for (const voter of voters) {
    const zkpVoteData = validator.createZKPVote(voter.id, voter.vote, 3);
    const valid = validator.verifyZKPVote(zkpVoteData);
    allZKPVotes.push(zkpVoteData);
    allValid = allValid && valid;
    
    console.log(`${voter.id}: voted for candidate ${voter.vote}, proof ${valid ? 'VALID' : 'INVALID'}`);
  }
  
  console.log(`All proofs valid: ${allValid ? 'YES' : 'NO'}`);
  
  // Test 5: Homomorphic tallying
  console.log('\n5. Testing homomorphic tallying...');
  
  for (let candidateIndex = 0; candidateIndex < 3; candidateIndex++) {
    const tally = validator.tallyCandidate(allZKPVotes, candidateIndex);
    const expectedCount = voters.filter(v => v.vote === candidateIndex).length;
    
    console.log(`Candidate ${candidateIndex}:`);
    console.log(`  Expected votes: ${expectedCount}`);
    console.log(`  Commitment sum: ${tally.commitmentSum.substring(0, 20)}...`);
    console.log(`  Total participating: ${tally.totalVotes}`);
  }
  
  console.log('\n=== ZKP Test Complete ===');
  if (allValid && isValid && isValid0 && zkpValid) {
    console.log('✅ All tests passed - ZKP system is working correctly!');
  } else {
    console.log('❌ Some tests failed - check the implementation');
  }
}

// Run test
if (require.main === module) {
  testZKPSystem();
}

module.exports = { testZKPSystem };