// client/src/pages/Vote.jsx
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import VoteForm from '../components/VoteForm';
import ConnectWallet from '../components/ConnectWallet';
import VoterRegistration from '../components/VoterRegistration';
import VoteVerification from '../components/VoteVerification';
import config from '../config';

function Vote({ walletAddress, connected }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [voted, setVoted] = useState(false);
  const [txSignature, setTxSignature] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [isCheckingRegistration, setIsCheckingRegistration] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verificationHash, setVerificationHash] = useState('');
  
  const electionId = searchParams.get('electionId');

  // Check if the voter is registered
  useEffect(() => {
    const checkVoterRegistration = async () => {
      if (!connected || !walletAddress) return;
      
      setIsCheckingRegistration(true);
      
      try {
        const response = await fetch(`${config.API_URL}/voters/${walletAddress}`);
        const data = await response.json();
        
        setIsRegistered(data.success && data.isRegistered);
      } catch (error) {
        console.error('Error checking voter registration:', error);
        setIsRegistered(false);
      } finally {
        setIsCheckingRegistration(false);
      }
    };
    
    checkVoterRegistration();
  }, [connected, walletAddress]);

  // Check if the voter has already voted
  useEffect(() => {
    const checkVotedStatus = async () => {
      if (!connected || !electionId || !walletAddress) return;
      
      try {
        const response = await fetch(`${config.API_URL}/vote/check`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            electionId,
            voter: walletAddress
          }),
        });
        
        const data = await response.json();
        
        if (data.success && data.hasVoted) {
          setVoted(true);
          if (data.verificationHash) {
            setVerificationHash(data.verificationHash);
          }
        }
      } catch (error) {
        console.error('Error checking voter status:', error);
      }
    };
    
    checkVotedStatus();
  }, [connected, electionId, walletAddress]);

  // Fetch election details
  useEffect(() => {
    const fetchElection = async () => {
      try {
        setLoading(true);
        
        if (!electionId) {
          // If no election ID is provided, load all available elections
          const response = await fetch(`${config.API_URL}/elections`);
          const data = await response.json();
          
          if (data.success) {
            // Filter only active elections
            const activeElections = data.elections.filter(e => e.status === 'active');
            
            if (activeElections.length > 0) {
              setElection({
                elections: activeElections,
                selectedElection: null
              });
            } else {
              setError('No active elections found.');
            }
          } else {
            setError(data.error || 'Failed to fetch elections');
          }
        } else {
          // Fetch specific election by ID
          const response = await fetch(`${config.API_URL}/elections/${electionId}`);
          const data = await response.json();
          
          if (data.success) {
            if (data.election.status === 'active') {
              setElection({
                elections: [data.election],
                selectedElection: data.election
              });
            } else {
              setError('This election is no longer active.');
            }
          } else {
            setError(`Election with ID ${electionId} not found.`);
          }
        }
      } catch (error) {
        console.error('Error fetching election:', error);
        setError('Failed to fetch election details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchElection();
  }, [electionId]);

  const handleElectionSelect = (selectedElection) => {
    setElection(prev => ({
      ...prev,
      selectedElection
    }));
  };

  const handleRegistrationComplete = () => {
    setIsRegistered(true);
    // Refresh the page to show elections
    fetchElections();
  };

  const fetchElections = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${config.API_URL}/elections`);
      const data = await response.json();
      
      if (data.success) {
        // Filter only active elections
        const activeElections = data.elections.filter(e => e.status === 'active');
        
        if (activeElections.length > 0) {
          setElection({
            elections: activeElections,
            selectedElection: null
          });
        } else {
          setError('No active elections found.');
        }
      } else {
        setError(data.error || 'Failed to fetch elections');
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

const handleVote = async (candidateIndex, useZKP = false) => {
  try {
    if (!connected || !election?.selectedElection) {
      alert('Please connect your wallet and select an election first.');
      return;
    }
    if (!isRegistered) {
      alert('You must register before voting. Please complete the registration process.');
      return;
    }
    
    // Send the vote to the backend
    setLoading(true);
    
    // Choose endpoint based on ZKP flag
    const endpoint = useZKP ? `${config.API_URL}/vote/zkp` : `${config.API_URL}/vote`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        electionId: election.selectedElection.id,
        candidateIndex,
        voter: walletAddress,
        useZKP // Add this flag for ZKP endpoint
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setTxSignature(result.tx);
      setExplorerUrl(result.explorerUrl || `https://explorer.solana.com/tx/${result.tx}?cluster=devnet`);
      setVerificationHash(result.verificationHash);
      
      // Store verification hash in localStorage for later verification
      localStorage.setItem(`vote-${election.selectedElection.id}`, JSON.stringify({
        electionId: election.selectedElection.id,
        electionName: election.selectedElection.name,
        verificationHash: result.verificationHash,
        votedAt: Date.now(),
        candidateIndex: useZKP ? null : candidateIndex, // Hide candidate for ZKP
        candidate: useZKP ? 'Private (ZKP)' : election.selectedElection.candidates[candidateIndex],
        isZKP: useZKP,
        zkpEnabled: result.zkpEnabled
      }));
      
      setVoted(true);
    } else {
      setError(result.error || 'Failed to cast vote. Please try again.');
    }
  } catch (error) {
    console.error('Error casting vote:', error);
    setError('Failed to cast your vote. Please try again later.');
  } finally {
    setLoading(false);
  }
};

  if (!connected) {
    return <ConnectWallet />;
  }

  if (isCheckingRegistration) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isRegistered) {
    return <VoterRegistration walletAddress={walletAddress} onRegistrationComplete={handleRegistrationComplete} />;
  }

  if (showVerification) {
    return (
      <div>
        <button
          onClick={() => setShowVerification(false)}
          className="mb-4 px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          &larr; Back to Elections
        </button>
        <VoteVerification initialValues={{
          walletAddress: walletAddress,
          electionId: electionId || ''
        }} />
      </div>
    );
  }

  if (loading && !election) {
    return (
      <div className="flex justify-center my-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 my-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (voted) {
    return (
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-700">
                  Your vote has been successfully cast!
                </p>
              </div>
            </div>
          </div>
          
          <h3 className="text-lg leading-6 font-medium text-gray-900">Vote Confirmation</h3>
          <div className="mt-5 border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Election</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{election.selectedElection.name}</dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Transaction Signature</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-all">{txSignature}</dd>
              </div>
              {verificationHash && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">Verification Hash</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 break-all">
                    {verificationHash}
                    <p className="mt-1 text-xs text-gray-500">
                      Save this hash to verify your vote later. It will also be stored locally in your browser.
                    </p>
                  </dd>
                </div>
              )}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500">Verification</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  Your vote has been verified by multiple validators and recorded on the Solana blockchain.
                  <div className="mt-2 flex space-x-4">
                    <a 
                      href={explorerUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View on Solana Explorer
                    </a>
                    <button
                      onClick={() => setShowVerification(true)}
                      className="text-green-600 hover:text-green-800 hover:underline"
                    >
                      Verify Your Vote
                    </button>
                  </div>
                </dd>
              </div>
            </dl>
          </div>
          
          <div className="mt-6 flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Home
            </button>
            
            <button
              type="button"
              onClick={() => {
                setVoted(false);
                setElection(prev => ({
                  ...prev,
                  selectedElection: null
                }));
                navigate('/vote');
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              View Other Elections
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Cast Your Vote</h3>
          <button
            onClick={() => setShowVerification(true)}
            className="px-3 py-1 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Verify a Vote
          </button>
        </div>
        
        <AirdropButton walletAddress={walletAddress} />
        
        {!election?.selectedElection ? (
          <div>
            <p className="mb-4 text-sm text-gray-500">Please select an election to vote in:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {election?.elections.map((elecItem) => (
                <div 
                  key={elecItem.id}
                  onClick={() => handleElectionSelect(elecItem)}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-blue-50 transition-colors"
                >
                  <h4 className="font-medium text-gray-900">{elecItem.name}</h4>
                  <p className="text-sm text-gray-500">
                    Ends in: {Math.floor((elecItem.endTime - Date.now()) / 3600000)} hours
                  </p>
                  <p className="text-sm text-gray-500">
                    Candidates: {elecItem.candidates.length}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <VoteForm 
            election={election.selectedElection} 
            walletAddress={walletAddress}
            onVote={handleVote}
          />
        )}
        
        <div className="mt-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2">Voter Information</h4>
          <p className="text-sm text-gray-500 mb-2">
            You are registered to vote with wallet address:
          </p>
          <p className="font-mono text-sm bg-gray-100 p-2 rounded break-all">
            {walletAddress}
          </p>
        </div>
      </div>
    </div>
  );
}

function AirdropButton({ walletAddress }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const requestAirdrop = async () => {
    if (!walletAddress) return;
    
    try {
      setLoading(true);
      setMessage('Requesting airdrop...');
      
      const response = await fetch(`${config.API_URL}/airdrop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ wallet: walletAddress }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setMessage(`Successfully airdropped 1 SOL! Transaction: ${data.signature.slice(0, 8)}...`);
      } else {
        setMessage(`Airdrop failed: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="my-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
      <p className="text-sm mb-2">Need SOL to vote? Request a devnet airdrop:</p>
      <button
        onClick={requestAirdrop}
        disabled={loading}
        className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md disabled:opacity-50"
      >
        {loading ? 'Processing...' : 'Get 1 SOL'}
      </button>
      {message && (
        <p className="mt-2 text-sm text-gray-600">{message}</p>
      )}
    </div>
  );
}

export default Vote;