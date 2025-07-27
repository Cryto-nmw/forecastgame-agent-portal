// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import CreateGameForm from "@/components/CreateGameForm";
import CategoryTabs from "@/components/CategoryTabs";
import GameList from "@/components/GameList";
import { getFactoryDetails, getAllCategories, getGames } from "@/actions";
import { ContractDetails, AgentDeployedGame } from "@/types/db";

const GAMES_PER_PAGE = 9;

export default function Home() {
  const [factoryDetails, setFactoryDetails] = useState<ContractDetails | null>(
    null
  );
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [deployedGames, setDeployedGames] = useState<AgentDeployedGame[]>([]);
  const [totalGamesCount, setTotalGamesCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [errorLoadingGames, setErrorLoadingGames] = useState<string | null>(
    null
  );

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
  }, []);

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

  useEffect(() => {
    fetchGames(activeCategory, currentPage);
  }, [activeCategory, currentPage, fetchGames]);

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const totalPages = Math.ceil(totalGamesCount / GAMES_PER_PAGE);

  return (
    <main className="min-h-screen bg-gray-50 flex justify-center py-12 px-4">
      {" "}
      {/* Centered content */}
      <div className="w-full max-w-6xl bg-white shadow-xl rounded-xl p-8 space-y-12">
        {" "}
        {/* Professional container */}
        <header className="text-center mb-10">
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-4">
            Agent Operations Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Manage your Forecast Game deployments efficiently.
          </p>
        </header>
        {/* Connection & Factory Info Section */}
        <section className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-6 rounded-lg shadow-lg flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-lg space-y-2">
            <p>
              Connected Chain:{" "}
              <span className="font-semibold">
                {process.env.NEXT_PUBLIC_CHAIN_NAME || "Loading..."} (
                {process.env.NEXT_PUBLIC_CHAIN_ID || "..."})
              </span>
            </p>
            <p>
              ForecastGameFactory Address:{" "}
              <span className="font-semibold break-all text-blue-200">
                {process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "Not set"}
              </span>
            </p>
            {factoryDetails && (
              <p>
                Factory Deployed At (DB):{" "}
                <span className="font-semibold">
                  {new Date(factoryDetails.deployed_at).toLocaleString()}
                </span>
              </p>
            )}
            <p>
              Agent ID:{" "}
              <span className="font-semibold">
                {process.env.NEXT_PUBLIC_AGENT_ID || "Not set"}
              </span>
            </p>
          </div>
          <div className="flex-shrink-0">
            <ConnectWalletButton />{" "}
            {/* Assuming ConnectWalletButton has professional styling */}
          </div>
        </section>
        {/* Create Game Form Section */}
        <section className="bg-white p-8 rounded-lg shadow-md border border-gray-200">
          {factoryDetails ? (
            <CreateGameForm factoryAbi={factoryDetails.abi as string} />
          ) : (
            <div className="text-red-600 text-center text-lg p-6 bg-red-50 rounded-lg border border-red-200">
              Error: ForecastGameFactory details not found in database. Please
              ensure the factory is deployed and its details are logged
              correctly.
            </div>
          )}
        </section>
        {/* Deployed Games List Section */}
        <section className="bg-gray-50 p-8 rounded-lg shadow-inner border border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">
            Deployed Games Overview
          </h2>

          <CategoryTabs
            categories={allCategories}
            activeCategory={activeCategory}
            onSelectCategory={handleCategoryChange}
          />

          {isLoadingGames ? (
            <div className="text-center text-blue-600 text-lg py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              Loading deployed games...
            </div>
          ) : errorLoadingGames ? (
            <div className="text-center text-red-600 text-lg py-10 bg-red-50 rounded-md border border-red-200">
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
        </section>
      </div>
    </main>
  );
}
