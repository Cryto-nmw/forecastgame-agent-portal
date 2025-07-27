"use server";

import { getQuery, runQuery } from "@/lib/db";
import { ContractDetails } from "@/types/db"; // Assuming you create this type
import { ResultSetHeader } from "mysql2/promise";

interface GameDeploymentData {
  factoryAddress: string;
  gameIdOnChain: number;
  gameAddress: string;
  agentId: string;
  deployedByAddress: string;
  transactionHash: string;
  chainId: number;
}

// Define the ContractDetails interface to match your database schema
interface ContractDetails {
  id: number;
  contract_name: string;
  address: string;
  abi: string; // Assuming ABI is stored as a stringified JSON
  bytecode: string;
  deployed_at: Date; // MariaDB DATETIME maps to JS Date
  status: string;
  chain_id: number;
  compiler_version: string;
}

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

    // Convert Buffer ABI to string if necessary (mysql2 returns Buffer for TEXT/BLOB)
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

export async function recordAgentGameDeployment(
  data: GameDeploymentData
): Promise<{ success: boolean; error?: string }> {
  try {
    const query = `
      INSERT INTO agent_deployed_games (
        factory_deployment_id,
        game_id_on_chain,
        game_address,
        agent_id,
        deployed_by_address,
        transaction_hash,
        deployed_at
      ) VALUES (
        (SELECT id FROM deployed_contracts WHERE address = ? AND chain_id = ?),
        ?, ?, ?, ?, ?, NOW()
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
