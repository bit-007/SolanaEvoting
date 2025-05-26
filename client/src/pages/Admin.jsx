// client/src/pages/Admin.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import config from '../config';

function Admin({ walletAddress, connected, isAdmin }) {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    electionName: '',
    candidates: ['', ''],
    startTime: '',
    endTime: ''
  });

  // Fetch elections
  useEffect(() => {
    const fetchElections = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.API_URL}/elections`);
        const data = await response.json();
        
        if (data.success) {
          setElections(data.elections);
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
    
    fetchElections();
  }, []);

  // Input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleCandidateChange = (index, value) => {
    const newCandidates = [...formData.candidates];
    newCandidates[index] = value;
    setFormData({
      ...formData,
      candidates: newCandidates
    });
  };

  const addCandidate = () => {
    setFormData({
      ...formData,
      candidates: [...formData.candidates, '']
    });
  };

  const removeCandidate = (index) => {
    if (formData.candidates.length <= 2) {
      alert('At least two candidates are required');
      return;
    }
    
    const newCandidates = [...formData.candidates];
    newCandidates.splice(index, 1);
    setFormData({
      ...formData,
      candidates: newCandidates
    });
  };

  // Add a separate function to fetch elections
  const fetchElections = async () => {
    try {
      const response = await fetch(`${config.API_URL}/elections`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch elections: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setElections(data.elections);
      } else {
        console.error('Error fetching elections:', data.error);
        setError(data.error || 'Failed to fetch elections');
      }
    } catch (error) {
      console.error('Error fetching elections:', error);
      setError('Network error. Please try again later.');
    }
  };

  // Form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Validation with clearer error messages
      if (!formData.electionName.trim()) {
        alert('Please enter an election name');
        return;
      }
      
      // Filter out empty candidates first
      const filteredCandidates = formData.candidates.filter(c => c.trim());
      
      if (filteredCandidates.length < 2) {
        alert('Please enter at least two candidates');
        return;
      }
      
      if (!formData.startTime || !formData.endTime) {
        alert('Please select both start and end times');
        return;
      }
      
      // Calculate Unix timestamps
      const startTime = Math.floor(new Date(formData.startTime).getTime() / 1000);
      const endTime = Math.floor(new Date(formData.endTime).getTime() / 1000);
      
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (startTime < currentTime) {
        alert('Start time cannot be in the past');
        return;
      }
      
      if (startTime >= endTime) {
        alert('End time must be after start time');
        return;
      }
      
      setLoading(true);
      
      // Log the request data for debugging
      const requestData = {
        electionName: formData.electionName.trim(),
        candidates: filteredCandidates,
        startTime,
        endTime,
        authority: walletAddress
      };
      
      console.log('Submitting election data:', requestData);
      
      // Make the API request
      const response = await fetch(`${config.API_URL}/elections`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });
      
      // Handle non-200 responses
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Server error: ${response.status}`);
        } else {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error(`Server returned status ${response.status}`);
        }
      }
      
      const data = await response.json();
      
      if (data.success) {
        // Success feedback
        alert(`Election created successfully! ID: ${data.electionId}`);
        
        // Reset form
        setFormData({
          electionName: '',
          candidates: ['', ''],
          startTime: '',
          endTime: ''
        });
        
        setShowCreateForm(false);
        
        // Refresh elections list
        await fetchElections();
      } else {
        alert(`Error creating election: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating election:', error);
      alert(`Failed to create election: ${error.message || 'Please check console for details'}`);
    } finally {
      setLoading(false);
    }
  };

  // End election handler
  const handleEndElection = async (electionId) => {
    if (!confirm('Are you sure you want to end this election? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`${config.API_URL}/elections/${electionId}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authority: walletAddress
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Election ended successfully!');
        
        // Update the election status locally
        setElections(prevElections => 
          prevElections.map(election => 
            election.id === electionId 
              ? { ...election, status: 'completed' } 
              : election
          )
        );
      } else {
        alert(`Error ending election: ${data.error}`);
      }
    } catch (error) {
      console.error('Error ending election:', error);
      alert('Failed to end election. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Please connect your wallet to access the admin interface.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              Access denied. You are not an authorized administrator.
            </p>
            <p className="text-sm text-red-700 mt-2">
              Your wallet address: {walletAddress}
            </p>
            <p className="text-sm text-red-600 mt-2">
              If you believe this is an error, please contact the system administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Election Administration</h1>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {showCreateForm ? 'Cancel' : 'Create New Election'}
          </button>
        </div>
        
        {showCreateForm && (
          <div className="bg-gray-50 p-6 mb-6 rounded-lg">
            <h2 className="text-xl font-semibold mb-4">Create New Election</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Election Name</label>
                <input
                  type="text"
                  name="electionName"
                  value={formData.electionName}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Candidates</label>
                {formData.candidates.map((candidate, index) => (
                  <div key={index} className="flex mt-1">
                    <input
                      type="text"
                      value={candidate}
                      onChange={(e) => handleCandidateChange(index, e.target.value)}
                      className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={`Candidate ${index + 1}`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeCandidate(index)}
                      className="ml-2 inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCandidate}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Candidate
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Start Time</label>
                  <input
                    type="datetime-local"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">End Time</label>
                  <input
                    type="datetime-local"
                    name="endTime"
                    value={formData.endTime}
                    onChange={handleInputChange}
                   className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                   required
                 />
               </div>
             </div>
             
             <div className="flex justify-end">
               <button
                 type="submit"
                 disabled={loading}
                 className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
               >
                 {loading ? 'Creating...' : 'Create Election'}
               </button>
             </div>
           </form>
         </div>
       )}
     </div>
     
     <h2 className="text-xl font-semibold text-gray-800 mb-4">Manage Elections</h2>
     
     {loading && !elections.length ? (
       <div className="flex justify-center my-12">
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
       <div className="bg-white shadow overflow-hidden sm:rounded-md">
         <ul className="divide-y divide-gray-200">
           {elections.length === 0 ? (
             <li className="px-4 py-4 sm:px-6">
               <p className="text-gray-500 text-center py-4">No elections found. Create a new election to get started.</p>
             </li>
           ) : (
             elections.map((election) => (
               <li key={election.id} className="px-4 py-4 sm:px-6">
                 <div className="flex items-center justify-between">
                   <div>
                     <h3 className="text-lg font-medium text-gray-900">{election.name}</h3>
                     <div className="mt-2 flex items-center text-sm text-gray-500">
                       <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                         election.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                       }`}>
                         {election.status === 'active' ? 'Active' : 'Completed'}
                       </span>
                       <span className="ml-2">
                         {election.candidates.length} candidates
                       </span>
                       <span className="ml-2">
                         {election.totalVoters} votes cast
                       </span>
                     </div>
                     <div className="mt-2 flex items-center text-sm text-gray-500">
                       <span>
                         Start: {new Date(election.startTime).toLocaleString()}
                       </span>
                       <span className="ml-2">
                         End: {new Date(election.endTime).toLocaleString()}
                       </span>
                     </div>
                   </div>
                   <div className="flex space-x-2">
                     <Link
                       to={`/vote?electionId=${election.id}`}
                       className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                     >
                       View
                     </Link>
                     
                     {election.status === 'active' && (
                       <button
                         onClick={() => handleEndElection(election.id)}
                         className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                       >
                         End Election
                       </button>
                     )}
                   </div>
                 </div>
               </li>
             ))
           )}
         </ul>
       </div>
     )}
     
     <div className="mt-6 bg-white rounded-lg shadow-md p-6">
       <h2 className="text-lg font-medium text-gray-900 mb-2">Admin Actions</h2>
       <p className="text-sm text-gray-500 mb-4">
         As an administrator, you can create new elections, monitor ongoing elections, and end active elections.
         All actions are recorded on the blockchain for transparency and auditability.
       </p>
       
       <div className="border-t border-gray-200 pt-4">
         <h3 className="text-sm font-medium text-gray-500">Your Admin Address</h3>
         <p className="mt-1 text-sm text-gray-900 font-mono">{walletAddress}</p>
       </div>
       
       <div className="mt-4">
         <h3 className="text-lg font-medium text-gray-900">Advanced Features</h3>
         <div className="mt-2">
           <Link 
             to="/dplt" 
             className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
           >
             View DPLT Network Status
           </Link>
         </div>
         <p className="mt-2 text-sm text-gray-500">
           Monitor the Distributed Permission Ledger Technology (DPLT) network that powers the transparency and security features of our e-voting system.
         </p>
       </div>
     </div>
   </div>
 );
}

export default Admin;