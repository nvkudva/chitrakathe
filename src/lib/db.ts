import postgres from "postgres";
import { config } from "./config";

let sqlClient: postgres.Sql | null = null;

export function sql(): postgres.Sql {
  if (!sqlClient) {
    sqlClient = postgres(config().DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      transform: { undefined: null },
    });
  }
  return sqlClient;
}

export async function closeDb(): Promise<void> {
  await sqlClient?.end({ timeout: 5 });
  sqlClient = null;
}
