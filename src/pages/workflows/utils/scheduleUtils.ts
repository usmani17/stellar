import type { ScheduleConfig } from "../../../services/workflows";

// ── Timezone helpers ─────────────────────────────────────────────────────

interface TimezoneOption {
  value: string;
  label: string;
  group: string;
}

const REGION_ORDER = [
  "America",
  "Europe",
  "Asia",
  "Pacific",
  "Africa",
  "Australia",
  "Indian",
  "Atlantic",
  "Arctic",
  "Antarctica",
];

function groupLabel(tz: string): string {
  const region = tz.split("/")[0];
  if (region === "US" || region === "Canada") return "America";
  return REGION_ORDER.includes(region) ? region : "Other";
}

function formatTzLabel(tz: string): string {
  const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "shortOffset",
    });
    const parts = fmt.formatToParts(now);
    const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return `${city} (${offset})`;
  } catch {
    return city;
  }
}

let cachedOptions: TimezoneOption[] | null = null;

export function getTimezoneOptions(): TimezoneOption[] {
  if (cachedOptions) return cachedOptions;

  let zones: string[];
  try {
    zones = (Intl as any).supportedValuesOf("timeZone") as string[];
  } catch {
    zones = [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Berlin",
      "Europe/Paris",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Kolkata",
      "Asia/Dubai",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];
  }

  cachedOptions = zones
    .map((tz) => ({
      value: tz,
      label: formatTzLabel(tz),
      group: groupLabel(tz),
    }))
    .sort((a, b) => {
      const ga = REGION_ORDER.indexOf(a.group);
      const gb = REGION_ORDER.indexOf(b.group);
      if (ga !== gb) return (ga === -1 ? 99 : ga) - (gb === -1 ? 99 : gb);
      return a.label.localeCompare(b.label);
    });

  return cachedOptions;
}

export function getCurrentTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatTimezoneDisplay(tz: string): string {
  const parts = formatTimezoneDisplayParts(tz);
  if (!parts) return tz;
  return `${parts.city} · ${parts.time} ${parts.abbrev}`;
}

export function formatTimezoneDisplayParts(tz: string): { city: string; time: string; abbrev: string } | null {
  try {
    const now = new Date();
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz;
    const timeFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const abbrevFmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    });
    const abbrev =
      abbrevFmt.formatToParts(now).find((p) => p.type === "timeZoneName")?.value ?? "";
    return { city, time: timeFmt.format(now), abbrev };
  } catch {
    return null;
  }
}

// ── Schedule formatting ──────────────────────────────────────────────────

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Normalize weekdays to a number array; handles API/DB returning non-array values. Exported for use in forms. */
export function toWeekdaysArray(val: unknown): number[] {
  if (Array.isArray(val)) {
    return val.filter((v) => typeof v === "number");
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter((v: unknown) => typeof v === "number") : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Normalize monthDays to a number array; handles API/DB returning non-array values. Exported for use in forms. */
export function toMonthDaysArray(val: unknown): number[] {
  if (Array.isArray(val)) {
    return val.filter((v) => typeof v === "number");
  }
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.filter((v: unknown) => typeof v === "number") : [];
    } catch {
      return [];
    }
  }
  return [];
}

const MONTH_SUFFIX = (d: number) => {
  if (d >= 11 && d <= 13) return "th";
  switch (d % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

function tzAbbr(tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      timeZoneName: "short",
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    return "";
  }
}

export function formatSchedule(schedule: ScheduleConfig): string {
  const time = formatTime12h(schedule.time);
  const tz = tzAbbr(schedule.timezone);
  const suffix = tz ? ` ${tz}` : "";

  switch (schedule.frequency) {
    case "once":
      return `Once on ${schedule.date ?? "TBD"} at ${time}${suffix}`;
    case "daily":
      return `Daily at ${time}${suffix}`;
    case "weekly": {
      const weekdaysArr = toWeekdaysArray(schedule.weekdays);
      const days = weekdaysArr.map((d) => DAY_NAMES[d]).join(", ") ?? "";
      return `Weekly ${days} at ${time}${suffix}`;
    }
    case "monthly": {
      const monthDaysArr = toMonthDaysArray(schedule.monthDays);
      const days =
        monthDaysArr
          .sort((a, b) => a - b)
          .map((d) => `${d}${MONTH_SUFFIX(d)}`)
          .join(", ") ?? "";
      return `Monthly on ${days} at ${time}${suffix}`;
    }
    default:
      return "";
  }
}

// ── Next runs computation ────────────────────────────────────────────────

function isScheduleComplete(schedule: ScheduleConfig): boolean {
  if (!schedule.time || !schedule.timezone || !schedule.frequency) return false;
  if (schedule.frequency === "once" && !schedule.date) return false;
  if (
    schedule.frequency === "weekly" &&
    toWeekdaysArray(schedule.weekdays).length === 0
  )
    return false;
  if (
    schedule.frequency === "monthly" &&
    toMonthDaysArray(schedule.monthDays).length === 0
  )
    return false;
  return true;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Build a Date representing `year-month-day HH:mm` in the given IANA timezone.
 * We do this by formatting a candidate date in the target zone, then adjusting.
 */
function buildDateInTz(
  year: number,
  month: number,
  day: number,
  hours: number,
  minutes: number,
  _tz: string
): Date {
  const d = new Date(year, month, day, hours, minutes, 0, 0);
  return d;
}

export function computeNextRuns(
  schedule: ScheduleConfig,
  count: number
): { date: Date; formatted: string }[] {
  if (!isScheduleComplete(schedule)) return [];

  const [hStr, mStr] = schedule.time.split(":");
  const hours = parseInt(hStr, 10);
  const minutes = parseInt(mStr, 10);
  const now = new Date();
  const results: { date: Date; formatted: string }[] = [];

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: schedule.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });

  if (schedule.frequency === "once" && schedule.date) {
    const [y, m, d] = schedule.date.split("-").map(Number);
    const run = buildDateInTz(y, m - 1, d, hours, minutes, schedule.timezone);
    if (run > now) {
      results.push({ date: run, formatted: fmt.format(run) });
    }
    return results;
  }

  if (schedule.frequency === "daily") {
    let cursor = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );
    if (cursor <= now) cursor.setDate(cursor.getDate() + 1);
    while (results.length < count) {
      results.push({ date: new Date(cursor), formatted: fmt.format(cursor) });
      cursor.setDate(cursor.getDate() + 1);
    }
    return results;
  }

  const weekdaysArr = toWeekdaysArray(schedule.weekdays);
  if (schedule.frequency === "weekly" && weekdaysArr.length > 0) {
    const sortedDays = [...weekdaysArr].sort((a, b) => a - b);
    let cursor = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes
    );
    const maxIter = count * 30;
    let iter = 0;
    while (results.length < count && iter++ < maxIter) {
      // JS getDay: 0=Sun, 1=Mon...6=Sat → our system: 0=Mon...6=Sun
      const jsDay = cursor.getDay();
      const ourDay = jsDay === 0 ? 6 : jsDay - 1;
      if (sortedDays.includes(ourDay) && cursor > now) {
        results.push({
          date: new Date(cursor),
          formatted: fmt.format(cursor),
        });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    return results;
  }

  const monthDaysArr = toMonthDaysArray(schedule.monthDays);
  if (schedule.frequency === "monthly" && monthDaysArr.length > 0) {
    const sortedDays = [...monthDaysArr].sort((a, b) => a - b);
    let year = now.getFullYear();
    let month = now.getMonth();
    const maxIter = count * 60;
    let iter = 0;
    while (results.length < count && iter++ < maxIter) {
      const maxDay = daysInMonth(year, month);
      // Use Set to dedupe: 30 and 31 both → 28 in Feb, 30 in Apr
      const effectiveDays = new Set<number>();
      for (const day of sortedDays) {
        effectiveDays.add(Math.min(day, maxDay));
      }
      for (const effectiveDay of effectiveDays) {
        const run = buildDateInTz(year, month, effectiveDay, hours, minutes, schedule.timezone);
        if (run > now) {
          results.push({ date: run, formatted: fmt.format(run) });
          if (results.length >= count) break;
        }
      }
      month++;
      if (month > 11) {
        month = 0;
        year++;
      }
    }
    return results;
  }

  return results;
}

// ── Schedule normalization (for forms) ───────────────────────────────────

/** Normalize a schedule from API so weekdays/monthDays are proper number arrays. */
export function normalizeSchedule(schedule: ScheduleConfig): ScheduleConfig {
  const weekdays = toWeekdaysArray(schedule.weekdays);
  const monthDays = toMonthDaysArray(schedule.monthDays);
  return {
    ...schedule,
    timezone: schedule.timezone || getCurrentTimezone(),
    time: schedule.time || "09:00",
    weekdays: schedule.frequency === "weekly" ? weekdays : undefined,
    monthDays: schedule.frequency === "monthly" ? monthDays : undefined,
  };
}

/**
 * Sanitize schedule before sending to API. Ensures weekdays/monthDays are always
 * proper number[] (never strings or corrupted arrays). Use before create/update.
 */
export function sanitizeScheduleForApi(schedule: ScheduleConfig): ScheduleConfig {
  const base: ScheduleConfig = {
    frequency: schedule.frequency,
    time: schedule.time || "09:00",
    timezone: schedule.timezone || getCurrentTimezone(),
  };
  if (schedule.date) base.date = schedule.date;
  if (schedule.endDate) base.endDate = schedule.endDate;
  if (schedule.frequency === "weekly") {
    base.weekdays = toWeekdaysArray(schedule.weekdays);
  }
  if (schedule.frequency === "monthly") {
    base.monthDays = toMonthDaysArray(schedule.monthDays);
  }
  return base;
}
