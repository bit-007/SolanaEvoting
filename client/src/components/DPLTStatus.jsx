// client/src/components/DPLTStatus.jsx
import { useState, useEffect } from 'react';
import config from '../config';

function DPLTStatus() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/dplt/status`);
        const data = await response.json();
        
        if (data.success) {
          setStatus(data);
        } else {
          setError(data.error || 'Failed to fetch DPLT status');
        }
      } catch (error) {
        console.error('Error fetching DPLT status:', error);
        setError('Network error. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
    
    // Refresh status every 10 seconds
    const interval = setInterval(fetchStatus, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
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
    );
  }
  
  if (!status || !status.network) {
    return null;
  }
  
  const { network } = status;
  const nodes = network.nodes || [];
  const validators = network.validators || [];
  
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">DPLT Network Status</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-blue-600">{nodes.length}</div>
          <div className="text-sm text-blue-800">Nodes</div>
        </div>
        
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-600">{network.totalBlocks || 0}</div>
          <div className="text-sm text-green-800">Blocks</div>
        </div>
        
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-purple-600">{network.totalTransactions || 0}</div>
          <div className="text-sm text-purple-800">Processed Transactions</div>
        </div>
        
        <div className="bg-yellow-50 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-600">
            {nodes.reduce((sum, node) => sum + (node.transactionCount || 0), 0)}
          </div>
          <div className="text-sm text-yellow-800">Pending Transactions</div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Node Status</h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Node ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Blocks</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Block</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {nodes.map((node) => (
                <tr key={node.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{node.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{node.transactionCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{node.blockCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    #{node.latestBlock?.index || 0} ({node.latestBlock ? new Date(node.latestBlock.timestamp).toLocaleTimeString() : 'N/A'})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-800 mb-2">Validator Status</h3>
        <div className="bg-gray-50 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Validator ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Validations</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Approved</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {validators.map((validator) => (
                <tr key={validator.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{validator.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{validator.validationCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{validator.approvedCount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{validator.rejectedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {network.consensus && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">Consensus Status</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Block Interval</p>
                <p className="text-md font-medium">{network.consensus.blockInterval / 1000} seconds</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Time to Next Block</p>
                <p className="text-md font-medium">{Math.ceil(network.consensus.nextBlockIn / 1000)} seconds</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Network Consistency</p>
                <p className={`text-md font-medium ${network.consensus.consistent ? 'text-green-600' : 'text-red-600'}`}>
                  {network.consensus.consistent ? 'Consistent' : 'Inconsistent'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Node Count</p>
                <p className="text-md font-medium">{network.consensus.nodeCount}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-xs text-gray-500 text-right">
        Last updated: {new Date().toLocaleTimeString()}
      </div>

      // In client/src/components/DPLTStatus.jsx - Add this near the end of the component

{network.consensus && !network.consensus.consistent && (
  <div className="mt-4 p-4 bg-red-900 border border-red-700 rounded-lg">
    <h3 className="text-lg font-medium text-white mb-2">Network Inconsistency Detected</h3>
    <p className="text-sm text-red-200 mb-4">
      The DPLT network nodes are out of sync. This may affect transaction processing.
    </p>
    <button
      onClick={async () => {
        try {
          setLoading(true);
          const response = await fetch(`${config.API_URL}/dplt/recover`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          const data = await response.json();
          if (data.success) {
            alert('Network recovery initiated. The page will refresh in 3 seconds.');
            setTimeout(() => window.location.reload(), 3000);
          } else {
            alert(`Recovery failed: ${data.error}`);
          }
        } catch (error) {
          alert(`Error initiating recovery: ${error.message}`);
        } finally {
          setLoading(false);
        }
      }}
      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
    >
      Force Network Recovery
    </button>
  </div>
)}
    </div>
  );
}

export default DPLTStatus;