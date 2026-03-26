import React, { useState, useEffect, useMemo, useRef } from "react";
import { accountsService } from "../../services/accounts";
import { metaCampaignsService } from "../../services/meta";
import type {
  CreateMetaCampaignPayload,
  MetaCampaignStatus,
  UpdateMetaCampaignPayload,
} from "../../types/meta";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";

const META_OBJECTIVES: { value: string; label: string; caption: string }[] = [
  {
    value: "OUTCOME_AWARENESS",
    label: "Awareness",
    caption: "Show your ads to people who are most likely to remember them.",
  },
  {
    value: "OUTCOME_TRAFFIC",
    label: "Traffic",
    caption:
      "Send people to a destination, like your website, app, Instagram profile or Facebook event.",
  },
  {
    value: "OUTCOME_ENGAGEMENT",
    label: "Engagement",
    caption:
      "Get more messages, purchases through messaging, video views, interactions, Page likes or event responses.",
  },
  {
    value: "OUTCOME_LEADS",
    label: "Leads",
    caption: "Collect leads for your business or brand.",
  },
  {
    value: "OUTCOME_APP_PROMOTION",
    label: "App Promotion",
    caption: "Find new people to install your app and continue using it.",
  },
  {
    value: "OUTCOME_SALES",
    label: "Sales",
    caption: "Find people likely to purchase your product or service.",
  },
];

const SPECIAL_AD_CATEGORIES: {
  value: string;
  label: string;
  caption: string;
}[] = [
  { value: "NONE", label: "None", caption: "" },
  {
    value: "CREDIT",
    label: "Credit",
    caption:
      "Ads for credit cards and other related credit opportunities (if still allowed for the chosen objective).",
  },
  {
    value: "EMPLOYMENT",
    label: "Employment",
    caption:
      "Ads for job offers, internships, professional certification programs or other related opportunities.",
  },
  {
    value: "HOUSING",
    label: "Housing",
    caption:
      "Ads for real estate listings, homeowners insurance, mortgage loans or other related opportunities.",
  },
  {
    value: "ONLINE_GAMBLING_AND_GAMING",
    label: "Online gambling and gaming",
    caption: "Ads related to online gambling or gaming activities.",
  },
  {
    value: "ISSUES_ELECTIONS_POLITICS",
    label: "Social Issues, elections or politics",
    caption:
      "Ads about social issues (such as economy, or civil and social rights), elections, or political figures or campaigns.",
  },
];

const BUYING_TYPES: { value: string; label: string; caption: string }[] = [
  {
    value: "AUCTION",
    label: "Auction",
    caption: "Buy in real-time with cost effective bidding.",
  },
  {
    value: "RESERVATION",
    label: "Reservation",
    caption: "Buy in advance for more predictable outcomes.",
  },
];

const BID_STRATEGIES: { value: string; label: string; caption: string }[] = [
  {
    value: "LOWEST_COST_WITHOUT_CAP",
    label: "Highest Volume",
    caption: "Get the most results for your budget.",
  },
  {
    value: "LOWEST_COST_WITH_BID_CAP",
    label: "Bid cap",
    caption: "Set the highest you want to bid in any auction.",
  },
  {
    value: "COST_CAP",
    label: "Cost per result goal",
    caption:
      "Aim for a certain cost per result while maximizing the volume of results.",
  },
  {
    value: "LOWEST_COST_WITH_MIN_ROAS",
    label: "Minimum ROAS",
    caption: "Used to find the highest purchase value for your budget.",
  },
];

const STATUS_OPTIONS: { value: MetaCampaignStatus; label: string }[] = [
  { value: "PAUSED", label: "Paused" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

function normalizeObjectiveForForm(raw: string | undefined): string {
  const o = (raw || "").trim().toUpperCase();
  if (META_OBJECTIVES.some((x) => x.value === o)) return o;
  const legacy: Record<string, string> = {
    LINK_CLICKS: "OUTCOME_TRAFFIC",
    CONVERSIONS: "OUTCOME_SALES",
    BRAND_AWARENESS: "OUTCOME_AWARENESS",
    REACH: "OUTCOME_AWARENESS",
    VIDEO_VIEWS: "OUTCOME_ENGAGEMENT",
    MESSAGES: "OUTCOME_ENGAGEMENT",
    LEAD_GENERATION: "OUTCOME_LEADS",
  };
  return legacy[o] || "OUTCOME_TRAFFIC";
}

const BUDGET_TYPE_OPTIONS: { value: "daily" | "lifetime"; label: string }[] = [
  { value: "daily", label: "Daily budget" },
  { value: "lifetime", label: "Lifetime budget" },
];

/** ISO 3166-1 alpha-2 country codes for special_ad_category_country (Meta). */
const SPECIAL_AD_CATEGORY_COUNTRIES = [
  "AC",
  "AD",
  "AE",
  "AF",
  "AG",
  "AI",
  "AL",
  "AM",
  "AN",
  "AO",
  "AQ",
  "AR",
  "AS",
  "AT",
  "AU",
  "AW",
  "AX",
  "AZ",
  "BA",
  "BB",
  "BD",
  "BE",
  "BF",
  "BG",
  "BH",
  "BI",
  "BJ",
  "BL",
  "BM",
  "BN",
  "BO",
  "BQ",
  "BR",
  "BS",
  "BT",
  "BV",
  "BW",
  "BY",
  "BZ",
  "CA",
  "CC",
  "CD",
  "CF",
  "CG",
  "CH",
  "CI",
  "CK",
  "CL",
  "CM",
  "CN",
  "CO",
  "CR",
  "CU",
  "CV",
  "CW",
  "CX",
  "CY",
  "CZ",
  "DE",
  "DJ",
  "DK",
  "DM",
  "DO",
  "DZ",
  "EC",
  "EE",
  "EG",
  "EH",
  "ER",
  "ES",
  "ET",
  "FI",
  "FJ",
  "FK",
  "FM",
  "FO",
  "FR",
  "GA",
  "GB",
  "GD",
  "GE",
  "GF",
  "GG",
  "GH",
  "GI",
  "GL",
  "GM",
  "GN",
  "GP",
  "GQ",
  "GR",
  "GS",
  "GT",
  "GU",
  "GW",
  "GY",
  "HK",
  "HM",
  "HN",
  "HR",
  "HT",
  "HU",
  "ID",
  "IE",
  "IL",
  "IM",
  "IN",
  "IO",
  "IQ",
  "IR",
  "IS",
  "IT",
  "JE",
  "JM",
  "JO",
  "JP",
  "KE",
  "KG",
  "KH",
  "KI",
  "KM",
  "KN",
  "KP",
  "KR",
  "KW",
  "KY",
  "KZ",
  "LA",
  "LB",
  "LC",
  "LI",
  "LK",
  "LR",
  "LS",
  "LT",
  "LU",
  "LV",
  "LY",
  "MA",
  "MC",
  "MD",
  "ME",
  "MF",
  "MG",
  "MH",
  "MK",
  "ML",
  "MM",
  "MN",
  "MO",
  "MP",
  "MQ",
  "MR",
  "MS",
  "MT",
  "MU",
  "MV",
  "MW",
  "MX",
  "MY",
  "MZ",
  "NA",
  "NC",
  "NE",
  "NF",
  "NG",
  "NI",
  "NL",
  "NO",
  "NP",
  "NR",
  "NU",
  "NZ",
  "OM",
  "PA",
  "PE",
  "PF",
  "PG",
  "PH",
  "PK",
  "PL",
  "PM",
  "PN",
  "PR",
  "PS",
  "PT",
  "PW",
  "PY",
  "QA",
  "RE",
  "RO",
  "RS",
  "RU",
  "RW",
  "SA",
  "SB",
  "SC",
  "SD",
  "SE",
  "SG",
  "SH",
  "SI",
  "SJ",
  "SK",
  "SL",
  "SM",
  "SN",
  "SO",
  "SR",
  "SS",
  "ST",
  "SV",
  "SX",
  "SY",
  "SZ",
  "TC",
  "TD",
  "TF",
  "TG",
  "TH",
  "TJ",
  "TK",
  "TL",
  "TM",
  "TN",
  "TO",
  "TR",
  "TT",
  "TV",
  "TW",
  "TZ",
  "UA",
  "UG",
  "UM",
  "US",
  "UY",
  "UZ",
  "VA",
  "VC",
  "VE",
  "VG",
  "VI",
  "VN",
  "VU",
  "WF",
  "WS",
  "XK",
  "YE",
  "YT",
  "ZA",
  "ZM",
  "ZW",
];

/** Country code to display label (ISO 3166-1 alpha-2). */
const SPECIAL_AD_CATEGORY_COUNTRY_LABELS: Record<string, string> = {
  AC: "Ascension Island",
  AD: "Andorra",
  AE: "United Arab Emirates",
  AF: "Afghanistan",
  AG: "Antigua and Barbuda",
  AI: "Anguilla",
  AL: "Albania",
  AM: "Armenia",
  AN: "Netherlands Antilles",
  AO: "Angola",
  AQ: "Antarctica",
  AR: "Argentina",
  AS: "American Samoa",
  AT: "Austria",
  AU: "Australia",
  AW: "Aruba",
  AX: "Åland Islands",
  AZ: "Azerbaijan",
  BA: "Bosnia and Herzegovina",
  BB: "Barbados",
  BD: "Bangladesh",
  BE: "Belgium",
  BF: "Burkina Faso",
  BG: "Bulgaria",
  BH: "Bahrain",
  BI: "Burundi",
  BJ: "Benin",
  BL: "Saint Barthélemy",
  BM: "Bermuda",
  BN: "Brunei",
  BO: "Bolivia",
  BQ: "Caribbean Netherlands",
  BR: "Brazil",
  BS: "Bahamas",
  BT: "Bhutan",
  BV: "Bouvet Island",
  BW: "Botswana",
  BY: "Belarus",
  BZ: "Belize",
  CA: "Canada",
  CC: "Cocos (Keeling) Islands",
  CD: "Democratic Republic of the Congo",
  CF: "Central African Republic",
  CG: "Republic of the Congo",
  CH: "Switzerland",
  CI: "Ivory Coast",
  CK: "Cook Islands",
  CL: "Chile",
  CM: "Cameroon",
  CN: "China",
  CO: "Colombia",
  CR: "Costa Rica",
  CU: "Cuba",
  CV: "Cape Verde",
  CW: "Curaçao",
  CX: "Christmas Island",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DE: "Germany",
  DJ: "Djibouti",
  DK: "Denmark",
  DM: "Dominica",
  DO: "Dominican Republic",
  DZ: "Algeria",
  EC: "Ecuador",
  EE: "Estonia",
  EG: "Egypt",
  EH: "Western Sahara",
  ER: "Eritrea",
  ES: "Spain",
  ET: "Ethiopia",
  FI: "Finland",
  FJ: "Fiji",
  FK: "Falkland Islands",
  FM: "Micronesia",
  FO: "Faroe Islands",
  FR: "France",
  GA: "Gabon",
  GB: "United Kingdom",
  GD: "Grenada",
  GE: "Georgia",
  GF: "French Guiana",
  GG: "Guernsey",
  GH: "Ghana",
  GI: "Gibraltar",
  GL: "Greenland",
  GM: "Gambia",
  GN: "Guinea",
  GP: "Guadeloupe",
  GQ: "Equatorial Guinea",
  GR: "Greece",
  GS: "South Georgia and the South Sandwich Islands",
  GT: "Guatemala",
  GU: "Guam",
  GW: "Guinea-Bissau",
  GY: "Guyana",
  HK: "Hong Kong",
  HM: "Heard Island and McDonald Islands",
  HN: "Honduras",
  HR: "Croatia",
  HT: "Haiti",
  HU: "Hungary",
  ID: "Indonesia",
  IE: "Ireland",
  IL: "Israel",
  IM: "Isle of Man",
  IN: "India",
  IO: "British Indian Ocean Territory",
  IQ: "Iraq",
  IR: "Iran",
  IS: "Iceland",
  IT: "Italy",
  JE: "Jersey",
  JM: "Jamaica",
  JO: "Jordan",
  JP: "Japan",
  KE: "Kenya",
  KG: "Kyrgyzstan",
  KH: "Cambodia",
  KI: "Kiribati",
  KM: "Comoros",
  KN: "Saint Kitts and Nevis",
  KP: "North Korea",
  KR: "South Korea",
  KW: "Kuwait",
  KY: "Cayman Islands",
  KZ: "Kazakhstan",
  LA: "Laos",
  LB: "Lebanon",
  LC: "Saint Lucia",
  LI: "Liechtenstein",
  LK: "Sri Lanka",
  LR: "Liberia",
  LS: "Lesotho",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  LY: "Libya",
  MA: "Morocco",
  MC: "Monaco",
  MD: "Moldova",
  ME: "Montenegro",
  MF: "Saint Martin",
  MG: "Madagascar",
  MH: "Marshall Islands",
  MK: "North Macedonia",
  ML: "Mali",
  MM: "Myanmar",
  MN: "Mongolia",
  MO: "Macau",
  MP: "Northern Mariana Islands",
  MQ: "Martinique",
  MR: "Mauritania",
  MS: "Montserrat",
  MT: "Malta",
  MU: "Mauritius",
  MV: "Maldives",
  MW: "Malawi",
  MX: "Mexico",
  MY: "Malaysia",
  MZ: "Mozambique",
  NA: "Namibia",
  NC: "New Caledonia",
  NE: "Niger",
  NF: "Norfolk Island",
  NG: "Nigeria",
  NI: "Nicaragua",
  NL: "Netherlands",
  NO: "Norway",
  NP: "Nepal",
  NR: "Nauru",
  NU: "Niue",
  NZ: "New Zealand",
  OM: "Oman",
  PA: "Panama",
  PE: "Peru",
  PF: "French Polynesia",
  PG: "Papua New Guinea",
  PH: "Philippines",
  PK: "Pakistan",
  PL: "Poland",
  PM: "Saint Pierre and Miquelon",
  PN: "Pitcairn Islands",
  PR: "Puerto Rico",
  PS: "Palestine",
  PT: "Portugal",
  PW: "Palau",
  PY: "Paraguay",
  QA: "Qatar",
  RE: "Réunion",
  RO: "Romania",
  RS: "Serbia",
  RU: "Russia",
  RW: "Rwanda",
  SA: "Saudi Arabia",
  SB: "Solomon Islands",
  SC: "Seychelles",
  SD: "Sudan",
  SE: "Sweden",
  SG: "Singapore",
  SH: "Saint Helena, Ascension and Tristan da Cunha",
  SI: "Slovenia",
  SJ: "Svalbard and Jan Mayen",
  SK: "Slovakia",
  SL: "Sierra Leone",
  SM: "San Marino",
  SN: "Senegal",
  SO: "Somalia",
  SR: "Suriname",
  SS: "South Sudan",
  ST: "São Tomé and Príncipe",
  SV: "El Salvador",
  SX: "Sint Maarten",
  SY: "Syria",
  SZ: "Eswatini",
  TC: "Turks and Caicos Islands",
  TD: "Chad",
  TF: "French Southern and Antarctic Lands",
  TG: "Togo",
  TH: "Thailand",
  TJ: "Tajikistan",
  TK: "Tokelau",
  TL: "Timor-Leste",
  TM: "Turkmenistan",
  TN: "Tunisia",
  TO: "Tonga",
  TR: "Turkey",
  TT: "Trinidad and Tobago",
  TV: "Tuvalu",
  TW: "Taiwan",
  TZ: "Tanzania",
  UA: "Ukraine",
  UG: "Uganda",
  UM: "United States Minor Outlying Islands",
  US: "United States",
  UY: "Uruguay",
  UZ: "Uzbekistan",
  VA: "Vatican City",
  VC: "Saint Vincent and the Grenadines",
  VE: "Venezuela",
  VG: "British Virgin Islands",
  VI: "United States Virgin Islands",
  VN: "Vietnam",
  VU: "Vanuatu",
  WF: "Wallis and Futuna",
  WS: "Samoa",
  XK: "Kosovo",
  YE: "Yemen",
  YT: "Mayotte",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe",
};

export interface MetaProfileOption {
  /** Meta ad account id we will send as profile_id (e.g. "act_316035998" or "316035998"). */
  id: string;
  name: string;
  account_id?: string;
  ad_account_id?: string;
}

export interface CreateMetaCampaignPanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
  /** Same form as create; save sends only changed fields (PATCH). */
  editCampaignId?: string | null;
}

const inputClass = "campaign-input w-full";

export const CreateMetaCampaignPanel: React.FC<
  CreateMetaCampaignPanelProps
> = ({ channelId, onSuccess, onClose, editCampaignId = null }) => {
  const isEditMode = Boolean(editCampaignId && String(editCampaignId).trim());
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [status, setStatus] = useState<MetaCampaignStatus>("PAUSED");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [lifetimeBudget, setLifetimeBudget] = useState<string>("");
  const [budgetMode, setBudgetMode] = useState<"campaign" | "adset">(
    "campaign",
  );
  const [adsetBudgetSharingEnabled, setAdsetBudgetSharingEnabled] =
    useState<boolean>(true);
  const [specialAdCategories, setSpecialAdCategories] = useState("NONE");
  const [specialAdCategoryCountry, setSpecialAdCategoryCountry] = useState<
    string[]
  >([]);
  const [buyingType, setBuyingType] = useState("AUCTION");
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [profileId, setProfileId] = useState<string | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editDetailLoading, setEditDetailLoading] = useState(false);
  const [editDetail, setEditDetail] = useState<{
    campaign: Record<string, unknown>;
  } | null>(null);
  const [editFormReady, setEditFormReady] = useState(false);
  const [statusEditLocked, setStatusEditLocked] = useState(false);
  const [deletedStatusLabel, setDeletedStatusLabel] = useState(false);
  const editBaselineRef = useRef<{
    name: string;
    status: MetaCampaignStatus | null;
    dailyBudget: string;
    lifetimeBudget: string;
    budgetMode: "campaign" | "adset";
    budgetType: "daily" | "lifetime";
  } | null>(null);
  const editApplyKeyRef = useRef<string | null>(null);

  // Special Ad Category options can be restricted for some objectives (e.g. engagement).
  const specialAdCategoryOptions = useMemo(() => {
    // For some objectives Meta doesn’t allow Credit; hide it for those.
    if (
      objective === "OUTCOME_ENGAGEMENT" ||
      objective === "OUTCOME_TRAFFIC" ||
      objective === "OUTCOME_SALES"
    ) {
      return SPECIAL_AD_CATEGORIES.filter((opt) => opt.value !== "CREDIT");
    }
    return SPECIAL_AD_CATEGORIES;
  }, [objective]);

  // If current selection becomes invalid for the chosen objective, reset to NONE.
  useEffect(() => {
    if (
      !specialAdCategoryOptions.find((opt) => opt.value === specialAdCategories)
    ) {
      setSpecialAdCategories("NONE");
    }
  }, [objective, specialAdCategoryOptions, specialAdCategories]);

  const handleFillTest = () => {
    if (profiles.length > 0 && profileId === "") {
      setProfileId(profiles[0].id);
    }
    setName((prev) => {
      if (prev && prev.trim().length > 0) {
        return prev.trim();
      }
      return suggestedCreateCampaignName();
    });
    setObjective("OUTCOME_TRAFFIC");
    setStatus("PAUSED");
    setBuyingType("AUCTION");
    setBidStrategy("LOWEST_COST_WITHOUT_CAP");
    setBudgetMode("campaign");
    setBudgetType("daily");
    setDailyBudget((prev) => (prev && prev.trim().length > 0 ? prev : "20"));
    setLifetimeBudget("");
    setAdsetBudgetSharingEnabled(true);
    setSpecialAdCategories("NONE");
    setSpecialAdCategoryCountry((prev) => (prev.length > 0 ? prev : ["US"]));
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{
          id?: string | number;
          name?: string;
          account_id?: string;
          profileId?: string;
          profile_id?: string;
        }>;
        const mapped: MetaProfileOption[] = list
          .map((p) => {
            const rawId =
              (p.profileId && String(p.profileId).trim()) ||
              (p.profile_id && String(p.profile_id).trim()) ||
              (p.account_id && String(p.account_id).trim()) ||
              (p.id != null ? String(p.id).trim() : "");
            if (!rawId) return null;
            return {
              id: rawId,
              name: p.name || p.account_id || rawId,
              account_id: p.account_id,
            } as MetaProfileOption;
          })
          .filter((p): p is MetaProfileOption => p !== null);
        setProfiles(mapped);
        if (mapped.length > 0 && profileId === "" && !isEditMode) {
          setProfileId(mapped[0].id);
        }
      })
      .catch(() => {
        if (!cancelled) setProfiles([]);
      })
      .finally(() => {
        if (!cancelled) setProfilesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, isEditMode]);

  useEffect(() => {
    editApplyKeyRef.current = null;
    editBaselineRef.current = null;
    setEditFormReady(false);
    setStatusEditLocked(false);
    setDeletedStatusLabel(false);
  }, [editCampaignId]);

  useEffect(() => {
    if (!isEditMode || !editCampaignId) {
      setEditDetail(null);
      setEditDetailLoading(false);
      return;
    }
    let cancelled = false;
    setEditDetailLoading(true);
    setEditDetail(null);
    accountsService
      .getMetaCampaignDetail(channelId, editCampaignId)
      .then((data) => {
        if (!cancelled)
          setEditDetail(data as { campaign: Record<string, unknown> });
      })
      .catch(() => {
        if (!cancelled) setEditDetail(null);
      })
      .finally(() => {
        if (!cancelled) setEditDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEditMode, editCampaignId, channelId]);

  useEffect(() => {
    if (!isEditMode || !editDetail?.campaign) return;
    if (profilesLoading) return;
    const cid = String(editCampaignId);
    if (editApplyKeyRef.current === cid) return;

    const c = editDetail.campaign;
    const st = String(c.status || "PAUSED").toUpperCase();
    const deleted = st === "DELETED";
    setDeletedStatusLabel(deleted);
    setStatusEditLocked(deleted);

    const dd = c.daily_budget_dollars as number | null | undefined;
    const ld = c.lifetime_budget_dollars as number | null | undefined;
    const hasDaily = dd != null && dd > 0 && (ld == null || ld <= 0);
    const hasLife = ld != null && ld > 0;
    let bm: "campaign" | "adset" = "adset";
    let bt: "daily" | "lifetime" = "daily";
    let dbStr = "";
    let lbStr = "";
    if (hasDaily) {
      bm = "campaign";
      bt = "daily";
      dbStr = String(dd);
    } else if (hasLife) {
      bm = "campaign";
      bt = "lifetime";
      lbStr = String(ld);
    }

    setName(String(c.campaign_name || ""));
    setObjective(normalizeObjectiveForForm(String(c.objective || "")));
    const btRaw = String(c.buying_type || "AUCTION").toUpperCase();
    setBuyingType(btRaw === "RESERVATION" ? "RESERVATION" : "AUCTION");
    const bid = String(c.bid_strategy || "");
    setBidStrategy(
      BID_STRATEGIES.some((b) => b.value === bid)
        ? bid
        : "LOWEST_COST_WITHOUT_CAP",
    );
    const sacList = (c.special_ad_categories_list as string[]) || [];
    const firstCat = sacList.find((x) => x && String(x) !== "NONE");
    setSpecialAdCategories(firstCat ? String(firstCat) : "NONE");
    setBudgetMode(bm);
    setBudgetType(bt);
    setDailyBudget(dbStr);
    setLifetimeBudget(lbStr);
    setAdsetBudgetSharingEnabled(true);

    if (!deleted && ["ACTIVE", "PAUSED", "ARCHIVED"].includes(st)) {
      setStatus(st as MetaCampaignStatus);
    } else if (!deleted) {
      setStatus("PAUSED");
    }

    const actNorm = (s: string) => s.replace(/^act_/i, "").trim();
    const mid = actNorm(String(c.meta_ad_account_id || ""));
    const match = profiles.find(
      (p) =>
        actNorm(String(p.id)) === mid ||
        actNorm(String(p.account_id || "")) === mid,
    );
    if (match) setProfileId(match.id);
    else if (mid) setProfileId(mid.startsWith("act_") ? mid : `act_${mid}`);
    else if (profiles[0]) setProfileId(profiles[0].id);

    const statusBaseline: MetaCampaignStatus | null =
      !deleted && ["ACTIVE", "PAUSED", "ARCHIVED"].includes(st)
        ? (st as MetaCampaignStatus)
        : null;
    editBaselineRef.current = {
      name: String(c.campaign_name || "").trim(),
      status: statusBaseline,
      dailyBudget: dbStr,
      lifetimeBudget: lbStr,
      budgetMode: bm,
      budgetType: bt,
    };

    editApplyKeyRef.current = cid;
    setEditFormReady(true);
    setError(null);
  }, [isEditMode, editDetail, profilesLoading, editCampaignId, profiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Campaign name is required.");
      return;
    }

    if (isEditMode && editCampaignId) {
      const b = editBaselineRef.current;
      if (!b) {
        setError("Campaign data is not ready yet.");
        return;
      }
      const payload: UpdateMetaCampaignPayload = {};
      if (trimmedName !== b.name) payload.name = trimmedName;
      if (!statusEditLocked && b.status !== null && status !== b.status) {
        payload.status = status;
      }
      if (budgetMode === "campaign" && b.budgetMode === "campaign") {
        if (budgetType === "daily" && b.budgetType === "daily") {
          const nv = dailyBudget.trim() === "" ? NaN : Number(dailyBudget);
          const ov = b.dailyBudget.trim() === "" ? NaN : Number(b.dailyBudget);
          if (!Number.isNaN(nv) && nv !== ov) payload.daily_budget = nv;
        }
        if (budgetType === "lifetime" && b.budgetType === "lifetime") {
          const nv =
            lifetimeBudget.trim() === "" ? NaN : Number(lifetimeBudget);
          const ov =
            b.lifetimeBudget.trim() === "" ? NaN : Number(b.lifetimeBudget);
          if (!Number.isNaN(nv) && nv !== ov) payload.lifetime_budget = nv;
        }
      }
      if (Object.keys(payload).length === 0) {
        setError("No changes to save.");
        return;
      }
      setSubmitLoading(true);
      try {
        await metaCampaignsService.updateMetaCampaign(
          channelId,
          editCampaignId,
          payload,
        );
        onSuccess();
        onClose();
      } catch (err: unknown) {
        const message =
          err && typeof err === "object" && "response" in err
            ? (err as { response?: { data?: { error?: string } } }).response
                ?.data?.error
            : err instanceof Error
              ? err.message
              : "Failed to update campaign.";
        setError(String(message));
      } finally {
        setSubmitLoading(false);
      }
      return;
    }

    // Meta now requires special_ad_categories to be provided explicitly.
    // Prevent submits without a selection so we don't hit the API with a missing parameter.
    if (specialAdCategories === "NONE") {
      setError(
        "Please choose a Special Ad Category (Meta requires this parameter).",
      );
      return;
    }
    // Resolve profile_id: use selected Meta ad account id from dropdown (no numeric coercion).
    const resolvedProfileId =
      profileId && profileId !== ""
        ? String(profileId).trim()
        : profiles.length > 0 && profiles[0].id
          ? profiles[0].id
          : null;
    if (resolvedProfileId == null) {
      setError("Please select an ad account.");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload: CreateMetaCampaignPayload = {
        profile_id: resolvedProfileId,
        name: trimmedName,
        objective,
        status,
        buying_type: buyingType,
        bid_strategy: bidStrategy,
        // We already validated specialAdCategories !== "NONE", so always send a non-empty array.
        special_ad_categories: [specialAdCategories],
      };
      if (budgetMode === "campaign") {
        if (
          budgetType === "daily" &&
          dailyBudget !== "" &&
          !Number.isNaN(Number(dailyBudget))
        ) {
          payload.daily_budget = Number(dailyBudget);
        }
        if (
          budgetType === "lifetime" &&
          lifetimeBudget !== "" &&
          !Number.isNaN(Number(lifetimeBudget))
        ) {
          payload.lifetime_budget = Number(lifetimeBudget);
        }
      } else {
        // Ad set budget mode: do not send campaign budget, but Meta requires this flag.
        payload.is_adset_budget_sharing_enabled = adsetBudgetSharingEnabled;
      }
      if (specialAdCategoryCountry.length > 0) {
        payload.special_ad_category_country = specialAdCategoryCountry;
      }
      await metaCampaignsService.createMetaCampaign(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : err instanceof Error
            ? err.message
            : "Failed to create campaign.";
      setError(String(message));
    } finally {
      setSubmitLoading(false);
    }
  };

  const showMainForm = isEditMode
    ? Boolean(editDetail && !profilesLoading && editFormReady)
    : profiles.length > 0 && !profilesLoading;

  const profileDropdownOptions =
    isEditMode && profiles.length === 0 && profileId
      ? [
          {
            value: profileId,
            label: String(profileId),
          },
        ]
      : profiles.map((p) => ({
          value: p.id,
          label: p.name || p.account_id || `Account ${p.id}`,
        }));

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            {isEditMode ? "Edit Meta Campaign" : "Create Meta Campaign"}
          </h2>
        </div>

        {isEditMode && editDetailLoading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading campaign..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : isEditMode && !editDetailLoading && !editDetail ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                Campaign not found or could not be loaded.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Close
              </button>
            </div>
          </>
        ) : !isEditMode && profilesLoading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading ad accounts..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : isEditMode && editDetail && profilesLoading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading ad accounts..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : !isEditMode && profiles.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad accounts found. Connect and save ad accounts in channel
                settings first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : showMainForm ? (
          <>
            <div className="p-4 border-b border-gray-200">
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">
                  {error}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                  Campaign details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label-small">Ad account *</label>
                    <Dropdown<string>
                      options={profileDropdownOptions}
                      value={profileId === "" ? undefined : profileId}
                      placeholder="Select ad account"
                      onChange={(val) => setProfileId(val)}
                      buttonClassName={inputClass}
                      disabled={isEditMode}
                    />
                  </div>

                  {/* Campaign name */}
                  <div>
                    <label className="form-label-small">Campaign name *</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Summer Sale"
                        className={inputClass}
                      />
                    </div>
                  </div>

                  {/* Objective */}
                  <div>
                    <label className="form-label-small">Objective</label>
                    <Dropdown
                      options={META_OBJECTIVES.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={objective}
                      placeholder="Select objective"
                      onChange={(val) => setObjective(val)}
                      buttonClassName={inputClass}
                      disabled={isEditMode}
                    />
                    <p className="text-[11px] text-[#556179] mt-1">
                      {META_OBJECTIVES.find((o) => o.value === objective)
                        ?.caption ?? ""}
                    </p>
                  </div>

                  {/* Buying type */}
                  <div>
                    <label className="form-label-small">Buying type</label>
                    <Dropdown
                      options={BUYING_TYPES.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      value={buyingType}
                      placeholder="Select buying type"
                      onChange={(val) => setBuyingType(val)}
                      buttonClassName={inputClass}
                      disabled={isEditMode}
                    />
                    <p className="text-[11px] text-[#556179] mt-1">
                      {BUYING_TYPES.find((opt) => opt.value === buyingType)
                        ?.caption ?? ""}
                    </p>
                  </div>

                  {/* Special ad categories */}
                  <div>
                    <label className="form-label-small">
                      Special ad categories
                    </label>
                    <Dropdown
                      options={specialAdCategoryOptions.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      value={specialAdCategories}
                      placeholder="Select category"
                      onChange={(val) => setSpecialAdCategories(val)}
                      buttonClassName={inputClass}
                      disabled={isEditMode}
                    />
                    {(() => {
                      const caption = specialAdCategoryOptions.find(
                        (opt) => opt.value === specialAdCategories,
                      )?.caption;
                      return caption ? (
                        <p className="text-[11px] text-[#556179] mt-1">
                          {caption}
                        </p>
                      ) : null;
                    })()}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="form-label-small">Status</label>
                    {deletedStatusLabel ? (
                      <p className="text-[12px] text-[#556179] py-2">
                        Deleted — status cannot be changed.
                      </p>
                    ) : (
                      <Dropdown<MetaCampaignStatus>
                        options={STATUS_OPTIONS}
                        value={status}
                        placeholder="Select status"
                        onChange={(val) => setStatus(val)}
                        buttonClassName={inputClass}
                        disabled={isEditMode && statusEditLocked}
                      />
                    )}
                  </div>

                  {/* Budget mode and campaign-level budget */}
                  <div className="md:col-span-2">
                    <label className="form-label-small">Budget strategy</label>
                    <div className="flex flex-col gap-2 text-[12px] text-[#556179]">
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="meta-budget-mode"
                          className="mt-[2px]"
                          checked={budgetMode === "campaign"}
                          onChange={() => setBudgetMode("campaign")}
                          disabled={isEditMode}
                        />
                        <span>
                          <span className="font-semibold">
                            Use campaign budget
                          </span>{" "}
                          (Advantage+ campaign budget / automatic distribution).
                          Set a single daily or lifetime budget at the campaign
                          level; Meta will allocate spend across ad sets.
                        </span>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="meta-budget-mode"
                          className="mt-[2px]"
                          checked={budgetMode === "adset"}
                          onChange={() => setBudgetMode("adset")}
                          disabled={isEditMode}
                        />
                        <span>
                          <span className="font-semibold">
                            Set budgets per ad set
                          </span>{" "}
                          (Ad set–level budgets). No campaign budget; each ad
                          set will have its own daily or lifetime budget, and
                          you can optionally enable budget sharing.
                        </span>
                      </label>
                    </div>
                  </div>

                  {budgetMode === "campaign" && (
                    <>
                      <div>
                        <label className="form-label-small">Budget type</label>
                        <Dropdown<"daily" | "lifetime">
                          options={BUDGET_TYPE_OPTIONS}
                          value={budgetType}
                          placeholder="Select budget type"
                          onChange={(val) => setBudgetType(val)}
                          buttonClassName={inputClass}
                          disabled={isEditMode}
                        />
                      </div>

                      <div>
                        <label className="form-label-small">
                          {budgetType === "daily"
                            ? "Daily budget (optional, in account currency)"
                            : "Lifetime budget (optional, in account currency)"}
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={
                            budgetType === "daily"
                              ? dailyBudget
                              : lifetimeBudget
                          }
                          onChange={(e) =>
                            budgetType === "daily"
                              ? setDailyBudget(e.target.value)
                              : setLifetimeBudget(e.target.value)
                          }
                          placeholder="e.g. 20.00"
                          className={inputClass}
                        />
                      </div>
                    </>
                  )}

                  {budgetMode === "adset" && (
                    <div>
                      <label className="form-label-small">
                        Ad set budget sharing
                      </label>
                      <label className="flex items-start gap-2 text-[12px] text-[#556179] cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-[2px]"
                          checked={adsetBudgetSharingEnabled}
                          onChange={(e) =>
                            setAdsetBudgetSharingEnabled(e.target.checked)
                          }
                          disabled={isEditMode}
                        />
                        <span>
                          Enable Ad Set Budget Sharing (recommended). Allows
                          each ad set to share up to 20% of its daily budget
                          with better-performing ad sets in this campaign.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Bid strategy */}
                  <div>
                    <label className="form-label-small">Bid strategy</label>
                    <Dropdown
                      options={BID_STRATEGIES.map((opt) => ({
                        value: opt.value,
                        label: opt.label,
                      }))}
                      value={bidStrategy}
                      placeholder="Select bid strategy"
                      onChange={(val) => setBidStrategy(val)}
                      buttonClassName={inputClass}
                      disabled={isEditMode}
                    />
                    <p className="text-[11px] text-[#556179] mt-1">
                      {BID_STRATEGIES.find((opt) => opt.value === bidStrategy)
                        ?.caption ?? ""}
                    </p>
                  </div>

                  {/* Special ad category country */}
                  <div className="md:col-span-2">
                    <label className="form-label-small">
                      Special ad category country (optional)
                    </label>
                    <Dropdown<string>
                      options={SPECIAL_AD_CATEGORY_COUNTRIES.filter(
                        (code) => !specialAdCategoryCountry.includes(code),
                      ).map((code) => ({
                        value: code,
                        label: SPECIAL_AD_CATEGORY_COUNTRY_LABELS[code] ?? code,
                      }))}
                      value=""
                      onChange={(value) => {
                        if (!specialAdCategoryCountry.includes(value)) {
                          setSpecialAdCategoryCountry([
                            ...specialAdCategoryCountry,
                            value,
                          ]);
                        }
                      }}
                      placeholder="Select countries"
                      buttonClassName={inputClass}
                      searchable={true}
                      searchPlaceholder="Search countries..."
                      emptyMessage="No countries available"
                      disabled={isEditMode}
                    />
                    {specialAdCategoryCountry.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {specialAdCategoryCountry.map((code) => (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                          >
                            {SPECIAL_AD_CATEGORY_COUNTRY_LABELS[code] ?? code}
                            <button
                              type="button"
                              onClick={() => {
                                setSpecialAdCategoryCountry(
                                  specialAdCategoryCountry.filter(
                                    (c) => c !== code,
                                  ),
                                );
                              }}
                              className="hover:text-red-200"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {specialAdCategoryCountry.length > 0 && (
                      <p className="text-[11px] text-[#556179] mt-1">
                        {specialAdCategoryCountry.length} selected.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              {!isEditMode && (
                <button
                  type="button"
                  onClick={handleFillTest}
                  className="inline-flex items-center px-3 py-1.5 rounded-md border border-dashed border-forest-f40 text-[11px] text-forest-f40 hover:bg-forest-f10"
                >
                  Fill test values
                </button>
              )}
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
              >
                {submitLoading
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save changes"
                    : "Create campaign"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Preparing form..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
