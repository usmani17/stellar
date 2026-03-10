import type { SessionWithMessages } from "../contexts/AssistantContext";

/** Group sessions by date (Today, Yesterday, or formatted date), ordered by latest first */
export function groupSessionsByDate(
  sessions: SessionWithMessages[]
): Record<string, SessionWithMessages[]> {
  const groups: Record<string, SessionWithMessages[]> = {};
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sorted = [...sessions]
    .filter((s) => s.id !== "__pending__")
    .sort(
      (a, b) =>
        new Date(b.updated_at ?? 0).getTime() -
        new Date(a.updated_at ?? 0).getTime()
    );

  sorted.forEach((session) => {
    const d = new Date(session.updated_at ?? session.created_at ?? 0);
    const ds = d.toDateString();
    const todayStr = today.toDateString();
    const yesterdayStr = yesterday.toDateString();
    let groupKey: string;
    if (ds === todayStr) groupKey = "Today";
    else if (ds === yesterdayStr) groupKey = "Yesterday";
    else
      groupKey = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(session);
  });
  return groups;
}
