/**
 * Stable color from a single character (matches brand picker in DashboardHeader).
 */
export function getInitialColor(initial: string): string {
  const colors = [
    "#136D6D",
    "#072929",
    "#556179",
    "#8B5CF6",
    "#EC4899",
    "#F59E0B",
    "#10B981",
    "#3B82F6",
    "#EF4444",
    "#06B6D4",
    "#F97316",
    "#6366F1",
    "#14B8A6",
    "#A855F7",
    "#E11D48",
  ];

  if (!initial) return colors[0];
  const charCode = initial.charCodeAt(0);
  let index: number;
  if (charCode >= 48 && charCode <= 57) {
    index = (charCode - 48) % colors.length;
  } else if (charCode >= 65 && charCode <= 90) {
    index = (charCode - 65) % colors.length;
  } else if (charCode >= 97 && charCode <= 122) {
    index = (charCode - 97) % colors.length;
  } else {
    index = Math.abs(charCode % colors.length);
  }
  return colors[index];
}

/** Two-word names → two letters; one word → up to two characters. */
export function getAvatarInitials(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? "";
    const b = parts[1][0] ?? "";
    return (a + b).toUpperCase();
  }
  if (t.length >= 2) return t.slice(0, 2).toUpperCase();
  return t[0].toUpperCase();
}
