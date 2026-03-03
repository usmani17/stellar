import React, { useState, useEffect, useRef } from "react";
import { ImageIcon, Loader2, Upload, Mail, Check, Plus, Trash2 } from "lucide-react";
import { BaseModal, Input } from "../../../components/ui";
import { useAuth } from "../../../contexts/AuthContext";
import {
  assetUploadService,
  type DeliveryAction,
} from "../../../services/workflows";
import { useBrandSettings } from "../hooks/useBrandSettings";
import { cn } from "../../../lib/cn";

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;

interface BrandSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: number | undefined;
}

export const BrandSettingsModal: React.FC<BrandSettingsModalProps> = ({
  isOpen,
  onClose,
  accountId,
}) => {
  const { user } = useAuth();
  const { settings, isLoading, updateSettings, isUpdating } =
    useBrandSettings(accountId);

  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#136D6D");
  const [defaultDeliveryEmails, setDefaultDeliveryEmails] = useState<string[]>([""]);
  const [defaultDeliveryWebhookUrl, setDefaultDeliveryWebhookUrl] = useState("");
  const [selectedDeliveryTypes, setSelectedDeliveryTypes] = useState<("email" | "slack")[]>(["email"]);
  const [logoError, setLogoError] = useState(false);
  const [colorError, setColorError] = useState("");
  const [saved, setSaved] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logoUrl);
      setPrimaryColor(settings.primaryColor);
      const da = settings.deliveryAction;
      const selectedTypes: ("email" | "slack")[] = [];
      
      if (da?.actions?.find(a => a.type === "slack")) {
        selectedTypes.push("slack");
        setDefaultDeliveryWebhookUrl(da.actions.find(a => a.type === "slack")?.webhookUrl ?? "");
      } else {
        setDefaultDeliveryWebhookUrl("");
      }
      
      if (da?.actions?.find(a => a.type === "email")) {
        selectedTypes.push("email");
        let emails: string[] = [];
        const fromDa = da?.actions?.find(a => a.type === "email")?.emails?.filter(Boolean);
        if (fromDa?.length) emails = fromDa;
        else if (user?.email) emails = [user.email];
        else emails = [""];
        setDefaultDeliveryEmails(emails.length ? emails : [""]);
      } else {
        let emails: string[] = [];
        if (user?.email) emails = [user.email];
        else emails = [""];
        setDefaultDeliveryEmails(emails.length ? emails : [""]);
      }
      
      setSelectedDeliveryTypes(selectedTypes.length ? selectedTypes : ["email"]);
      setLogoError(false);
      setColorError("");
      setSaved(false);
    }
  }, [settings, user?.email, isOpen]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError(true);
      return;
    }
    setLogoUploading(true);
    setLogoError(false);
    try {
      const { url } = await assetUploadService.uploadImage(file, accountId);
      setLogoUrl(url);
    } catch {
      setLogoError(true);
    } finally {
      setLogoUploading(false);
      e.target.value = "";
    }
  };

  const validateColor = (val: string) => {
    if (!val) {
      setColorError("");
      return true;
    }
    if (!HEX_REGEX.test(val)) {
      setColorError("Enter a valid hex color (e.g. #136D6D)");
      return false;
    }
    setColorError("");
    return true;
  };

  const handleSave = async () => {
    if (!validateColor(primaryColor)) return;
    const emails = defaultDeliveryEmails.map((e) => e.trim()).filter(Boolean);
    const actions: DeliveryAction["actions"] = [];
    
    if (selectedDeliveryTypes.includes("slack") && defaultDeliveryWebhookUrl.trim()) {
      actions.push({ type: "slack", webhookUrl: defaultDeliveryWebhookUrl.trim() });
    }
    
    if (selectedDeliveryTypes.includes("email") && emails.length > 0) {
      actions.push({ type: "email", emails });
    }
    
    const payloadDeliveryAction: DeliveryAction | null = actions.length > 0 ? { actions } : null;
    try {
      await updateSettings({
        logoUrl,
        primaryColor,
        deliveryAction: payloadDeliveryAction,
      });
      setSaved(true);
      setTimeout(() => onClose(), 400);
    } catch {
      setSaved(false);
    }
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} size="lg" padding="p-0">
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <h2 className="text-xl font-agrandir font-medium text-forest-f60 mb-4">
          Report Settings
        </h2>
        <p className="text-sm text-forest-f30 mb-5">
          Default logo, color, and delivery for PDF reports. Workflows can override these per workflow.
        </p>

        <div className="space-y-6">
          {/* Logo: Upload or URL */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-2">
              Report Logo
            </label>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                aria-hidden
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sandstorm-s40 bg-white text-forest-f60 text-sm hover:bg-sandstorm-s5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Upload logo image"
              >
                {logoUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="w-4 h-4" aria-hidden />
                )}
                {logoUploading ? "Uploading…" : "Upload image"}
              </button>
              <span className="flex items-center text-sm text-forest-f30 self-center">
                or
              </span>
              <div className="flex-1 min-w-[200px]">
                <Input
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setLogoError(false);
                  }}
                  placeholder="Or paste image URL (e.g. from S3)"
                />
              </div>
            </div>
            <div className="w-full h-[120px] rounded-lg border border-sandstorm-s40 bg-sandstorm-s5 flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                logoError ? (
                  <div className="flex flex-col items-center gap-2 text-forest-f30">
                    <ImageIcon className="w-8 h-8" />
                    <span className="text-xs">Could not load image</span>
                  </div>
                ) : (
                  <img
                    src={logoUrl}
                    alt="Logo preview"
                    className="max-h-full max-w-full object-contain p-2"
                    onError={() => setLogoError(true)}
                    onLoad={() => setLogoError(false)}
                  />
                )
              ) : (
                <div className="flex flex-col items-center gap-2 text-forest-f30">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Upload or paste URL</span>
                </div>
              )}
            </div>
          </div>

          {/* Primary Color */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-1">
              Primary Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={HEX_REGEX.test(primaryColor) ? primaryColor : "#136D6D"}
                onChange={(e) => {
                  const hex = e.target.value;
                  setPrimaryColor(hex);
                  setColorError("");
                }}
                className="w-10 h-10 rounded-lg border border-sandstorm-s40 shrink-0 cursor-pointer p-0.5 bg-sandstorm-s5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-sandstorm-s40 [&::-webkit-color-swatch]:rounded-md"
                aria-label="Pick primary color"
              />
              <div className="flex-1 min-w-0">
                <Input
                  value={primaryColor}
                  onChange={(e) => {
                    setPrimaryColor(e.target.value);
                    validateColor(e.target.value);
                  }}
                  placeholder="#136D6D"
                  error={colorError}
                />
              </div>
            </div>
            {HEX_REGEX.test(primaryColor) && (
              <p className="mt-1.5 text-xs text-forest-f30">{primaryColor}</p>
            )}
          </div>

          {/* Default Delivery */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-1">
              Default delivery
            </label>
            <p className="text-xs text-forest-f30 mb-2">
              Reports will be sent here unless a workflow specifies custom delivery.
            </p>
            <div className="flex items-center gap-4 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDeliveryTypes.includes("email")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDeliveryTypes(prev => [...prev, "email"]);
                    } else {
                      setSelectedDeliveryTypes(prev => prev.filter(t => t !== "email"));
                    }
                  }}
                  className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 accent-[#136D6D]"
                />
                <span className="text-[13px] text-forest-f60">Email</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDeliveryTypes.includes("slack")}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDeliveryTypes(prev => [...prev, "slack"]);
                    } else {
                      setSelectedDeliveryTypes(prev => prev.filter(t => t !== "slack"));
                    }
                  }}
                  className="w-4 h-4 text-[#136D6D] focus:ring-[#136D6D] border-gray-300 accent-[#136D6D]"
                />
                <span className="text-[13px] text-forest-f60">Slack</span>
              </label>
            </div>
            {selectedDeliveryTypes.includes("email") && (
              <div className="space-y-2">
                {defaultDeliveryEmails.map((email, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-forest-f40 shrink-0" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        const next = [...defaultDeliveryEmails];
                        next[i] = e.target.value;
                        setDefaultDeliveryEmails(next);
                      }}
                      placeholder={user?.email ?? "reports@company.com"}
                      className="flex-1 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const next = defaultDeliveryEmails.filter((_, j) => j !== i);
                        setDefaultDeliveryEmails(next.length ? next : [""]);
                      }}
                      className="p-2 text-forest-f30 hover:text-red-r30 rounded transition-colors"
                      aria-label="Remove email"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDefaultDeliveryEmails([...defaultDeliveryEmails, ""])}
                  className="inline-flex items-center gap-1.5 text-[13px] text-forest-f40 hover:text-forest-f50"
                >
                  <Plus className="w-4 h-4" />
                  Add email
                </button>
              </div>
            )}
            {selectedDeliveryTypes.includes("slack") && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    type="url"
                    value={defaultDeliveryWebhookUrl}
                    onChange={(e) => setDefaultDeliveryWebhookUrl(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    className="flex-1"
                  />
                </div>
                <a 
                  href="https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-forest-f40 hover:text-forest-f50 underline"
                >
                  Learn how to create Slack webhook
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-sandstorm-s40">
          <button
            onClick={onClose}
            className="edit-button"
            disabled={isUpdating}
          >
            <span className="text-[10.64px] text-[#072929] font-normal">
              Cancel
            </span>
          </button>
          <button
            onClick={handleSave}
            disabled={isUpdating || !!colorError || isLoading}
            className={cn(
              "create-entity-button transition-colors duration-200",
              saved && "bg-forest-f40"
            )}
          >
            <span className="text-[10.64px] text-white font-normal inline-flex items-center gap-1.5">
              {isUpdating ? (
                "Saving..."
              ) : saved ? (
                <>
                  <Check className="w-3.5 h-3.5" aria-hidden />
                  Saved
                </>
              ) : (
                "Save Settings"
              )}
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
