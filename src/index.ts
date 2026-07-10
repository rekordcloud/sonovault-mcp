#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SonoVault } from "sonovault";
import { createServer } from "./server.js";

const apiKey = process.env.SONOVAULT_API_KEY;
if (!apiKey) {
  console.error(
    "sonovault-mcp: SONOVAULT_API_KEY is not set.\n" +
      "Get a free API key (1,000 requests/month, no credit card) at https://sonovault.now\n" +
      "then add it to your MCP client config, e.g.:\n" +
      '  { "mcpServers": { "sonovault": { "command": "npx", "args": ["-y", "sonovault-mcp"],\n' +
      '      "env": { "SONOVAULT_API_KEY": "svk_live_..." } } } }',
  );
  process.exit(1);
}

const sv = new SonoVault({ apiKey });
const server = createServer(sv);
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("sonovault-mcp ready (stdio)");
