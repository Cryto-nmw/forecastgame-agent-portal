// agent-portal/lib/db.ts
import mysql from "mysql2/promise"; // Use the promise-based API
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { ContractDetails, DeploymentLog, AgentDeployedGame } from "@/types/db"; // Import types

// Type definitions for query results
// interface RunResult extends ResultSetHeader {}
type RunResult = ResultSetHeader; // <-- CHANGE TO THIS

// Create a connection pool (recommended for server applications)
let pool: mysql.Pool | null = null;

async function getPool(): Promise<mysql.Pool> {
  if (pool) {
    return pool;
  }

  // Ensure environment variables are loaded
  if (
    !process.env.DB_HOST ||
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_NAME
  ) {
    throw new Error(
      "Database environment variables (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME) are not set in .env.local."
    );
  }

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || "3306", 10),
    waitForConnections: true,
    connectionLimit: 10, // Adjust as needed
    queueLimit: 0,
  });

  console.log("MariaDB connection pool created.");

  // Attempt to connect and ensure ONLY agent_deployed_games table is created/exists
  try {
    const connection = await pool.getConnection();

    // ONLY create the table specific to the agent portal
    // The 'deployed_contracts' and 'deployment_logs' tables are expected to be created by your deployment script.
    await connection.query(`
            CREATE TABLE IF NOT EXISTS agent_deployed_games (
                id INT AUTO_INCREMENT PRIMARY KEY,
                factory_deployment_id INT NOT NULL,
                game_id_on_chain INT NOT NULL,
                game_address VARCHAR(255) NOT NULL,
                agent_id VARCHAR(255) NOT NULL,
                deployed_by_address VARCHAR(255) NOT NULL,
                transaction_hash VARCHAR(255) NOT NULL UNIQUE,
                deployed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (factory_deployment_id) REFERENCES deployed_contracts(id)
            );
        `);
    console.log('Table "agent_deployed_games" ensured.');

    connection.release(); // Release the connection back to the pool
    console.log(
      "MariaDB connection successful and agent_deployed_games table checked/created."
    );
    return pool;
  } catch (error) {
    console.error(
      "Error connecting to MariaDB or creating agent_deployed_games table:",
      error
    );
    if (pool) {
      await pool.end(); // Close the pool if table creation fails
      pool = null;
    }
    throw error;
  }
}

// Utility for running a single query (INSERT, UPDATE, DELETE)
export async function runQuery<T extends RunResult = RunResult>(
  sql: string,
  params: any[] = []
): Promise<T> {
  const conn = await getPool().then((p) => p.getConnection());
  try {
    const [result] = await conn.execute<T>(sql, params);
    return result;
  } finally {
    conn.release();
  }
}

// Utility for getting all rows (SELECT *)
export async function allQuery<T extends RowDataPacket[] = RowDataPacket[]>(
  sql: string,
  params: any[] = []
): Promise<T> {
  const conn = await getPool().then((p) => p.getConnection());
  try {
    const [rows] = await conn.execute<T>(sql, params);
    return rows;
  } finally {
    conn.release();
  }
}

// Utility for getting a single row (SELECT single)
export async function getQuery<T extends RowDataPacket = RowDataPacket>(
  sql: string,
  params: any[] = []
): Promise<T | undefined> {
  const conn = await getPool().then((p) => p.getConnection());
  try {
    const [rows] = await conn.execute<T[]>(sql, params);
    return rows[0]; // Return the first row or undefined
  } finally {
    conn.release();
  }
}

// Function to explicitly close the connection pool (useful for graceful shutdown)
export async function closeDbPool(): Promise<void> {
  if (pool) {
    console.log("Closing MariaDB connection pool.");
    await pool.end();
    pool = null;
  }
}

// Export getDb as getPool, keeping original name for consistency with actions
export const getDb = getPool;
