// agent-portal/lib/db.ts
import mysql, { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { ContractDetails, DeploymentLog, AgentDeployedGame } from "@/types/db";

type RunResult = ResultSetHeader;

let pool: mysql.Pool | null = null;

async function getPool(): Promise<mysql.Pool> {
  if (pool) {
    return pool;
  }

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
    connectionLimit: 10,
    queueLimit: 0,
  });

  console.log("MariaDB connection pool created.");

  try {
    const connection = await pool.getConnection();
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
                categories VARCHAR(255) DEFAULT '',
                FOREIGN KEY (factory_deployment_id) REFERENCES deployed_contracts(id)
            );
        `);
    console.log('Table "agent_deployed_games" ensured.');
    connection.release();
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
      await pool.end();
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
    return rows[0];
  } finally {
    conn.release();
  }
}

/**
 * Fetches unique categories from agent_deployed_games.
 * Returns an array of strings, e.g., ['Weather', 'Politics'].
 */
export async function getUniqueCategoriesFromDb(): Promise<string[]> {
  try {
    const rows = (await allQuery(`
            SELECT DISTINCT categories FROM agent_deployed_games WHERE categories IS NOT NULL AND categories != '';
        `)) as Array<RowDataPacket & { categories: string }>;

    const allCategories = new Set<string>();
    rows.forEach((row) => {
      row.categories.split(",").forEach((cat) => {
        const trimmedCat = cat.trim();
        if (trimmedCat) {
          allCategories.add(trimmedCat);
        }
      });
    });
    return Array.from(allCategories).sort();
  } catch (error) {
    console.error("Error fetching unique categories:", error);
    return [];
  }
}

/**
 * Fetches deployed games with pagination and optional category filter.
 */
export async function getDeployedGamesFromDb(
  category: string | null,
  page: number,
  limit: number
): Promise<{ games: AgentDeployedGame[]; totalCount: number }> {
  try {
    const offset = (page - 1) * limit;
    let whereClause = "";
    const params: (string | number)[] = [];

    if (category && category !== "All") {
      whereClause = "WHERE FIND_IN_SET(?, categories)";
      params.push(category);
    }

    const countQuery = `SELECT COUNT(*) as count FROM agent_deployed_games ${whereClause};`;
    // --- MODIFIED LINE HERE ---
    const countResult = await allQuery<
      Array<RowDataPacket & { count: number }>
    >(countQuery, params);
    // --- END MODIFIED LINE ---

    const totalCount = countResult.length > 0 ? countResult[0].count : 0;

    const gamesQuery = `
            SELECT * FROM agent_deployed_games
            ${whereClause}
            ORDER BY deployed_at DESC
            LIMIT ? OFFSET ?;
        `;
    params.push(limit, offset);

    const games = await allQuery<AgentDeployedGame[]>(gamesQuery, params);

    return { games, totalCount };
  } catch (error) {
    console.error("Error fetching deployed games:", error);
    return { games: [], totalCount: 0 };
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
