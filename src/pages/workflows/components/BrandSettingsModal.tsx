import React, { useState, useEffect, useRef } from "react";
import { ImageIcon, Upload, Mail } from "lucide-react";
import { BaseModal, Input, Alert } from "../../../components/ui";
import { useAuth } from "../../../contexts/AuthContext";
import { useBrandSettings } from "../hooks/useBrandSettings";

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
  const [defaultDeliveryEmail, setDefaultDeliveryEmail] = useState("");
  const [logoError, setLogoError] = useState(false);
  const [colorError, setColorError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setLogoUrl(settings.logoUrl);
      setPrimaryColor(settings.primaryColor);
      setDefaultDeliveryEmail(settings.defaultDeliveryEmail || user?.email || "");
      setLogoError(false);
      setColorError("");
      setSuccessMsg("");
    }
  }, [settings, user?.email, isOpen]);

  const isLogoDataUrl = logoUrl.startsWith("data:");

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError(true);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoUrl(dataUrl);
      setLogoError(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
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
    try {
      await updateSettings({ logoUrl, primaryColor, defaultDeliveryEmail });
      setSuccessMsg("Settings saved successfully");
      setTimeout(() => {
        setSuccessMsg("");
        onClose();
      }, 1200);
    } catch {
      setSuccessMsg("");
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

        {successMsg && (
          <Alert variant="success" className="mb-4">
            {successMsg}
          </Alert>
        )}

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
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-sandstorm-s40 bg-white text-forest-f60 text-sm hover:bg-sandstorm-s5 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload image
              </button>
              <span className="flex items-center text-sm text-forest-f30 self-center">
                or
              </span>
              <div className="flex-1 min-w-[200px]">
                <Input
                  value={isLogoDataUrl ? "" : logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setLogoError(false);
                  }}
                  placeholder="Paste image URL"
                />
              </div>
            </div>
            {isLogoDataUrl && (
              <p className="text-xs text-forest-f30 mb-2">
                Image uploaded. Paste a URL above to replace, or upload a new image.
              </p>
            )}
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

          {/* Default Delivery Email */}
          <div>
            <label className="block text-[13px] font-medium text-forest-f60 mb-1">
              Default delivery email
            </label>
            <p className="text-xs text-forest-f30 mb-2">
              Reports will be sent here unless a workflow specifies a custom address. Defaults to your logged-in email.
            </p>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-forest-f40 shrink-0" />
              <Input
                type="email"
                value={defaultDeliveryEmail}
                onChange={(e) => setDefaultDeliveryEmail(e.target.value)}
                placeholder={user?.email ?? "reports@company.com"}
              />
            </div>
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
            className="create-entity-button"
          >
            <span className="text-[10.64px] text-white font-normal">
              {isUpdating ? "Saving..." : "Save Settings"}
            </span>
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
