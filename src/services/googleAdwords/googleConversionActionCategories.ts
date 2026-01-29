/**
 * All conversion action categories (Google Ads API v22).
 * Used for display/labels and filter dropdown. Excludes UNSPECIFIED and UNKNOWN.
 */
export const CONVERSION_ACTION_CATEGORIES = [
  { value: "DEFAULT", label: "Default" },
  { value: "PAGE_VIEW", label: "Page View" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SIGNUP", label: "Sign-up" },
  { value: "DOWNLOAD", label: "Download" },
  { value: "ADD_TO_CART", label: "Add to Cart" },
  { value: "BEGIN_CHECKOUT", label: "Begin Checkout" },
  { value: "SUBSCRIBE_PAID", label: "Paid Subscription" },
  { value: "PHONE_CALL_LEAD", label: "Phone Call Lead" },
  { value: "IMPORTED_LEAD", label: "Imported Lead" },
  { value: "SUBMIT_LEAD_FORM", label: "Submit Lead Form" },
  { value: "BOOK_APPOINTMENT", label: "Book Appointment" },
  { value: "REQUEST_QUOTE", label: "Request Quote" },
  { value: "GET_DIRECTIONS", label: "Get Directions" },
  { value: "OUTBOUND_CLICK", label: "Outbound Click" },
  { value: "CONTACT", label: "Contact" },
  { value: "ENGAGEMENT", label: "Engagement" },
  { value: "STORE_VISIT", label: "Store Visit" },
  { value: "STORE_SALE", label: "Store Sale" },
  { value: "QUALIFIED_LEAD", label: "Qualified Lead" },
  { value: "CONVERTED_LEAD", label: "Converted Lead" },
] as const;

/**
 * Categories allowed when creating a conversion action via the API.
 * Google Ads rejects create for: DOWNLOAD, IMPORTED_LEAD, STORE_VISIT, STORE_SALE, QUALIFIED_LEAD, CONVERTED_LEAD.
 * Use this list in the Create Conversion Action form.
 */
export const CONVERSION_ACTION_CATEGORIES_FOR_CREATE = [
  { value: "DEFAULT", label: "Default" },
  { value: "PAGE_VIEW", label: "Page View" },
  { value: "PURCHASE", label: "Purchase" },
  { value: "SIGNUP", label: "Sign-up" },
  { value: "ADD_TO_CART", label: "Add to Cart" },
  { value: "BEGIN_CHECKOUT", label: "Begin Checkout" },
  { value: "SUBSCRIBE_PAID", label: "Paid Subscription" },
  { value: "PHONE_CALL_LEAD", label: "Phone Call Lead" },
  { value: "SUBMIT_LEAD_FORM", label: "Submit Lead Form" },
  { value: "BOOK_APPOINTMENT", label: "Book Appointment" },
  { value: "REQUEST_QUOTE", label: "Request Quote" },
  { value: "GET_DIRECTIONS", label: "Get Directions" },
  { value: "OUTBOUND_CLICK", label: "Outbound Click" },
  { value: "CONTACT", label: "Contact" },
  { value: "ENGAGEMENT", label: "Engagement" },
] as const;

export type ConversionActionCategoryValue = (typeof CONVERSION_ACTION_CATEGORIES)[number]["value"];

/** Map category value to display label. Falls back to formatted value if unknown. */
export function getConversionActionCategoryLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const found = CONVERSION_ACTION_CATEGORIES.find((c) => c.value === value);
  return found ? found.label : value.replace(/_/g, " ");
}
