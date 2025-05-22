// client/src/pages/Home.jsx - Update this file



import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ResultDisplay from '../components/ResultDisplay';
import config from '../config';

function Home({ walletAddress, connected }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedElection, setSelectedElection] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState(null);
  const [isRegistered, setIsRegistered] = useState(true);

  // Fetch elections from the server
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("Fetching elections from:", `${config.API_URL}/elections`);
        const response = await fetch(`${config.API_URL}/elections`);
        const data = await response.json();
        
        if (data.success) {
          console.log("Elections data:", data.elections);
          setElections(data.elections);
        } else {
          console.error("API error:", data.error);
          setError(data.error || 'Failed to fetch elections');
        }
      } catch (error) {
        console.error("Network error:", error);
        setError('Network error. Please check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchElections();
    
    // Refresh elections every 30 seconds
    const interval = setInterval(fetchElections, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewResults = async (election) => {
    try {
      setLoading(true);
      setSelectedElection(election);
      
      const response = await fetch(`${config.API_URL}/results/${election.id}`);
      const data = await response.json();
      
      if (data.success) {
        setResults(data);
        setShowResults(true);
      } else {
        setError(data.error || 'Failed to fetch results');
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Secure Blockchain E-Voting</h1>
        <p className="page-description">
          Welcome to our blockchain-based electronic voting platform. Our system utilizes a multi-layered architecture 
          with Distributed Permission Ledger Technology (DPLT) and the Solana blockchain to ensure security, 
          transparency, and verifiability throughout the electoral process.
        </p>
        
        {!connected && (
          <div className="mt-4 p-4 bg-yellow-50 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">Connect your wallet first</h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    Please connect your Solana wallet to participate in elections. You need a connected wallet to cast votes and view election details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      

      <h2 className="text-2xl font-semibold text-gray-800 mb-4">Active Elections</h2>
      
      {loading && !elections.length ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.filter(e => e.status === 'active').map((election) => (
            <div key={election.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{election.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Ends in: {Math.max(0, Math.floor((election.endTime - Date.now()) / 3600000))} hours
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Candidates: {election.candidates.length}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Votes cast: {election.totalVoters}
                </p>
                <div className="mt-4 flex items-center justify-between">
                  <Link
                    to={`/vote?electionId=${election.id}`}
                    className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${!connected ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={(e) => !connected && e.preventDefault()}
                  >
                    Cast Vote
                  </Link>
                  <button
                    onClick={() => handleViewResults(election)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Results
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {elections.filter(e => e.status === 'active').length === 0 && (
            <div className="col-span-3 bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">No active elections at the moment.</p>

              {/* Add registration button */}
              {connected && (
                <Link
                  to="/register"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Register to Vote
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Past Elections</h2>
      
      {loading && !elections.length ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {elections.filter(e => e.status === 'completed').map((election) => (
            <div key={election.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-medium text-gray-900">{election.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Status: <span className="text-red-500 font-medium">Closed</span>
                </p>
                // client/src/pages/Home.jsx (continued)

                <p className="mt-1 text-sm text-gray-500">
                  Status: <span className="text-red-500 font-medium">Closed</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Candidates: {election.candidates.length}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Total votes: {election.totalVoters}
                </p>
                <div className="mt-4 flex items-center justify-center">
                  <button
                    onClick={() => handleViewResults(election)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    View Results
                  </button>
                </div>
              </div>
            </div>
          ))}
          
          {elections.filter(e => e.status === 'completed').length === 0 && (
            <div className="col-span-3 bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-500">No past elections to display.</p>
            </div>
          )}
        </div>
      )}

      {/* Results Modal */}
      {showResults && selectedElection && results && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowResults(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                  {selectedElection.name} - Results
                </h3>
                <ResultDisplay 
                  election={{
                    electionName: selectedElection.name,
                    isActive: selectedElection.status === 'active'
                  }} 
                  results={results.results}
                />
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={() => setShowResults(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



export default Home;