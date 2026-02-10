import type { AgentConnectionStatus } from "../../types/agent";

function getBaseUrl(): string | null {
  const baseUrl = import.meta.env.VITE_AI_AGENT_BASE_URL;
  if (!baseUrl || typeof baseUrl !== "string") return null;
  return (baseUrl as string).replace(/\/$/, "");
}

/**
 * Check whether the LangGraph server is reachable (health check).
 * Does not throw; returns { connected: false, error } on failure or missing env.
 */
export async function checkHealth(): Promise<AgentConnectionStatus> {
  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return { connected: false, error: "VITE_AI_AGENT_BASE_URL is not set" };
  }
  try {
    const res = await fetch(`${baseUrl}/ok`, { method: "GET" });
    if (res.ok) return { connected: true };
    return {
      connected: false,
      error: `Server returned ${res.status}`,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { connected: false, error: message };
  }
}

export const agentConnectionService = { checkHealth };
