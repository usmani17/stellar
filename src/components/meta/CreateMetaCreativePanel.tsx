import React, { useEffect, useMemo, useState } from "react";
import { accountsService } from "../../services/accounts";
import {
  metaCreativesService,
  metaImagesService,
  metaVideosService,
} from "../../services/meta";
import type {
  CreateMetaCreativePayload,
  MetaCreativeType,
  MetaCreativeCarouselCard,
} from "../../types/meta";
import { Loader } from "../ui/Loader";
import { Dropdown } from "../ui/Dropdown";

export interface MetaProfileOption {
  id: number;
  name: string;
}

export interface CreateMetaCreativePanelProps {
  channelId: number;
  onSuccess: () => void;
  onClose: () => void;
}

const inputClass = "campaign-input w-full";
const HARDCODED_PAGE_ID = "1987399148246485";
const ctaOptions = [
  "LEARN_MORE",
  "SHOP_NOW",
  "SIGN_UP",
  "DOWNLOAD",
  "BOOK_TRAVEL",
  "CONTACT_US",
  "WATCH_MORE",
];

type UiCreativeType = MetaCreativeType;

interface MetaPageOption {
  id: string;
  name: string;
  category?: string;
}

interface CarouselCardForm {
  id: string;
  title: string;
  link: string;
  imageHash: string;
  imageUrl: string;
  videoId: string;
}

const makeCard = (seed: number): CarouselCardForm => ({
  id: `card-${seed}`,
  title: "",
  link: "",
  imageHash: "",
  imageUrl: "",
  videoId: "",
});

const isValidHttpUrl = (value: string): boolean => {
  const v = value.trim();
  if (!v) return false;
  try {
    const url = new URL(v);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Simple in-memory cache for creative creation options.
// Lives for the lifetime of the page (cleared on full refresh).
const profilesCache = new Map<number, MetaProfileOption[]>(); // key: channelId
const imagesCache = new Map<number, Array<{ hash: string; name: string; url?: string }>>(); // key: channelId
const videosCache = new Map<number, Array<{ id: string; title: string }>>(); // key: channelId

export const CreateMetaCreativePanel: React.FC<
  CreateMetaCreativePanelProps
> = ({ channelId, onSuccess, onClose }) => {
  const [creativeType, setCreativeType] = useState<UiCreativeType>("link_image");
  const [name, setName] = useState("");
  const [pageId] = useState(HARDCODED_PAGE_ID);

  const [linkMessage, setLinkMessage] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkImageHash, setLinkImageHash] = useState("");
  const [linkImageUrl, setLinkImageUrl] = useState("");

  const [videoMessage, setVideoMessage] = useState("");
  const [videoId, setVideoId] = useState("");
  const [videoDestinationUrl, setVideoDestinationUrl] = useState("");
  const [videoImageHash, setVideoImageHash] = useState("");
  const [videoImageUrl, setVideoImageUrl] = useState("");

  const [carouselMessage, setCarouselMessage] = useState("");
  const [carouselLink, setCarouselLink] = useState("");
  const [carouselCards, setCarouselCards] = useState<CarouselCardForm[]>([
    makeCard(1),
    makeCard(2),
  ]);

  const [collectionProductSetId, setCollectionProductSetId] = useState("");
  const [collectionHeadline, setCollectionHeadline] = useState("");
  const [collectionBody, setCollectionBody] = useState("");
  const [collectionCoverImageHash, setCollectionCoverImageHash] = useState("");
  const [collectionCoverImageUrl, setCollectionCoverImageUrl] = useState("");
  const [collectionCoverVideoId, setCollectionCoverVideoId] = useState("");

  const [images, setImages] = useState<
    Array<{ hash: string; name: string; url?: string }>
  >([]);
  const [videos, setVideos] = useState<Array<{ id: string; title: string }>>([]);
  const [assetsLoading, setAssetsLoading] = useState(true);

  const [callToAction, setCallToAction] = useState("LEARN_MORE");
  const [profileId, setProfileId] = useState<number | "">("");
  const [profiles, setProfiles] = useState<MetaProfileOption[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFillTest = () => {
    if (profiles.length > 0 && profileId === "") {
      setProfileId(profiles[0].id);
    }
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    setName((prev) => {
      const base = prev.trim() || "Test Multi Format Creative";
      return /\d{10,}$/.test(base) ? base : `${base} ${stamp}`;
    });

    if (creativeType === "link_image") {
      setLinkMessage((m) =>
        m.trim() ? m : "Sample link creative copy for testing.",
      );
      setLinkUrl((l) => (l.trim() ? l : "https://www.example.com/landing"));
      if (!linkImageHash && images.length > 0) {
        setLinkImageHash(images[0].hash);
      }
      setLinkImageUrl((u) =>
        u.trim() ? u : "https://picsum.photos/seed/meta-link/1200/628",
      );
    } else if (creativeType === "video") {
      setVideoMessage((m) =>
        m.trim() ? m : "Sample video creative copy for testing.",
      );
      if (!videoId && videos.length > 0) {
        setVideoId(videos[0].id);
      }
      setVideoDestinationUrl((u) =>
        u.trim() ? u : "https://www.example.com/video-destination",
      );
      if (!videoImageHash && images.length > 0) {
        setVideoImageHash(images[0].hash);
      }
    } else if (creativeType === "carousel") {
      setCarouselMessage((m) =>
        m.trim() ? m : "Sample carousel primary text.",
      );
      setCarouselLink((l) => (l.trim() ? l : "https://www.example.com/store"));
      setCarouselCards((prev) =>
        prev.map((card, idx) => ({
          ...card,
          title: card.title || `Card ${idx + 1}`,
          link: card.link || `https://www.example.com/store/${idx + 1}`,
          imageHash:
            card.imageHash || (images[idx] ? images[idx].hash : images[0]?.hash || ""),
        })),
      );
    } else {
      setCollectionProductSetId((p) =>
        p.trim() ? p : "123456789012345",
      );
      setCollectionHeadline((h) => h.trim() ? h : "Collection headline");
      setCollectionBody((b) => b.trim() ? b : "Collection body copy placeholder.");
      if (!collectionCoverImageHash && images.length > 0) {
        setCollectionCoverImageHash(images[0].hash);
      }
    }

    setCallToAction("LEARN_MORE");
    setError(null);
  };

  useEffect(() => {
    let cancelled = false;

    const cached = profilesCache.get(channelId);
    if (cached) {
      setProfiles(cached);
      if (cached.length > 0 && profileId === "") setProfileId(cached[0].id);
      setProfilesLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setProfilesLoading(true);
    accountsService
      .fetchMetaProfiles(channelId)
      .then((res) => {
        if (cancelled) return;
        const list = (res.profiles || []) as Array<{
          id?: number;
          name?: string;
        }>;
        const withId = list.filter((p) => p.id != null) as MetaProfileOption[];
        profilesCache.set(channelId, withId);
        setProfiles(withId);
        if (withId.length > 0 && profileId === "") setProfileId(withId[0].id);
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
  }, [channelId, profileId]);

  useEffect(() => {
    let cancelled = false;

    const cachedImages = imagesCache.get(channelId);
    const cachedVideos = videosCache.get(channelId);
    if (cachedImages && cachedVideos) {
      setImages(cachedImages);
      setVideos(cachedVideos);
      setAssetsLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setAssetsLoading(true);
    Promise.all([
      metaImagesService.listMetaImages(channelId, { page: 1, page_size: 100 }),
      metaVideosService.listMetaVideos(channelId, { page: 1, page_size: 100 }),
    ])
      .then(([imagesRes, videosRes]) => {
        if (cancelled) return;
        const mappedImages = (imagesRes.images || [])
          .map((img) => ({
            hash: String(img.hash || "").trim(),
            name: String(img.name || img.hash || "Image"),
            url: img.url ? String(img.url) : undefined,
          }))
          .filter((img) => img.hash);
        const mappedVideos = (videosRes.videos || [])
          .map((v) => ({
            id: String(v.video_id || "").trim(),
            title: String(v.title || v.video_id || "Video"),
          }))
          .filter((v) => v.id);
        setImages(mappedImages);
        setVideos(mappedVideos);
        imagesCache.set(channelId, mappedImages);
        videosCache.set(channelId, mappedVideos);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setImages([]);
        setVideos([]);
      })
      .finally(() => {
        if (!cancelled) setAssetsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [channelId]);

  const imageOptions = useMemo(
    () =>
      images.map((img) => ({
        value: img.hash,
        label: `${img.name} (${img.hash})`,
      })),
    [images],
  );
  const imageUrlOptions = useMemo(
    () =>
      images
        .filter((img) => Boolean(img.url && String(img.url).trim()))
        .map((img) => ({
          value: String(img.url || "").trim(),
          label: `${img.name} (${String(img.url || "").trim()})`,
        })),
    [images],
  );
  const videoOptions = useMemo(
    () =>
      videos.map((v) => ({
        value: v.id,
        label: `${v.title} (${v.id})`,
      })),
    [videos],
  );

  const mapBackendError = (err: unknown): string => {
    if (!(err && typeof err === "object" && "response" in err)) {
      return err instanceof Error ? err.message : "Failed to create creative.";
    }
    const data = (err as { response?: { data?: { error?: string; field?: string } } })
      .response?.data;
    const message = data?.error || "Failed to create creative.";
    const field = data?.field || "";
    if (!field) return message;

    const sectionPrefix =
      field.startsWith("spec.cards")
        ? "Carousel"
        : field.startsWith("spec.video") || field.includes("video")
          ? "Video"
          : field.startsWith("spec.product_set_id") || field.includes("collection")
            ? "Collection"
            : field.startsWith("spec.")
              ? "Creative spec"
              : "Form";
    return `${sectionPrefix}: ${message}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Creative name is required.");
      return;
    }
    if (profileId === "" || profileId == null) {
      setError("Please select an ad account.");
      return;
    }
    if (!pageId.trim()) {
      setError("Please select a Facebook Page.");
      return;
    }

    if (creativeType === "link_image") {
      if (!linkUrl.trim() || !isValidHttpUrl(linkUrl)) {
        setError("Link format requires a valid destination URL.");
        return;
      }
      const hasHash = Boolean(linkImageHash.trim());
      const hasUrl = Boolean(linkImageUrl.trim());
      if (hasHash && hasUrl) {
        setError("Choose either an image hash or an image URL (not both).");
        return;
      }
      if (!hasHash && !hasUrl) {
        setError("Link format requires either an image hash or an image URL.");
        return;
      }
      if (linkImageUrl.trim() && !isValidHttpUrl(linkImageUrl)) {
        setError("Link image URL must be a valid HTTP/HTTPS URL.");
        return;
      }
    }

    if (creativeType === "video") {
      if (!videoId.trim()) {
        setError("Video format requires a video ID.");
        return;
      }
      if (videoDestinationUrl.trim() && !isValidHttpUrl(videoDestinationUrl)) {
        setError("Video destination URL must be a valid HTTP/HTTPS URL.");
        return;
      }
      if (videoImageUrl.trim() && !isValidHttpUrl(videoImageUrl)) {
        setError("Video thumbnail URL must be a valid HTTP/HTTPS URL.");
        return;
      }
    }

    if (creativeType === "carousel") {
      if (carouselCards.length < 2) {
        setError("Carousel format requires at least 2 cards.");
        return;
      }
      if (carouselCards.length > 10) {
        setError("Carousel format supports up to 10 cards.");
        return;
      }
      const invalidCard = carouselCards.find(
        (c) =>
          !c.title.trim() ||
          !c.link.trim() ||
          !isValidHttpUrl(c.link) ||
          (!c.imageHash.trim() && !c.imageUrl.trim() && !c.videoId.trim()),
      );
      if (invalidCard) {
        setError(
          "Each carousel card needs title, valid link URL, and media (image hash/image URL/video ID).",
        );
        return;
      }
    }

    if (creativeType === "collection") {
      if (!collectionProductSetId.trim()) {
        setError("Collection format requires a product set ID.");
        return;
      }
      if (
        !collectionCoverImageHash.trim() &&
        !collectionCoverImageUrl.trim() &&
        !collectionCoverVideoId.trim()
      ) {
        setError(
          "Collection format requires cover media (image hash, image URL, or video ID).",
        );
        return;
      }
      if (collectionCoverImageUrl.trim() && !isValidHttpUrl(collectionCoverImageUrl)) {
        setError("Collection cover image URL must be a valid HTTP/HTTPS URL.");
        return;
      }
    }

    setSubmitLoading(true);
    try {
      let payload: CreateMetaCreativePayload;
      if (creativeType === "link_image") {
        payload = {
          profile_id: Number(profileId),
          creative_type: "link_image",
          spec: {
            name: name.trim(),
            page_id: pageId.trim(),
            message: linkMessage.trim() || undefined,
            link: linkUrl.trim(),
            image_hash: linkImageHash.trim() || undefined,
            image_url: linkImageUrl.trim() || undefined,
            call_to_action_type: callToAction,
          },
        };
      } else if (creativeType === "video") {
        payload = {
          profile_id: Number(profileId),
          creative_type: "video",
          spec: {
            name: name.trim(),
            page_id: pageId.trim(),
            message: videoMessage.trim() || undefined,
            video_id: videoId.trim(),
            destination_url: videoDestinationUrl.trim() || undefined,
            image_hash: videoImageHash.trim() || undefined,
            image_url: videoImageUrl.trim() || undefined,
            call_to_action_type: callToAction,
          },
        };
      } else if (creativeType === "carousel") {
        const cards: MetaCreativeCarouselCard[] = carouselCards.map((c) => ({
          title: c.title.trim(),
          name: c.title.trim(),
          link: c.link.trim(),
          image_hash: c.imageHash.trim() || undefined,
          picture: c.imageUrl.trim() || undefined,
          video_id: c.videoId.trim() || undefined,
        }));
        payload = {
          profile_id: Number(profileId),
          creative_type: "carousel",
          spec: {
            name: name.trim(),
            page_id: pageId.trim(),
            message: carouselMessage.trim() || undefined,
            link: carouselLink.trim() || undefined,
            cards,
            call_to_action_type: callToAction,
          },
        };
      } else {
        payload = {
          profile_id: Number(profileId),
          creative_type: "collection",
          spec: {
            name: name.trim(),
            page_id: pageId.trim(),
            product_set_id: collectionProductSetId.trim(),
            headline: collectionHeadline.trim() || undefined,
            body: collectionBody.trim() || undefined,
            cover_image_hash: collectionCoverImageHash.trim() || undefined,
            cover_image_url: collectionCoverImageUrl.trim() || undefined,
            cover_video_id: collectionCoverVideoId.trim() || undefined,
            call_to_action_type: callToAction,
          },
        };
      }
      await metaCreativesService.createMetaCreative(channelId, payload);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(mapBackendError(err));
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
              <button type="button" onClick={onClose} className="cancel-button">
                Cancel
              </button>
            </div>
          </>
        ) : profiles.length === 0 ? (
          <>
            <div className="p-4 border-b border-gray-200">
              <p className="text-[12px] text-[#556179] py-4">
                No ad accounts found. Save ad accounts in channel settings
                first.
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
                  Creative details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label-small">Ad account *</label>
                    <select
                      value={profileId === "" ? "" : profileId}
                      onChange={(e) =>
                        setProfileId(
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      className={inputClass}
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name || `Account ${p.id}`}
                        </option>
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
                    <label className="form-label-small">Creative format *</label>
                    <select
                      value={creativeType}
                      onChange={(e) =>
                        setCreativeType(e.target.value as UiCreativeType)
                      }
                      className={inputClass}
                    >
                      <option value="link_image">Link</option>
                      <option value="video">Video</option>
                      <option value="carousel">Carousel</option>
                      <option value="collection">Collection</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label-small">
                      Facebook Page *
                    </label>
                    <div
                      className={`${inputClass} py-2 px-3 bg-gray-100 text-[#556179] rounded border border-gray-200`}
                    >
                      {HARDCODED_PAGE_ID}
                    </div>
                  </div>
                  <div>
                    <label className="form-label-small">Call to action</label>
                    <select
                      value={callToAction}
                      onChange={(e) => setCallToAction(e.target.value)}
                      className={inputClass}
                    >
                      {ctaOptions.map((cta) => (
                        <option key={cta} value={cta}>
                          {cta}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-[12px] text-blue-900">
                Using hardcoded Facebook Page ID{" "}
                <span className="font-semibold">{HARDCODED_PAGE_ID}</span> for
                creative creation.
              </div>

              {creativeType === "link_image" && (
                <div className="mb-6">
                  <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                    Link creative
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="form-label-small">Primary text</label>
                      <textarea
                        value={linkMessage}
                        onChange={(e) => setLinkMessage(e.target.value)}
                        rows={2}
                        placeholder="Ad copy"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Link URL *</label>
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Image hash</label>
                      <Dropdown
                        options={[
                          { value: "", label: "Select image hash (optional)" },
                          ...imageOptions,
                        ]}
                        value={linkImageHash}
                        placeholder="Select image hash (optional)"
                        onChange={(val) => {
                          const v = String(val || "");
                          setLinkImageHash(v);
                          if (v) setLinkImageUrl("");
                        }}
                        buttonClassName={inputClass}
                        disabled={assetsLoading || imageOptions.length === 0}
                        searchable={true}
                        searchPlaceholder="Search image hashes..."
                        emptyMessage="No images available"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label-small">Image URL</label>
                      <Dropdown
                        options={[
                          { value: "", label: "Select image URL (optional)" },
                          ...imageUrlOptions,
                        ]}
                        value={linkImageUrl}
                        placeholder="Select image URL (optional)"
                        onChange={(val) => {
                          const v = String(val || "");
                          setLinkImageUrl(v);
                          if (v.trim()) setLinkImageHash("");
                        }}
                        buttonClassName={inputClass}
                        disabled={assetsLoading || imageUrlOptions.length === 0}
                        searchable={true}
                        searchPlaceholder="Search image URLs..."
                        emptyMessage="No image URLs available"
                      />
                    </div>
                  </div>
                </div>
              )}

              {creativeType === "video" && (
                <div className="mb-6">
                  <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                    Video creative
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="form-label-small">Primary text</label>
                      <textarea
                        value={videoMessage}
                        onChange={(e) => setVideoMessage(e.target.value)}
                        rows={2}
                        placeholder="Ad copy"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Video ID *</label>
                      <select
                        value={videoId}
                        onChange={(e) => setVideoId(e.target.value)}
                        className={inputClass}
                        disabled={assetsLoading || videoOptions.length === 0}
                      >
                        <option value="">Select video ID</option>
                        {videoOptions.map((video) => (
                          <option key={video.value} value={video.value}>
                            {video.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label-small">
                        Destination URL (optional)
                      </label>
                      <input
                        type="url"
                        value={videoDestinationUrl}
                        onChange={(e) => setVideoDestinationUrl(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="form-label-small">
                        Thumbnail image hash (optional)
                      </label>
                      <select
                        value={videoImageHash}
                        onChange={(e) => setVideoImageHash(e.target.value)}
                        className={inputClass}
                        disabled={assetsLoading || imageOptions.length === 0}
                      >
                        <option value="">Select image hash (optional)</option>
                        {imageOptions.map((img) => (
                          <option key={img.value} value={img.value}>
                            {img.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label-small">
                        Thumbnail image URL (optional)
                      </label>
                      <input
                        type="url"
                        value={videoImageUrl}
                        onChange={(e) => setVideoImageUrl(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              )}

              {creativeType === "carousel" && (
                <div className="mb-6">
                  <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                    Carousel creative
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="md:col-span-2">
                      <label className="form-label-small">Primary text</label>
                      <textarea
                        value={carouselMessage}
                        onChange={(e) => setCarouselMessage(e.target.value)}
                        rows={2}
                        placeholder="Carousel intro copy"
                        className={inputClass}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label-small">
                        Fallback destination URL
                      </label>
                      <input
                        type="url"
                        value={carouselLink}
                        onChange={(e) => setCarouselLink(e.target.value)}
                        placeholder="https://..."
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    {carouselCards.map((card, idx) => (
                      <div
                        key={card.id}
                        className="border border-gray-200 rounded-lg p-3 bg-white"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[12px] font-semibold text-[#072929]">
                            Card {idx + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() =>
                              setCarouselCards((prev) =>
                                prev.length <= 2
                                  ? prev
                                  : prev.filter((c) => c.id !== card.id),
                              )
                            }
                            disabled={carouselCards.length <= 2}
                            className="text-[11px] text-red-700 disabled:text-gray-400"
                          >
                            Remove
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="form-label-small">Title *</label>
                            <input
                              type="text"
                              value={card.title}
                              onChange={(e) =>
                                setCarouselCards((prev) =>
                                  prev.map((c) =>
                                    c.id === card.id
                                      ? { ...c, title: e.target.value }
                                      : c,
                                  ),
                                )
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="form-label-small">Link URL *</label>
                            <input
                              type="url"
                              value={card.link}
                              onChange={(e) =>
                                setCarouselCards((prev) =>
                                  prev.map((c) =>
                                    c.id === card.id
                                      ? { ...c, link: e.target.value }
                                      : c,
                                  ),
                                )
                              }
                              className={inputClass}
                            />
                          </div>
                          <div>
                            <label className="form-label-small">Image hash</label>
                            <select
                              value={card.imageHash}
                              onChange={(e) =>
                                setCarouselCards((prev) =>
                                  prev.map((c) =>
                                    c.id === card.id
                                      ? { ...c, imageHash: e.target.value }
                                      : c,
                                  ),
                                )
                              }
                              className={inputClass}
                              disabled={assetsLoading || imageOptions.length === 0}
                            >
                              <option value="">Select image hash</option>
                              {imageOptions.map((img) => (
                                <option key={img.value} value={img.value}>
                                  {img.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="form-label-small">Image URL</label>
                            <input
                              type="url"
                              value={card.imageUrl}
                              onChange={(e) =>
                                setCarouselCards((prev) =>
                                  prev.map((c) =>
                                    c.id === card.id
                                      ? { ...c, imageUrl: e.target.value }
                                      : c,
                                  ),
                                )
                              }
                              className={inputClass}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="form-label-small">Video ID</label>
                            <select
                              value={card.videoId}
                              onChange={(e) =>
                                setCarouselCards((prev) =>
                                  prev.map((c) =>
                                    c.id === card.id
                                      ? { ...c, videoId: e.target.value }
                                      : c,
                                  ),
                                )
                              }
                              className={inputClass}
                              disabled={assetsLoading || videoOptions.length === 0}
                            >
                              <option value="">Select video (optional)</option>
                              {videoOptions.map((video) => (
                                <option key={video.value} value={video.value}>
                                  {video.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCarouselCards((prev) =>
                          prev.length >= 10
                            ? prev
                            : [...prev, makeCard(Date.now())],
                        )
                      }
                      disabled={carouselCards.length >= 10}
                      className="inline-flex items-center px-3 py-1.5 rounded-md border border-dashed border-forest-f40 text-[11px] text-forest-f40 hover:bg-forest-f10 disabled:text-gray-400 disabled:border-gray-300"
                    >
                      Add card
                    </button>
                  </div>
                </div>
              )}

              {creativeType === "collection" && (
                <div className="mb-6">
                  <h3 className="text-[14px] font-semibold text-[#072929] mb-4">
                    Collection creative
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label-small">Product set ID *</label>
                      <input
                        type="text"
                        value={collectionProductSetId}
                        onChange={(e) => setCollectionProductSetId(e.target.value)}
                        className={inputClass}
                        placeholder="Catalog product set ID"
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Headline</label>
                      <input
                        type="text"
                        value={collectionHeadline}
                        onChange={(e) => setCollectionHeadline(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label-small">Body</label>
                      <textarea
                        rows={2}
                        value={collectionBody}
                        onChange={(e) => setCollectionBody(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className="form-label-small">Cover image hash</label>
                      <select
                        value={collectionCoverImageHash}
                        onChange={(e) => setCollectionCoverImageHash(e.target.value)}
                        className={inputClass}
                        disabled={assetsLoading || imageOptions.length === 0}
                      >
                        <option value="">Select image hash</option>
                        {imageOptions.map((img) => (
                          <option key={img.value} value={img.value}>
                            {img.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="form-label-small">Cover image URL</label>
                      <input
                        type="url"
                        value={collectionCoverImageUrl}
                        onChange={(e) => setCollectionCoverImageUrl(e.target.value)}
                        className={inputClass}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="form-label-small">Cover video ID</label>
                      <select
                        value={collectionCoverVideoId}
                        onChange={(e) => setCollectionCoverVideoId(e.target.value)}
                        className={inputClass}
                        disabled={assetsLoading || videoOptions.length === 0}
                      >
                        <option value="">Select video (optional)</option>
                        {videoOptions.map((video) => (
                          <option key={video.value} value={video.value}>
                            {video.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleFillTest}
                className="inline-flex items-center px-3 py-1.5 rounded-md border border-dashed border-forest-f40 text-[11px] text-forest-f40 hover:bg-forest-f10"
              >
                Fill test values
              </button>
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
