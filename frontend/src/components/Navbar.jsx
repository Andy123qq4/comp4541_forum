import { Link } from 'react-router-dom';
import { useEffect } from 'react';

const Navbar = ({ account, connectWallet }) => {
  // Function to truncate Ethereum address for display
  const truncateAddress = (address) => {
    if (!address) return 'Connect Wallet';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Function to handle disconnection
  const handleDisconnect = () => {
    // MetaMask doesn't have a true disconnect method
    // So we'll reload the page which resets the app state
    window.location.reload();
  };

  // Function to handle switching accounts
  const handleSwitch = async () => {
    try {
      // Force MetaMask to show the account selection modal
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      
      // After selecting, refresh the wallet connection
      connectWallet();
    } catch (error) {
      console.error('Error switching account:', error);
    }
  };

  // Check if MetaMask is installed
  const isMetaMaskInstalled = () => {
    return typeof window.ethereum !== 'undefined';
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">HKUST Anonymous Forum</Link>
      </div>
      <div className="navbar-menu">
        <Link to="/" className="navbar-item">Home</Link>
        <Link to="/create" className="navbar-item">Create Post</Link>
      </div>
      <div className="navbar-end">
        <div className="wallet-info">
          {account ? (
            <div className="wallet-controls">
            <div className="connected-wallet">
                <span className="wallet-status">Connected</span>
              </div>
              <div className="wallet-buttons">
                <button 
                  className="connect-wallet-btn reconnect"
                  onClick={handleSwitch}
                  title="Switch accounts or reconnect wallet"
                >
                  Switch
                </button>
                <button 
                  className="connect-wallet-btn disconnect"
                  onClick={handleDisconnect}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <>
              {isMetaMaskInstalled() ? (
            <button 
              className="connect-wallet-btn"
                  onClick={connectWallet}
            >
              Connect Wallet
            </button>
              ) : (
                <a 
                  href="https://metamask.io/download/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="connect-wallet-btn"
                >
                  Install MetaMask
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 