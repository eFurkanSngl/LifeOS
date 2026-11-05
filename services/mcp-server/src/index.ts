import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SqliteRepository } from "../../../packages/database/src/node";
import { createServer } from "./tools";
if (process.env.LIFEOS_MCP_ENABLED !== "1" || !process.env.LIFEOS_DB_PATH) {
  console.error(
    "Set LIFEOS_MCP_ENABLED=1 and LIFEOS_DB_PATH to the existing desktop database.",
  );
  process.exitCode = 1;
} else {
  const repo = new SqliteRepository(process.env.LIFEOS_DB_PATH);
  const server = createServer(repo);
  await server.connect(new StdioServerTransport());
  const stop = () => {
    void server.close().finally(() => {
      repo.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}
