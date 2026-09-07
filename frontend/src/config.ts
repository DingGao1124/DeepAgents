import { Client } from "@langchain/langgraph-sdk";

// The LangGraph dev server (backend) runs here by default.
export const AGENT_URL = "http://localhost:2024";

// Must match the graph name in ../../backend/langgraph.json ("graphs": { "agent": ... }).
export const ASSISTANT_ID = "agent";

// sessionStorage key for the active thread (used for reconnect + history).
export const THREAD_KEY = "web-page-agent.activeThreadId";

// Shared SDK client for listing past conversations (threads).
export const client = new Client({ apiUrl: AGENT_URL });

// HITL types mirror the backend's interruptOn payload (HITLRequest / HITLResponse).
export interface ActionRequest {
  name: string;
  args: Record<string, unknown>;
  description?: string;
}

export interface ReviewConfig {
  allowedDecisions: Array<"approve" | "reject" | "edit" | "respond">;
}

export interface HITLRequest {
  actionRequests: ActionRequest[];
  reviewConfigs: ReviewConfig[];
}

export type Decision =
  | { type: "approve" }
  | { type: "reject"; message?: string }
  | { type: "edit"; editedAction: { name: string; args: Record<string, unknown> } };

export interface HITLResponse {
  decisions: Decision[];
}
