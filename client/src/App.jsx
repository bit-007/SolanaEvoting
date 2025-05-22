// client/src/App.jsx
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Vote from './pages/Vote';
import Admin from './pages/Admin';
import './index.css';
import DPLTStatus from './components/DPLTStatus';
import VoterRegistration from './components/VoterRegistration';
import VoteVerification from './components/VoteVerification';
import SideNavigation from './components/SideNavigation';

function App() {
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Check if Phantom wallet is connected on load
    const onLoad = async () => {
      try {
        const { solana } = window;
        
        if (solana && solana.isPhantom) {
          console.log("Phantom wallet found, checking connection...");
          
          // Try to connect with onlyIfTrusted flag
          try {
            const response = await solana.connect({ onlyIfTrusted: true });
            console.log("Connected to wallet:", response.publicKey.toString());
            setWalletAddress(response.publicKey.toString());
            setConnected(true);
          } catch (err) {
            console.log("Not connected yet:", err.message);
            // This is normal if the user hasn't connected before
          }
        } else {
          console.warn("Phantom wallet not found");
        }
      } catch (error) {
        console.error('Wallet connection error:', error);
      }
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  const connectWallet = async () => {
    try {
      const { solana } = window;
      
      if (solana) {
        console.log("Attempting to connect to Phantom wallet...");
        const response = await solana.connect();
        console.log("Connected successfully:", response.publicKey.toString());
        setWalletAddress(response.publicKey.toString());
        setConnected(true);
      } else {
        alert('Please install Phantom wallet to use this app!');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
      alert(`Error connecting wallet: ${error.message}`);
    }
  };

  const disconnectWallet = async () => {
    try {
      const { solana } = window;
      
      if (solana) {
        await solana.disconnect();
        setWalletAddress('');
        setConnected(false);
        console.log("Wallet disconnected");
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <Router>
      <div className="flex min-h-screen bg-bg-primary">
        {/* Mobile menu toggle button */}
        <div className="md:hidden fixed top-4 left-4 z-50">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 bg-accent-primary rounded-md text-white"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path>
              </svg>
            )}
          </button>
        </div>
        
        {/* Side Navigation - hidden on mobile unless menu is open */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block z-40`}>
          <SideNavigation 
            walletAddress={walletAddress} 
            connected={connected}
            connectWallet={connectWallet}
            disconnectWallet={disconnectWallet}
          />
        </div>
        
        {/* Main Content */}
        <div className="main-content w-full md:ml-64 flex-1">
          <main className="p-6">
            <Routes>
              <Route path="/" element={<Home walletAddress={walletAddress} connected={connected} />} />
              <Route path="/vote" element={<Vote walletAddress={walletAddress} connected={connected} />} />
              <Route path="/admin" element={<Admin walletAddress={walletAddress} connected={connected} />} />
              <Route path="/register" element={<VoterRegistration walletAddress={walletAddress} onRegistrationComplete={() => window.location.href = '/vote'} />} />
              <Route path="/verify" element={<VoteVerification />} />
              <Route path="/dplt" element={<DPLTStatus />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;