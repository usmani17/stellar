import React, { useState, useEffect, useCallback, useRef } from "react";
import { BaseModal } from "./BaseModal";
import { Loader } from "./Loader";
import { campaignsService } from "../../services/campaigns";
import type { Asset } from "../campaigns/AssetsTable";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;
const INFINITE_SCROLL_THRESHOLD_PX = 150;

/** Filter by backend assetType column (IMAGE | VIDEO). */
const ASSET_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All types" },
  { value: "IMAGE", label: "Images" },
  { value: "VIDEO", label: "Videos" },
];

export interface AssetPickerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (asset: Asset) => void;
  accountId: number;
  channelId?: string | number | null;
  profileId?: string | null;
  /** When true, only show image assets (assetType=IMAGE filter) */
  imageOnly?: boolean;
  title?: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDimensions(asset: Asset): string {
  const w = asset.fileMetadata?.width;
  const h = asset.fileMetadata?.height;
  if (w != null && h != null) return `${w}×${h}`;
  return "—";
}

function displayName(asset: Asset): string {
  return asset.name || asset.fileName || asset.assetId || `Asset ${asset.id}`;
}

export const AssetPickerPopup: React.FC<AssetPickerPopupProps> = ({
  isOpen,
  onClose,
  onSelect,
  accountId,
  channelId,
  profileId,
  imageOnly = false,
  title = "Browse assets",
}) => {
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [assetType, setAssetType] = useState(imageOnly ? "IMAGE" : "");
  const [page, setPage] = useState(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [previewErrors, setPreviewErrors] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadAssets = useCallback(
    async (append: boolean) => {
      if (!accountId) return;
      const isAppend = append && page > 1;
      if (isAppend) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      try {
        const data = await campaignsService.getAssets(
          accountId,
          {
            page: isAppend ? page : 1,
            page_size: PAGE_SIZE,
            sort_by: "creationTime",
            order: "desc",
            ...(profileId && { profileId: String(profileId) }),
            ...(search.trim() && { search: search.trim() }),
            ...(assetType && { assetType }),
          },
          channelId ?? null,
        );
        const list = Array.isArray(data.assets) ? data.assets : [];
        const newTotalPages = data.total_pages ?? 0;
        setTotalPages(newTotalPages);
        if (isAppend) {
          setAssets((prev) => [...prev, ...list]);
        } else {
          setAssets(list);
        }
      } catch (err) {
        console.error("[AssetPickerPopup] Failed to load assets:", err);
        if (!isAppend) {
          setAssets([]);
          setTotalPages(0);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accountId, channelId, profileId, page, search, assetType],
  );

  // Debounce search
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => setSearch(searchInput), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchInput, isOpen]);

  const prevPageRef = useRef(1);

  // Reset to page 1 and clear selection when search or assetType changes
  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setSelectedAsset(null);
      prevPageRef.current = 1;
    }
  }, [search, assetType, isOpen]);

  // Initial load when modal opens or filters change (page 1)
  useEffect(() => {
    if (!isOpen || !accountId) return;
    loadAssets(false);
  }, [isOpen, accountId, search, assetType]);

  // Load more when page increments (infinite scroll)
  useEffect(() => {
    if (!isOpen || !accountId || page <= 1) return;
    if (prevPageRef.current === page) return;
    prevPageRef.current = page;
    loadAssets(true);
  }, [isOpen, accountId, page, loadAssets]);

  const hasMore = page < totalPages;

  const onScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el || loading || loadingMore || !hasMore) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    if (
      scrollTop + clientHeight >=
      scrollHeight - INFINITE_SCROLL_THRESHOLD_PX
    ) {
      setLoadingMore(true);
      setPage((p) => p + 1);
    }
  }, [loading, loadingMore, hasMore]);

  const handleDone = () => {
    if (selectedAsset) {
      onSelect(selectedAsset);
      onClose();
    }
  };

  const isSelected = (asset: Asset) =>
    selectedAsset != null &&
    (asset.assetId
      ? asset.assetId === selectedAsset.assetId
      : asset.id === selectedAsset.id);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      maxWidth="max-w-3xl"
      maxHeight="max-h-[85vh]"
      padding="p-0"
      containerClassName="p-0 overflow-hidden flex flex-col max-h-[85vh]"
    >
      <div className="flex flex-col h-full max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            aria-label="Close"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-center gap-3 shrink-0">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by asset ID or name..."
            className="flex-1 min-w-[200px] campaign-input px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
          />
          <select
            value={assetType}
            onChange={(e) => {
              setAssetType(e.target.value);
              setPage(1);
            }}
            className="campaign-input px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D]"
          >
            {ASSET_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 min-h-[240px]"
          style={{ maxHeight: "50vh" }}
          onScroll={onScroll}
        >
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader />
            </div>
          ) : assets.length === 0 ? (
            <div className="text-center py-12 text-gray-500 text-sm">
              No assets found. Try adjusting search or filters.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 pb-4">
              {assets.map((asset) => {
                const aid = asset.assetId || String(asset.id);
                const previewUrl = asset.storageLocationUrls?.defaultUrl;
                const isImage =
                  asset.assetType === "IMAGE" ||
                  asset.contentType?.toLowerCase().startsWith("image/") ||
                  asset.fileMetadata?.contentType
                    ?.toLowerCase()
                    .startsWith("image/") ||
                  asset.mediaType?.toLowerCase() === "image";
                const showPreview =
                  isImage && previewUrl && !previewErrors[aid];
                const selected = isSelected(asset);

                return (
                  <li
                    key={asset.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedAsset(asset)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedAsset(asset);
                      }
                    }}
                    className={`border rounded-lg p-4 flex items-center gap-4 bg-white transition-colors cursor-pointer hover:border-[#136D6D]/50 ${
                      selected
                        ? "border-[#136D6D] ring-2 ring-[#136D6D]/30"
                        : "border-gray-200"
                    }`}
                  >
                    <div className="w-20 h-20 rounded border border-gray-200 bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center">
                      {showPreview ? (
                        <img
                          src={previewUrl}
                          alt=""
                          className="w-full h-full object-contain"
                          onError={() =>
                            setPreviewErrors((p) => ({ ...p, [aid]: true }))
                          }
                        />
                      ) : (
                        <span className="text-xs text-gray-400">
                          {isImage ? "No preview" : "—"}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-medium text-gray-900 truncate"
                        title={displayName(asset)}
                      >
                        {displayName(asset)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDimensions(asset)} ·{" "}
                        {formatDate(asset.creationTime || asset.createdAt)}
                      </p>
                      {asset.assetId && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          ID: {asset.assetId}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {loadingMore && (
            <div className="flex justify-center py-4">
              <Loader />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-white shrink-0 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            disabled={!selectedAsset}
            className="px-4 py-2 text-sm font-medium text-white bg-[#136D6D] rounded-lg hover:bg-[#0e5a5a] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Done
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
