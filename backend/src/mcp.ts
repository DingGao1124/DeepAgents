/**
 * MCP client: load remote tools from the MCP_SERVERS environment variable.
 *
 *   MCP_SERVERS={"name":{"url":"http://localhost:8000/mcp","transport":"http","headers":{...}}}
 *
 * transport: "http" | "sse"; defaults to HTTP.
 */

import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { StructuredToolInterface } from "@langchain/core/tools";

export interface McpServerConfig {
  url: string;
  transport?: "http" | "sse";
  headers?: Record<string, string>;
}

export type McpServersConfig = Record<string, McpServerConfig>;

export function parseMcpServersFromEnv(): McpServersConfig {
  const raw = process.env.MCP_SERVERS;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      console.warn("[MCP] MCP_SERVERS must be a JSON object; ignoring it");
      return {};
    }
    return parsed as McpServersConfig;
  } catch {
    console.warn("[MCP] MCP_SERVERS contains invalid JSON; ignoring it");
    return {};
  }
}

function toClientConfig(servers: McpServersConfig): Record<string, McpServerConfig> {
  const config: Record<string, McpServerConfig> = {};

  for (const [name, server] of Object.entries(servers)) {
    if (!server.url) {
      console.warn(`[MCP] Skipping "${name}": missing url`);
      continue;
    }
    config[name] = {
      transport: server.transport ?? "http",
      url: server.url,
      headers: server.headers,
    };
  }

  return config;
}

let _client: MultiServerMCPClient | null = null;
let _tools: StructuredToolInterface[] | null = null;

export function getMcpClient(): MultiServerMCPClient | null {
  const servers = parseMcpServersFromEnv();
  const config = toClientConfig(servers);

  if (Object.keys(config).length === 0) return null;

  if (!_client) {
    _client = new MultiServerMCPClient(config);
    console.log(`[MCP] ${Object.keys(config).length} servers: ${Object.keys(config).join(", ")}`);
  }

  return _client;
}

export async function loadMcpTools(): Promise<StructuredToolInterface[]> {
  if (_tools) return _tools;

  const client = getMcpClient();
  if (!client) return [];

  try {
    _tools = await client.getTools();
    console.log(`[MCP] ${_tools.length} tools loaded`);
    return _tools;
  } catch (error) {
    console.warn(`[MCP] load failed: ${error instanceof Error ? error.message : error}`);
    return [];
  }
}

export async function closeMcpClient(): Promise<void> {
  if (_client) {
    await _client.close().catch(() => {});
    _client = null;
    _tools = null;
  }
}
