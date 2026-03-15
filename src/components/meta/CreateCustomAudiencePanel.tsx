import React, { useState, useEffect, useCallback } from "react";
import { accountsService } from "../../services/accounts";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../ui/Loader";
import { CustomAudienceRuleBuilder } from "./CustomAudienceRuleBuilder";
import type {
  CustomAudienceCreatePayload,
  MetaCustomAudienceSubtype,
  MetaCustomerFileSource,
  AudienceRule,
} from "../../types/meta";
import {
  audienceRuleToJsonString,
  getDefaultAudienceRule,
  getExampleAudienceRule,
} from "../../types/meta";

export interface MetaProfileOption {
  id: number;
  name: string;
  account_id?: string;
  ad_account_id?: string;
}

const SUBTYPE_OPTIONS: { value: MetaCustomAudienceSubtype; label: string }[] = [
  { value: "CUSTOM", label: "Customer list / Customer file (CUSTOM)" },
  { value: "WEBSITE", label: "Website (WEBSITE)" },
  { value: "APP", label: "App (APP)" },
  { value: "ENGAGEMENT", label: "Engagement (ENGAGEMENT)" },
  { value: "OFFLINE_CONVERSION", label: "Offline conversion (OFFLINE_CONVERSION)" },
];

const CUSTOMER_FILE_SOURCE_OPTIONS: { value: MetaCustomerFileSource; label: string }[] = [
  { value: "USER_PROVIDED_ONLY", label: "User provided only" },
  { value: "PARTNER_PROVIDED_ONLY", label: "Partner provided only" },
  { value: "BOTH_USER_AND_PARTNER_PROVIDED", label: "Both user and partner provided" },
];

const inputClass = "campaign-input w-full";

export interface CreateCustomAudiencePanelProps {
  channelId: number;
  accountId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CreateCustomAudiencePanel: React.FC<CreateCustomAudiencePanelProps> = ({
  channelId,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [subtype, setSubtype] = useState<MetaCustomAudienceSubtype>("CUSTOM");
  const [description, setDescription] = useState("");
  const [customerFileSource, setCustomerFileSource] = useState<MetaCustomerFileSource | "">("");
  const [retentionDays, setRetentionDays] = useState<string>("");
  const [ruleData, setRuleData] = useState<AudienceRule | null>(null);
  const [ruleJson, setRuleJson] = useState("");
  const [prefill, setPrefill] = useState(false);
  const [profileId, setProfileId] = useState<number | "">("");
  const [pixelId, setPixelId] = useState("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [pixels, setPixels] = useState<Array<{ id: string; name: string }>>([]);
  const [pixelsLoading, setPixelsLoading] = useState(false);
  const [apps, setApps] = useState<Array<{ id: string; name: string; link?: string }>>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCustomerFile = subtype === "CUSTOM";
  const showWebsiteApp = subtype === "WEBSITE" || subtype === "APP";
  const showEngagementRule = subtype === "ENGAGEMENT" || subtype === "OFFLINE_CONVERSION";

  const loadProfiles = useCallback(() => {
    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        const list = (res.profiles || []) as Array<{ id?: number; name?: string; account_id?: string }>;
        setProfiles(list.filter((p) => p.id != null) as MetaProfileOption[]);
      })
      .catch(() => setProfiles([]))
      .finally(() => setProfilesLoading(false));
  }, [channelId]);

  const loadPixels = useCallback(() => {
    if (profileId === "" || profileId == null) {
      setPixels([]);
      return;
    }
    setPixelsLoading(true);
    accountsService
      .getMetaPixels(channelId, profileId)
      .then((res) => {
        setPixels(res.pixels || []);
      })
      .catch(() => setPixels([]))
      .finally(() => setPixelsLoading(false));
  }, [channelId, profileId]);

  const loadApps = useCallback(() => {
    if (profileId === "" || profileId == null) {
      setApps([]);
      return;
    }
    setAppsLoading(true);
    accountsService
      .getMetaOwnedApps(channelId, profileId)
      .then((res) => {
        setApps(res.apps || []);
      })
      .catch(() => setApps([]))
      .finally(() => setAppsLoading(false));
  }, [channelId, profileId]);

  useEffect(() => {
    if (showWebsiteApp || showEngagementRule) loadProfiles();
  }, [showWebsiteApp, showEngagementRule, loadProfiles]);

  useEffect(() => {
    if ((showWebsiteApp || showEngagementRule) && profileId !== "" && profileId != null) loadPixels();
  }, [showWebsiteApp, showEngagementRule, profileId, loadPixels]);

  useEffect(() => {
    if (subtype === "APP" && profileId !== "" && profileId != null) loadApps();
    else setApps([]);
  }, [subtype, profileId, loadApps]);

  useEffect(() => {
    if (subtype === "WEBSITE" && pixelId && pixels.length > 0) {
      const found = pixels.some((p) => p.id === pixelId);
      if (!found) setPixelId("");
    }
  }, [subtype, pixelId, pixels]);

  useEffect(() => {
    if ((showWebsiteApp || showEngagementRule) && profiles.length > 0 && (profileId === "" || profileId == null)) {
      setProfileId(profiles[0].id);
    }
  }, [showWebsiteApp, showEngagementRule, profiles, profileId]);

  // Default prefill to true for APP (recommended for backfilling historical app events).
  useEffect(() => {
    if (subtype === "APP") setPrefill(true);
  }, [subtype]);

  const handleSetExampleRules = () => {
    setError(null);
    if (subtype === "WEBSITE") {
      setRuleData(
        getExampleAudienceRule("website_pageview_30d", { pixelId: pixelId || undefined })
      );
      setRuleJson("");
    } else if (subtype === "APP") {
      setRuleData(getExampleAudienceRule("app_purchase_30d"));
      setRuleJson("");
      setRetentionDays("30");
    } else if (showEngagementRule) {
      setRuleData(getExampleAudienceRule("video_50pct"));
      setRuleJson("");
    }
  };

  const handleFillTestData = () => {
    setError(null);
    if (subtype === "CUSTOM") {
      setName("CRM High-Value Customers");
      setDescription("Emails from Shopify");
      setCustomerFileSource("USER_PROVIDED_ONLY");
      setRetentionDays("90");
    } else if (subtype === "WEBSITE") {
      setName("Purchasers Last 30 Days");
      const nextPixelId = pixels.length > 0 ? pixels[0].id : pixelId || "";
      setPixelId(nextPixelId);
      setRuleData(
        getExampleAudienceRule("website_purchase_60d", {
          pixelId: nextPixelId || undefined,
        })
      );
      setRuleJson("");
      if (profiles.length > 0) setProfileId(profiles[0].id);
    } else if (subtype === "APP") {
      setName("App – AchieveLevel 30d");
      setPixelId("");
      setRetentionDays("30");
      setRuleData(getExampleAudienceRule("app_achieve_level"));
      setRuleJson("");
      if (profiles.length > 0) setProfileId(profiles[0].id);
    } else if (subtype === "ENGAGEMENT" || subtype === "OFFLINE_CONVERSION") {
      setName("Video Viewers 50%");
      setRuleData(getExampleAudienceRule("video_50pct"));
      setRuleJson("");
    } else {
      setName(name || "My custom audience");
      setDescription(description || "Created via Stellar");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Audience name is required.");
      return;
    }
    if (showCustomerFile && !customerFileSource) {
      setError("Customer file source is required for customer list (CUSTOM) audiences.");
      return;
    }
    if (showCustomerFile && retentionDays !== "") {
      const rd = Number(retentionDays);
      if (!Number.isNaN(rd) && (rd < 1 || rd > 180)) {
        setError("Retention days must be between 1 and 180 when provided.");
        return;
      }
    }
    if (subtype === "WEBSITE" && !pixelId.trim()) {
      setError("Pixel ID is required for WEBSITE.");
      return;
    }
    if (showWebsiteApp && (profileId === "" || profileId == null)) {
      setError("Please select an ad account for website/app audiences.");
      return;
    }
    if (subtype === "WEBSITE") {
      const r = ruleData ? audienceRuleToJsonString(ruleData) : ruleJson.trim();
      if (!r) {
        setError("Rule is required for WEBSITE.");
        return;
      }
      if (ruleData && ruleData.inclusions.rules.length === 0) {
        setError("At least one inclusion rule is required for WEBSITE.");
        return;
      }
    }
    if (subtype === "APP") {
      const rd = retentionDays === "" ? NaN : Number(retentionDays);
      if (retentionDays === "" || Number.isNaN(rd) || rd < 1 || rd > 180) {
        setError("Retention days is required for APP (integer 1–180).");
        return;
      }
      if (ruleData) {
        if (ruleData.inclusions.rules.length === 0) {
          setError("At least one inclusion rule is required for APP.");
          return;
        }
      } else if (!ruleJson.trim()) {
        setError("Rule is required for APP.");
        return;
      }
    }
    if (showEngagementRule && ruleData && ruleData.inclusions.rules.length === 0) {
      setError("At least one inclusion rule is required when using the rule builder.");
      return;
    }

    setSubmitLoading(true);
    try {
      const payload: CustomAudienceCreatePayload = {
        name: name.trim(),
        subtype,
      };
      if (description.trim()) payload.description = description.trim();

      if (showCustomerFile && customerFileSource) {
        payload.customer_file_source = customerFileSource;
        payload.retention_days = Number(retentionDays) || 90;
      }

      if (showWebsiteApp) {
        if (profileId !== "" && profileId != null) payload.profile_id = Number(profileId);
        if (retentionDays !== "" && !Number.isNaN(Number(retentionDays))) {
          payload.retention_days = Number(retentionDays);
        }
        const ruleToSend = ruleData ?? getDefaultAudienceRule();
        payload.rule = ruleData ? audienceRuleToJsonString(ruleToSend) : ruleJson.trim() || undefined;
        payload.prefill = prefill;
        if (subtype === "WEBSITE" && pixelId.trim()) payload.pixel_id = pixelId.trim();
      }

      if (showEngagementRule && ruleData && ruleData.inclusions.rules.length > 0) {
        payload.rule = audienceRuleToJsonString(ruleData);
      }

      await accountsService.createMetaCustomAudience(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string; detail?: string } } }).response?.data
              ?.error ??
            (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : err instanceof Error
            ? err.message
            : "Failed to create custom audience.";
      setError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">Create Custom Audience</h2>
        </div>

        <div className="p-4 border-b border-gray-200">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label-small">Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. My audience"
                className={inputClass}
                maxLength={255}
              />
            </div>

            <div>
              <label className="form-label-small">Subtype *</label>
              <Dropdown<MetaCustomAudienceSubtype>
                options={SUBTYPE_OPTIONS}
                value={subtype}
                placeholder="Select subtype"
                onChange={(val) => setSubtype(val)}
                buttonClassName={inputClass}
              />
            </div>

            <div className="md:col-span-2">
              <label className="form-label-small">Description (optional)</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief summary"
                className={inputClass}
              />
            </div>

            {showCustomerFile && (
              <>
                <div>
                  <label className="form-label-small">Customer file source *</label>
                  <Dropdown<MetaCustomerFileSource>
                    options={CUSTOMER_FILE_SOURCE_OPTIONS}
                    value={customerFileSource || undefined}
                    placeholder="Select source"
                    onChange={(val) => setCustomerFileSource(val)}
                    buttonClassName={inputClass}
                  />
                </div>
                <div>
                  <label className="form-label-small">Retention days * (1–180)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    placeholder="e.g. 90"
                    className={inputClass}
                  />
                </div>
              </>
            )}

            {showWebsiteApp && (
              <>
                {profilesLoading ? (
                  <div className="md:col-span-2 flex items-center gap-2 text-[12px] text-[#556179]">
                    <Loader size="sm" showMessage={false} /> Loading ad accounts...
                  </div>
                ) : (
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
                )}
                {subtype === "WEBSITE" && (
                  <div>
                    <label className="form-label-small">Pixel *</label>
                    {pixelsLoading ? (
                      <div className="flex items-center gap-2 text-[12px] text-[#556179]">
                        <Loader size="sm" showMessage={false} /> Loading pixels...
                      </div>
                    ) : (
                      <Dropdown<string>
                        options={pixels.map((p) => ({
                          value: p.id,
                          label: p.name ? `${p.name} (${p.id})` : p.id,
                        }))}
                        value={pixelId}
                        placeholder="Select pixel"
                        onChange={(val) => setPixelId(val ?? "")}
                        buttonClassName={inputClass}
                        searchable
                        searchPlaceholder="Search pixels..."
                      />
                    )}
                  </div>
                )}
                <div>
                  <label className="form-label-small">
                    {subtype === "APP"
                      ? "Retention days * (1–180)"
                      : "Retention days (optional, 1–180)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    placeholder="e.g. 30"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="form-label-small block mb-0">Audience rule *</label>
                    <button
                      type="button"
                      onClick={handleSetExampleRules}
                      className="secondary-button text-[11px] py-1.5 px-2"
                    >
                      Set example rules
                    </button>
                  </div>
                  <CustomAudienceRuleBuilder
                    value={ruleData ?? getDefaultAudienceRule()}
                    onChange={(r) => setRuleData(r)}
                    disabled={submitLoading || profilesLoading || (subtype === "APP" && appsLoading)}
                    sourceType={subtype === "APP" ? "app" : "website"}
                    eventSourceIdOptions={
                      showWebsiteApp
                        ? {
                            ...(pixels.length > 0 && { pixel: pixels }),
                            ...(subtype === "APP" && apps.length > 0 && { app: apps }),
                          }
                        : undefined
                    }
                  />
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    id="prefill"
                    checked={prefill}
                    onChange={(e) => setPrefill(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="prefill" className="form-label-small mb-0">
                    Prefill with historical data (last 30 days)
                  </label>
                </div>
              </>
            )}

            {showEngagementRule && !showWebsiteApp && (
              <div className="md:col-span-2 space-y-4">
                {profilesLoading ? (
                  <div className="flex items-center gap-2 text-[12px] text-[#556179]">
                    <Loader size="sm" showMessage={false} /> Loading ad accounts...
                  </div>
                ) : (
                  <div>
                    <label className="form-label-small">Ad account (optional, for pixel/video source)</label>
                    <Dropdown<number>
                      options={profiles.map((p) => ({
                        value: p.id,
                        label: p.name || p.account_id || `Account ${p.id}`,
                      }))}
                      value={profileId === "" ? undefined : profileId}
                      placeholder="Select ad account"
                      onChange={(val) => setProfileId(val ?? "")}
                      buttonClassName={inputClass}
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="form-label-small block mb-0">Audience rule (optional)</label>
                    <button
                      type="button"
                      onClick={handleSetExampleRules}
                      className="secondary-button text-[11px] py-1.5 px-2"
                    >
                      Set example rules
                    </button>
                  </div>
                  <CustomAudienceRuleBuilder
                    value={ruleData ?? getDefaultAudienceRule()}
                    onChange={(r) => setRuleData(r)}
                    disabled={submitLoading || profilesLoading}
                    sourceType={subtype === "OFFLINE_CONVERSION" ? "offline_conversion" : "engagement"}
                    eventSourceIdOptions={
                      pixels.length > 0 ? { pixel: pixels } : undefined
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleFillTestData}
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
            {submitLoading ? (
              <>
                <Loader size="sm" showMessage={false} />
                Creating...
              </>
            ) : (
              "Create Custom Audience"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
