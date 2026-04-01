/** Shared content height for table and chart widgets to align visual heights side-by-side */
export const DASHBOARD_TABLE_CHART_CONTENT_HEIGHT = 280;

/** Snap any HH:MM to on-the-hour for dropdown matching. */
export function snapTimeToHour(timeStr: string | undefined): string {
  if (!timeStr) return "09:00";
  const [hRaw] = timeStr.split(":");
  const hour = Math.min(23, Math.max(0, parseInt(hRaw, 10) || 9));
  return `${String(hour).padStart(2, "0")}:00`;
}

export const SCHEDULE_FREQUENCY_OPTIONS = [
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
	{ value: "monthly", label: "Monthly" },
];

const _hourLabel = (h24: number): string => {
	const hour12 = h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24;
	const period = h24 < 12 ? "AM" : "PM";
	return `${hour12}:00 ${period}`;
};

export const TIME_OPTIONS = Array.from({ length: 24 }, (_, h24) => {
	const value = `${String(h24).padStart(2, "0")}:00`;
	return { value, label: _hourLabel(h24) };
});

/** Mon=0 .. Sun=6 (same as workflows ScheduleConfig) */
export const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
