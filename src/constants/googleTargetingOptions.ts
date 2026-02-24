/**
 * Shared Google Ads targeting options (geo + language).
 * Hardcoded from official Google data - no API fetch.
 * Campaign form and draft form both use these. Form stores/sends ID only.
 */
import { GOOGLE_GEO_TARGETS } from "./googleGeoTargets";
import { GOOGLE_LANGUAGE_CONSTANTS } from "./googleLanguageConstants";

export type LocationOption = {
  value: string;
  label: string;
  id: string;
  type: string;
  countryCode: string;
};

export type LanguageOption = {
  value: string;
  label: string;
  id: string;
};

const locationOptions: LocationOption[] = GOOGLE_GEO_TARGETS.map((loc) => ({
  value: loc.id,
  label: `${loc.name} (${loc.type})`,
  id: loc.id,
  type: loc.type,
  countryCode: loc.countryCode,
}));

const languageOptions: LanguageOption[] = GOOGLE_LANGUAGE_CONSTANTS.map(
  (lang) => ({
    value: lang.id,
    label: lang.name,
    id: lang.id,
  })
);

export function getGoogleLocationOptions(): LocationOption[] {
  return locationOptions;
}

export function getGoogleLanguageOptions(): LanguageOption[] {
  return languageOptions;
}
