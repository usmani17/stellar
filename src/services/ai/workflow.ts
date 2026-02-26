import { getBaseUrl } from "./pixisChat";

export interface PromptEnhancementRequest {
  prompt: string;
  context?: string;
  style?: "concise" | "detailed" | "analytical" | "actionable";
}

export interface PromptEnhancementResponse {
  original_prompt: string;
  enhanced_prompt: string;
  enhancements: string[];
  tokens_estimate: number;
}

/**
 * Enhance a user prompt for better data analysis results.
 * Takes a raw prompt and returns an enhanced version with structured guidance
 * for obtaining more targeted and useful analysis results.
 */
export async function enhancePrompt(
  params: PromptEnhancementRequest,
  accessToken: string,
  internalToken?: string
): Promise<PromptEnhancementResponse> {
  const baseUrl = getBaseUrl();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  if (internalToken) {
    headers["X-Internal-Token"] = internalToken;
  }

  const res = await fetch(`${baseUrl}/workflow/prompts/enhance`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Prompt enhancement failed: ${res.status} ${errText}`);
  }

  return res.json();
}
