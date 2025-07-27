// app/page.tsx
"use client"; // This page needs to be a Client Component to manage state for tabs and pagination

import { useState, useEffect, useCallback } from "react";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import CreateGameForm from "@/components/CreateGameForm";
import CategoryTabs from "@/components/CategoryTabs"; // NEW IMPORT
import GameList from "@/components/GameList"; // NEW IMPORT
import { getFactoryDetails, getAllCategories, getGames } from "@/actions"; // UPDATED IMPORTS
import { ContractDetails, AgentDeployedGame } from "@/types/db"; // Import necessary types

const GAMES_PER_PAGE = 9; // Define how many games per page

export default function Home() {
  const [factoryDetails, setFactoryDetails] = useState<ContractDetails | null>(
    null
  );
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All"); // 'All' is default tab
  const [deployedGames, setDeployedGames] = useState<AgentDeployedGame[]>([]);
  const [totalGamesCount, setTotalGamesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [errorLoadingGames, setErrorLoadingGames] = useState<string | null>(
    null
  );

  // Fetch factory details once on load
  useEffect(() => {
    const fetchDetails = async () => {
      const details = await getFactoryDetails();
      if (details) {
        setFactoryDetails(details);
      } else {
        console.error("Failed to load factory details.");
      }
    };
    fetchDetails();
  }, []);

  // Function to fetch games based on category and page
  const fetchGames = useCallback(async (category: string, page: number) => {
    setIsLoadingGames(true);
    setErrorLoadingGames(null);
    try {
      const { games, totalCount } = await getGames(
        category,
        page,
        GAMES_PER_PAGE
      );
      setDeployedGames(games);
      setTotalGamesCount(totalCount);
    } catch (error: any) {
      console.error("Error fetching games:", error);
      setErrorLoadingGames("Failed to load games: " + error.message);
    } finally {
      setIsLoadingGames(false);
    }
  }, []); // Dependencies are empty as it only depends on constants

  // Fetch all unique categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categories = await getAllCategories();
        setAllCategories(categories);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    fetchCategories();
  }, []);

  // Refetch games whenever activeCategory or currentPage changes
  useEffect(() => {
    fetchGames(activeCategory, currentPage);
  }, [activeCategory, currentPage, fetchGames]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1); // Reset to first page when category changes
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalGamesCount / GAMES_PER_PAGE);

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto max-w-screen-xl bg-white shadow-lg rounded-lg p-8 my-8">
        <h1 className="text-5xl font-extrabold text-blue-700 text-center mb-8 tracking-tight">
          Agent Portal
        </h1>

        <div className="flex flex-col md:flex-row justify-between items-center md:items-start gap-6 mb-12 bg-blue-50 p-6 rounded-lg shadow-sm">
          <div className="text-lg text-gray-800 space-y-2">
            <p>
              Connected Chain:{" "}
              <span className="font-semibold text-blue-700">
                {process.env.NEXT_PUBLIC_CHAIN_NAME || "Loading..."} (
                {process.env.NEXT_PUBLIC_CHAIN_ID || "..."})
              </span>
            </p>
            <p>
              ForecastGameFactory Address:{" "}
              <span className="font-semibold text-blue-700 break-all">
                {process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "Not set"}
              </span>
            </p>
            {factoryDetails && (
              <p>
                Factory Deployed At (DB):{" "}
                <span className="font-semibold text-blue-700">
                  {new Date(factoryDetails.deployed_at).toLocaleString()}
                </span>
              </p>
            )}
            <p>
              Agent ID:{" "}
              <span className="font-semibold text-blue-700">
                {process.env.NEXT_PUBLIC_AGENT_ID || "Not set"}
              </span>
            </p>
          </div>
          <div className="self-end md:self-auto">
            <ConnectWalletButton />
          </div>
        </div>

        {/* Create Game Form Section */}
        {factoryDetails ? (
          <CreateGameForm factoryAbi={factoryDetails.abi as string} />
        ) : (
          <p className="text-red-500 text-center mb-8 p-4 bg-red-50 rounded-lg">
            Error: ForecastGameFactory details not found in database. Ensure the
            factory is deployed and its details are logged correctly.
          </p>
        )}

        {/* Deployed Games List Section */}
        <div className="mt-12 p-6 bg-gray-100 rounded-lg shadow-inner">
          <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            Browse Deployed Games
          </h2>

          <CategoryTabs
            categories={allCategories}
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryChange}
          />

          {isLoadingGames ? (
            <div className="text-center text-blue-600 text-lg py-10">
              Loading games...
            </div>
          ) : errorLoadingGames ? (
            <div className="text-center text-red-600 text-lg py-10">
              {errorLoadingGames}
            </div>
          ) : (
            <GameList
              games={deployedGames}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              gamesPerPage={GAMES_PER_PAGE}
              totalGamesCount={totalGamesCount}
            />
          )}
        </div>
      </div>
    </main>
  );
}
