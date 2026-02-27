import React, { useState, useEffect } from "react";
import { accountsService } from "../../services/accounts";
import { metaCreativesService } from "../../services/meta";
import type { CreateMetaCreativePayload, MetaObjectStorySpec } from "../../types/meta";
import { Loader } from "../ui/Loader";

export interface MetaProfileOption {
  id: number;
  name: string;
}

export interface CreateMetaCreativePanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass =
  "campaign-input w-full";

export const CreateMetaCreativePanel: React.FC<CreateMetaCreativePanelProps> = ({
  channelId,
  onSuccess,
  onClose,
}) => {
  const [name, setName] = useState("");
  const [pageId, setPageId] = useState("");
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [picture, setPicture] = useState("");
  const [callToAction, setCallToAction] = useState("LEARN_MORE");
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
        const list = (res.profiles || []) as Array<{ id?: number; name?: string }>;
        const withId = list.filter((p) => p.id != null) as MetaProfileOption[];
        setProfiles(withId);
        if (withId.length > 0 && profileId === "") setProfileId(withId[0].id);
      })
      .catch(() => { if (!cancelled) setProfiles([]); })
      .finally(() => { if (!cancelled) setProfilesLoading(false); });
    return () => { cancelled = true; };
  }, [channelId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Creative name is required."); return; }
    if (!pageId.trim()) { setError("Facebook Page ID is required."); return; }
    if (profileId === "" || profileId == null) { setError("Please select an ad account."); return; }
    const object_story_spec: MetaObjectStorySpec = {
      page_id: pageId.trim(),
      link_data: {
        message: message.trim() || undefined,
        link: link.trim() || undefined,
        picture: picture.trim() || undefined,
        call_to_action: { type: callToAction },
      },
    };
    setSubmitLoading(true);
    try {
      const payload: CreateMetaCreativePayload = {
        profile_id: Number(profileId),
        name: name.trim(),
        object_story_spec,
      };
      await metaCreativesService.createMetaCreative(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
        : err instanceof Error ? err.message : "Failed to create creative.";
      setError(String(msg));
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl shadow-sm w-full bg-[#f9f9f6] mb-4">
      <form onSubmit={handleSubmit}>
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-[16px] font-semibold text-[#072929]">
            Create Ad Creative
          </h2>
        </div>

        {profilesLoading ? (
          <>
            <div className="p-4 border-b border-gray-200 py-6 flex justify-center">
              <Loader size="md" message="Loading ad accounts..." />
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
            </div>
          </>
        ) : profiles.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad accounts found. Save ad accounts in channel settings first.
              </p>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="cancel-button">Cancel</button>
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
                  Creative details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label-small">Ad account *</label>
                    <select
                      value={profileId === "" ? "" : profileId}
                      onChange={(e) => setProfileId(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputClass}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.name || `Account ${p.id}`}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">Creative name *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Summer sale image"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Facebook Page ID *</label>
                    <input
                      type="text"
                      value={pageId}
                      onChange={(e) => setPageId(e.target.value)}
                      placeholder="Page ID where the ad will be published"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Call to action</label>
                    <select
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      className={inputClass}
                    >
                      <option value="LEARN_MORE">Learn More</option>
                      <option value="SHOP_NOW">Shop Now</option>
                      <option value="SIGN_UP">Sign Up</option>
                      <option value="DOWNLOAD">Download</option>
                      <option value="BOOK_TRAVEL">Book Travel</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                  Link and creative
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="form-label-small">Message (optional)</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={2}
                      placeholder="Ad copy"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Link URL (optional)</label>
                    <input
                      type="url"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="form-label-small">Image URL (optional)</label>
                    <input
                      type="url"
                      value={picture}
                      onChange={(e) => setPicture(e.target.value)}
                      placeholder="https://..."
                      className={inputClass}
                    />
                  </div>
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
                {submitLoading ? "Creating..." : "Create creative"}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
};
