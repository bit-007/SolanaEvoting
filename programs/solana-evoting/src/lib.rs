use anchor_lang::prelude::*;

declare_id!("GbzpQsWceMHsMLzAshjft5yvqt2m2ULdCJzCErGpWR9");

#[program]
pub mod solana_evoting {
    use super::*;

    // Initialize the election with candidates
    pub fn initialize_election(
        ctx: Context<InitializeElection>,
        election_name: String,
        candidates: Vec<String>,
        start_time: i64,
        end_time: i64,
    ) -> Result<()> {
        let election = &mut ctx.accounts.election;
        election.authority = ctx.accounts.authority.key();
        election.election_name = election_name;
        election.candidates = candidates;
        election.votes = vec![0; election.candidates.len()];
        election.start_time = start_time;
        election.end_time = end_time;
        election.is_active = true;
        election.total_voters = 0;
        Ok(())
    }

    // Cast a vote in the election
    pub fn cast_vote(
        ctx: Context<CastVote>, 
        candidate_index: u8,
        verification_hash: String, // Hash from the DPLT layer
    ) -> Result<()> {
        let election = &mut ctx.accounts.election;
        let voter = &mut ctx.accounts.voter;
        
        // Check if election is active
        require!(election.is_active, ErrorCode::ElectionNotActive);
        
        // Check if current time is within election period
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= election.start_time && 
            clock.unix_timestamp <= election.end_time,
            ErrorCode::ElectionNotInProgress
        );
        
        // Check if the voter has already voted
        require!(!voter.has_voted, ErrorCode::AlreadyVoted);
        
        // Check if candidate index is valid
        require!(
            (candidate_index as usize) < election.candidates.len(),
            ErrorCode::InvalidCandidate
        );
        
        // Record the vote
        election.votes[candidate_index as usize] += 1;
        election.total_voters += 1;
        
        // Mark voter as having voted
        voter.has_voted = true;
        voter.verification_hash = verification_hash;
        
        Ok(())
    }

    // End the election
    pub fn end_election(ctx: Context<EndElection>) -> Result<()> {
        let election = &mut ctx.accounts.election;
        
        // Only the authority can end the election
        require!(
            ctx.accounts.authority.key() == election.authority,
            ErrorCode::Unauthorized
        );
        
        election.is_active = false;
        
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeElection<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 100 + 4 + (50 * 10) + 4 + (4 * 10) + 8 + 8 + 1 + 4,
    )]
    pub election: Account<'info, Election>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(candidate_index: u8, verification_hash: String)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    
    #[account(
        init_if_needed,
        payer = voter_signer,
        space = 8 + 1 + 100,
        seeds = [b"voter", voter_signer.key().as_ref(), election.key().as_ref()],
        bump
    )]
    pub voter: Account<'info, Voter>,
    
    #[account(mut)]
    pub voter_signer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct EndElection<'info> {
    #[account(mut)]
    pub election: Account<'info, Election>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Election {
    pub authority: Pubkey,
    pub election_name: String,
    pub candidates: Vec<String>,
    pub votes: Vec<u32>,
    pub start_time: i64,
    pub end_time: i64,
    pub is_active: bool,
    pub total_voters: u32,
}

#[account]
pub struct Voter {
    pub has_voted: bool,
    pub verification_hash: String, // Hash from the DPLT layer for verification
}

#[error_code]
pub enum ErrorCode {
    #[msg("The election is not active")]
    ElectionNotActive,
    #[msg("The election is not in progress")]
    ElectionNotInProgress,
    #[msg("You have already voted in this election")]
    AlreadyVoted,
    #[msg("Invalid candidate index")]
    InvalidCandidate,
    #[msg("Unauthorized to perform this action")]
    Unauthorized,
}