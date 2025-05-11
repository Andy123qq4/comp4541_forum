import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ethers } from 'ethers'
import contractABI from './contract/HKUSTForum.json'
import Navbar from './components/Navbar'
import HomePage from './components/HomePage'
import CreatePost from './components/CreatePost'
import PostDetail from './components/PostDetail'
import './App.css'

function App() {
  const [account, setAccount] = useState('')
  const [contract, setContract] = useState(null)
  const [provider, setProvider] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  // Contract address - replace with your deployed contract address
  const contractAddress = '0x5538b80d6DC078c6C3E413c5b61ecE43f0A808b5'

  // Determine basename for Router from environment variable
  const publicBasePath = import.meta.env.VITE_PUBLIC_BASE_PATH || "/";

  // Handle account changes more robustly
  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      // User disconnected their wallet
      setAccount('');
      console.log('Please connect to MetaMask.');
    } else if (accounts[0] !== account) {
      // User switched accounts
      setAccount(accounts[0]);
      
      // Reinitialize contract with new signer
      if (provider) {
        try {
          const signer = provider.getSigner();
          const forumContract = new ethers.Contract(
            contractAddress,
            contractABI.abi,
            signer
          );
          setContract(forumContract);
        } catch (error) {
          console.error('Error updating signer:', error);
        }
      }
    }
  };

  useEffect(() => {
    const init = async () => {
      // Check if MetaMask is installed
      if (window.ethereum) {
        try {
          // Get current accounts
          const accounts = await window.ethereum.request({
            method: 'eth_accounts', // This gets currently connected accounts without prompting
          });
          
          if (accounts.length > 0) {
            setAccount(accounts[0]);
          }

          // Create provider instance
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          setProvider(provider);

          // Only create contract if we have an account
          if (accounts.length > 0) {
            const signer = provider.getSigner();
            const forumContract = new ethers.Contract(
              contractAddress,
              contractABI.abi,
              signer
            );
            setContract(forumContract);
          } else {
            // If no accounts are connected, prompt user to connect
            connectWallet();
          }

          // Listen for account changes
          window.ethereum.on('accountsChanged', handleAccountsChanged);
          
          // Listen for chain changes
          window.ethereum.on('chainChanged', () => {
            // Reload the page when the chain changes
            window.location.reload();
          });
        } catch (error) {
          console.error('Error initializing app', error);
        }
      }
      setLoading(false);
    };

    init();
    
    // Cleanup event listeners on unmount
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  // Function to connect wallet - can be passed to child components if needed
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
        handleAccountsChanged(accounts);
      } catch (error) {
        console.error('Error connecting to MetaMask', error);
      }
    } else {
      alert('Please install MetaMask to use this dApp');
    }
  };

  return (
    <Router basename={publicBasePath}>
      <div className="app">
        <Navbar 
          account={account} 
          connectWallet={connectWallet} 
        />
        
        <div className="container">
          {loading ? (
            <div className="loading">Loading...</div>
          ) : (
            <Routes>
              <Route 
                path="/" 
                element={<HomePage contract={contract} provider={provider} account={account} />} 
              />
              <Route 
                path="/create" 
                element={<CreatePost contract={contract} account={account} />} 
              />
              <Route 
                path="/post/:id" 
                element={<PostDetail contract={contract} provider={provider} account={account} />} 
              />
            </Routes>
          )}
        </div>
      </div>
    </Router>
  )
}

export default App
