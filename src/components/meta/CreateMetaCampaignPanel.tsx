import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { metaCampaignsService } from "../../services/meta";
import type { CreateMetaCampaignPayload, MetaCampaignStatus } from "../../types/meta";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";

const META_OBJECTIVES: { value: string; label: string; caption: string }[] = [
  { value: "OUTCOME_AWARENESS", label: "Awareness", caption: "Show your ads to people who are most likely to remember them." },
  { value: "OUTCOME_TRAFFIC", label: "Traffic", caption: "Send people to a destination, like your website, app, Instagram profile or Facebook event." },
  { value: "OUTCOME_ENGAGEMENT", label: "Engagement", caption: "Get more messages, purchases through messaging, video views, interactions, Page likes or event responses." },
  { value: "OUTCOME_LEADS", label: "Leads", caption: "Collect leads for your business or brand." },
  { value: "OUTCOME_APP_PROMOTION", label: "App Promotion", caption: "Find new people to install your app and continue using it." },
  { value: "OUTCOME_SALES", label: "Sales", caption: "Find people likely to purchase your product or service." },
];

const SPECIAL_AD_CATEGORIES: { value: string; label: string; caption: string }[] = [
  { value: "NONE", label: "None", caption: "" },
  { value: "CREDIT", label: "Financial products and services", caption: "Ads for credit cards, long-term financing, checking and saving accounts, investment services, insurance services, or other related financial opportunities." },
  { value: "EMPLOYMENT", label: "Employment", caption: "Ads for job offers, internships, professional certification programs or other related opportunities." },
  { value: "HOUSING", label: "Housing", caption: "Ads for real estate listings, homeowners insurance, mortgage loans or other related opportunities." },
  { value: "ISSUES_ELECTIONS_POLITICS", label: "Social Issues, elections or politics", caption: "Ads about social issues (such as economy, or civil and social rights), elections, or political figures or campaigns." },
];

const BUYING_TYPES: { value: string; label: string; caption: string }[] = [
  { value: "AUCTION", label: "Auction", caption: "Buy in real-time with cost effective bidding." },
  { value: "RESERVATION", label: "Reservation", caption: "Buy in advance for more predictable outcomes." },
];

const BID_STRATEGIES: { value: string; label: string; caption: string }[] = [
  { value: "LOWEST_COST_WITHOUT_CAP", label: "Highest Volume", caption: "Get the most results for your budget." },
  { value: "LOWEST_COST_WITH_BID_CAP", label: "Bid cap", caption: "Set the highest you want to bid in any auction." },
  { value: "COST_CAP", label: "Cost per result goal", caption: "Aim for a certain cost per result while maximizing the volume of results." },
  { value: "LOWEST_COST_WITH_MIN_ROAS", label: "Minimum ROAS", caption: "Used to find the highest purchase value for your budget." },
];

const STATUS_OPTIONS: { value: MetaCampaignStatus; label: string }[] = [
  { value: "PAUSED", label: "Paused" },
  { value: "ACTIVE", label: "Active" },
  { value: "ARCHIVED", label: "Archived" },
];

const BUDGET_TYPE_OPTIONS: { value: "daily" | "lifetime"; label: string }[] = [
  { value: "daily", label: "Daily budget" },
  { value: "lifetime", label: "Lifetime budget" },
];

/** ISO 3166-1 alpha-2 country codes for special_ad_category_country (Meta). */
const SPECIAL_AD_CATEGORY_COUNTRIES = [
  "AC", "AD", "AE", "AF", "AG", "AI", "AL", "AM", "AN", "AO", "AQ", "AR", "AS", "AT", "AU", "AW", "AX", "AZ",
  "BA", "BB", "BD", "BE", "BF", "BG", "BH", "BI", "BJ", "BL", "BM", "BN", "BO", "BQ", "BR", "BS", "BT", "BV", "BW", "BY", "BZ",
  "CA", "CC", "CD", "CF", "CG", "CH", "CI", "CK", "CL", "CM", "CN", "CO", "CR", "CU", "CV", "CW", "CX", "CY", "CZ",
  "DE", "DJ", "DK", "DM", "DO", "DZ",
  "EC", "EE", "EG", "EH", "ER", "ES", "ET",
  "FI", "FJ", "FK", "FM", "FO", "FR",
  "GA", "GB", "GD", "GE", "GF", "GG", "GH", "GI", "GL", "GM", "GN", "GP", "GQ", "GR", "GS", "GT", "GU", "GW", "GY",
  "HK", "HM", "HN", "HR", "HT", "HU",
  "ID", "IE", "IL", "IM", "IN", "IO", "IQ", "IR", "IS", "IT",
  "JE", "JM", "JO", "JP",
  "KE", "KG", "KH", "KI", "KM", "KN", "KP", "KR", "KW", "KY", "KZ",
  "LA", "LB", "LC", "LI", "LK", "LR", "LS", "LT", "LU", "LV", "LY",
  "MA", "MC", "MD", "ME", "MF", "MG", "MH", "MK", "ML", "MM", "MN", "MO", "MP", "MQ", "MR", "MS", "MT", "MU", "MV", "MW", "MX", "MY", "MZ",
  "NA", "NC", "NE", "NF", "NG", "NI", "NL", "NO", "NP", "NR", "NU", "NZ",
  "OM",
  "PA", "PE", "PF", "PG", "PH", "PK", "PL", "PM", "PN", "PR", "PS", "PT", "PW", "PY",
  "QA",
  "RE", "RO", "RS", "RU", "RW",
  "SA", "SB", "SC", "SD", "SE", "SG", "SH", "SI", "SJ", "SK", "SL", "SM", "SN", "SO", "SR", "SS", "ST", "SV", "SX", "SY", "SZ",
  "TC", "TD", "TF", "TG", "TH", "TJ", "TK", "TL", "TM", "TN", "TO", "TR", "TT", "TV", "TW", "TZ",
  "UA", "UG", "UM", "US", "UY", "UZ",
  "VA", "VC", "VE", "VG", "VI", "VN", "VU",
  "WF", "WS",
  "XK",
  "YE", "YT",
  "ZA", "ZM", "ZW",
];

/** Country code to display label (ISO 3166-1 alpha-2). */
const SPECIAL_AD_CATEGORY_COUNTRY_LABELS: Record<string, string> = {
  AC: "Ascension Island", AD: "Andorra", AE: "United Arab Emirates", AF: "Afghanistan", AG: "Antigua and Barbuda",
  AI: "Anguilla", AL: "Albania", AM: "Armenia", AN: "Netherlands Antilles", AO: "Angola", AQ: "Antarctica",
  AR: "Argentina", AS: "American Samoa", AT: "Austria", AU: "Australia", AW: "Aruba", AX: "Åland Islands",
  AZ: "Azerbaijan", BA: "Bosnia and Herzegovina", BB: "Barbados", BD: "Bangladesh", BE: "Belgium", BF: "Burkina Faso",
  BG: "Bulgaria", BH: "Bahrain", BI: "Burundi", BJ: "Benin", BL: "Saint Barthélemy", BM: "Bermuda", BN: "Brunei",
  BO: "Bolivia", BQ: "Caribbean Netherlands", BR: "Brazil", BS: "Bahamas", BT: "Bhutan", BV: "Bouvet Island",
  BW: "Botswana", BY: "Belarus", BZ: "Belize", CA: "Canada", CC: "Cocos (Keeling) Islands", CD: "Democratic Republic of the Congo",
  CF: "Central African Republic", CG: "Republic of the Congo", CH: "Switzerland", CI: "Ivory Coast", CK: "Cook Islands",
  CL: "Chile", CM: "Cameroon", CN: "China", CO: "Colombia", CR: "Costa Rica", CU: "Cuba", CV: "Cape Verde",
  CW: "Curaçao", CX: "Christmas Island", CY: "Cyprus", CZ: "Czech Republic", DE: "Germany", DJ: "Djibouti",
  DK: "Denmark", DM: "Dominica", DO: "Dominican Republic", DZ: "Algeria", EC: "Ecuador", EE: "Estonia",
  EG: "Egypt", EH: "Western Sahara", ER: "Eritrea", ES: "Spain", ET: "Ethiopia", FI: "Finland", FJ: "Fiji",
  FK: "Falkland Islands", FM: "Micronesia", FO: "Faroe Islands", FR: "France", GA: "Gabon", GB: "United Kingdom",
  GD: "Grenada", GE: "Georgia", GF: "French Guiana", GG: "Guernsey", GH: "Ghana", GI: "Gibraltar", GL: "Greenland",
  GM: "Gambia", GN: "Guinea", GP: "Guadeloupe", GQ: "Equatorial Guinea", GR: "Greece", GS: "South Georgia and the South Sandwich Islands",
  GT: "Guatemala", GU: "Guam", GW: "Guinea-Bissau", GY: "Guyana", HK: "Hong Kong", HM: "Heard Island and McDonald Islands",
  HN: "Honduras", HR: "Croatia", HT: "Haiti", HU: "Hungary", ID: "Indonesia", IE: "Ireland", IL: "Israel",
  IM: "Isle of Man", IN: "India", IO: "British Indian Ocean Territory", IQ: "Iraq", IR: "Iran", IS: "Iceland",
  IT: "Italy", JE: "Jersey", JM: "Jamaica", JO: "Jordan", JP: "Japan", KE: "Kenya", KG: "Kyrgyzstan", KH: "Cambodia",
  KI: "Kiribati", KM: "Comoros", KN: "Saint Kitts and Nevis", KP: "North Korea", KR: "South Korea", KW: "Kuwait",
  KY: "Cayman Islands", KZ: "Kazakhstan", LA: "Laos", LB: "Lebanon", LC: "Saint Lucia", LI: "Liechtenstein",
  LK: "Sri Lanka", LR: "Liberia", LS: "Lesotho", LT: "Lithuania", LU: "Luxembourg", LV: "Latvia", LY: "Libya",
  MA: "Morocco", MC: "Monaco", MD: "Moldova", ME: "Montenegro", MF: "Saint Martin", MG: "Madagascar", MH: "Marshall Islands",
  MK: "North Macedonia", ML: "Mali", MM: "Myanmar", MN: "Mongolia", MO: "Macau", MP: "Northern Mariana Islands",
  MQ: "Martinique", MR: "Mauritania", MS: "Montserrat", MT: "Malta", MU: "Mauritius", MV: "Maldives", MW: "Malawi",
  MX: "Mexico", MY: "Malaysia", MZ: "Mozambique", NA: "Namibia", NC: "New Caledonia", NE: "Niger", NF: "Norfolk Island",
  NG: "Nigeria", NI: "Nicaragua", NL: "Netherlands", NO: "Norway", NP: "Nepal", NR: "Nauru", NU: "Niue",
  NZ: "New Zealand", OM: "Oman", PA: "Panama", PE: "Peru", PF: "French Polynesia", PG: "Papua New Guinea",
  PH: "Philippines", PK: "Pakistan", PL: "Poland", PM: "Saint Pierre and Miquelon", PN: "Pitcairn Islands",
  PR: "Puerto Rico", PS: "Palestine", PT: "Portugal", PW: "Palau", PY: "Paraguay", QA: "Qatar", RE: "Réunion",
  RO: "Romania", RS: "Serbia", RU: "Russia", RW: "Rwanda", SA: "Saudi Arabia", SB: "Solomon Islands", SC: "Seychelles",
  SD: "Sudan", SE: "Sweden", SG: "Singapore", SH: "Saint Helena, Ascension and Tristan da Cunha", SI: "Slovenia",
  SJ: "Svalbard and Jan Mayen", SK: "Slovakia", SL: "Sierra Leone", SM: "San Marino", SN: "Senegal", SO: "Somalia",
  SR: "Suriname", SS: "South Sudan", ST: "São Tomé and Príncipe", SV: "El Salvador", SX: "Sint Maarten", SY: "Syria",
  SZ: "Eswatini", TC: "Turks and Caicos Islands", TD: "Chad", TF: "French Southern and Antarctic Lands", TG: "Togo",
  TH: "Thailand", TJ: "Tajikistan", TK: "Tokelau", TL: "Timor-Leste", TM: "Turkmenistan", TN: "Tunisia", TO: "Tonga",
  TR: "Turkey", TT: "Trinidad and Tobago", TV: "Tuvalu", TW: "Taiwan", TZ: "Tanzania", UA: "Ukraine", UG: "Uganda",
  UM: "United States Minor Outlying Islands", US: "United States", UY: "Uruguay", UZ: "Uzbekistan", VA: "Vatican City",
  VC: "Saint Vincent and the Grenadines", VE: "Venezuela", VG: "British Virgin Islands", VI: "United States Virgin Islands",
  VN: "Vietnam", VU: "Vanuatu", WF: "Wallis and Futuna", WS: "Samoa", XK: "Kosovo", YE: "Yemen", YT: "Mayotte",
  ZA: "South Africa", ZM: "Zambia", ZW: "Zimbabwe",
};

export interface MetaProfileOption {
  id: number;
  name: string;
  account_id?: string;
  ad_account_id?: string;
}

export interface CreateMetaCampaignPanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass =
  "campaign-input w-full";

export const CreateMetaCampaignPanel: React.FC<CreateMetaCampaignPanelProps> = ({
  channelId,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("OUTCOME_TRAFFIC");
  const [status, setStatus] = useState<MetaCampaignStatus>("PAUSED");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [lifetimeBudget, setLifetimeBudget] = useState<string>("");
  const [specialAdCategories, setSpecialAdCategories] = useState("NONE");
  const [specialAdCategoryCountry, setSpecialAdCategoryCountry] = useState<string[]>([]);
  const [buyingType, setBuyingType] = useState("AUCTION");
  const [bidStrategy, setBidStrategy] = useState("LOWEST_COST_WITHOUT_CAP");
  const [profileId, setProfileId] = useState<number | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{ id?: number; name?: string; account_id?: string }>;
        const withId = list.filter((p) => p.id != null) as MetaProfileOption[];
        setProfiles(withId);
        if (withId.length > 0 && profileId === "") {
          setProfileId(withId[0].id);
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
  }, [channelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (profileId === "" || profileId == null) {
      setError("Please select an ad account.");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload: CreateMetaCampaignPayload = {
        profile_id: Number(profileId),
        name: name.trim(),
        objective,
        status,
        buying_type: buyingType,
        bid_strategy: bidStrategy,
        special_ad_categories: specialAdCategories === "NONE" ? [] : [specialAdCategories],
      };
      if (budgetType === "daily" && dailyBudget !== "" && !Number.isNaN(Number(dailyBudget))) {
        payload.daily_budget = Number(dailyBudget);
      }
      if (budgetType === "lifetime" && lifetimeBudget !== "" && !Number.isNaN(Number(lifetimeBudget))) {
        payload.lifetime_budget = Number(lifetimeBudget);
      }
      if (specialAdCategoryCountry.length > 0) {
        payload.special_ad_category_country = specialAdCategoryCountry;
      }
      await metaCampaignsService.createMetaCampaign(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : err instanceof Error
          ? err.message
          : "Failed to create campaign.";
      setError(String(message));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Meta Campaign
          </h2>
        </div>

        {profilesLoading ? (
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
        ) : profiles.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad accounts found. Connect and save ad accounts in channel settings first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : (
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
                    <Dropdown<number>
                      options={profiles.map((p) => ({
                        value: p.id,
                        label: p.name || p.account_id || `Account ${p.id}`,
                      }))}
                      value={profileId === "" ? undefined : profileId}
                      placeholder="Select ad account"
                      onChange={(val) => setProfileId(val)}
                      buttonClassName={inputClass}
                    />
                  </div>

                  {/* Campaign name */}
                  <div>
                    <label className="form-label-small">Campaign name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Summer Sale"
                      className={inputClass}
                    />
                  </div>

                  {/* Objective */}
                  <div>
                    <label className="form-label-small">Objective</label>
                    <Dropdown
                      options={META_OBJECTIVES.map((o) => ({ value: o.value, label: o.label }))}
                      value={objective}
                      placeholder="Select objective"
                      onChange={(val) => setObjective(val)}
                      buttonClassName={inputClass}
                    />
                    <p className="text-[11px] text-[#556179] mt-1">
                      {META_OBJECTIVES.find((o) => o.value === objective)?.caption ?? ""}
                    </p>
                  </div>

                  {/* Buying type */}
                  <div>
                    <label className="form-label-small">Buying type</label>
                    <Dropdown
                      options={BUYING_TYPES.map((opt) => ({ value: opt.value, label: opt.label }))}
                      value={buyingType}
                      placeholder="Select buying type"
                      onChange={(val) => setBuyingType(val)}
                      buttonClassName={inputClass}
                    />
                    <p className="text-[11px] text-[#556179] mt-1">
                      {BUYING_TYPES.find((opt) => opt.value === buyingType)?.caption ?? ""}
                    </p>
                  </div>

                  {/* Special ad categories */}
                  <div>
                    <label className="form-label-small">Special ad categories</label>
                    <Dropdown
                      options={SPECIAL_AD_CATEGORIES.map((opt) => ({ value: opt.value, label: opt.label }))}
                      value={specialAdCategories}
                      placeholder="Select category"
                      onChange={(val) => setSpecialAdCategories(val)}
                      buttonClassName={inputClass}
                    />
                    {(() => {
                      const caption = SPECIAL_AD_CATEGORIES.find((opt) => opt.value === specialAdCategories)?.caption;
                      return caption ? <p className="text-[11px] text-[#556179] mt-1">{caption}</p> : null;
                    })()}
                  </div>

                  {/* Status */}
                  <div>
                    <label className="form-label-small">Status</label>
                    <Dropdown<MetaCampaignStatus>
                      options={STATUS_OPTIONS}
                      value={status}
                      placeholder="Select status"
                      onChange={(val) => setStatus(val)}
                      buttonClassName={inputClass}
                    />
                  </div>

                  {/* Budget type */}
                  <div>
                    <label className="form-label-small">Budget type</label>
                    <Dropdown<"daily" | "lifetime">
                      options={BUDGET_TYPE_OPTIONS}
                      value={budgetType}
                      placeholder="Select budget type"
                      onChange={(val) => setBudgetType(val)}
                      buttonClassName={inputClass}
                    />
                  </div>

                  {/* Daily budget */}
                  <div>
                    <label className="form-label-small">
                      {budgetType === "daily" ? "Daily budget (optional, in account currency)" : "Lifetime budget (optional, in account currency)"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={budgetType === "daily" ? dailyBudget : lifetimeBudget}
                      onChange={(e) => (budgetType === "daily" ? setDailyBudget(e.target.value) : setLifetimeBudget(e.target.value))}
                      placeholder="e.g. 20.00"
                      className={inputClass}
                    />
                  </div>

                  {/* Bid strategy */}
                  <div>
                    <label className="form-label-small">Bid strategy</label>
                    <Dropdown
                      options={BID_STRATEGIES.map((opt) => ({ value: opt.value, label: opt.label }))}
                      value={bidStrategy}
                      placeholder="Select bid strategy"
                      onChange={(val) => setBidStrategy(val)}
                      buttonClassName={inputClass}
                    />
                    <p className="text-[11px] text-[#556179] mt-1">
                      {BID_STRATEGIES.find((opt) => opt.value === bidStrategy)?.caption ?? ""}
                    </p>
                  </div>

                  {/* Special ad category country */}
                  <div className="md:col-span-2">
                    <label className="form-label-small">Special ad category country (optional)</label>
                    <Dropdown<string>
                      options={SPECIAL_AD_CATEGORY_COUNTRIES.filter(
                        (code) => !specialAdCategoryCountry.includes(code)
                      ).map((code) => ({
                        value: code,
                        label: SPECIAL_AD_CATEGORY_COUNTRY_LABELS[code] ?? code,
                      }))}
                      value=""
                      onChange={(value) => {
                        if (!specialAdCategoryCountry.includes(value)) {
                          setSpecialAdCategoryCountry([...specialAdCategoryCountry, value]);
                        }
                      }}
                      placeholder="Select countries"
                      buttonClassName={inputClass}
                      searchable={true}
                      searchPlaceholder="Search countries..."
                      emptyMessage="No countries available"
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
                                setSpecialAdCategoryCountry(specialAdCategoryCountry.filter((c) => c !== code));
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
              <button
                type="button"
                onClick={onClose}
                className="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
              >
                {submitLoading ? "Creating..." : "Create campaign"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
