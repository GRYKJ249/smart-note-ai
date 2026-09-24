import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDatabase() {
  if (!database) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is required");
    const pool = mysql.createPool({ uri: url, connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10) });
    database = drizzle(pool, { schema, mode: "default" });
  }
  return database;
}
