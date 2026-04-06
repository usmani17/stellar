/**
 * Shared action-type labels and badge colors for dashboard actions UI.
 * Platform-agnostic: action types that share the same slug across Google & Meta
 * use a single entry. Platform-specific types are grouped below.
 */

export const ACTION_TYPE_LABELS: Record<string, string> = {
  // --- Cross-platform (Google + Meta) ---
  change_state: "Change status",
  adjust_budget: "Adjust budget",
  adjust_bid: "Adjust bid",
  adjust_target: "Adjust target",
  update_targeting: "Update targeting",

  // --- Google Ads ---
  add_negative_keyword: "Add negative keywords",
  change_bid_strategy: "Change bid strategy",
  add_keyword: "Add keywords",
  exclude_placement: "Exclude placement",
  add_negative_target: "Add negative target",
  set_ad_schedule: "Set ad schedule",
  adjust_device_bid: "Device bid modifier",
  adjust_demographic_bid: "Demographic bid modifier",
  adjust_age_targeting: "Adjust age targeting",
  remove_keyword: "Remove keywords",
  remove_negative_keyword: "Remove negative keywords",
  set_frequency_cap: "Set frequency cap",
  add_asset: "Add asset",
  remove_asset: "Remove asset",
  update_ad_url: "Update ad URL",
  toggle_ai_max: "Toggle AI Max",
  adjust_impression_share_target: "Adjust impression share",
  add_product_group: "Add product group",
  exclude_product_group: "Exclude product group",
  adjust_shared_budget: "Adjust shared budget",
  assign_shared_budget: "Assign shared budget",
  adjust_portfolio_bid_target: "Adjust portfolio bid target",
  assign_portfolio_bid_strategy: "Assign portfolio bid strategy",

  // --- Meta Ads (add entries here when Meta actions are implemented) ---
};

export const ACTION_TYPE_COLORS: Record<
  string,
  { bg: string; text: string; darkBg: string; darkText: string }
> = {
  // --- Cross-platform ---
  change_state: { bg: "bg-amber-50", text: "text-amber-700", darkBg: "bg-amber-900/30", darkText: "text-amber-300" },
  adjust_budget: { bg: "bg-emerald-50", text: "text-emerald-700", darkBg: "bg-emerald-900/30", darkText: "text-emerald-300" },
  adjust_bid: { bg: "bg-blue-50", text: "text-blue-700", darkBg: "bg-blue-900/30", darkText: "text-blue-300" },
  adjust_target: { bg: "bg-teal-50", text: "text-teal-700", darkBg: "bg-teal-900/30", darkText: "text-teal-300" },
  update_targeting: { bg: "bg-orange-50", text: "text-orange-700", darkBg: "bg-orange-900/30", darkText: "text-orange-300" },

  // --- Google Ads ---
  add_negative_keyword: { bg: "bg-purple-50", text: "text-purple-700", darkBg: "bg-purple-900/30", darkText: "text-purple-300" },
  change_bid_strategy: { bg: "bg-indigo-50", text: "text-indigo-700", darkBg: "bg-indigo-900/30", darkText: "text-indigo-300" },
  add_keyword: { bg: "bg-cyan-50", text: "text-cyan-700", darkBg: "bg-cyan-900/30", darkText: "text-cyan-300" },
  exclude_placement: { bg: "bg-rose-50", text: "text-rose-700", darkBg: "bg-rose-900/30", darkText: "text-rose-300" },
  add_negative_target: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", darkBg: "bg-fuchsia-900/30", darkText: "text-fuchsia-300" },
  set_ad_schedule: { bg: "bg-sky-50", text: "text-sky-700", darkBg: "bg-sky-900/30", darkText: "text-sky-300" },
  adjust_device_bid: { bg: "bg-violet-50", text: "text-violet-700", darkBg: "bg-violet-900/30", darkText: "text-violet-300" },
  adjust_demographic_bid: { bg: "bg-lime-50", text: "text-lime-700", darkBg: "bg-lime-900/30", darkText: "text-lime-300" },
  adjust_age_targeting: { bg: "bg-pink-50", text: "text-pink-700", darkBg: "bg-pink-900/30", darkText: "text-pink-300" },
  remove_keyword: { bg: "bg-red-50", text: "text-red-700", darkBg: "bg-red-900/30", darkText: "text-red-300" },
  remove_negative_keyword: { bg: "bg-red-50", text: "text-red-700", darkBg: "bg-red-900/30", darkText: "text-red-300" },
  set_frequency_cap: { bg: "bg-yellow-50", text: "text-yellow-700", darkBg: "bg-yellow-900/30", darkText: "text-yellow-300" },
  add_asset: { bg: "bg-green-50", text: "text-green-700", darkBg: "bg-green-900/30", darkText: "text-green-300" },
  remove_asset: { bg: "bg-red-50", text: "text-red-700", darkBg: "bg-red-900/30", darkText: "text-red-300" },
  update_ad_url: { bg: "bg-blue-50", text: "text-blue-700", darkBg: "bg-blue-900/30", darkText: "text-blue-300" },
  toggle_ai_max: { bg: "bg-violet-50", text: "text-violet-700", darkBg: "bg-violet-900/30", darkText: "text-violet-300" },
  adjust_impression_share_target: { bg: "bg-sky-50", text: "text-sky-700", darkBg: "bg-sky-900/30", darkText: "text-sky-300" },
  add_product_group: { bg: "bg-cyan-50", text: "text-cyan-700", darkBg: "bg-cyan-900/30", darkText: "text-cyan-300" },
  exclude_product_group: { bg: "bg-fuchsia-50", text: "text-fuchsia-700", darkBg: "bg-fuchsia-900/30", darkText: "text-fuchsia-300" },
  adjust_shared_budget: { bg: "bg-emerald-50", text: "text-emerald-700", darkBg: "bg-emerald-900/30", darkText: "text-emerald-300" },
  assign_shared_budget: { bg: "bg-emerald-50", text: "text-emerald-700", darkBg: "bg-emerald-900/30", darkText: "text-emerald-300" },
  adjust_portfolio_bid_target: { bg: "bg-teal-50", text: "text-teal-700", darkBg: "bg-teal-900/30", darkText: "text-teal-300" },
  assign_portfolio_bid_strategy: { bg: "bg-indigo-50", text: "text-indigo-700", darkBg: "bg-indigo-900/30", darkText: "text-indigo-300" },

  // --- Meta Ads (add entries here when Meta actions are implemented) ---
};
