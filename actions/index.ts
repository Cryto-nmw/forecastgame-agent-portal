"use server";

import {
  getQuery,
  runQuery,
  getUniqueCategoriesFromDb,
  getDeployedGamesFromDb,
} from "@/lib/db"; // <-- IMPORT NEW DB FUNCTIONS
import { ContractDetails, AgentDeployedGame } from "@/types/db";
import { ResultSetHeader } from "mysql2/promise";

interface GameDeploymentData {
  factoryAddress: string;
  gameIdOnChain: number;
  gameAddress: string;
  agentId: string;
  deployedByAddress: string;
  transactionHash: string;
  chainId: number;
  categories: string[]; // <-- ADD THIS FIELD (as an array)
}

// interface ContractDetails {
//   // Re-declaring for type check (ensure it matches types/db.ts)
//   id: number;
//   contract_name: string;
//   address: string;
//   abi: string | Buffer;
//   bytecode: string | Buffer;
//   deployed_at: Date;
//   status: string;
//   chain_id: number;
//   compiler_version: string;
// }

export async function getFactoryDetails(): Promise<ContractDetails | null> {
  const factoryAddress = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID;

  if (!factoryAddress || !chainId) {
    console.error(
      "NEXT_PUBLIC_FACTORY_ADDRESS or NEXT_PUBLIC_CHAIN_ID is not set."
    );
    return null;
  }

  try {
    const query = `SELECT * FROM deployed_contracts WHERE address = ? AND chain_id = ? AND contract_name = ?;`;
    const result = await getQuery<ContractDetails>(query, [
      factoryAddress,
      parseInt(chainId),
      "ForecastGameFactory",
    ]);

    if (result && Buffer.isBuffer(result.abi)) {
      result.abi = result.abi.toString("utf8");
    }
    if (result && Buffer.isBuffer(result.bytecode)) {
      result.bytecode = result.bytecode.toString("utf8");
    }

    return result || null;
  } catch (error) {
    console.error("Error fetching factory details from DB:", error);
    return null;
  }
}

// UPDATED: recordAgentGameDeployment to include categories
export async function recordAgentGameDeployment(
  data: GameDeploymentData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Convert categories array to a comma-separated string for storage
    const categoriesString = data.categories.join(",");

    const query = `
      INSERT INTO agent_deployed_games (
        factory_deployment_id,
        game_id_on_chain,
        game_address,
        agent_id,
        deployed_by_address,
        transaction_hash,
        deployed_at,
        categories
      ) VALUES (
        (SELECT id FROM deployed_contracts WHERE address = ? AND chain_id = ?),
        ?, ?, ?, ?, ?, NOW(), ?
      );
    `;

    const result = await runQuery(query, [
      data.factoryAddress,
      data.chainId,
      data.gameIdOnChain,
      data.gameAddress,
      data.agentId,
      data.deployedByAddress,
      data.transactionHash,
      categoriesString, // <-- ADD THIS
    ]);

    if (result.affectedRows === 1) {
      console.log(`Agent game deployment recorded: ${data.gameAddress}`);
      return { success: true };
    } else {
      return {
        success: false,
        error: "Failed to insert into agent_deployed_games. Row not affected.",
      };
    }
  } catch (error: any) {
    console.error("Error recording agent game deployment:", error);
    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return {
        success: false,
        error:
          "Factory deployment not found in 'deployed_contracts'. Ensure factory is deployed and logged correctly.",
      };
    }
    if (error.code === "ER_DUP_ENTRY") {
      return {
        success: false,
        error:
          "Duplicate transaction hash. This game might already be recorded.",
      };
    }
    return { success: false, error: error.message || "Unknown database error" };
  }
}

// --- NEW SERVER ACTIONS FOR GAME LISTING ---

/**
 * Server Action to get all unique categories from the database for tabs.
 */
export async function getAllCategories(): Promise<string[]> {
  return await getUniqueCategoriesFromDb();
}

/**
 * Server Action to get deployed games with pagination and category filter.
 */
export async function getGames(
  category: string | null,
  page: number,
  limit: number
): Promise<{ games: AgentDeployedGame[]; totalCount: number }> {
  return await getDeployedGamesFromDb(category, page, limit);
}

// --- END NEW SERVER ACTIONS ---
