//client/src/components/ResultDisplay.jsx
import { useEffect, useRef } from 'react';

function ResultDisplay({ election, results }) {
  const canvasRef = useRef(null);
  
  // Calculate total votes for percentages
  const totalVotes = results 
    ? results.reduce((sum, result) => sum + result.votes, 0)
    : 0;
  
  // Sort results by votes (descending)
  const sortedResults = results 
    ? [...results].sort((a, b) => b.votes - a.votes)
    : [];

  // Draw bar chart on canvas
  useEffect(() => {
    if (!canvasRef.current || !results || results.length === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Calculate bar dimensions
    const barCount = results.length;
    const barWidth = width / (barCount * 2);
    const spacing = barWidth;
    const maxVotes = Math.max(...results.map(r => r.votes));
    
    // Draw bars
    results.forEach((result, index) => {
      // Calculate bar height proportional to votes
      const barHeight = (result.votes / maxVotes) * (height - 40);
      const x = spacing + index * (barWidth + spacing);
      const y = height - barHeight - 20;
      
      // Generate a color based on index
      const hue = (index * 137) % 360; // Golden angle to distribute colors
      ctx.fillStyle = `hsl(${hue}, 70%, 60%)`;
      
      // Draw bar
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw vote count
      ctx.fillStyle = '#4B5563';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(result.votes, x + barWidth / 2, y - 5);
      
      // Draw candidate name (truncate if too long)
      let candidateName = result.candidate;
      if (candidateName.length > 12) {
        candidateName = candidateName.substring(0, 10) + '...';
      }
      ctx.fillText(candidateName, x + barWidth / 2, height - 5);
    });
  }, [results]);

  return (
    <div>
      {election.isActive ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                This election is still ongoing. Results may change as more votes are cast.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">
                This election has ended. These are the final results.
              </p>
            </div>
          </div>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <div className="flex flex-col">
          {/* Bar chart */}
          <div className="mb-4">
            <canvas 
              ref={canvasRef} 
              width={500} 
              height={300} 
              className="w-full h-52"
            />
          </div>
          
          {/* Results table */}
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Votes
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedResults.map((result, index) => (
                <tr key={index} className={index === 0 ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {index + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {result.candidate}
                    {index === 0 && !election.isActive && (
                      <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Winner
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {result.votes}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {totalVotes > 0 ? ((result.votes / totalVotes) * 100).toFixed(2) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="mt-4 text-sm text-gray-500">
        <p>Total votes cast: {totalVotes}</p>
      </div>
    </div>
  );
}

export default ResultDisplay;