/** Applies db/migrations/*.sql in order, once each. */
import { promises as fs } from "node:fs";
import path from "node:path";
import { sql, closeDb } from "../src/lib/db";

const db = sql();
await db`create table if not exists schema_migrations (
  name text primary key, applied_at timestamptz not null default now()
)`;

const dir = path.resolve("db/migrations");
const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
const done = new Set((await db`select name from schema_migrations`).map((r) => r.name as string));

for (const f of files) {
  if (done.has(f)) {
    console.log(`  skip   ${f}`);
    continue;
  }
  const body = await fs.readFile(path.join(dir, f), "utf8");
  await db.begin(async (tx) => {
    await tx.unsafe(body);
    await tx`insert into schema_migrations (name) values (${f})`;
  });
  console.log(`  applied ${f}`);
}
await closeDb();
