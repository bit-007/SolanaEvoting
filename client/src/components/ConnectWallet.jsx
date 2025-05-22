//client/src/components/ConnetWallet.jsx
function ConnectWallet() {
  const connectWallet = async () => {
    try {
      const { solana } = window;
      
      if (solana) {
        await solana.connect();
        // Page will refresh and App.jsx will detect the connection
      } else {
        alert('Please install Phantom wallet to use this app!');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6 text-center">
        <svg 
          className="mx-auto h-12 w-12 text-gray-400" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
          />
        </svg>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Wallet Connection Required</h3>
        <p className="mt-1 text-sm text-gray-500">
          Please connect your Solana wallet to participate in an election.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={connectWallet}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect Wallet
          </button>
        </div>
      </div>
      
      <div className="bg-gray-50 px-4 py-5 sm:p-6">
        <h4 className="text-sm font-medium text-gray-500">Why connect a wallet?</h4>
        <ul className="mt-2 text-sm text-gray-500 list-disc pl-5 space-y-1">
          <li>Your wallet address serves as your unique voter ID</li>
          <li>It ensures that each person can only vote once</li>
          <li>It allows you to securely sign your vote transaction</li>
          <li>It enables verification of your vote on the blockchain</li>
        </ul>
        
        <h4 className="mt-4 text-sm font-medium text-gray-500">Supported wallets:</h4>
        <p className="mt-1 text-sm text-gray-500">
          Currently, this app supports Phantom wallet for Solana. If you don't have it installed yet, you can get it from <a href="https://phantom.app/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">phantom.app</a>.
        </p>
      </div>
    </div>
  );
}

export default ConnectWallet;