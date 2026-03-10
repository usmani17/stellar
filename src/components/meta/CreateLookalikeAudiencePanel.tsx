import React, { useState } from "react";
import { accountsService } from "../../services/accounts";
import { Loader } from "../../components/ui/Loader";
import type { LookalikeAudienceCreatePayload } from "../../types/meta";

const inputClass = "campaign-input w-full";

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
  const [country, setCountry] = useState("");
  const [ratio, setRatio] = useState<number>(0.01);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!originAudienceId.trim()) {
      setError("Seed audience ID is required.");
      return;
    }
    if (!country.trim()) {
      setError("Country code is required (e.g. US).");
      return;
    }
    const countryCode = country.trim().toUpperCase();
    if (countryCode.length !== 2) {
      setError("Country must be a 2-letter ISO code (e.g. US).");
      return;
    }
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
              <label className="form-label-small">Seed audience ID *</label>
              <input
                type="text"
                value={originAudienceId}
                onChange={(e) => setOriginAudienceId(e.target.value)}
                placeholder="Custom audience ID to base lookalike on"
                className={inputClass}
              />
              <p className="text-[11px] text-[#556179] mt-1">
                The ID of the Custom Audience to use as the seed.
              </p>
            </div>

            <div>
              <label className="form-label-small">Country code *</label>
              <input
                type="text"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. US"
                maxLength={2}
                className={inputClass}
              />
              <p className="text-[11px] text-[#556179] mt-1">
                ISO 3166-1 alpha-2 (e.g. US, GB).
              </p>
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
