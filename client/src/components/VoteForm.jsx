//client/src/components/VoteForm.jsx
import { useState } from 'react';

function VoteForm({ election, walletAddress, onVote }) {
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedCandidate === null) {
      setError('Please select a candidate to vote for.');
      return;
    }
    
    // Call parent component's vote handler
    onVote(selectedCandidate);
  };

  return (
    <div>
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              You are voting in <span className="font-medium">{election.electionName}</span> with your wallet address <span className="font-mono">{walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 6)}</span>
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
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
      )}

      <form onSubmit={handleSubmit}>
        <div className="border rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 text-sm font-medium text-gray-500 border-b">
            Select a candidate to vote for:
          </div>
          <div className="divide-y divide-gray-200">
            {election.candidates.map((candidate, index) => (
              <div key={index} className="p-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="candidate"
                    value={index}
                    checked={selectedCandidate === index}
                    onChange={() => setSelectedCandidate(index)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-3 text-gray-900">{candidate}</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center">
          <div className="w-full sm:max-w-xs">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cast Vote
            </button>
          </div>
          <div className="ml-4 text-sm text-gray-500">
            Your vote will be securely recorded on the blockchain.
          </div>
        </div>
      </form>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-500">How your vote is secured:</h4>
        <ul className="mt-2 text-sm text-gray-500 list-disc pl-5 space-y-1">
          <li>Your vote is verified by multiple validators</li>
          <li>A cryptographic verification hash is generated as proof</li>
          <li>The vote is permanently recorded on the Solana blockchain</li>
          <li>Your identity is kept private while maintaining verifiability</li>
        </ul>
      </div>
    </div>
  );
}

export default VoteForm;