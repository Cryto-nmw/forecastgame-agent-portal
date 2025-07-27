// agent-portal/components/CreateGameForm.tsx
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

const PREDEFINED_CATEGORIES = [
  "Weather",
  "Politics",
  "Sports",
  "Technology",
  "Finance",
  "Entertainment",
  "Others",
];

export default function CreateGameForm({ factoryAbi }: CreateGameFormProps) {
  const [question, setQuestion] = useState("");
  const [answersInput, setAnswersInput] = useState("");
  const [oddsInput, setOddsInput] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

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
          contractRef.current = factoryContract;
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

  const handleCategoryChange = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

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
    if (!question || !answersInput || !oddsInput || !depositAmount) {
      setMessage({ type: "error", text: "All fields are required." });
      setIsLoading(false);
      return;
    }
    if (selectedCategories.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one category.",
      });
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

    const answersArray = answersInput
      .split(",")
      .map((ans) => ans.trim())
      .filter((ans) => ans.length > 0);
    const oddsArray = oddsInput
      .split(",")
      .map((odd) => BigInt(odd.trim()))
      .filter((odd) => odd > 0n);

    if (answersArray.length === 0 || oddsArray.length === 0) {
      setMessage({
        type: "error",
        text: "Please enter valid answers and odds separated by commas.",
      });
      setIsLoading(false);
      return;
    }
    if (answersArray.length !== oddsArray.length) {
      setMessage({
        type: "error",
        text: "Number of answers must match number of odds.",
      });
      setIsLoading(false);
      return;
    }

    try {
      const depositValue = parseEther(depositAmount);

      console.log("Calling createGame with:", {
        question,
        answersArray,
        oddsArray: oddsArray.map((o) => o.toString()),
        depositValue: depositValue.toString(),
        selectedCategories: selectedCategories,
      });

      const tx = await contractRef.current.createGame(
        question,
        answersArray,
        oddsArray,
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
        let gameIdOnChain: number | null = null;
        let gameAddress: string | null = null;

        for (const log of receipt.logs) {
          try {
            const parsedLog = contractRef.current.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "GameCreated") {
              gameIdOnChain = Number(parsedLog.args.gameId);
              gameAddress = parsedLog.args.gameAddress;
              break;
            }
          } catch (parseError) {
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

          const result = await recordAgentGameDeployment({
            factoryAddress: factoryAddress!,
            gameIdOnChain: gameIdOnChain,
            gameAddress: gameAddress,
            agentId: agentId,
            deployedByAddress: await signer.getAddress(),
            transactionHash: receipt.hash,
            chainId: parseInt(chainId!),
            categories: selectedCategories,
          });

          if (result.success) {
            setMessage({
              type: "success",
              text: `Game created and recorded in DB! Game ID: ${gameIdOnChain}`,
            });
            setQuestion("");
            setAnswersInput("");
            setOddsInput("");
            setDepositAmount("");
            setSelectedCategories([]);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {" "}
      {/* Use space-y for consistent vertical rhythm */}
      <h2 className="text-3xl font-extrabold text-gray-900 mb-6 text-center">
        Deploy New Forecast Game
      </h2>
      <div>
        <label
          htmlFor="question"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Question
        </label>
        <textarea
          id="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Will BTC price be over $70,000 by 2025-12-31?"
          rows={3}
          required
        ></textarea>
      </div>
      <div>
        <label
          htmlFor="answers"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Answers (comma-separated)
        </label>
        <input
          type="text"
          id="answers"
          value={answersInput}
          onChange={(e) => setAnswersInput(e.target.value)}
          placeholder="e.g., Yes,No,Maybe"
          required
        />
        <p className="text-gray-500 text-xs mt-1">
          Enter multiple answers separated by commas (e.g., Yes,No).
        </p>
      </div>
      <div>
        <label
          htmlFor="odds"
          className="block text-sm font-semibold text-gray-700 mb-2"
        >
          Odds (comma-separated, integer values corresponding to answers)
        </label>
        <input
          type="text"
          id="odds"
          value={oddsInput}
          onChange={(e) => setOddsInput(e.target.value)}
          placeholder="e.g., 100,200,50"
          required
        />
        <p className="text-gray-500 text-xs mt-1">
          Enter odds for each answer, separated by commas. Values must be
          integers (e.g., 100,200).
        </p>
      </div>
      {/* Categories Field */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Categories
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
          {PREDEFINED_CATEGORIES.map((category) => (
            <label
              key={category}
              className="inline-flex items-center text-sm text-gray-700 cursor-pointer hover:bg-gray-100 p-2 rounded-md transition-colors"
            >
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                value={category}
                checked={selectedCategories.includes(category)}
                onChange={() => handleCategoryChange(category)}
              />
              <span className="ml-2">{category}</span>
            </label>
          ))}
        </div>
        {selectedCategories.length === 0 && (
          <p className="text-red-500 text-xs mt-1">
            Please select at least one category.
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="depositAmount"
          className="block text-sm font-semibold text-gray-700 mb-2"
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
          required
        />
        <p className="text-gray-500 text-xs mt-1">
          Amount will be sent as Wei to the contract.
        </p>
      </div>
      <button
        type="submit"
        disabled={
          isLoading ||
          !signer ||
          !contract ||
          !factoryAddress ||
          !factoryAbi ||
          selectedCategories.length === 0
        }
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-lg"
      >
        {isLoading ? "Creating Game..." : "Deploy Forecast Game"}
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
