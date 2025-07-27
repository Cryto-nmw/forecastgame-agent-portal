"use client";

import { useState, useRef, useEffect } from "react";
import { BrowserProvider, JsonRpcSigner, Contract, parseEther } from "ethers";
import { recordAgentGameDeployment } from "@/actions";

interface CreateGameFormProps {
  factoryAbi: string;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function CreateGameForm({ factoryAbi }: CreateGameFormProps) {
  const [oracleAddress, setOracleAddress] = useState("");
  const [predictionMarketOracle, setPredictionMarketOracle] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  const agentId = process.env.NEXT_PUBLIC_AGENT_ID;
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;

  // Use a ref to store the contract instance
  const contractRef = useRef<Contract | null>(null);

  useEffect(() => {
    const initEthers = async () => {
      if (window.ethereum && factoryAddress && factoryAbi) {
        try {
          const provider = new BrowserProvider(window.ethereum);
          const currentSigner = await provider.getSigner();
          setSigner(currentSigner);

          const factoryContract = new Contract(
            factoryAddress,
            JSON.parse(factoryAbi),
            currentSigner
          );
          setContract(factoryContract);
          contractRef.current = factoryContract; // Store in ref
        } catch (error) {
          console.error("Error initializing ethers or contract:", error);
          setMessage({
            type: "error",
            text: "Failed to initialize wallet or contract. Ensure MetaMask is connected and on the correct network.",
          });
        }
      } else if (!factoryAddress) {
        setMessage({
          type: "error",
          text: "ForecastGameFactory address is not set in environment variables.",
        });
      } else if (!factoryAbi) {
        setMessage({
          type: "error",
          text: "ForecastGameFactory ABI is not loaded.",
        });
      }
    };
    initEthers();
  }, [factoryAddress, factoryAbi]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    if (!contractRef.current || !signer) {
      setMessage({
        type: "error",
        text: "Wallet not connected or contract not initialized.",
      });
      setIsLoading(false);
      return;
    }
    if (!oracleAddress || !predictionMarketOracle || !depositAmount) {
      setMessage({ type: "error", text: "All fields are required." });
      setIsLoading(false);
      return;
    }
    if (!agentId || !chainId) {
      setMessage({
        type: "error",
        text: "Agent ID or Chain ID not set in environment variables.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const depositValue = parseEther(depositAmount);

      console.log("Calling createGame with:", {
        oracleAddress,
        predictionMarketOracle,
        depositValue: depositValue.toString(),
      });

      const tx = await contractRef.current.createGame(
        oracleAddress,
        predictionMarketOracle,
        { value: depositValue }
      );

      setMessage({
        type: "success",
        text: `Transaction sent: ${tx.hash}. Waiting for confirmation...`,
      });
      console.log("Transaction sent:", tx.hash);

      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt);

      if (receipt && receipt.status === 1) {
        // Find the GameCreated event
        let gameIdOnChain: number | null = null;
        let gameAddress: string | null = null;

        // Iterate through logs to find the GameCreated event
        for (const log of receipt.logs) {
          try {
            const parsedLog = contractRef.current.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "GameCreated") {
              gameIdOnChain = Number(parsedLog.args.gameId);
              gameAddress = parsedLog.args.gameAddress;
              break;
            }
          } catch (parseError) {
            // This log might not be from our contract or not the GameCreated event
            console.log("Could not parse log, skipping:", log);
          }
        }

        if (gameIdOnChain !== null && gameAddress !== null) {
          setMessage({
            type: "success",
            text: `Game created successfully! Game ID: ${gameIdOnChain}, Address: ${gameAddress}. Saving to database...`,
          });
          console.log(
            "GameCreated event found. Game ID:",
            gameIdOnChain,
            "Address:",
            gameAddress
          );

          // Record deployment in the database via Server Action
          const result = await recordAgentGameDeployment({
            factoryAddress: factoryAddress!,
            gameIdOnChain: gameIdOnChain,
            gameAddress: gameAddress,
            agentId: agentId,
            deployedByAddress: await signer.getAddress(),
            transactionHash: receipt.hash,
            chainId: parseInt(chainId!),
          });

          if (result.success) {
            setMessage({
              type: "success",
              text: `Game created and recorded in DB! Game ID: ${gameIdOnChain}`,
            });
          } else {
            setMessage({
              type: "error",
              text: `Game created on-chain, but failed to record in DB: ${result.error}`,
            });
            console.error("Failed to record game in DB:", result.error);
          }
        } else {
          setMessage({
            type: "error",
            text: "Game created, but could not find GameCreated event in transaction receipt.",
          });
        }
      } else {
        setMessage({ type: "error", text: "Transaction failed on-chain." });
      }
    } catch (err: any) {
      console.error("Error creating game:", err);
      setMessage({
        type: "error",
        text: `Failed to create game: ${err.shortMessage || err.message}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4">
        <label
          htmlFor="oracleAddress"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Oracle Address (e.g., Chainlink)
        </label>
        <input
          type="text"
          id="oracleAddress"
          value={oracleAddress}
          onChange={(e) => setOracleAddress(e.target.value)}
          placeholder="0x..."
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>

      <div className="mb-4">
        <label
          htmlFor="predictionMarketOracle"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Prediction Market Oracle Address
        </label>
        <input
          type="text"
          id="predictionMarketOracle"
          value={predictionMarketOracle}
          onChange={(e) => setPredictionMarketOracle(e.target.value)}
          placeholder="0x..."
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>

      <div className="mb-6">
        <label
          htmlFor="depositAmount"
          className="block text-gray-700 text-sm font-bold mb-2"
        >
          Initial Deposit Amount (ETH)
        </label>
        <input
          type="number"
          id="depositAmount"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          step="0.0001"
          min="0"
          placeholder="e.g., 0.1"
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
          required
        />
      </div>

      <button
        type="submit"
        disabled={
          isLoading || !signer || !contract || !factoryAddress || !factoryAbi
        }
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
      >
        {isLoading ? "Creating Game..." : "Create Forecast Game"}
      </button>

      {message && (
        <div
          className={`message-box ${
            message.type === "success" ? "success" : "error"
          }`}
        >
          {message.text}
        </div>
      )}
    </form>
  );
}
