import React, { useState, useEffect } from "react";
import { type GoogleConversionAction } from "../../services/googleAdwords/googleAdwordsConversionActions";
import {
  CONVERSION_ACTION_CATEGORIES,
  getConversionActionCategoryLabel,
} from "../../services/googleAdwords/googleConversionActionCategories";
import { Loader } from "../ui/Loader";
import { CreateGoogleConversionActionModal } from "./CreateGoogleConversionActionModal";
import { useGoogleConversionActions } from "../../hooks/queries/useGoogleConversionActions";

interface GoogleConversionActionSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (conversionActions: GoogleConversionAction[]) => void;
  accountId: number;
  channelId: number;
  profileId: number;
  title?: string;
  selectedIds?: string[]; // Already selected conversion action IDs
  profileCurrencyCode?: string; // Account currency for create modal default
}

export const GoogleConversionActionSelectorModal: React.FC<GoogleConversionActionSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  accountId,
  channelId,
  profileId,
  title = "Select Conversion Actions",
  selectedIds = [],
  profileCurrencyCode,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [selectedConversionActions, setSelectedConversionActions] = useState<GoogleConversionAction[]>([]);
  const [createConversionActionOpen, setCreateConversionActionOpen] = useState(false);

  // Use React Query to fetch conversion actions with caching
  const { data: allConversionActions = [], isLoading: loading, error: queryError } = useGoogleConversionActions(
    isOpen ? accountId : undefined,
    isOpen ? channelId : undefined,
    isOpen ? profileId : undefined
  );
  
  const error = queryError ? (queryError.message || "Failed to load conversion actions") : null;

  // Initialize selected conversion actions from selectedIds prop
  useEffect(() => {
    if (isOpen && allConversionActions.length > 0 && selectedIds.length > 0) {
      const selected = allConversionActions.filter(ca => selectedIds.includes(ca.id));
      setSelectedConversionActions(selected);
    } else if (isOpen && selectedIds.length === 0) {
      setSelectedConversionActions([]);
    }
  }, [isOpen, allConversionActions, selectedIds]);

  // Reset search and filter when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setCategoryFilter("");
    }
  }, [isOpen]);

  const getFilteredConversionActions = (): GoogleConversionAction[] => {
    let filtered = allConversionActions;

    // Filter by category (valid categories only)
    if (categoryFilter) {
      filtered = filtered.filter((ca) => ca.category === categoryFilter);
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter((ca) => {
        return (
          ca.name.toLowerCase().includes(search) ||
          (ca.category && ca.category.toLowerCase().includes(search)) ||
          (ca.type && ca.type.toLowerCase().includes(search))
        );
      });
    }

    return filtered;
  };

  const handleToggleSelection = (conversionAction: GoogleConversionAction) => {
    setSelectedConversionActions((prev) => {
      const isSelected = prev.some((ca) => ca.id === conversionAction.id);
      if (isSelected) {
        return prev.filter((ca) => ca.id !== conversionAction.id);
      } else {
        return [...prev, conversionAction];
      }
    });
  };

  const handleSelect = () => {
    onSelect(selectedConversionActions);
    onClose();
  };

  const handleCreateSuccess = (conversionAction: GoogleConversionAction) => {
    // Add the newly created conversion action to selected list
    setSelectedConversionActions((prev) => {
      if (!prev.some((ca) => ca.id === conversionAction.id)) {
        return [...prev, conversionAction];
      }
      return prev;
    });
    // Refetch will happen automatically via React Query cache invalidation
  };

  if (!isOpen) return null;

  const filteredConversionActions = getFilteredConversionActions();

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#e8e8e3]">
            <h2 className="text-[18px] font-semibold text-[#072929] leading-[100%]">{title}</h2>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="text-[#556179] hover:text-[#072929] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search and category filter */}
          <div className="p-4 border-b border-[#e8e8e3] flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search conversion actions by name, category, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-0 px-4 py-2 border border-[#e8e8e3] rounded-lg bg-white focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929]"
            />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-[#e8e8e3] rounded-lg bg-white focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] text-[13.3px] text-[#072929] min-w-[180px]"
            >
              <option value="">All categories</option>
              {CONVERSION_ACTION_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Create Button */}
          <div className="p-4 border-b border-[#e8e8e3]">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setCreateConversionActionOpen(true);
              }}
              className="create-entity-button flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-[10.64px] text-white font-normal">Create New Conversion Action</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader size="md" showMessage={true} message="Loading conversion actions..." />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {!loading && !error && filteredConversionActions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[#556179] text-sm">
                  {searchTerm ? "No conversion actions found matching your search." : "No conversion actions available."}
                </p>
                <p className="text-[#556179] text-xs mt-2">
                  Click "Create New Conversion Action" to create one.
                </p>
              </div>
            )}

            {!loading && !error && filteredConversionActions.length > 0 && (
              <div className="overflow-x-auto">
                <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden">
                  <table className="w-full text-[13.3px]">
                    <thead>
                      <tr className="border-b border-[#e8e8e3] bg-white">
                        <th className="text-left py-3 px-4 font-medium text-[#072929] w-10">Select</th>
                        <th className="text-left py-3 px-4 font-medium text-[#072929]">Name</th>
                        <th className="text-left py-3 px-4 font-medium text-[#072929]">Category</th>
                        <th className="text-left py-3 px-4 font-medium text-[#072929]">Type</th>
                        <th className="text-left py-3 px-4 font-medium text-[#072929]">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-[#072929]">Value</th>
                        <th className="text-right py-3 px-4 font-medium text-[#072929]">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredConversionActions.map((conversionAction, index) => {
                        const isSelected = selectedConversionActions.some((ca) => ca.id === conversionAction.id);
                        const isLastRow = index === filteredConversionActions.length - 1;
                        const valueDisplay =
                          conversionAction.default_value != null
                            ? `${conversionAction.currency || "USD"} ${Number(conversionAction.default_value).toFixed(2)}`
                            : "—";
                        return (
                          <tr
                            key={conversionAction.id}
                            onClick={() => handleToggleSelection(conversionAction)}
                            className={`border-b ${!isLastRow ? "border-[#e8e8e3]" : ""} hover:bg-gray-50 transition-colors cursor-pointer ${
                              isSelected ? "bg-[#136D6D]/5" : ""
                            }`}
                          >
                            <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleSelection(conversionAction)}
                                className="w-4 h-4 text-[#136D6D] border-[#e8e8e3] rounded focus:ring-[#136D6D]"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-[#072929] leading-[1.26]">{conversionAction.name}</div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[#556179]">
                                {getConversionActionCategoryLabel(conversionAction.category)}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[#556179]">
                                {conversionAction.type ? conversionAction.type.replace(/_/g, " ") : "—"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[#556179]">{conversionAction.status ?? "—"}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-[#556179]">{valueDisplay}</span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleToggleSelection(conversionAction);
                                }}
                                className="px-3 py-1 text-[10.64px] bg-[#136D6D] text-white rounded-lg hover:bg-[#0f5a5a] transition-colors font-normal"
                              >
                                {isSelected ? "Deselect" : "Select"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-[#e8e8e3]">
            <div className="text-[13px] text-[#556179]">
              {selectedConversionActions.length > 0 && (
                <span>{selectedConversionActions.length} conversion action(s) selected</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onClose();
                }}
                className="px-4 py-2 text-[#072929] bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-[13.3px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSelect}
                disabled={selectedConversionActions.length === 0}
                className="create-entity-button disabled:opacity-50 flex items-center gap-2"
              >
                <span className="text-[10.64px] text-white font-normal">Select ({selectedConversionActions.length})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Conversion Action Modal */}
      <CreateGoogleConversionActionModal
        isOpen={createConversionActionOpen}
        onClose={() => setCreateConversionActionOpen(false)}
        onSuccess={handleCreateSuccess}
        accountId={accountId}
        channelId={channelId}
        profileId={profileId}
        profileCurrencyCode={profileCurrencyCode}
      />
    </>
  );
};
