// agent-portal/components/GameList.tsx
import { AgentDeployedGame } from "@/types/db";

interface GameListProps {
  games: AgentDeployedGame[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  gamesPerPage: number;
  totalGamesCount: number;
}

export default function GameList({
  games,
  currentPage,
  totalPages,
  onPageChange,
  gamesPerPage,
  totalGamesCount,
}: GameListProps) {
  const startIndex = (currentPage - 1) * gamesPerPage + 1;
  const endIndex = Math.min(currentPage * gamesPerPage, totalGamesCount);

  if (!games || games.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center text-gray-600 text-lg">
        <p className="mb-2">No deployed games found for this category.</p>
        <p className="text-sm">
          Try deploying a new game or selecting a different category.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Deployed Games
      </h2>

      <p className="text-sm text-gray-600 mb-6 text-center">
        Showing {startIndex}-{endIndex} of {totalGamesCount} games.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className="bg-white p-6 rounded-lg shadow-lg border border-gray-200 flex flex-col justify-between hover:shadow-xl transition-all duration-300"
          >
            <div>
              <h3 className="text-xl font-bold text-blue-700 mb-2">
                Game ID: {game.game_id_on_chain}
              </h3>
              <p className="text-gray-700 text-sm mb-1">
                <span className="font-semibold">Address:</span>{" "}
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded-md break-all">
                  {game.game_address}
                </span>
              </p>
              <p className="text-gray-700 text-sm mb-1">
                <span className="font-semibold">Agent:</span>{" "}
                <span className="font-medium">{game.agent_id}</span>
              </p>
              <p className="text-gray-700 text-sm mb-1">
                <span className="font-semibold">Categories:</span>{" "}
                <span className="font-medium">{game.categories || "N/A"}</span>
              </p>
              <p className="text-gray-700 text-sm mb-4">
                <span className="font-semibold">Deployed At:</span>{" "}
                <span className="font-medium">
                  {new Date(game.deployed_at).toLocaleString()}
                </span>
              </p>
            </div>
            <a
              href={`https://sepolia.etherscan.io/address/${game.game_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md text-sm transition-colors duration-200 mt-4"
            >
              View on Etherscan
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                ></path>
              </svg>
            </a>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-10">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              ></path>
            </svg>
            Previous
          </button>
          <span className="text-gray-700 font-semibold text-lg">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors text-base"
          >
            Next
            <svg
              className="w-4 h-4 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5l7 7-7 7"
              ></path>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
