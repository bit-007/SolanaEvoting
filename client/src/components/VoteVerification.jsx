// client/src/components/VoteVerification.jsx
import { useState, useEffect } from 'react';
import config from '../config';

function VoteVerification({ initialValues = {} }) {
  const [formData, setFormData] = useState({
    walletAddress: initialValues.walletAddress || '',
    electionId: initialValues.electionId || '',
    verificationHash: initialValues.verificationHash || ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  
  // Auto-fill form with initialValues if provided
  useEffect(() => {
    if (initialValues.walletAddress) {
      setFormData(prev => ({
        ...prev,
        walletAddress: initialValues.walletAddress
      }));
    }
    
    if (initialValues.electionId) {
      setFormData(prev => ({
        ...prev, 
        electionId: initialValues.electionId
      }));
    }
    
    // Check if there's a stored verification hash in localStorage
    if (initialValues.electionId) {
      const storedVote = localStorage.getItem(`vote-${initialValues.electionId}`);
      if (storedVote) {
        try {
          const voteData = JSON.parse(storedVote);
          if (voteData.verificationHash) {
            setFormData(prev => ({
              ...prev,
              verificationHash: voteData.verificationHash
            }));
          }
        } catch (e) {
          console.error("Error parsing stored vote data:", e);
        }
      }
    }
  }, [initialValues]);
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    setVerificationResult(null);
    
    try {
      console.log("Submitting verification data:", formData);
      
      const response = await fetch(`${config.API_URL}/votes/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          voterId: formData.walletAddress.trim(),
          electionId: formData.electionId.trim(),
          verificationHash: formData.verificationHash.trim()
        }),
      });
      
      const data = await response.json();
      console.log("Verification response:", data);
      
      if (data.success) {
        setVerificationResult(data);
      } else {
        setError(data.error || 'Verification failed. Please check your input and try again.');
      }
    } catch (error) {
      console.error('Error verifying vote:', error);
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-bg-secondary rounded-lg shadow p-6">
      <h2 className="text-text-primary text-xl font-semibold mb-4">Verify Your Vote</h2>
      
      {error && (
        <div className="mb-4 bg-red-900 border-l-4 border-red-500 p-4 rounded text-white">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {verificationResult && (
        <div className="mb-6 bg-green-900 border-l-4 border-green-500 p-4 rounded text-white">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">Vote Successfully Verified!</p>
              <p className="text-sm mt-1">
                Your vote for {verificationResult.election.name} on {verificationResult.election.date} has been verified.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-text-secondary">Wallet Address</label>
            <input
              type="text"
              id="walletAddress"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleChange}
              required
              placeholder="Your wallet address used for voting"
              className="mt-1 block w-full bg-bg-primary border border-border-color rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
            />
          </div>
          
          <div>
            <label htmlFor="electionId" className="block text-sm font-medium text-text-secondary">Election ID</label>
            <input
              type="text"
              id="electionId"
              name="electionId"
              value={formData.electionId}
              onChange={handleChange}
              required
              placeholder="ID of the election you voted in"
              className="mt-1 block w-full bg-bg-primary border border-border-color rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
            />
          </div>
          
          <div>
            <label htmlFor="verificationHash" className="block text-sm font-medium text-text-secondary">Verification Hash</label>
            <input
              type="text"
              id="verificationHash"
              name="verificationHash"
              value={formData.verificationHash}
              onChange={handleChange}
              required
              placeholder="Hash received when you cast your vote"
              className="mt-1 block w-full bg-bg-primary border border-border-color rounded-md shadow-sm py-2 px-3 text-text-primary focus:outline-none focus:ring-accent-primary focus:border-accent-primary"
            />
          </div>
        </div>
        
        <div className="mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2 bg-accent-primary hover:bg-accent-hover text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-primary disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify Vote'}
          </button>
        </div>
      </form>
      
      <div className="mt-6 border-t border-border-color pt-4 text-text-secondary">
        <h3 className="text-sm font-medium">To verify your vote:</h3>
        <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
          <li>Enter the wallet address you used to vote</li>
          <li>Enter the election ID (found in the URL when voting)</li>
          <li>Enter the verification hash you received after voting</li>
        </ol>
      </div>
    </div>
  );
}

export default VoteVerification;