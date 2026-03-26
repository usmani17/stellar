/** Shared action-type labels and badge colors for dashboard actions UI. */

export const ACTION_TYPE_LABELS: Record<string, string> = {
  change_state: "Change status",
  adjust_budget: "Adjust budget",
  adjust_bid: "Adjust bid",
  add_negative_keyword: "Add negative keywords",
  change_bid_strategy: "Change bid strategy",
  adjust_target: "Adjust target",
  add_keyword: "Add keywords",
  exclude_placement: "Exclude placement",
  add_negative_target: "Add negative target",
  update_targeting: "Update targeting",
  set_ad_schedule: "Set ad schedule",
  adjust_device_bid: "Device bid modifier",
  adjust_demographic_bid: "Demographic bid modifier",
};

export const ACTION_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  change_state: { bg: "bg-amber-50", text: "text-amber-700", darkBg: "bg-amber-900/30", darkText: "text-amber-300" },
  adjust_budget: { bg: "bg-emerald-50", text: "text-emerald-700", darkBg: "bg-emerald-900/30", darkText: "text-emerald-300" },
  adjust_bid: { bg: "bg-blue-50", text: "text-blue-700", darkBg: "bg-blue-900/30", darkText: "text-blue-300" },
  add_negative_keyword: { bg: "bg-purple-50", text: "text-purple-700", darkBg: "bg-purple-900/30", darkText: "text-purple-300" },
  change_bid_strategy: { bg: "bg-indigo-50", text: "text-indigo-700", darkBg: "bg-indigo-900/30", darkText: "text-indigo-300" },
  adjust_target: { bg: "bg-teal-50", text: "text-teal-700", darkBg: "bg-teal-900/30", darkText: "text-teal-300" },
  add_keyword: { bg: "bg-cyan-50", text: "text-cyan-700", darkBg: "bg-cyan-900/30", darkText: "text-cyan-300" },
  exclude_placement: { bg: "bg-rose-50", text: "text-rose-700", darkBg: "bg-rose-900/30", darkText: "text-rose-300" },
  add_negative_target: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", darkBg: "bg-fuchsia-900/30", darkText: "text-fuchsia-300" },
  update_targeting: { bg: "bg-orange-50", text: "text-orange-700", darkBg: "bg-orange-900/30", darkText: "text-orange-300" },
  set_ad_schedule: { bg: "bg-sky-50", text: "text-sky-700", darkBg: "bg-sky-900/30", darkText: "text-sky-300" },
  adjust_device_bid: { bg: "bg-violet-50", text: "text-violet-700", darkBg: "bg-violet-900/30", darkText: "text-violet-300" },
  adjust_demographic_bid: { bg: "bg-lime-50", text: "text-lime-700", darkBg: "bg-lime-900/30", darkText: "text-lime-300" },
};
