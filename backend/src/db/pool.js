import "dotenv/config";
import pg from "pg";

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

export const query = (text, params) => pool.query(text, params);

export const queryOne = async (text, params) => {
  const { rows } = await pool.query(text, params);
  return rows[0] ?? null;
};