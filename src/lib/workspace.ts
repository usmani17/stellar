import type { User } from "../services/auth";

const CURRENT_WORKSPACE_KEY = "currentWorkspaceId";

export function getCurrentWorkspaceId(): number | null {
  const raw = localStorage.getItem(CURRENT_WORKSPACE_KEY);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) ? null : n;
}

export function setCurrentWorkspaceId(id: number | null): void {
  if (id == null) {
    localStorage.removeItem(CURRENT_WORKSPACE_KEY);
    return;
  }
  localStorage.setItem(CURRENT_WORKSPACE_KEY, String(id));
}

/**
 * After loading user profile, ensure localStorage points at a valid membership.
 */
export function syncWorkspaceSelectionFromUser(user: User): void {
  const list = user.workspaces;
  if (!list || list.length === 0) {
    setCurrentWorkspaceId(null);
    return;
  }
  const current = getCurrentWorkspaceId();
  if (current != null && list.some((w) => w.id === current)) {
    return;
  }
  if (list.length === 1) {
    setCurrentWorkspaceId(list[0].id);
    return;
  }
  const legacy = user.workspace?.id;
  if (legacy != null && list.some((w) => w.id === legacy)) {
    setCurrentWorkspaceId(legacy);
    return;
  }
  setCurrentWorkspaceId(list[0].id);
}

/** Display name for the active workspace (header X-Workspace-Id). */
export function getActiveWorkspaceLabel(user: User | null): string | null {
  if (!user) return null;
  const wid = getCurrentWorkspaceId();
  const fromList = user.workspaces?.find((w) => w.id === wid);
  if (fromList) return fromList.name;
  return user.workspace?.name ?? null;
}
