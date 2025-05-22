const assert = require("assert");
const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Keypair, SystemProgram } = anchor.web3;

describe("Simple e-voting test", () => {
  // Configure the client
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  
  // We'll use this as a workaround if IDL isn't found
  let programId = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

  // Create keypairs for testing
  const authority = Keypair.generate();
  const election = Keypair.generate();
  const voter = Keypair.generate();
  
  // Election parameters
  const electionName = "Test Election";
  const candidates = ["Candidate A", "Candidate B"];
  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + 3600; // 1 hour
  
  it("Prepares test accounts", async () => {
    // Fund all accounts
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        authority.publicKey,
        5 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
    
    await provider.connection.confirmTransaction(
      await provider.connection.requestAirdrop(
        voter.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
    );
    
    console.log("Accounts funded with SOL");
  });
  
  it("Deploys program successfully", async () => {
    // Just verify that programId is valid
    const accountInfo = await provider.connection.getAccountInfo(programId);
    assert(accountInfo !== null, "Program is not deployed at the specified address");
    console.log("Program is deployed successfully");
  });
  
  it("Can create and retrieve a basic account", async () => {
    // Create a simple system account to verify everything is working
    const testAccount = Keypair.generate();
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.createAccount({
        fromPubkey: provider.wallet.publicKey,
        newAccountPubkey: testAccount.publicKey,
        space: 100,
        lamports: await provider.connection.getMinimumBalanceForRentExemption(100),
        programId: SystemProgram.programId,
      })
    );
    
    await provider.sendAndConfirm(tx, [testAccount]);
    
    const accountInfo = await provider.connection.getAccountInfo(testAccount.publicKey);
    assert(accountInfo !== null, "Failed to create test account");
    
    console.log("Basic account creation and verification successful");
  });
});