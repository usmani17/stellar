import React, { useState, useEffect } from "react";
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
import { audienceRuleToJsonString, getDefaultAudienceRule } from "../../types/meta";

export interface MetaProfileOption {
  id: number;
  name: string;
  account_id?: string;
  ad_account_id?: string;
}

const SUBTYPE_OPTIONS: { value: MetaCustomAudienceSubtype; label: string }[] = [
  { value: "CUSTOM", label: "Customer list" },
  { value: "WEBSITE", label: "Website (Pixel data)" },
  { value: "APP", label: "App events" },
  { value: "OFFLINE_EVENT", label: "Offline conversions" },
  { value: "LOOKALIKE", label: "Lookalike (Similar users)" },
  { value: "ENGAGEMENT", label: "Engagement (Meta content)" },
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
  const [prefill, setPrefill] = useState(false);
  const [profileId, setProfileId] = useState<number | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showCustomerFileSource = subtype === "CUSTOM";
  const showRetentionAndRule = subtype === "WEBSITE" || subtype === "APP";

  useEffect(() => {
    if (!showRetentionAndRule) return;
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
  }, [channelId, showRetentionAndRule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Audience name is required.");
      return;
    }
    if (subtype === "CUSTOM" && !customerFileSource) {
      setError("Customer file source is required for customer list audiences.");
      return;
    }
    if (showRetentionAndRule && (profileId === "" || profileId == null)) {
      setError("Please select an ad account for website/app audiences.");
      return;
    }
    setSubmitLoading(true);
    try {
      const payload: CustomAudienceCreatePayload = {
        name: name.trim(),
        subtype,
      };
      if (description.trim()) payload.description = description.trim();
      if (subtype === "CUSTOM" && customerFileSource) {
        payload.customer_file_source = customerFileSource;
      }
      if (showRetentionAndRule && retentionDays !== "" && !Number.isNaN(Number(retentionDays))) {
        payload.retention_days = Number(retentionDays);
      }
      if (showRetentionAndRule) {
        const ruleToSend = ruleData ?? getDefaultAudienceRule();
        payload.rule = audienceRuleToJsonString(ruleToSend);
        payload.prefill = prefill;
        if (profileId !== "" && profileId != null) {
          payload.profile_id = Number(profileId);
        }
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
            : "Failed to create custom audience. Audiences API may not be available yet.";
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
                placeholder="e.g. My customer list"
                className={inputClass}
              />
            </div>

            <div>
              <label className="form-label-small">Subtype</label>
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
                placeholder="Brief summary of the audience"
                className={inputClass}
              />
            </div>

            {showCustomerFileSource && (
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
            )}

            {showRetentionAndRule && (
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
                <div>
                  <label className="form-label-small">Retention days (optional)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={retentionDays}
                    onChange={(e) => setRetentionDays(e.target.value)}
                    placeholder="e.g. 30"
                    className={inputClass}
                  />
                  <p className="text-[11px] text-[#556179] mt-1">
                    How long a person remains in the audience after the last event (e.g. 30, 90, 180).
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="form-label-small block mb-2">Audience rule</label>
                  <CustomAudienceRuleBuilder
                    value={ruleData ?? getDefaultAudienceRule()}
                    onChange={(r) => setRuleData(r)}
                    disabled={submitLoading || profilesLoading}
                    sourceType={subtype === "APP" ? "app" : "website"}
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
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
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
