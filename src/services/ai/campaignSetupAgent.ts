import type { CampaignSetupState } from "../../types/agent";
import { threadsService } from "./threads";
import { runsService } from "./runs";

export interface CampaignSetupAgentCallbacks {
  onState?: (state: CampaignSetupState) => void;
  onMessage?: (content: string) => void;
  onThinkingStep?: (steps: string[]) => void;
  onError?: (error: string) => void;
}

/**
 * Send one user message to the campaign_setup agent on the given thread.
 * If threadId is null/undefined, creates a new thread first.
 * Uses stream_mode: ["values", "updates"]; state and messages are delivered via callbacks.
 * Returns the thread_id used for the run (new or existing).
 */
export async function sendMessage(
  text: string,
  threadId: string | null | undefined,
  callbacks: CampaignSetupAgentCallbacks
): Promise<string> {
  let tid = threadId ?? null;
  if (!tid) {
    const thread = await threadsService.createThread({});
    tid = thread.thread_id;
  }

  await runsService.streamRun(
    tid,
    {
      assistant_id: "campaign_setup",
      input: { messages: [{ role: "user", content: text }] },
      stream_mode: ["values", "updates"],
    },
    {
      onCampaignSetupState: callbacks.onState,
      onMessage: (content) => callbacks.onMessage?.(content),
      onThinkingStep: callbacks.onThinkingStep,
      onError: callbacks.onError,
    }
  );

  return tid;
}

export const campaignSetupAgentService = { sendMessage };
