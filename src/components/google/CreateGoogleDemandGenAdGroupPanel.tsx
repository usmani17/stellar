import React, { useState, useEffect } from "react";

export interface DemandGenAdGroupInput {
  name: string;
  channel_controls?: {
    gmail?: boolean;
    discover?: boolean;
    display?: boolean;
    youtube_in_feed?: boolean;
    youtube_in_stream?: boolean;
    youtube_shorts?: boolean;
  };
}

const DEFAULT_CHANNEL_CONTROLS = {
  gmail: true,
  discover: true,
  display: true,
  youtube_in_feed: true,
  youtube_in_stream: true,
  youtube_shorts: true,
};

const CHANNEL_OPTIONS = [
  { key: "gmail", label: "Gmail" },
  { key: "discover", label: "Google Discover" },
  { key: "display", label: "Display Network" },
  { key: "youtube_in_feed", label: "YouTube Feed" },
  { key: "youtube_in_stream", label: "YouTube In-Stream" },
  { key: "youtube_shorts", label: "YouTube Shorts" },
] as const;

interface CreateGoogleDemandGenAdGroupPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (entity: DemandGenAdGroupInput) => void;
  campaignId: string;
  campaignName?: string;
  loading?: boolean;
  submitError?: string | null;
}

export const CreateGoogleDemandGenAdGroupPanel: React.FC<
  CreateGoogleDemandGenAdGroupPanelProps
> = ({
  isOpen,
  onClose,
  onSubmit,
  campaignName,
  loading = false,
  submitError = null,
}) => {
  const generateDefaultName = (): string => {
    const now = new Date();
    const dateTime = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    return campaignName
      ? `${campaignName} — Ad Group ${dateTime}`
      : `Demand Gen Ad Group ${dateTime}`;
  };

  const [name, setName] = useState("");
  const [channelControls, setChannelControls] = useState<DemandGenAdGroupInput["channel_controls"]>({ ...DEFAULT_CHANNEL_CONTROLS });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setChannelControls({ ...DEFAULT_CHANNEL_CONTROLS });
      setErrors({});
    }
  }, [isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Ad group name is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      channel_controls: channelControls,
    });
  };

  const handleCancel = () => {
    setName("");
    setChannelControls({ ...DEFAULT_CHANNEL_CONTROLS });
    setErrors({});
    onClose();
  };

  const setPreset = (preset: "youtube_only" | "all") => {
    if (preset === "youtube_only") {
      setChannelControls({
        gmail: false,
        discover: false,
        display: false,
        youtube_in_feed: true,
        youtube_in_stream: true,
        youtube_shorts: true,
      });
    } else {
      setChannelControls({ ...DEFAULT_CHANNEL_CONTROLS });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Demand Gen Ad Group
        </h2>

        <div className="mb-4">
          <label className="form-label-small block mb-2">
            Ad Group Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
            }}
            placeholder="Enter ad group name"
            className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${errors.name ? "border-red-500" : "border-gray-200"}`}
          />
          {errors.name && (
            <p className="text-[10px] text-red-500 mt-1">{errors.name}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Channel Controls
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={() => setPreset("youtube_only")}
              className="px-3 py-2 bg-red-100 text-red-700 rounded text-[12px] hover:bg-red-200 transition-colors"
              title="Show ads on YouTube only"
            >
              YouTube only
            </button>
            <button
              type="button"
              onClick={() => setPreset("all")}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded text-[12px] hover:bg-gray-200 transition-colors"
              title="Show ads on all Demand Gen channels"
            >
              All channels
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white border border-gray-200 rounded">
            {CHANNEL_OPTIONS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={channelControls?.[key] ?? true}
                  onChange={(e) => {
                    setChannelControls((prev) => ({
                      ...prev,
                      [key]: e.target.checked,
                    }));
                  }}
                  className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
                />
                <span className="text-[13px] text-[#072929]">{label}</span>
              </label>
            ))}
          </div>
          <p className="text-[10px] text-[#556179] mt-1">
            Control where your Demand Gen ads appear. All channels are enabled by default.
          </p>
        </div>
      </div>

      {submitError && (
        <div className="px-4 py-3 bg-red-50 border-t border-red-200">
          <p className="text-[12px] text-red-600">{submitError}</p>
        </div>
      )}

      <div className="p-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 text-[#556179] bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-[11.2px]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="px-4 py-2 bg-[#136D6D] text-white text-[11.2px] rounded-lg hover:bg-[#0e5a5a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Creating..." : "Create Ad Group"}
        </button>
      </div>
    </div>
  );
};
