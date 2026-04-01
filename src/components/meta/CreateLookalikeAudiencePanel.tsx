import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { Dropdown } from "../ui/Dropdown";
import { Loader } from "../../components/ui/Loader";
import { META_COUNTRY_CODES, META_COUNTRY_LABELS } from "./metaCountryCodes";
import type { LookalikeAudienceCreatePayload } from "../../types/meta";

const inputClass = "campaign-input w-full";

const COUNTRY_OPTIONS = [...META_COUNTRY_CODES].map((code) => ({
  value: code,
  label: `${META_COUNTRY_LABELS[code] ?? code} (${code})`,
}));

const RATIO_OPTIONS = [
  { value: 0.01, label: "1% (Most similar)" },
  { value: 0.02, label: "2%" },
  { value: 0.03, label: "3%" },
  { value: 0.04, label: "4%" },
  { value: 0.05, label: "5%" },
  { value: 0.06, label: "6%" },
  { value: 0.07, label: "7%" },
  { value: 0.08, label: "8%" },
  { value: 0.09, label: "9%" },
  { value: 0.1, label: "10% (Largest audience)" },
];

export interface CreateLookalikeAudiencePanelProps {
  channelId: number;
  accountId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

export const CreateLookalikeAudiencePanel: React.FC<CreateLookalikeAudiencePanelProps> = ({
  channelId,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [originAudienceId, setOriginAudienceId] = useState("");
  const [country, setCountry] = useState("US");
  const [ratio, setRatio] = useState<number>(0.01);
  const [audiences, setAudiences] = useState<Array<{ audience_id: string; name: string }>>([]);
  const [audiencesLoading, setAudiencesLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAudiencesLoading(true);
    accountsService
      .getMetaAudiences(channelId, { page: 1, page_size: 100 })
      .then((res) => {
        const list = (res.audiences || []).map((a) => ({
          audience_id: String(a.audience_id ?? ""),
          name: a.name || a.audience_id || "",
        }));
        setAudiences(list.filter((a) => a.audience_id));
      })
      .catch(() => setAudiences([]))
      .finally(() => setAudiencesLoading(false));
  }, [channelId]);

  useEffect(() => {
    if (audiences.length > 0 && !originAudienceId) {
      setOriginAudienceId(audiences[0].audience_id);
    }
  }, [audiences, originAudienceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!originAudienceId.trim()) {
      setError("Seed audience is required.");
      return;
    }
    if (!country.trim()) {
      setError("Country is required.");
      return;
    }
    const countryCode = country.trim().toUpperCase();
    setSubmitLoading(true);
    try {
      const payload: LookalikeAudienceCreatePayload = {
        origin_audience_id: originAudienceId.trim(),
        lookalike_spec: {
          country: countryCode,
          ratio,
        },
      };
      if (name.trim()) payload.name = name.trim();

      await accountsService.createMetaLookalikeAudience(channelId, payload);
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
            : "Failed to create lookalike audience. Audiences API may not be available yet.";
      setError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">Create Lookalike Audience</h2>
        </div>

        <div className="p-4 border-b border-gray-200">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-[12px] text-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="form-label-small">Name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. US Lookalike 1%"
                className={inputClass}
              />
            </div>

            <div>
              <label className="form-label-small">Seed audience *</label>
              {audiencesLoading ? (
                <div className="flex items-center gap-2 text-[12px] text-[#556179] py-2">
                  <Loader size="sm" showMessage={false} /> Loading audiences...
                </div>
              ) : (
                <Dropdown<string>
                  options={audiences.map((a) => ({
                    value: a.audience_id,
                    label: a.name ? `${a.name} (${a.audience_id})` : a.audience_id,
                  }))}
                  value={originAudienceId}
                  placeholder="Select seed audience"
                  onChange={(val) => setOriginAudienceId(val)}
                  buttonClassName={inputClass}
                  searchable
                  searchPlaceholder="Search audiences..."
                  emptyMessage="No audiences found. Create a custom audience first."
                />
              )}
              <p className="text-[11px] text-[#556179] mt-1">
                Custom audience to use as the seed for the lookalike.
              </p>
            </div>

            <div>
              <label className="form-label-small">Country *</label>
              <Dropdown<string>
                options={COUNTRY_OPTIONS}
                value={country}
                placeholder="Select country"
                onChange={(val) => setCountry(val)}
                buttonClassName={inputClass}
                searchable
                searchPlaceholder="Search countries..."
                emptyMessage="No countries available"
              />
            </div>

            <div>
              <label className="form-label-small">Similarity ratio</label>
              <select
                value={ratio}
                onChange={(e) => setRatio(Number(e.target.value))}
                className={inputClass}
              >
                {RATIO_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-[#556179] mt-1">
                Top 1% = most similar; 10% = largest audience.
              </p>
            </div>
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
              "Create Lookalike Audience"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
