// client/src/components/SideNavigation.jsx
import { Link, useLocation } from 'react-router-dom';

function SideNavigation({ walletAddress, connected, isAdmin, connectWallet, disconnectWallet }) {
  const location = useLocation();
  
  return (
    <div className="sidebar h-screen fixed left-0 top-0 overflow-y-auto">
      {/* Logo Section */}
      <div className="flex items-center p-4 border-b border-border-color">
        <span className="text-lg font-bold text-text-primary">E-Voting</span>
      </div>
      
      {/* Wallet Section */}
      <div className="p-4 bg-bg-secondary border-b border-border-color">
        {connected ? (
          <div className="flex flex-col space-y-2">
            <span className="text-xs text-text-secondary">Connected wallet</span>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-mono truncate text-text-primary">
                  {walletAddress.substring(0, 6)}...{walletAddress.substring(walletAddress.length - 4)}
                </span>
              </div>
              <button 
                onClick={disconnectWallet}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Disconnect
              </button>
            </div>
            {isAdmin && (
              <div className="mt-2 px-2 py-1 bg-blue-600 rounded-md text-center">
                <span className="text-xs text-white font-medium">Administrator</span>
              </div>
            )}
          </div>
        ) : (
          <button 
            onClick={connectWallet}
            className="connect-wallet-btn w-full"
          >
            Connect Wallet
          </button>
        )}
      </div>
      
      {/* Navigation */}
      <div className="p-4">
        <Link to="/" className={`nav-link ${location.pathname === "/" ? "active" : ""} mb-2`}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
          </svg>
          Home
        </Link>

        <div className="nav-section">Elections</div>
        
        <Link to="/vote" className={`nav-link ${location.pathname === "/vote" ? "active" : ""} mb-2`}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path>
          </svg>
          Vote
        </Link>
        
        <Link to="/verify" className={`nav-link ${location.pathname === "/verify" ? "active" : ""} mb-2`}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Verify Vote
        </Link>
        
        <div className="nav-section">Account</div>
        
        <Link to="/register" className={`nav-link ${location.pathname === "/register" ? "active" : ""} mb-2`}>
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
          </svg>
          Register
        </Link>
        
        {/* Admin section - only show if user is admin */}
        {connected && isAdmin && (
          <>
            <div className="nav-section">Admin</div>
            
            <Link to="/admin" className={`nav-link ${location.pathname === "/admin" ? "active" : ""} mb-2`}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
              Admin Panel
            </Link>
            
            <Link to="/dplt" className={`nav-link ${location.pathname === "/dplt" ? "active" : ""} mb-2`}>
              <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"></path>
              </svg>
              DPLT Status
            </Link>
          </>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 text-xs text-center text-text-secondary border-t border-border-color mt-auto">
        © 2025 Blockchain E-Voting
        <br />
        Built with Solana & DPLT
      </div>
    </div>
  );
}

export default SideNavigation;