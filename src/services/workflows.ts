import api from "./api";

// ── Types ────────────────────────────────────────────────────────────────

export interface ScheduleConfig {
  frequency: "once" | "daily" | "weekly" | "monthly";
  time: string; // "HH:mm" 24h format
  timezone: string; // IANA e.g. "America/New_York"
  date?: string; // YYYY-MM-DD for "once"
  /** End date for recurring schedules (no runs after this date) */
  endDate?: string; // YYYY-MM-DD
  weekdays?: number[]; // 0=Mon..6=Sun for "weekly"
  monthDays?: number[]; // 1-31 for "monthly"
}

/** Delivery action types — extensible for Slack, WhatsApp, SMS, Webhook later */
export type DeliveryType = "email" | "slack" | "whatsapp" | "sms" | "webhook";

export interface DeliveryAction {
  actions: Array<{
    type: DeliveryType;
    /** Multiple recipient emails for type "email" */
    emails?: string[];
    /** Slack incoming webhook URL for type "slack" */
    webhookUrl?: string;
    /** Multiple recipient phone numbers for type "sms" or "whatsapp" */
    phoneNumbers?: string[];
  }>;
}

export interface Workflow {
  id: number;
  name: string;
  accountId: number;
  accountName: string;
  channelId: number | null;
  channelName: string;
  profileId: number | null;
  profileName: string;
  prompt: string;
  format: "pdf" | "docx";
  /** When null/undefined, use account default from Report Settings */
  deliveryAction?: DeliveryAction | null;
  schedule: ScheduleConfig;
  status: "active" | "paused";
  createdAt: string;
  lastRunAt?: string; // ISO string, for display
  lastRunStatus?: "success" | "failed" | "skipped";
}

export interface WorkflowRun {
  id: string;
  workflowId: number;
  ranAt: string; // ISO
  status: "success" | "failed" | "skipped" | "in_progress";
  outputUrl?: string; // for success: link to report
  /** Session ID (cur_sessions.id) for fetching run history from session table */
  sessionId?: string;
}

export interface CreateWorkflowPayload {
  name: string;
  accountId: number;
  channelId?: number | null;
  channelName?: string;
  profileId?: number | null;
  profileName?: string;
  prompt: string;
  format: "pdf" | "docx";
  /** When null, use account default from Report Settings */
  deliveryAction: DeliveryAction | null;
  schedule: ScheduleConfig;
}

export interface UpdateWorkflowPayload extends Partial<CreateWorkflowPayload> {
  status?: "active" | "paused";
}

/** Payload for workflow execute (preview/run) */
export interface WorkflowExecutePayload {
  accountId: number;
  channelId?: number | null;
  profileId?: number | null;
  accountName?: string;
  channelName?: string;
  profileName?: string;
  prompt: string;
  format: "pdf" | "docx";
  workflowId?: number | null;
  workflowName?: string | null;
  customerId?: string | null;
  loginCustomerId?: string | null;
  /** Brand logo URL for reports (from global Report Settings) */
  logoUrl?: string;
  /** Primary brand color hex (e.g. #136D6D) for reports */
  primaryColor?: string;
}

/** Response from workflow execute */
export interface WorkflowExecuteResponse {
  url: string;
  title: string;
  generated_at: string;
  format: string;
  session_id: string;
  full_message: string;
}

export interface BrandReportSettings {
  accountId: number;
  logoUrl: string;
  primaryColor: string; // hex e.g. "#136D6D"
  /** Default delivery (email addresses or Slack webhook); workflows can override per-workflow */
  deliveryAction?: DeliveryAction | null;
}

// ── Workflow service ─────────────────────────────────────────────────────

/** Raw API response shape (snake_case from backend). */
interface RawWorkflowRun {
  id: number;
  workflow_id: number;
  ran_at: string;
  status: "success" | "failed" | "skipped" | "in_progress";
  output_url?: string | null;
  cur_sessions_id?: string | null;
  error_message?: string | null;
  is_preview?: boolean;
  created_at?: string;
  retry_count?: number;
  started_at?: string;
  completed_at?: string;
  triggered_by?: string;
}

function normalizeWorkflowRun(r: RawWorkflowRun | Record<string, unknown>): WorkflowRun {
  const raw = r as Record<string, unknown>;
  const sessionId =
    raw.cur_sessions_id ??
    raw.curSessionsId ??
    raw.cur_session_id ??
    raw.curSessionId ??
    raw.session_id ??
    raw.sessionId;
  return {
    id: String(raw.id ?? raw.Id),
    workflowId: Number(raw.workflow_id ?? raw.workflowId ?? 0),
    ranAt: String(raw.ran_at ?? raw.ranAt ?? ""),
    status: (raw.status as WorkflowRun["status"]) ?? "skipped",
    outputUrl: (raw.output_url ?? raw.outputUrl) as string | undefined,
    sessionId: sessionId != null && sessionId !== "" ? String(sessionId) : undefined,
  };
}

function workflowsPath(accountId: number) {
  return `/assistant/${accountId}/workflows`;
}

export const workflowsService = {
  getWorkflows: async (
    accountId: number,
    params?: { search?: string }
  ): Promise<Workflow[]> => {
    const { data } = await api.get<Workflow[]>(`${workflowsPath(accountId)}/`, {
      params: params?.search?.trim()
        ? { search: params.search.trim() }
        : undefined,
    });
    return data;
  },

  createWorkflow: async (payload: CreateWorkflowPayload): Promise<Workflow> => {
    const accountId = payload.accountId;
    const { data } = await api.post<Workflow>(
      `${workflowsPath(accountId)}/`,
      payload
    );
    return data;
  },

  updateWorkflow: async (
    accountId: number,
    id: number,
    payload: UpdateWorkflowPayload
  ): Promise<Workflow> => {
    const { data } = await api.patch<Workflow>(
      `${workflowsPath(accountId)}/${id}/`,
      payload
    );
    return data;
  },

  deleteWorkflow: async (accountId: number, id: number): Promise<void> => {
    await api.delete(`${workflowsPath(accountId)}/${id}/`);
  },

  getWorkflowRuns: async (
    accountId: number,
    workflowId: number
  ): Promise<WorkflowRun[]> => {
    const { data } = await api.get<RawWorkflowRun[] | { runs?: RawWorkflowRun[]; results?: RawWorkflowRun[] }>(
      `${workflowsPath(accountId)}/${workflowId}/runs/`
    );
    const runs = Array.isArray(data)
      ? data
      : (data?.runs ?? data?.results ?? []);
    return (runs ?? []).map(normalizeWorkflowRun);
  },

  runWorkflowNow: async (
    accountId: number,
    workflowId: number
  ): Promise<{ runId: number | null; status: string; outputUrl: string | null; error: string | null }> => {
    const { data } = await api.post(
      `${workflowsPath(accountId)}/${workflowId}/run/`
    );
    return data;
  },

  /**
   * Execute workflow (preview or run).
   * Preview: calls agent directly, streams SSE, no history.
   * Run: calls backend run-stream (streams SSE + records history on finish).
   */
  executeWorkflow: async (
    accountId: number,
    payload: WorkflowExecutePayload,
    mode: "preview" | "run",
    options?: { onEvent?: (ev: Record<string, unknown>) => void }
  ): Promise<WorkflowExecuteResponse> => {
    if (payload.accountId !== accountId) {
      throw new Error("Payload accountId must match accountId");
    }
    const token = localStorage.getItem("accessToken");
    const apiBase = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api").replace(/\/$/, "");
    // Run: backend proxies agent stream and records workflow run history
    const url =
      mode === "run" && payload.workflowId
        ? `${apiBase}${workflowsPath(accountId)}/${payload.workflowId}/run-stream/`
        : `${(import.meta.env.VITE_AI_AGENT_BASE_URL || "http://localhost:8001").replace(/\/$/, "")}/workflow/execute?mode=preview`;

    // Preview: Accept text/event-stream asks agent to stream. Run: omit Accept for backend (DRF rejects it).
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    if (mode === "preview") headers.Accept = "text/event-stream";
    const res = await fetch(url, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error((err as { error?: string }).error || `Request failed: ${res.status}`);
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      return res.json() as Promise<WorkflowExecuteResponse>;
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: WorkflowExecuteResponse | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split("\n\n");
      buffer = chunks.pop() || "";
      for (const chunk of chunks) {
        const line = chunk.trim();
        if (line.startsWith("data: ")) {
          try {
            const ev = JSON.parse(line.slice(6)) as Record<string, unknown>;
            options?.onEvent?.(ev);
            if (ev.type === "workflow_result") {
              finalResult = {
                url: (ev.url as string) ?? "",
                title: (ev.title as string) ?? "",
                generated_at: (ev.generated_at as string) ?? "",
                format: (ev.format as string) ?? "pdf",
                session_id: (ev.session_id as string) ?? "",
                full_message: (ev.full_message as string) ?? "",
              };
            }
          } catch {
            // skip invalid JSON
          }
        }
      }
    }
    if (!finalResult) throw new Error("No workflow result received");
    return finalResult;
  },
};

// ── Asset upload (S3 public bucket) ───────────────────────────────────────

export interface AssetUploadResponse {
  url: string;
  s3_key: string;
  bucket: string;
}

export const assetUploadService = {
  /**
   * Upload an image file to S3 public bucket (pixis-assets).
   * Returns the permanent public URL to use for logo, etc.
   */
  uploadImage: async (
    file: File,
    accountId?: number
  ): Promise<AssetUploadResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    if (accountId != null) {
      formData.append("account_id", String(accountId));
    }
    const { data } = await api.post<AssetUploadResponse>(
      "/s3/upload-asset/",
      formData
    );
    return data;
  },
};

// ── Brand settings service ───────────────────────────────────────────────

function brandSettingsPath(accountId: number) {
  return `/assistant/${accountId}/brand-settings`;
}

export const brandSettingsService = {
  getBrandSettings: async (
    accountId: number
  ): Promise<BrandReportSettings> => {
    const { data } = await api.get<BrandReportSettings>(
      `${brandSettingsPath(accountId)}/`
    );
    return data;
  },

  updateBrandSettings: async (
    accountId: number,
    payload: Partial<Omit<BrandReportSettings, "accountId">>
  ): Promise<BrandReportSettings> => {
    const { data } = await api.patch<BrandReportSettings>(
      `${brandSettingsPath(accountId)}/`,
      payload
    );
    return data;
  },
};
