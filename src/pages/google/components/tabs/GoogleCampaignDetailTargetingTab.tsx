import React, { useState } from "react";
import { Target, Plus, Trash2 } from "lucide-react";
import { Button } from "../../../../components/ui";
import { Loader } from "../../../../components/ui/Loader";
import { googleAdwordsAdGroupsService } from "../../../../services/googleAdwords/googleAdwordsAdGroups";
import type { GoogleAdGroup } from "./GoogleTypes";

interface GoogleCampaignDetailTargetingTabProps {
  accountId: string | undefined;
  channelId: string | undefined;
  campaignId: string | undefined;
  adgroups: GoogleAdGroup[];
}

export const GoogleCampaignDetailTargetingTab: React.FC<
  GoogleCampaignDetailTargetingTabProps
> = ({ accountId, channelId, campaignId, adgroups }) => {
  const [selectedAdGroupId, setSelectedAdGroupId] = useState<string>("");
  const [audienceAdds, setAudienceAdds] = useState<
    Array<{ user_list_resource_name: string; bid_modifier: string }>
  >([{ user_list_resource_name: "", bid_modifier: "" }]);
  const [audienceExcludes, setAudienceExcludes] = useState<string[]>([""]);
  const [locationGeoIds, setLocationGeoIds] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const addAudienceAdd = () => {
    setAudienceAdds((prev) => [...prev, { user_list_resource_name: "", bid_modifier: "" }]);
  };
  const removeAudienceAdd = (index: number) => {
    setAudienceAdds((prev) => prev.filter((_, i) => i !== index));
  };
  const updateAudienceAdd = (
    index: number,
    field: "user_list_resource_name" | "bid_modifier",
    value: string
  ) => {
    setAudienceAdds((prev) =>
      prev.map((row, i) =>
        i === index ? { ...row, [field]: value } : row
      )
    );
  };

  const addAudienceExclude = () => setAudienceExcludes((prev) => [...prev, ""]);
  const removeAudienceExclude = (index: number) => {
    setAudienceExcludes((prev) => prev.filter((_, i) => i !== index));
  };
  const updateAudienceExclude = (index: number, value: string) => {
    setAudienceExcludes((prev) =>
      prev.map((v, i) => (i === index ? value : v))
    );
  };

  const addLocation = () => setLocationGeoIds((prev) => [...prev, ""]);
  const removeLocation = (index: number) => {
    setLocationGeoIds((prev) => prev.filter((_, i) => i !== index));
  };
  const updateLocation = (index: number, value: string) => {
    setLocationGeoIds((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  const handleSubmit = async () => {
    if (!accountId || !channelId || !campaignId || !selectedAdGroupId) {
      setMessage({ type: "error", text: "Please select an ad group." });
      return;
    }

    const adds = audienceAdds
      .filter((a) => (a.user_list_resource_name || "").trim().startsWith("customers/"))
      .map((a) => {
        const bid = a.bid_modifier.trim() ? parseFloat(a.bid_modifier) : undefined;
        return {
          user_list_resource_name: a.user_list_resource_name.trim(),
          ...(typeof bid === "number" && !Number.isNaN(bid) && bid > 0
            ? { bid_modifier: bid }
            : {}),
        };
      });
    const excludes = audienceExcludes.filter(
      (s) => (s || "").trim().startsWith("customers/")
    );
    const geoIds = locationGeoIds.filter((s) => (s || "").trim().length > 0);

    if (adds.length === 0 && excludes.length === 0 && geoIds.length === 0) {
      setMessage({
        type: "error",
        text: "Add at least one audience (resource name) or location (geo ID). Use full resource names, e.g. customers/123/userLists/456.",
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);
    try {
      const accountIdNum = parseInt(accountId, 10);
      const channelIdNum = parseInt(channelId, 10);
      if (isNaN(accountIdNum) || isNaN(channelIdNum)) {
        throw new Error("Invalid account or channel");
      }
      const result = await googleAdwordsAdGroupsService.addAdGroupTargeting(
        accountIdNum,
        channelIdNum,
        campaignId,
        selectedAdGroupId,
        {
          audience_adds: adds.length ? adds : undefined,
          audience_excludes: excludes.length ? excludes : undefined,
          location_geo_ids: geoIds.length ? geoIds : undefined,
        }
      );
      setMessage({
        type: "success",
        text: result.message || `Added ${result.criterion_resource_names?.length ?? 0} targeting criteria.`,
      });
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e?.response?.data?.error || e?.message || "Failed to add targeting.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const selectableAdgroups = adgroups.filter(
    (ag) => (ag.status || "").toUpperCase() !== "REMOVED"
  );

  if (!accountId || !channelId || !campaignId) {
    return (
      <div className="p-6 text-center text-[#556179] text-[13.3px]">
        Missing account, channel, or campaign context.
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-2xl">
        <h3 className="text-lg font-medium text-[#072929] mb-4 flex items-center gap-2">
          <Target className="w-5 h-5" />
          Ad group targeting
        </h3>
        <p className="text-[13.3px] text-[#556179] mb-6">
          Add audiences (remarketing lists), exclusions, and locations to an ad group. Select an ad group below, then add resource names or geo IDs and apply.
        </p>

        <div className="space-y-6">
          <div>
            <label className="block text-[10.64px] font-semibold text-[#556179] uppercase tracking-wide mb-2">
              Ad group
            </label>
            <select
              value={selectedAdGroupId}
              onChange={(e) => setSelectedAdGroupId(e.target.value)}
              className="w-full px-4 py-2.5 border border-[#e8e8e3] rounded-lg bg-[#FEFEFB] text-[13.3px] text-[#072929] focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
            >
              <option value="">Select ad group</option>
              {selectableAdgroups.map((ag) => (
                <option key={ag.id} value={String(ag.adgroup_id)}>
                  {ag.name || ag.adgroup_name || `Ad group ${ag.adgroup_id}`}
                </option>
              ))}
            </select>
            {selectableAdgroups.length === 0 && (
              <p className="mt-1 text-[11.2px] text-[#556179]">
                No ad groups in this campaign. Create one from the Ad Groups tab.
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10.64px] font-semibold text-[#556179] uppercase tracking-wide mb-2">
              Add audiences (user list resource names)
            </label>
            <p className="text-[11.2px] text-[#556179] mb-2">
              e.g. customers/8511124284/userLists/987654321 — optional bid modifier (e.g. 1.3 for +30%).
            </p>
            {audienceAdds.map((row, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="customers/XXX/userLists/YYY"
                  value={row.user_list_resource_name}
                  onChange={(e) =>
                    updateAudienceAdd(index, "user_list_resource_name", e.target.value)
                  }
                  className="flex-1 px-4 py-2 border border-[#e8e8e3] rounded-lg bg-[#FEFEFB] text-[13.3px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                />
                <input
                  type="text"
                  placeholder="1.3"
                  value={row.bid_modifier}
                  onChange={(e) => updateAudienceAdd(index, "bid_modifier", e.target.value)}
                  className="w-20 px-2 py-2 border border-[#e8e8e3] rounded-lg bg-[#FEFEFB] text-[13.3px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                  title="Bid modifier (e.g. 1.3 = +30%)"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => removeAudienceAdd(index)}
                  disabled={audienceAdds.length <= 1}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addAudienceAdd} className="mt-1">
              <Plus className="w-4 h-4 mr-1" />
              Add audience
            </Button>
          </div>

          <div>
            <label className="block text-[10.64px] font-semibold text-[#556179] uppercase tracking-wide mb-2">
              Exclude audiences (user list resource names)
            </label>
            {audienceExcludes.map((value, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="customers/XXX/userLists/YYY"
                  value={value}
                  onChange={(e) => updateAudienceExclude(index, e.target.value)}
                  className="flex-1 px-4 py-2 border border-[#e8e8e3] rounded-lg bg-[#FEFEFB] text-[13.3px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => removeAudienceExclude(index)}
                  disabled={audienceExcludes.length <= 1}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addAudienceExclude} className="mt-1">
              <Plus className="w-4 h-4 mr-1" />
              Add exclusion
            </Button>
          </div>

          <div>
            <label className="block text-[10.64px] font-semibold text-[#556179] uppercase tracking-wide mb-2">
              Locations (geo target constant IDs)
            </label>
            <p className="text-[11.2px] text-[#556179] mb-2">
              e.g. 2840 (US), 1023191 (Lahore). Find IDs in Tools &amp; settings → Geo targeting or via API.
            </p>
            {locationGeoIds.map((value, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="2840"
                  value={value}
                  onChange={(e) => updateLocation(index, e.target.value)}
                  className="flex-1 max-w-[200px] px-4 py-2 border border-[#e8e8e3] rounded-lg bg-[#FEFEFB] text-[13.3px] focus:outline-none focus:ring-2 focus:ring-[#136D6D]"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => removeLocation(index)}
                  disabled={locationGeoIds.length <= 1}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addLocation} className="mt-1">
              <Plus className="w-4 h-4 mr-1" />
              Add location
            </Button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-[13.3px] ${
                message.type === "success"
                  ? "bg-green-50 text-green-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={submitting || !selectedAdGroupId || selectableAdgroups.length === 0}
              className="create-entity-button"
            >
              {submitting ? (
                <Loader size="sm" showMessage={false} className="mr-2" />
              ) : null}
              {submitting ? "Adding…" : "Add targeting"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
