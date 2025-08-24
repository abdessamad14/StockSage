import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./shared/sqlite-schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./data/stocksage.db",
  },
});
