const anchor = require('@coral-xyz/anchor');
const { Program } = anchor;
const { SystemProgram, Keypair, PublicKey } = anchor.web3;
const { expect } = require('chai');

describe('solana-evoting', () => {
  // Configure the client to use the local cluster
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaEvoting;
  const authority = Keypair.generate();
  const voter1 = Keypair.generate();
  const voter2 = Keypair.generate();
  
  // Create a new keypair for election
  const election = Keypair.generate();
  
  // Election parameters
  const electionName = "Presidential Election 2025";
  const candidates = ["Candidate A", "Candidate B", "Candidate C"];
  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + 3600; // Election ends in 1 hour
  
  // Store the voter account addresses
  let voter1Address, voter2Address;
  
  before(async () => {
    // Airdrop SOL to authority for transaction fees
    const connection = anchor.getProvider().connection;
    const authorityAirdrop = await connection.requestAirdrop(
      authority.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(authorityAirdrop);
    
    // Airdrop SOL to voters for transaction fees
    const voter1Airdrop = await connection.requestAirdrop(
      voter1.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(voter1Airdrop);
    
    const voter2Airdrop = await connection.requestAirdrop(
      voter2.publicKey,
      10 * anchor.web3.LAMPORTS_PER_SOL
    );
    await connection.confirmTransaction(voter2Airdrop);
    
    // Find the PDA for the voter accounts
    const [voter1PDA, _voter1Bump] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('voter'),
        voter1.publicKey.toBuffer(),
        election.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    const [voter2PDA, _voter2Bump] = await PublicKey.findProgramAddressSync(
      [
        Buffer.from('voter'),
        voter2.publicKey.toBuffer(),
        election.publicKey.toBuffer(),
      ],
      program.programId
    );
    
    voter1Address = voter1PDA;
    voter2Address = voter2PDA;
  });

  it('Initialize Election', async () => {
    // Initialize the election
    await program.methods
      .initializeElection(
        electionName,
        candidates,
        new anchor.BN(startTime),
        new anchor.BN(endTime)
      )
      .accounts({
        election: election.publicKey,
        authority: authority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority, election])
      .rpc();
    
    // Fetch the election account and validate
    const electionAccount = await program.account.election.fetch(election.publicKey);
    expect(electionAccount.electionName).to.equal(electionName);
    expect(electionAccount.candidates).to.deep.equal(candidates);
    expect(electionAccount.isActive).to.be.true;
    expect(electionAccount.totalVoters).to.equal(0);
    
    console.log("Election initialized successfully!");
  });

  it('Cast Vote by Voter 1', async () => {
    // Cast a vote as voter1
    const candidateIndex = 1; // Vote for the second candidate
    const verificationHash = "test-verification-hash-1";
    
    await program.methods
      .castVote(
        candidateIndex,
        verificationHash
      )
      .accounts({
        election: election.publicKey,
        voter: voter1Address,
        voterSigner: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();
    
    // Fetch the election account and validate
    const electionAccount = await program.account.election.fetch(election.publicKey);
    expect(electionAccount.votes[candidateIndex]).to.equal(1);
    expect(electionAccount.totalVoters).to.equal(1);
    
    // Fetch the voter account and validate
    const voterAccount = await program.account.voter.fetch(voter1Address);
    expect(voterAccount.hasVoted).to.be.true;
    expect(voterAccount.verificationHash).to.equal(verificationHash);
    
    console.log("Voter 1 cast vote successfully!");
  });

  it('Prevent Double Voting', async () => {
    // Try to cast another vote as voter1
    const candidateIndex = 0; // Try to vote for a different candidate
    const verificationHash = "test-verification-hash-double";
    
    try {
      await program.methods
        .castVote(
          candidateIndex,
          verificationHash
        )
        .accounts({
          election: election.publicKey,
          voter: voter1Address,
          voterSigner: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      
      // If we get here, the test should fail
      expect.fail("Expected to throw an error for double voting");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("AlreadyVoted");
      console.log("Double voting prevented successfully!");
    }
  });

  it('Cast Vote by Voter 2', async () => {
    // Cast a vote as voter2
    const candidateIndex = 2; // Vote for the third candidate
    const verificationHash = "test-verification-hash-2";
    
    await program.methods
      .castVote(
        candidateIndex,
        verificationHash
      )
      .accounts({
        election: election.publicKey,
        voter: voter2Address,
        voterSigner: voter2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter2])
      .rpc();
    
    // Fetch the election account and validate
    const electionAccount = await program.account.election.fetch(election.publicKey);
    expect(electionAccount.votes[candidateIndex]).to.equal(1);
    expect(electionAccount.votes[1]).to.equal(1); // Previous vote still counted
    expect(electionAccount.totalVoters).to.equal(2);
    
    // Fetch the voter account and validate
    const voterAccount = await program.account.voter.fetch(voter2Address);
    expect(voterAccount.hasVoted).to.be.true;
    expect(voterAccount.verificationHash).to.equal(verificationHash);
    
    console.log("Voter 2 cast vote successfully!");
  });

  it('End Election', async () => {
    // End the election
    await program.methods
      .endElection()
      .accounts({
        election: election.publicKey,
        authority: authority.publicKey,
      })
      .signers([authority])
      .rpc();
    
    // Fetch the election account and validate
    const electionAccount = await program.account.election.fetch(election.publicKey);
    expect(electionAccount.isActive).to.be.false;
    
    console.log("Election ended successfully!");
  });

  it('Prevent Voting After Election End', async () => {
    // Try to cast a vote after election end
    const candidateIndex = 0;
    const verificationHash = "test-verification-hash-late";
    
    try {
      await program.methods
        .castVote(
          candidateIndex,
          verificationHash
        )
        .accounts({
          election: election.publicKey,
          voter: voter2Address,
          voterSigner: voter2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter2])
        .rpc();
      
      // If we get here, the test should fail
      expect.fail("Expected to throw an error for voting after election end");
    } catch (error) {
      expect(error.error.errorCode.code).to.equal("ElectionNotActive");
      console.log("Voting after election end prevented successfully!");
    }
  });
});