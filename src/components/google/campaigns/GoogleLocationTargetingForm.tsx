// Google Location Targeting Form Component
// Reusable component for location targeting (target and exclude locations)
// Used by SHOPPING, SEARCH, and PERFORMANCE_MAX campaigns

import React from "react";
import { Dropdown } from "../../ui/Dropdown";

export interface GoogleLocationTargetingFormProps {
  locationIds?: number[];
  excludedLocationIds?: string[];
  locationOptions: Array<{ value: string; label: string; id: string; type: string; countryCode: string }>;
  loadingLocations: boolean;
  onLocationIdsChange: (ids: number[] | undefined) => void;
  onExcludedLocationIdsChange: (ids: string[] | undefined) => void;
  errors?: {
    location_ids?: string;
  };
  showTitle?: boolean; // Whether to show "Location Targeting" title (default: true)
}

export const GoogleLocationTargetingForm: React.FC<GoogleLocationTargetingFormProps> = ({
  locationIds = [],
  excludedLocationIds = [],
  locationOptions,
  loadingLocations,
  onLocationIdsChange,
  onExcludedLocationIdsChange,
  errors,
  showTitle = true,
}) => {
  return (
    <div className="mt-6">
      {showTitle && (
        <h3 className="text-[15px] font-bold text-[#072929] mb-3">
          Location Targeting
        </h3>
      )}

      <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
        {/* Target and Exclude Locations - Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Target Locations */}
        <div>
          <label className="form-label">
            Target Locations
          </label>
          {errors?.location_ids && (
            <p className="text-[10px] text-red-500 -mt-1 mb-2">
              {errors.location_ids}
            </p>
          )}
          <Dropdown<string>
            options={locationOptions.filter(
              (opt) => !excludedLocationIds.includes(opt.value)
            )}
            value=""
            onChange={(value) => {
              const valueNum = parseInt(value, 10);
              if (!isNaN(valueNum) && !locationIds.includes(valueNum)) {
                // Remove from excluded locations if it exists there
                const excludedIds = excludedLocationIds.filter(id => id !== value);
                onExcludedLocationIdsChange(excludedIds.length > 0 ? excludedIds : undefined);
                // Add to target locations
                onLocationIdsChange([...locationIds, valueNum]);
              }
            }}
            placeholder={
              loadingLocations
                ? "Loading locations..."
                : locationOptions.length === 0
                ? "No locations found"
                : "Select locations to target"
            }
            buttonClassName="edit-button w-full"
            searchable={true}
            searchPlaceholder="Search locations..."
            emptyMessage={
              loadingLocations
                ? "Loading..."
                : "Start typing to search for locations"
            }
            disabled={loadingLocations}
          />
          {locationIds && locationIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {locationIds.map((locId) => {
                const location = locationOptions.find(l => l.value === String(locId));
                return (
                  <span
                    key={locId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-[#136D6D] text-white text-[11px] rounded"
                  >
                    {location?.label || locId}
                    <button
                      type="button"
                      onClick={() => {
                        const newIds = locationIds.filter(id => id !== locId);
                        onLocationIdsChange(newIds.length > 0 ? newIds : undefined);
                      }}
                      className="hover:text-red-200"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Exclude Locations */}
        <div>
          <label className="form-label">
            Exclude Locations
          </label>
          <Dropdown<string>
            options={locationOptions.filter(
              (opt) => {
                const optValueNum = parseInt(opt.value, 10);
                return !isNaN(optValueNum) && !locationIds.includes(optValueNum);
              }
            )}
            value=""
            onChange={(value) => {
              if (!excludedLocationIds.includes(value)) {
                // Remove from target locations if it exists there
                const valueNum = parseInt(value, 10);
                const targetIds = !isNaN(valueNum) 
                  ? locationIds.filter(id => id !== valueNum)
                  : locationIds;
                onLocationIdsChange(targetIds.length > 0 ? targetIds : undefined);
                // Add to excluded locations
                onExcludedLocationIdsChange([...excludedLocationIds, value]);
              }
            }}
            placeholder="Select locations to exclude"
            buttonClassName="edit-button w-full"
            searchable={true}
            searchPlaceholder="Search locations to exclude..."
            emptyMessage={
              loadingLocations
                ? "Loading..."
                : "Start typing to search for locations"
            }
            disabled={loadingLocations}
          />
          {excludedLocationIds && excludedLocationIds.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {excludedLocationIds.map((locId) => {
                const location = locationOptions.find(l => l.value === locId);
                return (
                  <span
                    key={locId}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-[11px] rounded"
                  >
                    {location?.label || locId}
                    <button
                      type="button"
                      onClick={() => {
                        const newIds = excludedLocationIds.filter(id => id !== locId);
                        onExcludedLocationIdsChange(newIds.length > 0 ? newIds : undefined);
                      }}
                      className="hover:text-red-200"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
