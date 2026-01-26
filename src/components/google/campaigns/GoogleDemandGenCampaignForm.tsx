// Demand Gen Campaign Form Component
// This component handles Demand Gen campaign-specific fields

import React from "react";
import type { BaseCampaignFormProps } from "./types";
import { getMinHeadlines, getMaxHeadlines, getMinDescriptions, getMaxDescriptions } from "./utils";

interface GoogleDemandGenCampaignFormProps extends BaseCampaignFormProps {
  // Headline and description handlers
  onAddHeadline: () => void;
  onRemoveHeadline: (index: number) => void;
  onUpdateHeadline: (index: number, value: string) => void;
  onAddDescription: () => void;
  onRemoveDescription: (index: number) => void;
  onUpdateDescription: (index: number, value: string) => void;
  // Preview state
  logoPreview: string | null;
  setLogoPreview: (preview: string | null) => void;
}

export const GoogleDemandGenCampaignForm: React.FC<GoogleDemandGenCampaignFormProps> = ({
  formData,
  errors,
  onChange,
  onAddHeadline,
  onRemoveHeadline,
  onUpdateHeadline,
  onAddDescription,
  onRemoveDescription,
  onUpdateDescription,
  logoPreview,
  setLogoPreview,
}) => {
  const minHeadlines = getMinHeadlines("DEMAND_GEN");
  const maxHeadlines = getMaxHeadlines();
  const minDescriptions = getMinDescriptions("DEMAND_GEN");
  const maxDescriptions = getMaxDescriptions();

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-[14px] font-semibold text-[#072929] border-b border-gray-200 pb-2">
        Demand Gen Settings
      </h3>

      {/* Final URL */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Final URL *
        </label>
        <input
          type="url"
          value={formData.final_url || ""}
          onChange={(e) => onChange("final_url", e.target.value)}
          className={`campaign-input w-full ${
            errors.final_url ? "border-red-500" : "border-gray-200"
          }`}
          placeholder="https://example.com"
        />
        {errors.final_url && (
          <p className="text-[10px] text-red-500 mt-1">
            {errors.final_url}
          </p>
        )}
      </div>

      {/* Video Input - Radio to choose between video_url and video_id */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Video Asset *
        </label>
        <div className="space-y-3">
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="video_type"
                checked={!formData.video_url || !!formData.video_id}
                onChange={() => {
                  onChange("video_url", "");
                  if (!formData.video_id) {
                    onChange("video_id", "");
                  }
                }}
                className="w-4 h-4 accent-forest-f40"
              />
              <span className="text-[13px] text-[#072929]">YouTube Video ID</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="video_type"
                checked={!!formData.video_url && !formData.video_id}
                onChange={() => {
                  onChange("video_id", "");
                  if (!formData.video_url) {
                    onChange("video_url", "");
                  }
                }}
                className="w-4 h-4 accent-forest-f40"
              />
              <span className="text-[13px] text-[#072929]">Video URL</span>
            </label>
          </div>
          
          {(!formData.video_url || formData.video_id) && (
            <div>
              <input
                type="text"
                value={formData.video_id || ""}
                onChange={(e) => {
                  onChange("video_id", e.target.value);
                  if (e.target.value) {
                    onChange("video_url", "");
                  }
                }}
                className={`campaign-input w-full ${
                  errors.video_id ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="dQw4w9WgXcQ"
              />
              {errors.video_id && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.video_id}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Enter a YouTube video ID (11 characters, e.g., dQw4w9WgXcQ)
              </p>
            </div>
          )}
          
          {(!formData.video_id || formData.video_url) && (
            <div>
              <input
                type="url"
                value={formData.video_url || ""}
                onChange={(e) => {
                  onChange("video_url", e.target.value);
                  if (e.target.value) {
                    onChange("video_id", "");
                  }
                }}
                className={`campaign-input w-full ${
                  errors.video_url ? "border-red-500" : "border-gray-200"
                }`}
                placeholder="https://example.com/video.mp4"
              />
              {errors.video_url && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.video_url}
                </p>
              )}
              <p className="text-[10px] text-[#556179] mt-1">
                Enter a valid video file URL
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Logo URL */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Logo URL *
        </label>
        <input
          type="url"
          value={formData.logo_url || ""}
          onChange={(e) => {
            onChange("logo_url", e.target.value);
            const urlValue = e.target.value.trim();
            if (urlValue && (urlValue.startsWith("http://") || urlValue.startsWith("https://"))) {
              setLogoPreview(urlValue);
            } else {
              setLogoPreview(null);
            }
          }}
          className={`campaign-input w-full ${
            errors.logo_url ? "border-red-500" : "border-gray-200"
          }`}
          placeholder="https://example.com/logo.png"
        />
        {errors.logo_url && (
          <p className="text-[10px] text-red-500 mt-1">
            {errors.logo_url}
          </p>
        )}
        {logoPreview && (
          <div className="mt-2">
            <p className="text-[10px] text-[#556179] mb-1 font-medium">Preview:</p>
            <div className="inline-block border border-gray-200 rounded p-1 bg-white">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="w-32 h-32 object-contain rounded"
                onError={() => setLogoPreview(null)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Business Name */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Business Name *
        </label>
        <input
          type="text"
          value={formData.business_name || ""}
          onChange={(e) => onChange("business_name", e.target.value)}
          className={`campaign-input w-full ${
            errors.business_name ? "border-red-500" : "border-gray-200"
          }`}
          placeholder="My Business Name"
        />
        {errors.business_name && (
          <p className="text-[10px] text-red-500 mt-1">
            {errors.business_name}
          </p>
        )}
      </div>

      {/* Headlines */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Headlines * ({minHeadlines}-{maxHeadlines} required)
          <span className="text-[10px] text-[#556179] font-normal ml-2">
            ({formData.headlines?.filter((h) => h.trim()).length || 0}/{maxHeadlines})
          </span>
        </label>
        <div className="space-y-2">
          {formData.headlines?.map((headline, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={headline}
                onChange={(e) => onUpdateHeadline(index, e.target.value)}
                className="campaign-input flex-1"
                placeholder={`Headline ${index + 1}`}
              />
              {formData.headlines && formData.headlines.length > minHeadlines && (
                <button
                  type="button"
                  onClick={() => onRemoveHeadline(index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {formData.headlines && formData.headlines.length < maxHeadlines && (
            <button
              type="button"
              onClick={onAddHeadline}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
            >
              + Add Headline
            </button>
          )}
        </div>
        {errors.headlines && (
          <p className="text-[10px] text-red-500 mt-1">
            {errors.headlines}
          </p>
        )}
      </div>

      {/* Descriptions */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Descriptions * ({minDescriptions}-{maxDescriptions} required)
          <span className="text-[10px] text-[#556179] font-normal ml-2">
            ({formData.descriptions?.filter((d) => d.trim()).length || 0}/{maxDescriptions})
          </span>
        </label>
        <div className="space-y-2">
          {formData.descriptions?.map((description, index) => (
            <div key={index} className="flex gap-2">
              <textarea
                value={description}
                onChange={(e) => onUpdateDescription(index, e.target.value)}
                rows={2}
                className="campaign-input flex-1"
                placeholder={`Description ${index + 1}`}
              />
              {formData.descriptions && formData.descriptions.length > minDescriptions && (
                <button
                  type="button"
                  onClick={() => onRemoveDescription(index)}
                  className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-[12px]"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
          {formData.descriptions && formData.descriptions.length < maxDescriptions && (
            <button
              type="button"
              onClick={onAddDescription}
              className="px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 text-[12px]"
            >
              + Add Description
            </button>
          )}
        </div>
        {errors.descriptions && (
          <p className="text-[10px] text-red-500 mt-1">
            {errors.descriptions}
          </p>
        )}
      </div>

      {/* Optional Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Long Headline
          </label>
          <input
            type="text"
            value={formData.long_headline || ""}
            onChange={(e) => onChange("long_headline", e.target.value)}
            className="campaign-input w-full"
            placeholder="Optional long headline"
          />
        </div>

        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Ad Group Name
          </label>
          <input
            type="text"
            value={formData.ad_group_name || ""}
            onChange={(e) => onChange("ad_group_name", e.target.value)}
            className="campaign-input w-full"
            placeholder="Optional ad group name"
          />
        </div>

        <div>
          <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
            Ad Name
          </label>
          <input
            type="text"
            value={formData.ad_name || ""}
            onChange={(e) => onChange("ad_name", e.target.value)}
            className="campaign-input w-full"
            placeholder="Optional ad name"
          />
        </div>
      </div>

      {/* Channel Controls */}
      <div>
        <label className="block text-[11.2px] font-semibold text-[#556179] mb-2 uppercase">
          Channel Controls
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-3 bg-white border border-gray-200 rounded">
          {[
            { key: "gmail", label: "Gmail" },
            { key: "discover", label: "Google Discover" },
            { key: "display", label: "Display Network" },
            { key: "youtube_in_feed", label: "YouTube Feed" },
            { key: "youtube_in_stream", label: "YouTube In-Stream" },
            { key: "youtube_shorts", label: "YouTube Shorts" },
          ].map((channel) => (
            <label key={channel.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.channel_controls?.[channel.key as keyof typeof formData.channel_controls] ?? true}
                onChange={(e) => {
                  const current = formData.channel_controls || {};
                  onChange("channel_controls", {
                    ...current,
                    [channel.key]: e.target.checked,
                  });
                }}
                className="w-4 h-4 accent-forest-f40 border-gray-300 rounded focus:ring-forest-f40"
              />
              <span className="text-[13px] text-[#072929]">{channel.label}</span>
            </label>
          ))}
        </div>
        <p className="text-[10px] text-[#556179] mt-1">
          Control where your Demand Gen ads appear. All channels are enabled by default.
        </p>
      </div>
    </div>
  );
};
