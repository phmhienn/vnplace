// src/db.ts
import { Pool } from "pg";
import { config } from "./config";

export const db = new Pool({ connectionString: config.dbUrl });

// test ping (gọi tạm ở index.ts để chắc kết nối ok)
export async function dbPing() {
  const r = await db.query("SELECT 1 as ok");
  console.log("DB ping:", r.rows[0]);
}
