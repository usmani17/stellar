import React, { useState, useEffect } from "react";
import { type CreateGoogleConversionActionPayload } from "../../services/googleAdwords/googleAdwordsConversionActions";
import { CONVERSION_ACTION_CATEGORIES_FOR_CREATE } from "../../services/googleAdwords/googleConversionActionCategories";
import { Loader } from "../ui/Loader";
import { useCreateGoogleConversionAction } from "../../hooks/mutations/useGoogleConversionActionMutations";

interface CreateGoogleConversionActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (conversionAction: any) => void;
  accountId: number;
  channelId: number;
  profileId: number;
  title?: string;
  profileCurrencyCode?: string; // Account currency for default selection
}

const COUNTING_TYPES = [
  { value: "ONE_PER_CLICK", label: "One per Click" },
  { value: "MANY_PER_CLICK", label: "Many per Click" },
];

// ISO 4217 currency codes (Google Ads supported) - common currencies
const CURRENCY_OPTIONS: { value: string; label: string }[] = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "CHF", label: "CHF - Swiss Franc" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "MXN", label: "MXN - Mexican Peso" },
  { value: "BRL", label: "BRL - Brazilian Real" },
  { value: "KRW", label: "KRW - South Korean Won" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
  { value: "HKD", label: "HKD - Hong Kong Dollar" },
  { value: "NOK", label: "NOK - Norwegian Krone" },
  { value: "SEK", label: "SEK - Swedish Krona" },
  { value: "DKK", label: "DKK - Danish Krone" },
  { value: "PLN", label: "PLN - Polish Zloty" },
  { value: "TRY", label: "TRY - Turkish Lira" },
  { value: "RUB", label: "RUB - Russian Ruble" },
  { value: "ZAR", label: "ZAR - South African Rand" },
  { value: "AED", label: "AED - UAE Dirham" },
  { value: "SAR", label: "SAR - Saudi Riyal" },
  { value: "ILS", label: "ILS - Israeli Shekel" },
  { value: "THB", label: "THB - Thai Baht" },
  { value: "IDR", label: "IDR - Indonesian Rupiah" },
  { value: "MYR", label: "MYR - Malaysian Ringgit" },
  { value: "PHP", label: "PHP - Philippine Peso" },
  { value: "CZK", label: "CZK - Czech Koruna" },
  { value: "HUF", label: "HUF - Hungarian Forint" },
  { value: "RON", label: "RON - Romanian Leu" },
  { value: "CLP", label: "CLP - Chilean Peso" },
  { value: "COP", label: "COP - Colombian Peso" },
  { value: "ARS", label: "ARS - Argentine Peso" },
  { value: "PEN", label: "PEN - Peruvian Sol" },
  { value: "EGP", label: "EGP - Egyptian Pound" },
  { value: "NGN", label: "NGN - Nigerian Naira" },
  { value: "PKR", label: "PKR - Pakistani Rupee" },
  { value: "BGN", label: "BGN - Bulgarian Lev" },
  { value: "HRK", label: "HRK - Croatian Kuna" },
  { value: "NZD", label: "NZD - New Zealand Dollar" },
  { value: "TWD", label: "TWD - New Taiwan Dollar" },
  { value: "VND", label: "VND - Vietnamese Dong" },
  { value: "BDT", label: "BDT - Bangladeshi Taka" },
  { value: "UAH", label: "UAH - Ukrainian Hryvnia" },
  { value: "MAD", label: "MAD - Moroccan Dirham" },
  { value: "QAR", label: "QAR - Qatari Riyal" },
  { value: "KWD", label: "KWD - Kuwaiti Dinar" },
  { value: "BHD", label: "BHD - Bahraini Dinar" },
  { value: "OMR", label: "OMR - Omani Rial" },
  { value: "JOD", label: "JOD - Jordanian Dinar" },
  { value: "LBP", label: "LBP - Lebanese Pound" },
  { value: "ISK", label: "ISK - Icelandic Krona" },
  { value: "UYU", label: "UYU - Uruguayan Peso" },
  { value: "BOB", label: "BOB - Bolivian Boliviano" },
  { value: "CRC", label: "CRC - Costa Rican Colón" },
  { value: "GTQ", label: "GTQ - Guatemalan Quetzal" },
  { value: "PAB", label: "PAB - Panamanian Balboa" },
  { value: "DOP", label: "DOP - Dominican Peso" },
  { value: "JMD", label: "JMD - Jamaican Dollar" },
  { value: "TTD", label: "TTD - Trinidad and Tobago Dollar" },
  { value: "XAF", label: "XAF - Central African CFA Franc" },
  { value: "XOF", label: "XOF - West African CFA Franc" },
  { value: "KES", label: "KES - Kenyan Shilling" },
  { value: "GHS", label: "GHS - Ghanaian Cedi" },
  { value: "ETB", label: "ETB - Ethiopian Birr" },
  { value: "TZS", label: "TZS - Tanzanian Shilling" },
  { value: "UGX", label: "UGX - Ugandan Shilling" },
  { value: "LKR", label: "LKR - Sri Lankan Rupee" },
  { value: "NPR", label: "NPR - Nepalese Rupee" },
  { value: "MMK", label: "MMK - Myanmar Kyat" },
  { value: "KHR", label: "KHR - Cambodian Riel" },
  { value: "LAK", label: "LAK - Lao Kip" },
  { value: "BND", label: "BND - Brunei Dollar" },
  { value: "MNT", label: "MNT - Mongolian Tugrik" },
  { value: "GEL", label: "GEL - Georgian Lari" },
  { value: "AMD", label: "AMD - Armenian Dram" },
  { value: "AZN", label: "AZN - Azerbaijani Manat" },
  { value: "KZT", label: "KZT - Kazakhstani Tenge" },
  { value: "BYN", label: "BYN - Belarusian Ruble" },
  { value: "MDL", label: "MDL - Moldovan Leu" },
  { value: "ALL", label: "ALL - Albanian Lek" },
  { value: "MKD", label: "MKD - Macedonian Denar" },
  { value: "BAM", label: "BAM - Bosnia-Herzegovina Convertible Mark" },
];

export const CreateGoogleConversionActionModal: React.FC<CreateGoogleConversionActionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  accountId,
  channelId,
  profileId,
  title = "Create Conversion Action",
  profileCurrencyCode,
}) => {
  const defaultCurrency = profileCurrencyCode ?? "USD";
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [countingType, setCountingType] = useState("ONE_PER_CLICK");
  const [clickLookbackDays, setClickLookbackDays] = useState(60);
  const [viewLookbackDays, setViewLookbackDays] = useState(1);
  const [defaultValue, setDefaultValue] = useState<string>("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [error, setError] = useState<string | null>(null);

  // Sync currency to profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrency(profileCurrencyCode ?? "USD");
    }
  }, [isOpen, profileCurrencyCode]);

  const createConversionActionMutation = useCreateGoogleConversionAction(accountId, channelId, profileId);
  const loading = createConversionActionMutation.isPending;

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Clear form state
    setName("");
    setCategory("");
    setCountingType("ONE_PER_CLICK");
    setClickLookbackDays(60);
    setViewLookbackDays(1);
    setDefaultValue("");
    setCurrency(defaultCurrency);
    setError(null);
    onClose();
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!category) {
      setError("Category is required");
      return;
    }

    setError(null);

    try {
      const payload: CreateGoogleConversionActionPayload = {
        name: name.trim(),
        category: category,
        type: "WEBPAGE", // Default to WEBPAGE
        counting_type: countingType,
        click_lookback_days: clickLookbackDays,
        view_lookback_days: viewLookbackDays,
        currency: currency,
      };

      // Add default_value only if provided
      if (defaultValue.trim()) {
        const value = parseFloat(defaultValue.trim());
        if (!isNaN(value) && value >= 0) {
          payload.default_value = value;
        }
      }

      const conversionAction = await createConversionActionMutation.mutateAsync(payload);
      
      // Reset form before closing
      setName("");
      setCategory("");
      setCountingType("ONE_PER_CLICK");
      setClickLookbackDays(60);
      setViewLookbackDays(1);
      setDefaultValue("");
      setCurrency(defaultCurrency);
      setError(null);
      onSuccess(conversionAction);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Failed to create conversion action");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#e8e8e3]">
          <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">{title}</h2>
          <button
            type="button"
            onClick={handleCancel}
            className="text-[#556179] hover:text-[#072929] transition-colors"
            disabled={loading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); handleSubmit(e); }} className="p-6 space-y-4" noValidate>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Purchase, Sign-up"
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              required
              disabled={loading}
            >
              <option value="">Select a category</option>
              {CONVERSION_ACTION_CATEGORIES_FOR_CREATE.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#072929] mb-1">
              Counting Type
            </label>
            <select
              value={countingType}
              onChange={(e) => setCountingType(e.target.value)}
              className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
              disabled={loading}
            >
              {COUNTING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#072929] mb-1">
                Click Lookback (days)
              </label>
              <input
                type="number"
                value={clickLookbackDays}
                onChange={(e) => setClickLookbackDays(parseInt(e.target.value) || 60)}
                min={1}
                max={90}
                className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#072929] mb-1">
                View Lookback (days)
              </label>
              <input
                type="number"
                value={viewLookbackDays}
                onChange={(e) => setViewLookbackDays(parseInt(e.target.value) || 1)}
                min={1}
                max={30}
                className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#072929] mb-1">
                Default Value (optional)
              </label>
              <input
                type="number"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                placeholder="0.00"
                min={0}
                step="0.01"
                className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#072929] mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3 py-2 border border-[#e8e8e3] rounded-lg focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
                disabled={loading}
              >
                {profileCurrencyCode && !CURRENCY_OPTIONS.some((c) => c.value === profileCurrencyCode) && (
                  <option value={profileCurrencyCode}>{profileCurrencyCode} - Account currency</option>
                )}
                {CURRENCY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e8e8e3]">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-[#072929] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 text-[13.3px]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || !name.trim() || !category}
              className="create-entity-button disabled:opacity-50 flex items-center gap-2"
            >
              {loading && <Loader size="sm" showMessage={false} variant="white" />}
              <span className="text-[10.64px] text-white font-normal">Create Conversion Action</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
