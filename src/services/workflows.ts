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
  type: DeliveryType;
  email?: string; // for email
  webhookUrl?: string; // for slack, webhook
  phoneNumber?: string; // for whatsapp, sms
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

export interface BrandReportSettings {
  accountId: number;
  logoUrl: string;
  primaryColor: string; // hex e.g. "#136D6D"
  /** Default email for report delivery; workflows can override per-workflow */
  defaultDeliveryEmail?: string;
  deliveryAction?: DeliveryAction | null;
}

// ── Workflow service ─────────────────────────────────────────────────────

function workflowsPath(accountId: number) {
  return `/assistant/${accountId}/workflows`;
}

export const workflowsService = {
  getWorkflows: async (accountId: number): Promise<Workflow[]> => {
    const { data } = await api.get<Workflow[]>(`${workflowsPath(accountId)}/`);
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
    const { data } = await api.get<WorkflowRun[]>(
      `${workflowsPath(accountId)}/${workflowId}/runs/`
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
