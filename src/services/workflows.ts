// import api from "./api"; // uncomment when real endpoints are ready

// ── Types ────────────────────────────────────────────────────────────────

export interface ScheduleConfig {
  frequency: "once" | "daily" | "weekly" | "monthly";
  time: string; // "HH:mm" 24h format
  timezone: string; // IANA e.g. "America/New_York"
  date?: string; // YYYY-MM-DD for "once"
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
  channelId: number;
  channelName: string;
  profileId: number;
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
  status: "success" | "failed" | "skipped";
  outputUrl?: string; // for success: link to report
}

export interface CreateWorkflowPayload {
  name: string;
  accountId: number;
  channelId: number;
  channelName: string;
  profileId: number;
  profileName: string;
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
}

// ── Mock data store (replaced by real API later) ─────────────────────────

let mockWorkflows: Workflow[] = [];
let mockBrandSettings: BrandReportSettings[] = [];
let mockWorkflowRuns: WorkflowRun[] = [];
let nextId = 1;

// ── Workflow service ─────────────────────────────────────────────────────

export const workflowsService = {
  getWorkflows: async (accountId: number): Promise<Workflow[]> => {
    // Mock: return workflows for this account
    // Real: const { data } = await api.get<Workflow[]>(`/workflows/`, { params: { account_id: accountId } });
    return mockWorkflows.filter((w) => w.accountId === accountId);
  },

  createWorkflow: async (payload: CreateWorkflowPayload): Promise<Workflow> => {
    // Real: const { data } = await api.post<Workflow>("/workflows/", payload);
    const id = nextId++;
    const workflow: Workflow = {
      id,
      name: payload.name || "Untitled workflow",
      accountId: payload.accountId,
      accountName: "",
      channelId: payload.channelId,
      channelName: payload.channelName,
      profileId: payload.profileId,
      profileName: payload.profileName,
      prompt: payload.prompt,
      format: payload.format,
      deliveryAction: payload.deliveryAction,
      schedule: payload.schedule,
      status: "active",
      createdAt: new Date().toISOString(),
      lastRunAt: undefined,
      lastRunStatus: undefined,
    };
    mockWorkflows.push(workflow);
    // Seed one mock run for demo (replace with real API later)
    const seedRun: WorkflowRun = {
      id: `run-${id}-1`,
      workflowId: id,
      ranAt: new Date(Date.now() - 86400000).toISOString(),
      status: "success",
      outputUrl: "#",
    };
    mockWorkflowRuns.push(seedRun);
    workflow.lastRunAt = seedRun.ranAt;
    workflow.lastRunStatus = seedRun.status;
    return workflow;
  },

  updateWorkflow: async (
    id: number,
    payload: UpdateWorkflowPayload
  ): Promise<Workflow> => {
    // Real: const { data } = await api.patch<Workflow>(`/workflows/${id}/`, payload);
    const idx = mockWorkflows.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error("Workflow not found");
    mockWorkflows[idx] = { ...mockWorkflows[idx], ...payload };
    return mockWorkflows[idx];
  },

  deleteWorkflow: async (id: number): Promise<void> => {
    // Real: await api.delete(`/workflows/${id}/`);
    mockWorkflows = mockWorkflows.filter((w) => w.id !== id);
    mockWorkflowRuns = mockWorkflowRuns.filter((r) => r.workflowId !== id);
  },

  getWorkflowRuns: async (workflowId: number): Promise<WorkflowRun[]> => {
    // Mock: return runs for this workflow (empty for new workflows)
    return mockWorkflowRuns
      .filter((r) => r.workflowId === workflowId)
      .sort((a, b) => new Date(b.ranAt).getTime() - new Date(a.ranAt).getTime());
  },
};

// ── Brand settings service ───────────────────────────────────────────────

export const brandSettingsService = {
  getBrandSettings: async (
    accountId: number
  ): Promise<BrandReportSettings> => {
    // Real: const { data } = await api.get<BrandReportSettings>(`/brand-settings/${accountId}/`);
    const existing = mockBrandSettings.find((s) => s.accountId === accountId);
    return existing ?? { accountId, logoUrl: "", primaryColor: "#136D6D" };
  },

  updateBrandSettings: async (
    accountId: number,
    payload: Partial<Omit<BrandReportSettings, "accountId">>
  ): Promise<BrandReportSettings> => {
    // Real: const { data } = await api.patch<BrandReportSettings>(`/brand-settings/${accountId}/`, payload);
    const idx = mockBrandSettings.findIndex((s) => s.accountId === accountId);
    if (idx === -1) {
      const settings: BrandReportSettings = {
        accountId,
        logoUrl: payload.logoUrl ?? "",
        primaryColor: payload.primaryColor ?? "#136D6D",
        defaultDeliveryEmail: payload.defaultDeliveryEmail ?? "",
      };
      mockBrandSettings.push(settings);
      return settings;
    }
    mockBrandSettings[idx] = { ...mockBrandSettings[idx], ...payload };
    return mockBrandSettings[idx];
  },
};
