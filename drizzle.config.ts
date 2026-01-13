import type { Config } from "drizzle-kit";

export default {
  schema: "./schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // These will be loaded from HeroStack's environment
    url: process.env.DATABASE_URL || "",
  },
  tablesFilter: ["kanban_*"],
} satisfies Config;
