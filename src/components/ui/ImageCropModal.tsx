import React, { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { BaseModal } from "./BaseModal";

export interface CropCoordinates {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Source image crop area in pixels (from react-easy-crop). Use for generating cropped image. */
export interface CropSourceArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onConfirm: (crop: CropCoordinates, sourceArea?: CropSourceArea) => void;
  /** Crop dimensions - default 1200x628 for custom images */
  requiredWidth?: number;
  requiredHeight?: number;
  title?: string;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageUrl,
  onConfirm,
  requiredWidth = 1200,
  requiredHeight = 628,
  title = "Crop Image",
}) => {
  const ASPECT = requiredWidth / requiredHeight;
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPx: Area) => {
    setCroppedAreaPixels(croppedAreaPx);
  }, []);

  const handleConfirm = () => {
    if (croppedAreaPixels) {
      // Use top/left from the crop selection; always set width/height to required dimensions
      const sourceArea: CropSourceArea = {
        x: Math.round(croppedAreaPixels.x),
        y: Math.round(croppedAreaPixels.y),
        width: Math.round(croppedAreaPixels.width),
        height: Math.round(croppedAreaPixels.height),
      };
      onConfirm(
        {
          left: sourceArea.x,
          top: sourceArea.y,
          width: requiredWidth,
          height: requiredHeight,
        },
        sourceArea
      );
      onClose();
      // Reset for next open
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-3xl"
      maxHeight="max-h-[90vh]"
      padding="p-0"
      closeOnBackdropClick={false}
    >
      <div className="flex flex-col">
        <div className="px-6 pt-6 pb-2">
          <h3 className="text-[17.1px] font-semibold text-[#072929]">
            {title}
          </h3>
          <p className="text-[12px] text-[#556179] mt-1">
            Adjust the crop frame to select the region ({requiredWidth}×{requiredHeight} pixels)
          </p>
        </div>
        <div className="relative h-[400px] w-full bg-gray-100">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="px-6 pb-2">
          <label className="block text-[10px] text-gray-600 mb-1">
            Zoom
          </label>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#136D6D]"
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-[12px] text-[#556179] hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-2 text-[12px] text-white bg-[#136D6D] hover:bg-[#0e5a5a] rounded-lg transition-colors"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </BaseModal>
  );
};
