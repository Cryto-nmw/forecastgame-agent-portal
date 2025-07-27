// agent-portal/types/db.ts
import { RowDataPacket } from "mysql2/promise"; // <-- ADD THIS IMPORT

export interface ContractDetails extends RowDataPacket {
  // <-- ADD 'extends RowDataPacket'
  id: number;
  contract_name: string;
  address: string;
  abi: string | Buffer; // ABI can be string or Buffer from DB
  bytecode: string | Buffer; // Bytecode can be string or Buffer from DB
  deployed_at: Date;
  status: string;
  chain_id: number;
  compiler_version: string;
}

export interface DeploymentLog extends RowDataPacket {
  // <-- ADD 'extends RowDataPacket'
  id: number;
  deployment_id: number;
  timestamp: Date;
  log_level: string;
  message: string;
}

export interface AgentDeployedGame extends RowDataPacket {
  // <-- ADD 'extends RowDataPacket'
  id: number;
  factory_deployment_id: number;
  game_id_on_chain: number;
  game_address: string;
  agent_id: string;
  deployed_by_address: string;
  transaction_hash: string;
  deployed_at: Date;
}
