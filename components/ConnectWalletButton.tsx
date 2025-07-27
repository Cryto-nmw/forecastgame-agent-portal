"use client";

import { useState, useEffect } from "react";
import { BrowserProvider, Signer } from "ethers";

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function ConnectWalletButton() {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;
  const chainName = process.env.NEXT_PUBLIC_CHAIN_NAME;

  useEffect(() => {
    // Check for existing connection on load
    if (window.ethereum) {
      const provider = new BrowserProvider(window.ethereum);
      provider.listAccounts().then((accounts) => {
        if (accounts.length > 0) {
          const connectedAccount = accounts[0];
          setAccount(connectedAccount.address);
          provider.getSigner().then(setSigner);
          checkChainId(provider);
        }
      });

      // Listen for account changes
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          provider.getSigner().then(setSigner);
        } else {
          setAccount(null);
          setSigner(null);
        }
      });

      // Listen for chain changes
      window.ethereum.on("chainChanged", (newChainId: string) => {
        console.log("Chain changed to:", newChainId);
        window.location.reload(); // Recommended by MetaMask for chain changes
      });
    }
  }, []);

  const checkChainId = async (provider: BrowserProvider) => {
    try {
      const { chainId: currentChainId } = await provider.getNetwork();
      if (currentChainId.toString() !== chainId) {
        setError(`Please switch to ${chainName} (Chain ID: ${chainId})`);
      } else {
        setError(null);
      }
    } catch (err) {
      console.error("Failed to get network:", err);
      setError("Failed to get network. Please check MetaMask.");
    }
  };

  const connectWallet = async () => {
    setConnecting(true);
    setError(null);
    try {
      if (!window.ethereum) {
        setError("MetaMask is not installed. Please install it to connect.");
        return;
      }

      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      const connectedAccount = accounts[0];
      setAccount(connectedAccount);

      const currentSigner = await provider.getSigner();
      setSigner(currentSigner);

      await checkChainId(provider);
    } catch (err: any) {
      console.error("Error connecting to wallet:", err);
      if (err.code === 4001) {
        setError("Wallet connection rejected by user.");
      } else {
        setError("Failed to connect wallet: " + err.message);
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="text-right">
      {account ? (
        <>
          <p>
            Connected as:{" "}
            <span className="font-semibold">
              {account.slice(0, 6)}...{account.slice(-4)}
            </span>
          </p>
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </>
      ) : (
        <button
          onClick={connectWallet}
          disabled={connecting}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          {connecting ? "Connecting..." : "Connect Wallet"}
        </button>
      )}
    </div>
  );
}
