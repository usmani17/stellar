import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { metaAdSetsService } from "../../services/meta";
import type {
  CreateMetaAdSetPayload,
  MetaAdSetStatus,
  MetaTargetingSpec,
} from "../../types/meta";
import { META_COUNTRY_CODES, META_COUNTRY_LABELS } from "./metaCountryCodes";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";

export interface CreateMetaAdSetPanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
  /** Ad account (profile) ID from the campaign. Required when creating from campaign context. */
  profileId: number;
  /** When provided (e.g. from campaign detail), pre-select this campaign and hide campaign dropdown */
  campaignId?: string;
  /** When provided, filters destination_type options by campaign objective (e.g. OUTCOME_TRAFFIC, OUTCOME_LEADS). */
  campaignObjective?: string;
  /** Optional Meta campaign bid strategy (e.g. LOWEST_COST_WITH_BID_CAP, COST_CAP, LOWEST_COST_WITH_MIN_ROAS). */
  campaignBidStrategy?: string;
  /** When true, campaign already has a budget set; hide budget fields and do not require/send ad set budget. */
  campaignBudgetSet?: boolean;
  accountId?: string;
}

const inputClass = "campaign-input w-full";

/** Meta optimization_goal enum – all values per Meta Ads API documentation. */
const OPTIMIZATION_GOAL_OPTIONS: { value: string; label: string }[] = [
  { value: "NONE", label: "None" },
  { value: "APP_INSTALLS", label: "App installs" },
  { value: "AD_RECALL_LIFT", label: "Ad recall lift" },
  { value: "ENGAGED_USERS", label: "Engaged users" },
  { value: "EVENT_RESPONSES", label: "Event responses" },
  { value: "IMPRESSIONS", label: "Impressions" },
  { value: "LEAD_GENERATION", label: "Lead generation" },
  { value: "QUALITY_LEAD", label: "Quality lead" },
  { value: "LINK_CLICKS", label: "Link clicks" },
  { value: "OFFSITE_CONVERSIONS", label: "Offsite conversions" },
  { value: "PAGE_LIKES", label: "Page likes" },
  { value: "POST_ENGAGEMENT", label: "Post engagement" },
  { value: "QUALITY_CALL", label: "Quality call" },
  { value: "REACH", label: "Reach" },
  { value: "LANDING_PAGE_VIEWS", label: "Landing page views" },
  { value: "VISIT_INSTAGRAM_PROFILE", label: "Visit Instagram profile" },
  { value: "ENGAGED_PAGE_VIEWS", label: "Engaged page views" },
  { value: "VALUE", label: "Value" },
  { value: "THRUPLAY", label: "ThruPlay" },
  { value: "DERIVED_EVENTS", label: "Derived events" },
  { value: "APP_INSTALLS_AND_OFFSITE_CONVERSIONS", label: "App installs and offsite conversions" },
  { value: "CONVERSATIONS", label: "Conversations" },
  { value: "IN_APP_VALUE", label: "In-app value" },
  { value: "MESSAGING_PURCHASE_CONVERSION", label: "Messaging purchase conversion" },
  { value: "SUBSCRIBERS", label: "Subscribers" },
  { value: "REMINDERS_SET", label: "Reminders set" },
  { value: "MEANINGFUL_CALL_ATTEMPT", label: "Meaningful call attempt" },
  { value: "PROFILE_VISIT", label: "Profile visit" },
  { value: "PROFILE_AND_PAGE_ENGAGEMENT", label: "Profile and page engagement" },
  { value: "ADVERTISER_SILOED_VALUE", label: "Advertiser siloed value" },
  { value: "AUTOMATIC_OBJECTIVE", label: "Automatic objective" },
  { value: "MESSAGING_APPOINTMENT_CONVERSION", label: "Messaging appointment conversion" },
];

const BILLING_EVENTS = ["LINK_CLICKS", "IMPRESSIONS", "REACH"] as const;
const BILLING_EVENT_OPTIONS = BILLING_EVENTS.map((b) => ({
  value: b,
  label: b,
}));
const PACING_TYPES = [
  { value: "standard", label: "Standard" },
  { value: "no_pacing", label: "No pacing" },
] as const;

const BUDGET_TYPE_OPTIONS: { value: "daily" | "lifetime"; label: string }[] = [
  { value: "daily", label: "Daily budget" },
  { value: "lifetime", label: "Lifetime budget" },
];

const STATUS_OPTIONS: { value: MetaAdSetStatus; label: string }[] = [
  { value: "PAUSED", label: "Paused" },
  { value: "ACTIVE", label: "Active" },
];

const TARGETING_GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "1", label: "Males" },
  { value: "2", label: "Females" },
];

const PUBLISHER_PLATFORMS = [
  "facebook",
  "instagram",
  "messenger",
  "audience_network",
] as const;
const PUBLISHER_PLATFORM_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  messenger: "Messenger",
  audience_network: "Audience Network",
};

/** Age options 16–65 for targeting (Meta). */
const AGE_OPTIONS = Array.from({ length: 65 - 16 + 1 }, (_, i) => 16 + i).map(
  (n) => ({
    value: String(n),
    label: String(n),
  }),
);

const DEVICE_PLATFORM_OPTIONS = [
  { value: "", label: "All" },
  { value: "mobile", label: "Mobile" },
  { value: "desktop", label: "Desktop" },
];

/** Destination types for ad set (Meta). Shown filtered by campaign objective when campaignObjective prop is set. */
const DESTINATION_TYPES: { value: string; label: string }[] = [
  { value: "WEBSITE", label: "Website" },
  { value: "APP", label: "App" },
  { value: "MESSENGER", label: "Messenger" },
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "INSTAGRAM_DIRECT", label: "Instagram Direct" },
  { value: "APPLINKS_AUTOMATIC", label: "App links (automatic)" },
  { value: "FACEBOOK", label: "Facebook" },
  { value: "MESSAGING_MESSENGER_WHATSAPP", label: "Messenger + WhatsApp" },
  {
    value: "MESSAGING_INSTAGRAM_DIRECT_MESSENGER",
    label: "Instagram Direct + Messenger",
  },
  {
    value: "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP",
    label: "Instagram Direct + Messenger + WhatsApp",
  },
  {
    value: "MESSAGING_INSTAGRAM_DIRECT_WHATSAPP",
    label: "Instagram Direct + WhatsApp",
  },
  { value: "SHOP_AUTOMATIC", label: "Shop (automatic)" },
  { value: "ON_AD", label: "On ad (lead)" },
  { value: "ON_POST", label: "On post" },
  { value: "ON_EVENT", label: "On event" },
  { value: "ON_VIDEO", label: "On video" },
  { value: "ON_PAGE", label: "On page" },
  { value: "INSTAGRAM_PROFILE", label: "Instagram profile" },
  { value: "FACEBOOK_PAGE", label: "Facebook page" },
  {
    value: "INSTAGRAM_PROFILE_AND_FACEBOOK_PAGE",
    label: "Instagram profile + Facebook page",
  },
  { value: "INSTAGRAM_LIVE", label: "Instagram Live" },
  { value: "FACEBOOK_LIVE", label: "Facebook Live" },
  { value: "IMAGINE", label: "Imagine" },
];

/** Allowed destination types per campaign objective (Meta ODAX). If objective not in map, show all. */
const OBJECTIVE_DESTINATION_MAP: Record<string, string[]> = {
  OUTCOME_TRAFFIC: [
    "WEBSITE",
    "APP",
    "MESSENGER",
    "WHATSAPP",
    "INSTAGRAM_DIRECT",
    "APPLINKS_AUTOMATIC",
    "FACEBOOK",
    "MESSAGING_MESSENGER_WHATSAPP",
    "MESSAGING_INSTAGRAM_DIRECT_MESSENGER",
    "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP",
    "MESSAGING_INSTAGRAM_DIRECT_WHATSAPP",
  ],
  OUTCOME_LEADS: [
    "ON_AD",
    "WEBSITE",
    "MESSENGER",
    "WHATSAPP",
    "INSTAGRAM_DIRECT",
    "MESSAGING_MESSENGER_WHATSAPP",
    "MESSAGING_INSTAGRAM_DIRECT_MESSENGER",
    "MESSAGING_INSTAGRAM_DIRECT_MESSENGER_WHATSAPP",
    "MESSAGING_INSTAGRAM_DIRECT_WHATSAPP",
  ],
  OUTCOME_ENGAGEMENT: [
    "ON_POST",
    "ON_PAGE",
    "ON_VIDEO",
    "ON_EVENT",
    "MESSENGER",
    "INSTAGRAM_PROFILE",
    "FACEBOOK_PAGE",
    "INSTAGRAM_PROFILE_AND_FACEBOOK_PAGE",
    "INSTAGRAM_LIVE",
    "FACEBOOK_LIVE",
  ],
  OUTCOME_SALES: [
    "WEBSITE",
    "APP",
    "SHOP_AUTOMATIC",
    "MESSENGER",
    "WHATSAPP",
    "INSTAGRAM_DIRECT",
  ],
  OUTCOME_APP_PROMOTION: ["APP", "APPLINKS_AUTOMATIC"],
  OUTCOME_AWARENESS: [
    "WEBSITE",
    "INSTAGRAM_PROFILE",
    "FACEBOOK_PAGE",
    "INSTAGRAM_PROFILE_AND_FACEBOOK_PAGE",
    "IMAGINE",
  ],
  LINK_CLICKS: [
    "WEBSITE",
    "APP",
    "MESSENGER",
    "WHATSAPP",
    "INSTAGRAM_DIRECT",
    "APPLINKS_AUTOMATIC",
    "FACEBOOK",
  ],
  CONVERSIONS: [
    "WEBSITE",
    "APP",
    "MESSENGER",
    "WHATSAPP",
    "INSTAGRAM_DIRECT",
    "SHOP_AUTOMATIC",
  ],
  PAGE_LIKES: [
    "FACEBOOK_PAGE",
    "INSTAGRAM_PROFILE",
    "INSTAGRAM_PROFILE_AND_FACEBOOK_PAGE",
  ],
  LEAD_GENERATION: ["ON_AD", "WEBSITE", "MESSENGER", "INSTAGRAM_DIRECT"],
  APP_INSTALLS: ["APP", "APPLINKS_AUTOMATIC"],
  PRODUCT_CATALOG_SALES: ["WEBSITE", "APP", "SHOP_AUTOMATIC"],
};

/** Format datetime-local value to ISO 8601 with timezone offset (e.g. 2024-05-20T10:00:00-0700). */
function formatDateTimeToISO(value: string): string | undefined {
  if (!value || value.trim() === "") return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const offsetMin = -d.getTimezoneOffset();
  const offsetHours = Math.floor(offsetMin / 60);
  const offsetMins = Math.abs(offsetMin % 60);
  const sign = offsetHours >= 0 ? "+" : "-";
  const pad = (n: number) => Math.abs(n).toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${sign}${pad(Math.abs(offsetHours))}${pad(offsetMins)}`;
}

export const CreateMetaAdSetPanel: React.FC<CreateMetaAdSetPanelProps> = ({
  channelId,
  onSuccess,
  onClose,
  profileId,
  campaignId: initialCampaignId,
  campaignObjective,
  campaignBidStrategy,
  campaignBudgetSet = false,
}) => {
  const [name, setName] = useState("");
  const [campaignId, setCampaignId] = useState(initialCampaignId ?? "");
  const [status, setStatus] = useState<MetaAdSetStatus>("PAUSED");
  const [budgetType, setBudgetType] = useState<"daily" | "lifetime">("daily");
  const [dailyBudget, setDailyBudget] = useState<string>("");
  const [lifetimeBudget, setLifetimeBudget] = useState<string>("");
  const [optimizationGoal, setOptimizationGoal] =
    useState<string>("LINK_CLICKS");
  const [billingEvent, setBillingEvent] = useState<string>("LINK_CLICKS");
  const [bidAmount, setBidAmount] = useState<string>("");
  const [destinationType, setDestinationType] = useState<string>("");
  const [pageId, setPageId] = useState<string>("");
  const [pixelId, setPixelId] = useState<string>("");
  const [customEventType, setCustomEventType] = useState<string>("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [objectStoreUrl, setObjectStoreUrl] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");
  const [productSetId, setProductSetId] = useState<string>("");
  const [offlineConversionDataSetId, setOfflineConversionDataSetId] =
    useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [pacingType, setPacingType] = useState<string>("standard");
  const [selectedTargetingCountries, setSelectedTargetingCountries] = useState<string[]>([]);
  const [ageMin, setAgeMin] = useState<string>("18");
  const [ageMax, setAgeMax] = useState<string>("");
  const [targetingGenders, setTargetingGenders] = useState<string>("all");
  const [publisherPlatforms, setPublisherPlatforms] = useState<string[]>([]);
  const [devicePlatforms, setDevicePlatforms] = useState<string>("");
  const [customAudiences, setCustomAudiences] = useState<string>("");
  const [excludedCustomAudiences, setExcludedCustomAudiences] =
    useState<string>("");
  const [interestsIds, setInterestsIds] = useState<string>("");
  const [behaviorsIds, setBehaviorsIds] = useState<string>("");
  const [campaigns, setCampaigns] = useState<
    Array<{ campaign_id: string; campaign_name: string }>
  >([]);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validateOnlySuccess, setValidateOnlySuccess] = useState(false);
  const [validateOnly, setValidateOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "basics" | "targeting" | "schedule" | "promoted" | "advanced"
  >("basics");

  const isCampaignLocked = Boolean(initialCampaignId);

  useEffect(() => {
    if (initialCampaignId) {
      setCampaignId(initialCampaignId);
    }
  }, [initialCampaignId]);

  useEffect(() => {
    if (isCampaignLocked) {
      setCampaignsLoading(false);
      return;
    }
    let cancelled = false;
    setCampaignsLoading(true);
    accountsService
      .getMetaCampaigns(channelId, { page: 1, page_size: 200 })
      .then((res) => {
        if (cancelled) return;
        const list = (res.campaigns || [])
          .map((c: { campaign_id?: string; campaign_name?: string }) => ({
            campaign_id: String(c.campaign_id ?? ""),
            campaign_name: c.campaign_name ?? "",
          }))
          .filter((c: { campaign_id: string }) => c.campaign_id);
        setCampaigns(list);
        if (list.length > 0 && !campaignId) setCampaignId(list[0].campaign_id);
      })
      .catch(() => {
        if (!cancelled) setCampaigns([]);
      })
      .finally(() => {
        if (!cancelled) setCampaignsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [channelId, isCampaignLocked, campaignId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidateOnlySuccess(false);
    if (!name.trim()) {
      setError("Ad set name is required.");
      return;
    }
    if (!campaignId) {
      setError("Campaign is required.");
      return;
    }
    if (profileId === 0) {
      setError("Ad account is still loading.");
      return;
    }

    if (!campaignBudgetSet) {
      const budgetVal = budgetType === "daily" ? dailyBudget : lifetimeBudget;
      if (
        budgetVal === "" ||
        Number.isNaN(parseFloat(budgetVal)) ||
        parseFloat(budgetVal) <= 0
      ) {
        setError(
          budgetType === "daily"
            ? "Daily budget is required and must be greater than 0."
            : "Lifetime budget is required and must be greater than 0.",
        );
        return;
      }
      if (budgetType === "lifetime") {
        const endIso = formatDateTimeToISO(endTime);
        if (!endTime.trim() || !endIso) {
          setError("End time is required when using lifetime budget.");
          return;
        }
      }
    }

    const campaignBidStrategyUpper = (campaignBidStrategy || "").toUpperCase();
    const requiresBidAmount =
      campaignBidStrategyUpper === "LOWEST_COST_WITH_BID_CAP" ||
      campaignBidStrategyUpper === "COST_CAP" ||
      campaignBidStrategyUpper === "LOWEST_COST_WITH_MIN_ROAS";
    if (requiresBidAmount) {
      const bid = bidAmount.trim() === "" ? NaN : parseFloat(bidAmount);
      if (Number.isNaN(bid) || bid <= 0) {
        setError(
          campaignBidStrategyUpper === "LOWEST_COST_WITH_MIN_ROAS"
            ? "Bid amount is required for this campaign's ROAS bid strategy. Please enter a positive bid amount."
            : "Bid amount is required for this campaign's bid strategy. Please enter a positive bid amount.",
        );
        return;
      }
    }

    if (selectedTargetingCountries.length === 0) {
      setError("At least one targeting country is required. Select from the list in the Targeting tab.");
      return;
    }

    const startIsoRequired = formatDateTimeToISO(startTime);
    if (!startTime.trim() || !startIsoRequired) {
      setError(
        "Start time is required (ISO 8601 recommended for ad set schedule).",
      );
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: CreateMetaAdSetPayload = {
        profile_id: profileId,
        campaign_id: campaignId,
        name: name.trim(),
        status,
        optimization_goal: optimizationGoal,
        billing_event: billingEvent,
        pacing_type: [pacingType],
      };

      if (!campaignBudgetSet) {
        if (budgetType === "daily") {
          payload.daily_budget = Math.round(parseFloat(dailyBudget) * 100);
        } else {
          payload.lifetime_budget = Math.round(
            parseFloat(lifetimeBudget) * 100,
          );
          const endIso = formatDateTimeToISO(endTime);
          if (endIso) payload.end_time = endIso;
        }
        if (budgetType === "daily" && endTime.trim()) {
          const endIso = formatDateTimeToISO(endTime);
          if (endIso) payload.end_time = endIso;
        }
      }

      if (
        bidAmount !== "" &&
        !Number.isNaN(parseFloat(bidAmount)) &&
        parseFloat(bidAmount) > 0
      ) {
        payload.bid_amount = Math.round(parseFloat(bidAmount) * 100);
      }
      if (destinationType) payload.destination_type = destinationType;
      const startIso = formatDateTimeToISO(startTime);
      if (startIso) payload.start_time = startIso;
      const po: Record<string, unknown> = {};
      if (pageId.trim()) po.page_id = pageId.trim();
      if (pixelId.trim()) po.pixel_id = pixelId.trim();
      if (customEventType.trim()) po.custom_event_type = customEventType.trim();
      if (applicationId.trim()) po.application_id = applicationId.trim();
      if (objectStoreUrl.trim()) po.object_store_url = objectStoreUrl.trim();
      if (eventId.trim()) po.event_id = eventId.trim();
      if (productSetId.trim()) po.product_set_id = productSetId.trim();
      if (offlineConversionDataSetId.trim())
        po.offline_conversion_data_set_id = offlineConversionDataSetId.trim();
      if (Object.keys(po).length > 0) payload.promoted_object = po;

      const targeting: Record<string, unknown> = {};
      if (selectedTargetingCountries.length > 0) {
        targeting.geo_locations = {
          countries: selectedTargetingCountries.map((c) => c.toUpperCase()),
        };
      }
      const aMin = ageMin.trim() ? parseInt(ageMin, 10) : undefined;
      const aMax = ageMax.trim() ? parseInt(ageMax, 10) : undefined;
      if (aMin != null && !Number.isNaN(aMin)) targeting.age_min = aMin;
      if (aMax != null && !Number.isNaN(aMax) && (aMin == null || aMax >= aMin))
        targeting.age_max = aMax;
      if (targetingGenders && targetingGenders !== "all") {
        const g = targetingGenders.trim();
        if (g === "1") targeting.genders = [1];
        else if (g === "2") targeting.genders = [2];
        else if (g === "all") targeting.genders = [1, 2];
      }
      if (publisherPlatforms.length > 0) {
        targeting.publisher_platforms = [...publisherPlatforms];
      }
      if (devicePlatforms.trim()) {
        targeting.device_platforms = [devicePlatforms.trim().toLowerCase()];
      }
      if (customAudiences.trim()) {
        const ids = customAudiences
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length > 0)
          targeting.custom_audiences = ids.map((id) => ({ id }));
      }
      if (excludedCustomAudiences.trim()) {
        const ids = excludedCustomAudiences
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length > 0)
          targeting.excluded_custom_audiences = ids.map((id) => ({ id }));
      }
      if (interestsIds.trim()) {
        const ids = interestsIds
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length > 0) targeting.interests = ids.map((id) => ({ id }));
      }
      if (behaviorsIds.trim()) {
        const ids = behaviorsIds
          .split(/[\s,]+/)
          .map((s) => s.trim())
          .filter(Boolean);
        if (ids.length > 0) targeting.behaviors = ids.map((id) => ({ id }));
      }
      if (Object.keys(targeting).length > 0)
        payload.targeting = targeting as MetaTargetingSpec;

      if (validateOnly) {
        payload.execution_options = ["validate_only"];
      }

      await metaAdSetsService.createMetaAdSet(channelId, payload);
      if (validateOnly) {
        setError(null);
        setValidateOnlySuccess(true);
        return;
      }
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data
              ?.error
          : err instanceof Error
            ? err.message
            : "Failed to create ad set.";
      setError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleFillTest = () => {
    if (!campaignId && campaigns.length > 0) {
      setCampaignId(campaigns[0].campaign_id);
    }
    setName((prev) =>
      prev && prev.trim().length > 0 ? prev : "Test Ad Set – Traffic",
    );
    if (!campaignBudgetSet) {
      setBudgetType("daily");
      setDailyBudget((prev) => (prev && prev.trim().length > 0 ? prev : "20"));
      setLifetimeBudget("");
    }
    if (selectedTargetingCountries.length === 0) {
      setSelectedTargetingCountries(["US"]);
    }
    if (!optimizationGoal) {
      setOptimizationGoal("LINK_CLICKS");
      setBillingEvent("LINK_CLICKS");
    }
    if (!startTime) {
      const now = new Date();
      const local = now.toISOString().slice(0, 16);
      setStartTime(local);
    }
  };

  const loading =
    (campaignsLoading && !isCampaignLocked) ||
    (isCampaignLocked && profileId === 0);

  const TABS: { id: typeof activeTab; label: string }[] = [
    { id: "basics", label: "Basics" },
    { id: "targeting", label: "Targeting" },
    { id: "schedule", label: "Schedule" },
    { id: "promoted", label: "Promoted object" },
    { id: "advanced", label: "Pacing" },
  ];

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Ad Set
          </h2>
        </div>

        {loading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : (isCampaignLocked && !campaignId) ||
          (!isCampaignLocked && campaigns.length === 0) ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No campaigns found. Create a campaign first.
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
              {validateOnlySuccess && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-[12px] text-green-800">
                  Validation passed. No ad set was created. Uncheck
                  &quot;Validate only&quot; to create.
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">
                  {error}
                </div>
              )}

              <div className="tabs-container mt-2">
                <div className="flex bg-[#FEFEFB] border-b border-[#e8e8e3]">
                  {TABS.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setActiveTab(tab.id);
                        }}
                        className={`tab-button cursor-pointer ${
                          isActive ? "tab-button-active" : "tab-button-inactive"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {activeTab === "basics" && (
                  <div className="p-3">
                    <div className="mb-6">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                        Ad set details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {!isCampaignLocked && (
                          <div>
                            <label className="form-label-small">
                              Campaign *
                            </label>
                            <Dropdown
                              options={campaigns.map((c) => ({
                                value: c.campaign_id,
                                label: c.campaign_name || c.campaign_id,
                              }))}
                              value={campaignId}
                              placeholder="Select campaign"
                              onChange={(val) => setCampaignId(val)}
                              buttonClassName={inputClass}
                            />
                          </div>
                        )}
                        <div>
                          <label className="form-label-small">
                            Ad set name *
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. US 18-35"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">Status</label>
                          <Dropdown<MetaAdSetStatus>
                            options={STATUS_OPTIONS}
                            value={status}
                            placeholder="Select status"
                            onChange={(val) => setStatus(val)}
                            buttonClassName={inputClass}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-1">
                        Budget and bid
                      </h3>
                      <p className="text-[11px] text-[#556179] mb-3">
                        Either <strong>daily budget</strong> or{" "}
                        <strong>lifetime budget</strong> is required and must be
                        greater than 0 (shown here in account currency; sent to
                        Meta in the account&apos;s smallest unit, e.g. cents).{" "}
                        For lifetime budget you must also set an end time; for
                        daily budget you can make the ad set ongoing by leaving
                        end time empty.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {!campaignBudgetSet && (
                          <>
                            <div>
                              <label className="form-label-small">
                                Budget type *
                              </label>
                              <Dropdown<"daily" | "lifetime">
                                options={BUDGET_TYPE_OPTIONS}
                                value={budgetType}
                                placeholder="Select budget type"
                                onChange={(val) => setBudgetType(val)}
                                buttonClassName={inputClass}
                              />
                            </div>
                            <div>
                              <label className="form-label-small">
                                {budgetType === "daily"
                                  ? "Daily budget *"
                                  : "Lifetime budget *"}
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
                              <p className="text-[11px] text-[#556179] mt-1">
                                In account currency.
                              </p>
                            </div>
                          </>
                        )}
                        <div>
                          <label className="form-label-small">
                            Optimization goal
                          </label>
                          <Dropdown
                            options={OPTIMIZATION_GOAL_OPTIONS}
                            value={optimizationGoal}
                            placeholder="Select optimization goal"
                            onChange={(val) => setOptimizationGoal(val)}
                            buttonClassName={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            Billing event
                          </label>
                          <Dropdown
                            options={BILLING_EVENT_OPTIONS}
                            value={billingEvent}
                            placeholder="Select billing event"
                            onChange={(val) => setBillingEvent(val)}
                            buttonClassName={inputClass}
                          />
                          <p className="text-[11px] text-[#556179] mt-1">
                            Align with optimization goal when possible.
                          </p>
                        </div>
                        <div>
                          <label className="form-label-small">
                            Bid amount (optional)
                          </label>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            placeholder="e.g. 1.50"
                            className={inputClass}
                          />
                          <p className="text-[11px] text-[#556179] mt-1">
                            In dollars; sent as cents.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-2">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                        Destination type
                      </h3>
                      <p className="text-[11px] text-[#556179] mb-2">
                        Destination of ads in this ad set. Options depend on
                        campaign objective
                        {campaignObjective ? ` (${campaignObjective})` : ""}.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label-small">
                            Destination type (optional)
                          </label>
                          <Dropdown
                            options={
                              campaignObjective &&
                              OBJECTIVE_DESTINATION_MAP[campaignObjective]
                                ? DESTINATION_TYPES.filter((d) =>
                                    OBJECTIVE_DESTINATION_MAP[
                                      campaignObjective
                                    ].includes(d.value),
                                  )
                                : DESTINATION_TYPES
                            }
                            value={destinationType}
                            placeholder="Select destination"
                            onChange={(val) => setDestinationType(val)}
                            buttonClassName={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "targeting" && (
                  <div className="p-3">
                    <div className="mb-6 p-4 rounded-xl border-2 border-[#136D6D]/20 bg-white/50">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
                        Targeting
                      </h3>
                      <p className="text-[11px] text-[#556179] mb-4">
                        Geo is required; demographics, audiences, and placements
                        are optional.
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                          <label className="form-label-small">
                            Countries * (select at least one)
                          </label>
                          <Dropdown<string>
                            options={META_COUNTRY_CODES.filter(
                              (code) => !selectedTargetingCountries.includes(code),
                            ).map((code) => ({
                              value: code,
                              label: `${META_COUNTRY_LABELS[code] ?? code} (${code})`,
                            }))}
                            value=""
                            onChange={(value) => {
                              if (value && !selectedTargetingCountries.includes(value)) {
                                setSelectedTargetingCountries([
                                  ...selectedTargetingCountries,
                                  value,
                                ]);
                              }
                            }}
                            placeholder="Select countries"
                            buttonClassName={inputClass}
                            searchable={true}
                            searchPlaceholder="Search countries..."
                            emptyMessage="No countries available"
                          />
                          {selectedTargetingCountries.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedTargetingCountries.map((code) => (
                                <span
                                  key={code}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                                >
                                  {META_COUNTRY_LABELS[code] ?? code}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedTargetingCountries(
                                        selectedTargetingCountries.filter(
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
                          {selectedTargetingCountries.length > 0 && (
                            <p className="text-[11px] text-[#556179] mt-1">
                              {selectedTargetingCountries.length} selected.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="form-label-small">
                            Age min (optional)
                          </label>
                          <Dropdown
                            options={AGE_OPTIONS}
                            value={ageMin}
                            placeholder="Minimum age (default 18)"
                            onChange={(val) => {
                              setAgeMin(val);
                              const min = parseInt(val, 10);
                              if (ageMax !== "" && !Number.isNaN(min)) {
                                const max = parseInt(ageMax, 10);
                                if (!Number.isNaN(max) && max < min)
                                  setAgeMax("");
                              }
                            }}
                            buttonClassName={inputClass}
                          />
                          <p className="text-[11px] text-[#556179] mt-1">
                            Minimum age. Defaults to 18.
                          </p>
                        </div>
                        <div>
                          <label className="form-label-small">
                            Age max (optional)
                          </label>
                          <Dropdown
                            options={[
                              { value: "", label: "No maximum" },
                              ...AGE_OPTIONS.filter((opt) => {
                                const minVal = parseInt(ageMin, 10);
                                const optVal = parseInt(opt.value, 10);
                                return (
                                  !Number.isNaN(minVal) &&
                                  !Number.isNaN(optVal) &&
                                  optVal >= minVal
                                );
                              }),
                            ]}
                            value={ageMax}
                            placeholder="Maximum age"
                            onChange={(val) => setAgeMax(val)}
                            buttonClassName={inputClass}
                          />
                          <p className="text-[11px] text-[#556179] mt-1">
                            Maximum age. If used, must be 65 or lower.
                          </p>
                        </div>
                        <div>
                          <label className="form-label-small">
                            Genders (optional)
                          </label>
                          <Dropdown
                            options={TARGETING_GENDER_OPTIONS}
                            value={targetingGenders}
                            placeholder="All"
                            onChange={(val) => setTargetingGenders(val)}
                            buttonClassName={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            Publisher platforms (optional)
                          </label>
                          <Dropdown<string>
                            options={PUBLISHER_PLATFORMS.filter(
                              (code) => !publisherPlatforms.includes(code),
                            ).map((code) => ({
                              value: code,
                              label: PUBLISHER_PLATFORM_LABELS[code] ?? code,
                            }))}
                            value=""
                            onChange={(value) => {
                              if (!publisherPlatforms.includes(value)) {
                                setPublisherPlatforms([
                                  ...publisherPlatforms,
                                  value,
                                ]);
                              }
                            }}
                            placeholder="Select platforms"
                            buttonClassName={inputClass}
                            searchable={true}
                            searchPlaceholder="Search platforms..."
                            emptyMessage="No platforms available"
                          />
                          {publisherPlatforms.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {publisherPlatforms.map((code) => (
                                <span
                                  key={code}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                                >
                                  {PUBLISHER_PLATFORM_LABELS[code] ?? code}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPublisherPlatforms(
                                        publisherPlatforms.filter(
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
                          {publisherPlatforms.length > 0 && (
                            <p className="text-[11px] text-[#556179] mt-1">
                              {publisherPlatforms.length} selected.
                            </p>
                          )}
                        </div>
                        <div>
                          <label className="form-label-small">
                            Device platforms (optional)
                          </label>
                          <Dropdown
                            options={DEVICE_PLATFORM_OPTIONS}
                            value={devicePlatforms}
                            placeholder="All"
                            onChange={(val) => setDevicePlatforms(val)}
                            buttonClassName={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label-small">
                            Custom audience IDs (comma separated)
                          </label>
                          <input
                            type="text"
                            value={customAudiences}
                            onChange={(e) => setCustomAudiences(e.target.value)}
                            placeholder="e.g. 123456, 789012"
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label-small">
                            Excluded custom audience IDs (comma separated)
                          </label>
                          <input
                            type="text"
                            value={excludedCustomAudiences}
                            onChange={(e) =>
                              setExcludedCustomAudiences(e.target.value)
                            }
                            placeholder="e.g. 123456"
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label-small">
                            Interest IDs (comma separated)
                          </label>
                          <input
                            type="text"
                            value={interestsIds}
                            onChange={(e) => setInterestsIds(e.target.value)}
                            placeholder="e.g. 600313926646730"
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label-small">
                            Behavior IDs (comma separated)
                          </label>
                          <input
                            type="text"
                            value={behaviorsIds}
                            onChange={(e) => setBehaviorsIds(e.target.value)}
                            placeholder="e.g. 6002714895372"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "schedule" && (
                  <div className="p-3">
                    <div className="mb-6">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                        Schedule
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label-small">
                            Start time *
                          </label>
                          <input
                            type="datetime-local"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            End time{" "}
                            {budgetType === "lifetime" ? "*" : "(optional)"}
                          </label>
                          <input
                            type="datetime-local"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className={inputClass}
                          />
                          {budgetType === "lifetime" && (
                            <p className="text-[11px] text-[#556179] mt-1">
                              Required when using lifetime budget.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "promoted" && (
                  <div className="p-3">
                    <div className="mb-6">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                        Promoted object
                      </h3>
                      <p className="text-[11px] text-[#556179] mb-3">
                        The object this ad set is promoting. Required for some
                        objectives (e.g. page_id for PAGE_LIKES/LEADS, pixel_id
                        for CONVERSIONS, application_id + object_store_url for
                        APP_INSTALLS).
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label-small">Page ID</label>
                          <input
                            type="text"
                            value={pageId}
                            onChange={(e) => setPageId(e.target.value)}
                            placeholder="e.g. Meta Page ID"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">Pixel ID</label>
                          <input
                            type="text"
                            value={pixelId}
                            onChange={(e) => setPixelId(e.target.value)}
                            placeholder="e.g. Conversion pixel ID"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            Custom event type
                          </label>
                          <input
                            type="text"
                            value={customEventType}
                            onChange={(e) => setCustomEventType(e.target.value)}
                            placeholder="e.g. PURCHASE, LEAD"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            Application ID
                          </label>
                          <input
                            type="text"
                            value={applicationId}
                            onChange={(e) => setApplicationId(e.target.value)}
                            placeholder="e.g. Facebook App ID"
                            className={inputClass}
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="form-label-small">
                            Object store URL
                          </label>
                          <input
                            type="text"
                            value={objectStoreUrl}
                            onChange={(e) => setObjectStoreUrl(e.target.value)}
                            placeholder="e.g. https://apps.apple.com/..."
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">Event ID</label>
                          <input
                            type="text"
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                            placeholder="e.g. Facebook event ID"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            Product set ID
                          </label>
                          <input
                            type="text"
                            value={productSetId}
                            onChange={(e) => setProductSetId(e.target.value)}
                            placeholder="e.g. for catalog sales"
                            className={inputClass}
                          />
                        </div>
                        <div>
                          <label className="form-label-small">
                            Offline conversion data set ID
                          </label>
                          <input
                            type="text"
                            value={offlineConversionDataSetId}
                            onChange={(e) =>
                              setOfflineConversionDataSetId(e.target.value)
                            }
                            placeholder="e.g. for offline conversions"
                            className={inputClass}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "advanced" && (
                  <div className="p-3">
                    <div className="mb-6">
                      <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                        Pacing
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="form-label-small">
                            Pacing type
                          </label>
                          <Dropdown
                            options={PACING_TYPES.map((p) => ({
                              value: p.value,
                              label: p.label,
                            }))}
                            value={pacingType}
                            placeholder="Select pacing type"
                            onChange={(val) => setPacingType(val)}
                            buttonClassName={inputClass}
                          />
                          <p className="text-[11px] text-[#556179] mt-1">
                            Sent as a list, e.g. [&quot;standard&quot;] or
                            [&quot;no_pacing&quot;].
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-end gap-3">
              <label className="flex items-center gap-2 text-[12px] text-[#556179] cursor-pointer">
                <input
                  type="checkbox"
                  checked={validateOnly}
                  onChange={(e) => {
                    setValidateOnly(e.target.checked);
                    if (e.target.checked) setValidateOnlySuccess(false);
                  }}
                  className="rounded border-gray-300"
                />
                Validate only (no ad set created)
              </label>
              <button
                type="button"
                onClick={handleFillTest}
                className="secondary-button font-semibold text-[11.2px]"
              >
                Fill test data
              </button>
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitLoading}
                className="create-entity-button font-semibold text-[11.2px] flex items-center gap-2"
              >
                {submitLoading
                  ? validateOnly
                    ? "Validating..."
                    : "Creating..."
                  : validateOnly
                    ? "Validate only"
                    : "Create ad set"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
