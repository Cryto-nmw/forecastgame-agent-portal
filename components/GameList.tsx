// agent-portal/components/GameList.tsx
import { AgentDeployedGame } from "@/types/db";

interface GameListProps {
  games: AgentDeployedGame[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  gamesPerPage: number; // Pass this to show current range
  totalGamesCount: number; // Pass total count for "showing X of Y"
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
      <div className="bg-white p-6 rounded-lg shadow-md text-center text-gray-600">
        No games deployed yet in this category.
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Deployed Games
      </h2>

      <div className="text-sm text-gray-600 mb-4 text-center">
        Showing {startIndex}-{endIndex} of {totalGamesCount} games
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => (
          <div
            key={game.id}
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <h3 className="text-xl font-semibold text-blue-700 mb-2">
              Game ID: {game.game_id_on_chain}
            </h3>
            <p className="text-gray-700 break-words text-sm mb-1">
              **Address:**{" "}
              <span className="font-mono bg-gray-100 p-1 rounded text-xs">
                {game.game_address}
              </span>
            </p>
            <p className="text-gray-700 text-sm mb-1">
              **Agent:** <span className="font-semibold">{game.agent_id}</span>
            </p>
            <p className="text-gray-700 text-sm mb-1">
              **Categories:**{" "}
              <span className="font-semibold">{game.categories || "N/A"}</span>
            </p>
            <p className="text-gray-700 text-sm">
              **Deployed At:**{" "}
              <span className="font-semibold">
                {new Date(game.deployed_at).toLocaleString()}
              </span>
            </p>
            {/* You can add a link to Etherscan here if needed */}
            <a
              href={`https://sepolia.etherscan.io/address/${game.game_address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-blue-500 hover:underline text-sm"
            >
              View on Etherscan &rarr;
            </a>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-8">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-gray-700 font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="py-2 px-4 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
