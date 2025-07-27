// components/ConnectWalletButton.tsx
"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
// --- CHANGE THIS LINE ---
import { injected } from "wagmi/connectors"; // Import 'injected' function directly
// --- END CHANGE ---

export default function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect({
    // --- CHANGE THIS LINE ---
    connector: injected(), // Use the injected() function to create the connector instance
    // --- END CHANGE ---
  });
  const { disconnect } = useDisconnect();

  if (isConnected) {
    return (
      <div className="flex items-center space-x-3 bg-white bg-opacity-20 backdrop-filter backdrop-blur-sm rounded-full px-4 py-2 text-sm font-medium border border-white border-opacity-30 shadow-inner">
        <span className="text-white text-shadow-sm">
          Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="ml-3 bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded-full text-xs transition-colors duration-200"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect()}
      className="btn-primary" // Using the global primary button style
    >
      Connect Wallet
    </button>
  );
}
