export type InsightCategory =
  | "all"
  | "audience"
  | "audit"
  | "compliance"
  | "creatives"
  | "funnel"
  | "performance";

export interface InsightCard {
  id: string;
  category: InsightCategory;
  title: string;
  description: string;
  prompt: string;
  iconName: string;
}

export const INSIGHT_CATEGORIES: { id: InsightCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "audience", label: "Audience" },
  { id: "audit", label: "Audit" },
  { id: "compliance", label: "Compliance" },
  { id: "creatives", label: "Creatives" },
  { id: "funnel", label: "Funnel" },
  { id: "performance", label: "Performance" },
];

export const INSIGHT_CARDS: InsightCard[] = [
  {
    id: "rising-cost-region",
    category: "audience",
    title: "Rising Cost by Region",
    description:
      "Are there any geographies where cost per result is rising faster than others?",
    prompt:
      "Are there any geographies where cost per result is rising faster than others?",
    iconName: "Users",
  },
  {
    id: "new-audiences-test",
    category: "audience",
    title: "New Audiences to Test",
    description:
      "Suggest new audience segments to expand reach and improve performance.",
    prompt:
      "Suggest new audience segments to expand reach and improve performance.",
    iconName: "Users",
  },
  {
    id: "audience-burnout",
    category: "audience",
    title: "Audience Burnout Ads",
    description: "Identify ads that may be experiencing audience fatigue.",
    prompt:
      "Identify ads that may be experiencing audience fatigue and suggest refreshes.",
    iconName: "Users",
  },
  {
    id: "wasted-spend",
    category: "audit",
    title: "Wasted Spend & Recommendations",
    description:
      "Find campaigns or ad groups with high wasted spend and get optimization ideas.",
    prompt:
      "Find campaigns or ad groups with high wasted spend and provide optimization recommendations.",
    iconName: "ClipboardList",
  },
  {
    id: "budget-pacing",
    category: "audit",
    title: "Budget Pacing Audit",
    description: "Check if campaigns are pacing correctly toward their budgets.",
    prompt:
      "Audit campaign budget pacing and identify any over or under-spending.",
    iconName: "ClipboardList",
  },
  {
    id: "low-roas-spend",
    category: "audit",
    title: "Spend on Low ROAS",
    description: "Identify spend going to low ROAS campaigns.",
    prompt:
      "Identify campaigns or ad groups with high spend but low ROAS and suggest optimization.",
    iconName: "ClipboardList",
  },
  {
    id: "roas-dropping",
    category: "performance",
    title: "Why is my ROAS dropping?",
    description: "Analyze factors contributing to ROAS decline.",
    prompt: "Why is my ROAS dropping?",
    iconName: "BarChart3",
  },
  {
    id: "budget-optimization",
    category: "performance",
    title: "Suggest budget optimization",
    description: "Get recommendations for reallocating budget across campaigns.",
    prompt: "Suggest budget optimization across my campaigns.",
    iconName: "BarChart3",
  },
  {
    id: "acos-trends",
    category: "performance",
    title: "Analyze ACOS trends",
    description: "Analyze ACOS trends over time and identify drivers.",
    prompt: "Analyze ACOS trends over time.",
    iconName: "BarChart3",
  },
  {
    id: "campaign-efficiency",
    category: "performance",
    title: "Compare campaign efficiency",
    description: "Compare efficiency across campaigns and identify top performers.",
    prompt: "Compare campaign efficiency across my campaigns.",
    iconName: "BarChart3",
  },
  {
    id: "create-campaign",
    category: "creatives",
    title: "Create campaign",
    description: "Start a new campaign with AI assistance.",
    prompt: "Create campaign",
    iconName: "Sparkles",
  },
];
