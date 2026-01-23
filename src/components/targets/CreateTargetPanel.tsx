import React, { useState, useEffect } from "react";
import { Dropdown } from "../ui/Dropdown";

export interface TargetInput {
  adGroupId: string;
  bid: number;
  expressionType: string; // For SP/SB: expression type (ASIN_SAME_AS, etc.), For SD: "manual" or "auto"
  expressionValue: string; // For SP/SB: ASIN or value, For SD: expression structure type (views, purchases, etc.)
  state: "ENABLED" | "PAUSED" | "PROPOSED" | "enabled" | "paused" | "archived";
  // SD-specific: nested expression structure
  expression?: Array<{
    type: string;
    value?: string | Array<{ type: string; value?: string }>;
  }>;
  // SD-specific: expression structure type
  sdExpressionStructureType?:
    | "TargetingPredicate"
    | "ContentTargetingPredicate"
    | "TargetingPredicateNested";
  // SD-specific: for nested expressions
  sdNestedType?: "views" | "audience" | "purchases";
  sdNestedPredicates?: Array<{ type: string; value: string }>;
  // SD-specific: for content targeting (array of objects with type and value)
  sdContentCategories?: Array<{ type: string; value: string }>;
}

interface TargetError {
  index: number;
  field: keyof TargetInput;
  message: string;
}

interface CreatedTarget {
  targetId?: string;
  adGroupId: string;
  bid: number;
  expression: Array<{ type: string; value: string }>;
  expressionType: string;
  state: "ENABLED" | "PAUSED" | "PROPOSED";
  index?: number;
}

interface FailedTarget {
  index: number;
  target: TargetInput;
  errors: Array<{ field?: string; message: string }>;
}

interface CreateTargetPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (targets: TargetInput[]) => void;
  adgroups: Array<{ adGroupId: string; name: string }>;
  campaignId: string;
  campaignType?: "SP" | "SB" | "SD";
  loading?: boolean;
  submitError?: string | null;
  fieldErrors?: Record<string, string>;
  createdTargets?: CreatedTarget[];
  failedCount?: number;
  failedTargets?: FailedTarget[];
}

// Expression types for SP campaigns
const EXPRESSION_TYPE_OPTIONS_SP = [
  { value: "ASIN_AGE_RANGE_SAME_AS", label: "ASIN Age Range Same As" },
  { value: "ASIN_BRAND_SAME_AS", label: "ASIN Brand Same As" },
  { value: "ASIN_CATEGORY_SAME_AS", label: "ASIN Category Same As" },
  { value: "ASIN_EXPANDED_FROM", label: "ASIN Expanded From" },
  { value: "ASIN_GENRE_SAME_AS", label: "ASIN Genre Same As" },
  {
    value: "ASIN_IS_PRIME_SHIPPING_ELIGIBLE",
    label: "ASIN Is Prime Shipping Eligible",
  },
  { value: "ASIN_PRICE_BETWEEN", label: "ASIN Price Between" },
  { value: "ASIN_PRICE_GREATER_THAN", label: "ASIN Price Greater Than" },
  { value: "ASIN_PRICE_LESS_THAN", label: "ASIN Price Less Than" },
  { value: "ASIN_REVIEW_RATING_BETWEEN", label: "ASIN Review Rating Between" },
  {
    value: "ASIN_REVIEW_RATING_GREATER_THAN",
    label: "ASIN Review Rating Greater Than",
  },
  {
    value: "ASIN_REVIEW_RATING_LESS_THAN",
    label: "ASIN Review Rating Less Than",
  },
  { value: "ASIN_SAME_AS", label: "ASIN Same As" },
  { value: "KEYWORD_GROUP_SAME_AS", label: "Keyword Group Same As" },
];

// Expression types for SB campaigns (only asinBrandSameAs and asinSameAs)
const EXPRESSION_TYPE_OPTIONS_SB = [
  { value: "asinBrandSameAs", label: "ASIN Brand Same As" },
  { value: "asinSameAs", label: "ASIN Same As" },
];

// Expression structure types for SD campaigns
const SD_EXPRESSION_STRUCTURE_TYPES = [
  { value: "TargetingPredicate", label: "Targeting Predicate" },
  { value: "ContentTargetingPredicate", label: "Content Targeting Predicate" },
  { value: "TargetingPredicateNested", label: "Targeting Predicate Nested" },
];

// TargetingPredicate types for SD
const SD_TARGETING_PREDICATE_TYPES = [
  { value: "asinSameAs", label: "ASIN Same As" },
  { value: "asinCategorySameAs", label: "ASIN Category Same As" },
  { value: "asinBrandSameAs", label: "ASIN Brand Same As" },
  { value: "asinPriceBetween", label: "ASIN Price Between" },
  { value: "asinPriceGreaterThan", label: "ASIN Price Greater Than" },
  { value: "asinPriceLessThan", label: "ASIN Price Less Than" },
  { value: "asinReviewRatingLessThan", label: "ASIN Review Rating Less Than" },
  {
    value: "asinReviewRatingGreaterThan",
    label: "ASIN Review Rating Greater Than",
  },
  { value: "asinReviewRatingBetween", label: "ASIN Review Rating Between" },
  {
    value: "asinIsPrimeShippingEligible",
    label: "ASIN Is Prime Shipping Eligible",
  },
  { value: "asinAgeRangeSameAs", label: "ASIN Age Range Same As" },
  { value: "asinGenreSameAs", label: "ASIN Genre Same As" },
  { value: "similarProduct", label: "Similar Product" },
];

// TargetingPredicateNested types
const SD_NESTED_TYPES = [
  { value: "views", label: "Views" },
  { value: "audience", label: "Audience" },
  { value: "purchases", label: "Purchases" },
];

// Nested predicate types (TargetingPredicateBase)
const SD_NESTED_PREDICATE_TYPES = [
  { value: "asinCategorySameAs", label: "ASIN Category Same As" },
  { value: "asinBrandSameAs", label: "ASIN Brand Same As" },
  { value: "asinPriceBetween", label: "ASIN Price Between" },
  { value: "asinPriceGreaterThan", label: "ASIN Price Greater Than" },
  { value: "asinPriceLessThan", label: "ASIN Price Less Than" },
  { value: "asinReviewRatingLessThan", label: "ASIN Review Rating Less Than" },
  {
    value: "asinReviewRatingGreaterThan",
    label: "ASIN Review Rating Greater Than",
  },
  { value: "asinReviewRatingBetween", label: "ASIN Review Rating Between" },
  { value: "similarProduct", label: "Similar Product" },
  { value: "exactProduct", label: "Exact Product" },
  {
    value: "asinIsPrimeShippingEligible",
    label: "ASIN Is Prime Shipping Eligible",
  },
  { value: "asinAgeRangeSameAs", label: "ASIN Age Range Same As" },
  { value: "asinGenreSameAs", label: "ASIN Genre Same As" },
  { value: "audienceSameAs", label: "Audience Same As" },
  { value: "lookback", label: "Lookback" },
  { value: "negative", label: "Negative" },
  { value: "relatedProduct", label: "Related Product" },
];

// Content categories for ContentTargetingPredicate
const SD_CONTENT_CATEGORIES = [
  {
    category: "Movies and Television",
    subcategory: "All Movies and Television",
    value: "amzn1.iab-content.SPSHQ5",
  },
  {
    category: "Movies and Television",
    subcategory: "Action or Adventure",
    value: "amzn1.iab-content.325",
  },
  {
    category: "Movies and Television",
    subcategory: "Animation or Anime",
    value: "amzn1.iab-content.641",
  },
  {
    category: "Movies and Television",
    subcategory: "Biographies",
    value: "amzn1.iab-content.44",
  },
  {
    category: "Movies and Television",
    subcategory: "Comedy",
    value: "amzn1.iab-content.646",
  },
  {
    category: "Movies and Television",
    subcategory: "Documentary",
    value: "amzn1.iab-content.332",
  },
  {
    category: "Movies and Television",
    subcategory: "Drama",
    value: "amzn1.iab-content.647",
  },
  {
    category: "Movies and Television",
    subcategory: "Factual",
    value: "amzn1.iab-content.648",
  },
  {
    category: "Movies and Television",
    subcategory: "Family",
    value: "amzn1.iab-content.645",
  },
  {
    category: "Movies and Television",
    subcategory: "Fantasy",
    value: "amzn1.iab-content.335",
  },
  {
    category: "Movies and Television",
    subcategory: "History",
    value: "amzn1.iab-content.EZWB7V",
  },
  {
    category: "Movies and Television",
    subcategory: "Holiday",
    value: "amzn1.iab-content.649",
  },
  {
    category: "Movies and Television",
    subcategory: "Horror",
    value: "amzn1.iab-content.336",
  },
  {
    category: "Movies and Television",
    subcategory: "Lifestyle",
    value: "amzn1.iab-content.TIFQA5",
  },
  {
    category: "Movies and Television",
    subcategory: "Music Video",
    value: "amzn1.iab-content.650",
  },
  {
    category: "Movies and Television",
    subcategory: "Musicals",
    value: "amzn1.iab-content.156",
  },
  {
    category: "Movies and Television",
    subcategory: "Mystery",
    value: "amzn1.iab-content.331",
  },
  {
    category: "Movies and Television",
    subcategory: "Reality TV",
    value: "amzn1.iab-content.651",
  },
  {
    category: "Movies and Television",
    subcategory: "Romance",
    value: "amzn1.iab-content.326",
  },
  {
    category: "Movies and Television",
    subcategory: "Science Fiction",
    value: "amzn1.iab-content.652",
  },
  {
    category: "Movies and Television",
    subcategory: "Soap Opera",
    value: "amzn1.iab-content.642",
  },
  {
    category: "Movies and Television",
    subcategory: "Special Interest (Indie or Art House)",
    value: "amzn1.iab-content.643",
  },
  {
    category: "Movies and Television",
    subcategory: "Sports Radio",
    value: "amzn1.iab-content.370",
  },
  {
    category: "Movies and Television",
    subcategory: "Talk Show",
    value: "amzn1.iab-content.A0AH3G",
  },
  {
    category: "Movies and Television",
    subcategory: "True Crime",
    value: "amzn1.iab-content.KHPC5A",
  },
  {
    category: "Movies and Television",
    subcategory: "Western",
    value: "amzn1.iab-content.KHPC6A",
  },
  {
    category: "Music and Radio",
    subcategory: "All Music and Radio",
    value: "amzn1.iab-content.338",
  },
  {
    category: "Music and Radio",
    subcategory: "Blues",
    value: "amzn1.iab-content.360",
  },
  {
    category: "Music and Radio",
    subcategory: "Classical Music",
    value: "amzn1.iab-content.346",
  },
  {
    category: "Music and Radio",
    subcategory: "Comedy (Music and Audio)",
    value: "amzn1.iab-content.348",
  },
  {
    category: "Music and Radio",
    subcategory: "Pop, Contemporary Hits, or Top 40 Music",
    value: "amzn1.iab-content.349",
  },
  {
    category: "Music and Radio",
    subcategory: "Country Music",
    value: "amzn1.iab-content.350",
  },
  {
    category: "Music and Radio",
    subcategory: "Dance and Electronic Music",
    value: "amzn1.iab-content.351",
  },
  {
    category: "Music and Radio",
    subcategory: "Hip Hop Music",
    value: "amzn1.iab-content.355",
  },
  {
    category: "Music and Radio",
    subcategory: "Inspirational or New Age Music",
    value: "amzn1.iab-content.356",
  },
  {
    category: "Music and Radio",
    subcategory: "Jazz",
    value: "amzn1.iab-content.357",
  },
  {
    category: "Music and Radio",
    subcategory: "Oldies or Adult Standards",
    value: "amzn1.iab-content.358",
  },
  {
    category: "Music and Radio",
    subcategory: "R&B, Soul or Funk Music",
    value: "amzn1.iab-content.362",
  },
  {
    category: "Music and Radio",
    subcategory: "Reggae",
    value: "amzn1.iab-content.359",
  },
  {
    category: "Music and Radio",
    subcategory: "Rock Music",
    value: "amzn1.iab-content.363",
  },
  {
    category: "Music and Radio",
    subcategory: "Songwriters or Folk",
    value: "amzn1.iab-content.353",
  },
  {
    category: "Music and Radio",
    subcategory: "World or International Music",
    value: "amzn1.iab-content.352",
  },
  {
    category: "Video Games",
    subcategory: "All Video Games",
    value: "amzn1.iab-content.680",
  },
  {
    category: "Video Games",
    subcategory: "Action-Adventure Games",
    value: "amzn1.iab-content.691",
  },
  {
    category: "Video Games",
    subcategory: "Casual Games",
    value: "amzn1.iab-content.693",
  },
  {
    category: "Video Games",
    subcategory: "Puzzle Video Games",
    value: "amzn1.iab-content.698",
  },
  {
    category: "Video Games",
    subcategory: "Racing Video Games",
    value: "amzn1.iab-content.VK7KD0",
  },
  {
    category: "Video Games",
    subcategory: "Role-Playing Video Games",
    value: "amzn1.iab-content.687",
  },
  {
    category: "Video Games",
    subcategory: "Simulation Video Games",
    value: "amzn1.iab-content.688",
  },
  {
    category: "Video Games",
    subcategory: "Sports Video Games",
    value: "amzn1.iab-content.689",
  },
  {
    category: "Video Games",
    subcategory: "Strategy Video Games",
    value: "amzn1.iab-content.690",
  },
  {
    category: "Video Games",
    subcategory: "PC Games",
    value: "amzn1.iab-content.684",
  },
  {
    category: "Video Games",
    subcategory: "Mobile Games",
    value: "amzn1.iab-content.683",
  },
  {
    category: "Video Games",
    subcategory: "Console Games",
    value: "amzn1.iab-content.681",
  },
  {
    category: "Video Games",
    subcategory: "eSports",
    value: "amzn1.iab-content.682",
  },
];

// ExpressionType options for SD campaigns (manual or auto)
const EXPRESSION_TYPE_SD_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto" },
];

const STATE_OPTIONS = [
  { value: "ENABLED", label: "ENABLED" },
  { value: "PAUSED", label: "PAUSED" },
  { value: "PROPOSED", label: "PROPOSED" },
];

const STATE_OPTIONS_SD = [
  { value: "enabled", label: "Enabled" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

export const CreateTargetPanel: React.FC<CreateTargetPanelProps> = ({
  isOpen,
  onClose,
  onSubmit,
  adgroups,
  campaignId,
  campaignType = "SP",
  loading = false,
  submitError = null,
  fieldErrors = {},
  createdTargets = [],
  failedCount = 0,
  failedTargets = [],
}) => {
  // Get expression type options based on campaign type
  // Note: For SD campaigns, expression types are handled differently via sdExpressionStructureType
  const EXPRESSION_TYPE_OPTIONS =
    campaignType === "SB"
      ? EXPRESSION_TYPE_OPTIONS_SB
      : EXPRESSION_TYPE_OPTIONS_SP;

  const STATE_OPTIONS_TO_USE =
    campaignType === "SD" ? STATE_OPTIONS_SD : STATE_OPTIONS;

  const [currentTarget, setCurrentTarget] = useState<TargetInput>({
    adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
    bid: 0.1,
    expressionType:
      campaignType === "SB"
        ? "asinSameAs"
        : campaignType === "SD"
        ? "manual"
        : "ASIN_SAME_AS",
    expressionValue: "",
    state: campaignType === "SD" ? "enabled" : "ENABLED",
    sdExpressionStructureType:
      campaignType === "SD" ? "TargetingPredicate" : undefined,
    sdNestedType: undefined,
    sdNestedPredicates: [],
    sdContentCategories: [],
  });
  const [addedTargets, setAddedTargets] = useState<TargetInput[]>([]);
  const [errors, setErrors] = useState<
    Partial<Record<keyof TargetInput, string>>
  >({});
  const [targetErrors, setTargetErrors] = useState<TargetError[]>([]);

  const handleChange = (
    field: keyof TargetInput,
    value: string | number | any
  ) => {
    setCurrentTarget((prev) => {
      const updated = { ...prev, [field]: value };
      // Reset dependent fields when structure type changes
      if (field === "sdExpressionStructureType" && campaignType === "SD") {
        updated.expressionValue = "";
        updated.sdContentCategories = [];
        updated.sdNestedType = undefined;
        updated.sdNestedPredicates = [];
      }
      return updated;
    });
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddNestedPredicate = () => {
    setCurrentTarget((prev) => ({
      ...prev,
      sdNestedPredicates: [
        ...(prev.sdNestedPredicates || []),
        { type: "", value: "" },
      ],
    }));
  };

  const handleRemoveNestedPredicate = (index: number) => {
    setCurrentTarget((prev) => ({
      ...prev,
      sdNestedPredicates: (prev.sdNestedPredicates || []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleAddContentCategory = () => {
    setCurrentTarget((prev) => ({
      ...prev,
      sdContentCategories: [
        ...(prev.sdContentCategories || []),
        { type: "contentCategorySameAs", value: "" },
      ],
    }));
  };

  const handleRemoveContentCategory = (index: number) => {
    setCurrentTarget((prev) => ({
      ...prev,
      sdContentCategories: (prev.sdContentCategories || []).filter(
        (_, i) => i !== index
      ),
    }));
  };

  const handleContentCategoryChange = (
    index: number,
    field: "type" | "value",
    value: string
  ) => {
    setCurrentTarget((prev) => {
      const categories = [...(prev.sdContentCategories || [])];
      categories[index] = {
        type: "contentCategorySameAs", // Always ensure type is contentCategorySameAs
        value: field === "value" ? value : categories[index]?.value || "",
      };
      return { ...prev, sdContentCategories: categories };
    });
  };

  const handleNestedPredicateChange = (
    index: number,
    field: "type" | "value",
    value: string
  ) => {
    setCurrentTarget((prev) => {
      const predicates = [...(prev.sdNestedPredicates || [])];
      predicates[index] = { ...predicates[index], [field]: value };
      return { ...prev, sdNestedPredicates: predicates };
    });
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TargetInput, string>> = {};

    if (!currentTarget.adGroupId) {
      newErrors.adGroupId = "Ad Group is required";
    }

    if (currentTarget.bid <= 0) {
      newErrors.bid = "Bid must be greater than 0";
    }

    // SD-specific validation
    if (campaignType === "SD") {
      if (!currentTarget.sdExpressionStructureType) {
        newErrors.sdExpressionStructureType =
          "Expression structure type is required";
      } else {
        if (currentTarget.sdExpressionStructureType === "TargetingPredicate") {
          const predicateType =
            currentTarget.expression?.[0]?.type ||
            currentTarget.expressionValue;
          const predicateValue = currentTarget.expression?.[0]?.value as string;
          if (!predicateType) {
            newErrors.expressionValue = "Predicate type is required";
          }
          if (!predicateValue?.trim()) {
            newErrors.expressionValue = "Predicate value is required";
          }
        } else if (
          currentTarget.sdExpressionStructureType ===
          "ContentTargetingPredicate"
        ) {
          if (
            !currentTarget.sdContentCategories ||
            currentTarget.sdContentCategories.length === 0
          ) {
            newErrors.sdContentCategories =
              "At least one content category is required";
          } else {
            // Validate each content category
            currentTarget.sdContentCategories.forEach((cat, idx) => {
              if (!cat.value?.trim()) {
                newErrors[`contentCategory_${idx}_value` as keyof TargetInput] =
                  "Content category value is required";
              }
            });
          }
        } else if (
          currentTarget.sdExpressionStructureType === "TargetingPredicateNested"
        ) {
          if (!currentTarget.sdNestedType) {
            newErrors.sdNestedType =
              "Nested type (views/audience/purchases) is required";
          }
          if (
            !currentTarget.sdNestedPredicates ||
            currentTarget.sdNestedPredicates.length === 0
          ) {
            newErrors.sdNestedPredicates =
              "At least one nested predicate is required";
          } else {
            // Validate each nested predicate
            currentTarget.sdNestedPredicates.forEach((pred, idx) => {
              if (!pred.type) {
                newErrors[`nestedPredicate_${idx}_type` as keyof TargetInput] =
                  "Predicate type is required";
              }
              if (!pred.value?.trim()) {
                newErrors[`nestedPredicate_${idx}_value` as keyof TargetInput] =
                  "Predicate value is required";
              }
            });
          }
        }
      }
    } else {
      // SP/SB validation
      if (!currentTarget.expressionValue.trim()) {
        newErrors.expressionValue = "Expression value is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddTarget = () => {
    if (!validate()) {
      return;
    }

    // For SD campaigns, ensure expression is properly formatted
    let targetToAdd = { ...currentTarget };
    if (campaignType === "SD" && targetToAdd.sdExpressionStructureType) {
      // Build expression based on structure type
      if (targetToAdd.sdExpressionStructureType === "TargetingPredicate") {
        // Use expression array if available, otherwise build from expressionValue
        if (!targetToAdd.expression || targetToAdd.expression.length === 0) {
          const predicateType =
            targetToAdd.expression?.[0]?.type || targetToAdd.expressionValue;
          const predicateValue =
            (targetToAdd.expression?.[0]?.value as string) || "";
          if (predicateType) {
            targetToAdd.expression = [
              { type: predicateType, value: predicateValue },
            ];
          }
        }
      } else if (
        targetToAdd.sdExpressionStructureType === "ContentTargetingPredicate"
      ) {
        // Set expression for content targeting - array of objects with type and value
        if (
          targetToAdd.sdContentCategories &&
          targetToAdd.sdContentCategories.length > 0
        ) {
          targetToAdd.expression = targetToAdd.sdContentCategories.map(
            (cat) => ({
              type: cat.type || "contentCategorySameAs",
              value: cat.value,
            })
          );
        }
      } else if (
        targetToAdd.sdExpressionStructureType === "TargetingPredicateNested"
      ) {
        // Set expression for nested
        if (
          targetToAdd.sdNestedType &&
          targetToAdd.sdNestedPredicates &&
          targetToAdd.sdNestedPredicates.length > 0
        ) {
          targetToAdd.expression = [
            {
              type: targetToAdd.sdNestedType,
              value: targetToAdd.sdNestedPredicates.map((pred) => ({
                type: pred.type,
                value: pred.value,
              })),
            },
          ];
        }
      }
    }

    // Add target to the list
    setAddedTargets((prev) => [...prev, targetToAdd]);

    // Reset form for next target
    setCurrentTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      bid: 0.1,
      expressionType:
        campaignType === "SB"
          ? "asinSameAs"
          : campaignType === "SD"
          ? "manual"
          : "ASIN_SAME_AS",
      expressionValue: "",
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      sdExpressionStructureType:
        campaignType === "SD" ? "TargetingPredicate" : undefined,
      sdNestedType: undefined,
      sdNestedPredicates: [],
      sdContentCategories: [],
      expression: undefined,
    });
    setErrors({});
    // Clear all previous target errors when adding a new target
    setTargetErrors([]);
  };

  const handleRemoveTarget = (index: number) => {
    // Remove the target from the list
    setAddedTargets((prev) => prev.filter((_, i) => i !== index));

    // Clear all previous target errors when removing a target
    // This ensures a clean slate since the user is actively fixing issues
    setTargetErrors([]);
  };

  const handleSubmit = () => {
    if (addedTargets.length === 0) {
      alert("Please add at least one target before submitting.");
      return;
    }

    // Clear previous errors
    setTargetErrors([]);
    onSubmit(addedTargets);
    // Don't reset targets here - let parent handle success/error
  };

  // Helper function to compute adjusted index based on created targets
  const getAdjustedErrorIndex = (originalIndex: number): number => {
    if (createdTargets.length === 0) return originalIndex;
    const createdIndices = new Set(
      createdTargets
        .map((ct) => ct.index)
        .filter((idx) => idx !== undefined && idx !== null)
    );
    const removedBefore = Array.from(createdIndices).filter(
      (idx) => idx < originalIndex
    ).length;
    return originalIndex - removedBefore;
  };

  // Process failed targets and field errors - adjust indices immediately
  useEffect(() => {
    const newTargetErrors: TargetError[] = [];

    // Process failed targets - use index from backend response and adjust immediately
    if (failedTargets && failedTargets.length > 0) {
      failedTargets.forEach((failedTarget) => {
        // Use the index from the backend response directly
        const originalIndex = failedTarget.index;

        // Only process if index is valid
        if (originalIndex !== undefined && originalIndex !== null) {
          // Adjust the index based on created targets
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map errors to the target at this adjusted index
          failedTarget.errors.forEach((error) => {
            // Map error field to TargetInput field
            let field: keyof TargetInput = "expressionValue"; // Default
            if (error.field) {
              // Map Amazon API field names to frontend field names
              const fieldMap: Record<string, keyof TargetInput> = {
                expression: "expressionValue",
                expressionType: "expressionType",
                bid: "bid",
                state: "state",
                adGroupId: "adGroupId",
              };
              field =
                fieldMap[error.field] || (error.field as keyof TargetInput);
            }

            // Check if error already exists for this index+field to avoid duplicates
            const exists = newTargetErrors.some(
              (e) => e.index === adjustedIndex && e.field === field
            );
            if (!exists) {
              newTargetErrors.push({
                index: adjustedIndex,
                field,
                message: error.message,
              });
            }
          });
        }
      });
    }

    // Process field errors (format: "field_$index") - adjust indices immediately
    Object.entries(fieldErrors).forEach(([key, message]) => {
      const match = key.match(/^(.+)_\$(\d+)$/);
      if (match) {
        const [, fieldName, indexStr] = match;
        const originalIndex = parseInt(indexStr, 10);
        if (!isNaN(originalIndex)) {
          // Adjust the index based on created targets
          const adjustedIndex = getAdjustedErrorIndex(originalIndex);

          // Map field name to TargetInput field
          const fieldMap: Record<string, keyof TargetInput> = {
            expression: "expressionValue",
            expressionType: "expressionType",
            bid: "bid",
            state: "state",
            adGroupId: "adGroupId",
          };
          const field = fieldMap[fieldName] || (fieldName as keyof TargetInput);

          // Check if error already exists for this index+field
          const exists = newTargetErrors.some(
            (e) => e.index === adjustedIndex && e.field === field
          );
          if (!exists) {
            newTargetErrors.push({
              index: adjustedIndex,
              field,
              message,
            });
          }
        }
      }
    });

    setTargetErrors(newTargetErrors);
  }, [failedTargets, fieldErrors, createdTargets]);

  // Handle successful targets - remove them from the list using index
  useEffect(() => {
    if (createdTargets && createdTargets.length > 0) {
      // Use index from response to remove only the specific target that was created
      setAddedTargets((prev) => {
        const createdIndices = new Set(
          createdTargets
            .map((ct) => ct.index)
            .filter((idx) => idx !== undefined && idx !== null)
        );

        // Remove targets at the indices that were successfully created
        return prev.filter((_, index) => !createdIndices.has(index));
      });
    }
  }, [createdTargets]);

  const handleCancel = () => {
    setAddedTargets([]);
    setCurrentTarget({
      adGroupId: adgroups.length > 0 ? adgroups[0].adGroupId : "",
      bid: 0.1,
      expressionType:
        campaignType === "SB"
          ? "asinSameAs"
          : campaignType === "SD"
          ? "manual"
          : "ASIN_SAME_AS",
      expressionValue: "",
      state: campaignType === "SD" ? "enabled" : "ENABLED",
      sdExpressionStructureType:
        campaignType === "SD" ? "TargetingPredicate" : undefined,
      sdNestedType: undefined,
      sdNestedPredicates: [],
      sdContentCategories: [],
    });
    setErrors({});
    setTargetErrors([]);
    onClose();
  };

  const getAdGroupName = (adGroupId: string) => {
    const adgroup = adgroups.find((ag) => ag.adGroupId === adGroupId);
    return adgroup?.name || adGroupId;
  };

  if (!isOpen) return null;

  return (
    <div className="create-panel">
      {/* Form */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-[16px] font-semibold text-[#072929] mb-4">
          Create Targets
        </h2>

        <div className="space-y-4">
          {/* Single line inputs */}
          {campaignType === "SD" ? (
            /* SD Campaign: All 5 fields in one line */
            <div className="grid grid-cols-5 gap-3">
              {/* Expression Structure */}
              <div>
                <label className="form-label-small">
                  Expression Structure *
                </label>
                <Dropdown<string>
                  options={SD_EXPRESSION_STRUCTURE_TYPES}
                  value={currentTarget.sdExpressionStructureType || ""}
                  onChange={(value) =>
                    handleChange("sdExpressionStructureType", value)
                  }
                  placeholder="Select structure type"
                  buttonClassName="w-full edit-button"
                />
                {errors.sdExpressionStructureType && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.sdExpressionStructureType}
                  </p>
                )}
              </div>

              {/* Ad Group */}
              <div>
                <label className="form-label-small">
                  Ad Group *
                </label>
                <Dropdown<string>
                  options={adgroups.map((ag) => ({
                    value: ag.adGroupId,
                    label: ag.name,
                  }))}
                  value={currentTarget.adGroupId}
                  onChange={(value) => handleChange("adGroupId", value)}
                  placeholder="Select ad group"
                  buttonClassName="edit-button w-full"
                />
                {errors.adGroupId && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.adGroupId}
                  </p>
                )}
              </div>

              {/* Expression Type */}
              <div>
                <label className="form-label-small">
                  Expression Type *
                </label>
                <Dropdown<string>
                  options={EXPRESSION_TYPE_SD_OPTIONS}
                  value={currentTarget.expressionType}
                  onChange={(value) => handleChange("expressionType", value)}
                  placeholder="Select type"
                  buttonClassName="w-full edit-button"
                />
              </div>

              {/* Bid */}
              <div>
                <label className="form-label-small">
                  Bid *
                </label>
                <input
                  type="number"
                  value={currentTarget.bid || ""}
                  onChange={(e) =>
                    handleChange("bid", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.10"
                  min="0"
                  step="0.01"
                  className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                    errors.bid ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.bid && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.bid}</p>
                )}
              </div>

              {/* State */}
              <div>
                <label className="form-label-small">
                  State *
                </label>
                <Dropdown<string>
                  options={STATE_OPTIONS_TO_USE}
                  value={currentTarget.state}
                  onChange={(value) =>
                    handleChange("state", value as TargetInput["state"])
                  }
                  placeholder="Select state"
                  buttonClassName="edit-button w-full"
                />
              </div>
            </div>
          ) : (
            /* SP/SB Campaign: Original layout */
            <div className="flex items-end gap-3">
              {/* Ad Group Dropdown */}
              <div className="flex-1 min-w-[180px] w-full">
                <label className="form-label-small">
                  Ad Group *
                </label>
                <Dropdown<string>
                  options={adgroups.map((ag) => ({
                    value: ag.adGroupId,
                    label: ag.name,
                  }))}
                  value={currentTarget.adGroupId}
                  onChange={(value) => handleChange("adGroupId", value)}
                  placeholder="Select ad group"
                  buttonClassName="edit-button w-full"
                />
                {errors.adGroupId && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.adGroupId}
                  </p>
                )}
              </div>

              {/* Expression Type */}
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Expression Type *
                </label>
                <Dropdown<string>
                  options={EXPRESSION_TYPE_OPTIONS}
                  value={currentTarget.expressionType}
                  onChange={(value) => handleChange("expressionType", value)}
                  placeholder="Select expression type"
                  buttonClassName="edit-button w-full"
                />
              </div>

              {/* Expression Value */}
              <div className="flex-1 min-w-[200px]">
                <label className="form-label-small">
                  Expression Value *
                </label>
                <input
                  type="text"
                  value={currentTarget.expressionValue}
                  onChange={(e) =>
                    handleChange("expressionValue", e.target.value)
                  }
                  placeholder="Enter ASIN or value"
                  className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                    errors.expressionValue
                      ? "border-red-500"
                      : "border-gray-200"
                  }`}
                />
                {errors.expressionValue && (
                  <p className="text-[10px] text-red-500 mt-1">
                    {errors.expressionValue}
                  </p>
                )}
              </div>

              {/* Bid */}
              <div className="w-[120px]">
                <label className="form-label-small">
                  Bid *
                </label>
                <input
                  type="number"
                  value={currentTarget.bid || ""}
                  onChange={(e) =>
                    handleChange("bid", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0.10"
                  min="0"
                  step="0.01"
                  className={`w-full campaign-input px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                    errors.bid ? "border-red-500" : "border-gray-200"
                  }`}
                />
                {errors.bid && (
                  <p className="text-[10px] text-red-500 mt-1">{errors.bid}</p>
                )}
              </div>

              {/* State - hidden for SB campaigns */}
              {campaignType !== "SB" && (
                <div className="w-[140px]">
                  <label className="form-label-small">
                    State *
                  </label>
                  <Dropdown<string>
                    options={STATE_OPTIONS_TO_USE}
                    value={currentTarget.state}
                    onChange={(value) =>
                      handleChange("state", value as TargetInput["state"])
                    }
                    placeholder="Select state"
                    buttonClassName="edit-button w-full"
                  />
                </div>
              )}

              {/* Add Target Button - Only show inline for SP/SB */}
              <div className="w-[120px]">
                <button
                  type="button"
                  onClick={handleAddTarget}
                  className="create-entity-button w-full text-[11px] justify-center"
                >
                  Add Target
                </button>
              </div>
            </div>
          )}

          {/* SD Dynamic Fields - Show on separate rows */}
          {campaignType === "SD" && (
            <>
              {/* TargetingPredicate fields */}
              {currentTarget.sdExpressionStructureType ===
                "TargetingPredicate" && (
                <div className="flex items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="form-label-small">
                      Predicate Type *
                    </label>
                    <Dropdown<string>
                      options={SD_TARGETING_PREDICATE_TYPES}
                      value={
                        currentTarget.expression?.[0]?.type ||
                        currentTarget.expressionValue ||
                        ""
                      }
                      onChange={(value) => {
                        const currentValue =
                          currentTarget.expression?.[0]?.value || "";
                        setCurrentTarget((prev) => ({
                          ...prev,
                          expressionValue: value,
                          expression: value
                            ? [{ type: value, value: currentValue }]
                            : [],
                        }));
                      }}
                      placeholder="Select predicate type"
                      buttonClassName="w-full"
                    />
                    {errors.expressionValue && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.expressionValue}
                      </p>
                    )}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <label className="form-label-small">
                      Predicate Value *
                    </label>
                    <input
                      type="text"
                      value={
                        (currentTarget.expression?.[0]?.value as string) || ""
                      }
                      onChange={(e) => {
                        const exprType =
                          currentTarget.expression?.[0]?.type ||
                          currentTarget.expressionValue;
                        if (exprType) {
                          setCurrentTarget((prev) => ({
                            ...prev,
                            expression: [
                              { type: exprType, value: e.target.value },
                            ],
                          }));
                        }
                      }}
                      placeholder="Enter value (e.g., ASIN)"
                      className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                        errors.expressionValue
                          ? "border-red-500"
                          : "border-gray-200"
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* ContentTargetingPredicate field */}
              {currentTarget.sdExpressionStructureType ===
                "ContentTargetingPredicate" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                      Content Categories *
                    </label>
                    <button
                      type="button"
                      onClick={handleAddContentCategory}
                      className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a] font-semibold"
                    >
                      + Add Category
                    </button>
                  </div>
                  {currentTarget.sdContentCategories &&
                  currentTarget.sdContentCategories.length > 0 ? (
                    <div className="space-y-2">
                      {currentTarget.sdContentCategories.map((cat, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <div className="flex-1 min-w-[300px]">
                            <Dropdown<string>
                              options={SD_CONTENT_CATEGORIES.map((cat) => ({
                                value: cat.value,
                                label: `${cat.category} - ${cat.subcategory}`,
                              }))}
                              value={cat.value || ""}
                              onChange={(value) =>
                                handleContentCategoryChange(idx, "value", value)
                              }
                              placeholder="Select content category"
                              buttonClassName="w-full"
                            />
                            {errors[
                              `contentCategory_${idx}_value` as keyof TargetInput
                            ] && (
                              <p className="text-[10px] text-red-500 mt-1">
                                {
                                  errors[
                                    `contentCategory_${idx}_value` as keyof TargetInput
                                  ]
                                }
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveContentCategory(idx)}
                            className="px-3 py-2.5 text-red-500 hover:text-red-700 transition-colors"
                            title="Remove"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11.2px] text-gray-500 italic">
                      No categories added. Click "Add Category" to add one.
                    </p>
                  )}
                  {errors.sdContentCategories && (
                    <p className="text-[10px] text-red-500 mt-1">
                      {errors.sdContentCategories}
                    </p>
                  )}
                </div>
              )}

              {/* TargetingPredicateNested fields */}
              {currentTarget.sdExpressionStructureType ===
                "TargetingPredicateNested" && (
                <>
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="form-label-small">
                        Nested Type *
                      </label>
                      <Dropdown<string>
                        options={SD_NESTED_TYPES}
                        value={currentTarget.sdNestedType || ""}
                        onChange={(value) =>
                          handleChange("sdNestedType", value)
                        }
                        placeholder="Select type"
                        buttonClassName="w-full edit-button"
                      />
                      {errors.sdNestedType && (
                        <p className="text-[10px] text-red-500 mt-1">
                          {errors.sdNestedType}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Nested Predicates Section */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[11.2px] font-semibold text-[#556179] uppercase">
                        Nested Predicates *
                      </label>
                      <button
                        type="button"
                        onClick={handleAddNestedPredicate}
                        className="text-[11.2px] text-[#136D6D] hover:text-[#0e5a5a] font-semibold"
                      >
                        + Add Predicate
                      </button>
                    </div>
                    {currentTarget.sdNestedPredicates &&
                    currentTarget.sdNestedPredicates.length > 0 ? (
                      <div className="space-y-2">
                        {currentTarget.sdNestedPredicates.map((pred, idx) => (
                          <div key={idx} className="flex gap-2 items-end">
                            <div className="flex-1 min-w-[200px]">
                              <Dropdown<string>
                                options={SD_NESTED_PREDICATE_TYPES}
                                value={pred.type}
                                onChange={(value) =>
                                  handleNestedPredicateChange(
                                    idx,
                                    "type",
                                    value
                                  )
                                }
                                placeholder="Select predicate type"
                                buttonClassName="w-full"
                              />
                              {errors[
                                `nestedPredicate_${idx}_type` as keyof TargetInput
                              ] && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  {
                                    errors[
                                      `nestedPredicate_${idx}_type` as keyof TargetInput
                                    ]
                                  }
                                </p>
                              )}
                            </div>
                            <div className="flex-1 min-w-[200px]">
                              <input
                                type="text"
                                value={pred.value}
                                onChange={(e) =>
                                  handleNestedPredicateChange(
                                    idx,
                                    "value",
                                    e.target.value
                                  )
                                }
                                placeholder="Enter value"
                                className={`bg-white w-full px-4 py-2.5 border rounded-lg text-[11.2px] text-black focus:outline-none focus:ring-2 focus:ring-[#136D6D] focus:border-[#136D6D] ${
                                  errors[
                                    `nestedPredicate_${idx}_value` as keyof TargetInput
                                  ]
                                    ? "border-red-500"
                                    : "border-gray-200"
                                }`}
                              />
                              {errors[
                                `nestedPredicate_${idx}_value` as keyof TargetInput
                              ] && (
                                <p className="text-[10px] text-red-500 mt-1">
                                  {
                                    errors[
                                      `nestedPredicate_${idx}_value` as keyof TargetInput
                                    ]
                                  }
                                </p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveNestedPredicate(idx)}
                              className="px-3 py-2.5 text-red-500 hover:text-red-700 transition-colors"
                              title="Remove"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11.2px] text-gray-500 italic">
                        No predicates added. Click "Add Predicate" to add one.
                      </p>
                    )}
                    {errors.sdNestedPredicates && (
                      <p className="text-[10px] text-red-500 mt-1">
                        {errors.sdNestedPredicates}
                      </p>
                    )}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Error Summary */}
      {submitError && (
        <div className="p-4 border-b border-gray-200 bg-red-50">
          <p className="text-[13.3px] text-red-600">{submitError}</p>
          {createdTargets.length > 0 && failedCount > 0 && (
            <p className="text-[12px] text-red-600 mt-1">
              {createdTargets.length} target(s) created successfully.{" "}
              {failedCount} target(s) failed.
            </p>
          )}
        </div>
      )}

      {/* Success Summary */}
      {createdTargets.length > 0 && failedCount === 0 && (
        <div className="p-4 border-b border-gray-200 bg-green-50">
          <p className="text-[13.3px] text-green-600">
            {createdTargets.length} target(s) created successfully!
          </p>
        </div>
      )}

      {/* Targets Table */}
      {addedTargets.length > 0 && (
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-[14px] font-semibold text-[#072929] mb-3">
            Added Targets ({addedTargets.length})
          </h3>
          <div className="bg-[#fefefb] border border-[#e8e8e3] rounded-[12px] overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[#e8e8e3]">
                    <th className="table-header">Ad Group</th>
                    <th className="table-header">
                      {campaignType === "SD"
                        ? "Expression Structure"
                        : "Expression Type"}
                    </th>
                    <th className="table-header">
                      {campaignType === "SD"
                        ? "Expression Details"
                        : "Expression Value"}
                    </th>
                    <th className="table-header">Bid</th>
                    <th className="table-header">State</th>
                    <th className="table-header">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {addedTargets.map((target, index) => {
                    const isLastRow = index === addedTargets.length - 1;
                    // Check if this target has errors
                    const targetRowErrors = targetErrors.filter(
                      (e) => e.index === index
                    );
                    const hasErrors = targetRowErrors.length > 0;
                    // Check if this target failed by comparing with adjusted indices
                    const isFailedTarget = failedTargets.some((ft) => {
                      if (ft.index === undefined || ft.index === null)
                        return false;
                      // Get the adjusted index for this failed target
                      const adjustedFailedIndex = getAdjustedErrorIndex(
                        ft.index
                      );
                      return adjustedFailedIndex === index;
                    });

                    // If a target failed but has no specific errors, we should still mark it
                    const shouldHighlight = hasErrors || isFailedTarget;

                    return (
                      <tr
                        key={index}
                        className={`${
                          !isLastRow ? "border-b border-[#e8e8e3]" : ""
                        } ${
                          shouldHighlight ? "bg-red-50" : ""
                        } hover:bg-gray-50 transition-colors`}
                      >
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {getAdGroupName(target.adGroupId)}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "adGroupId")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {campaignType === "SD"
                                ? target.sdExpressionStructureType || "—"
                                : EXPRESSION_TYPE_OPTIONS.find(
                                    (opt) => opt.value === target.expressionType
                                  )?.label || target.expressionType}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "expressionType")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {campaignType === "SD"
                                ? target.sdExpressionStructureType ===
                                  "TargetingPredicate"
                                  ? `${
                                      target.expression?.[0]?.type ||
                                      target.expressionValue ||
                                      "—"
                                    }: ${target.expression?.[0]?.value || "—"}`
                                  : target.sdExpressionStructureType ===
                                    "ContentTargetingPredicate"
                                  ? target.expression &&
                                    target.expression.length > 0
                                    ? target.expression
                                        .map((expr) => {
                                          const cat =
                                            SD_CONTENT_CATEGORIES.find(
                                              (c) => c.value === expr.value
                                            );
                                          return cat
                                            ? `${cat.category} - ${cat.subcategory}`
                                            : expr.value || "—";
                                        })
                                        .join(", ") || "—"
                                    : "—"
                                  : target.sdExpressionStructureType ===
                                    "TargetingPredicateNested"
                                  ? `${target.sdNestedType || "—"} (${
                                      target.sdNestedPredicates?.length || 0
                                    } predicates)`
                                  : "—"
                                : target.expressionValue}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "expressionValue")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              ${target.bid.toFixed(2)}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "bid")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <div className="flex flex-col">
                            <span className="table-text leading-[1.26]">
                              {target.state}
                            </span>
                            {targetRowErrors
                              .filter((e) => e.field === "state")
                              .map((e, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] text-red-500 mt-1"
                                >
                                  {e.message}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="table-cell">
                          <button
                            type="button"
                            onClick={() => handleRemoveTarget(index)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            title="Remove"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="p-4 flex items-center justify-end gap-3">
        {/* Add Target Button for SD campaigns - positioned at bottom right */}
        {campaignType === "SD" && (
          <button
            type="button"
            onClick={handleAddTarget}
            className="create-entity-button text-[11px] justify-center"
          >
            Add Target
          </button>
        )}
        <button
          type="button"
          onClick={handleCancel}
          className="cancel-button"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={addedTargets.length === 0 || loading}
          className="apply-button"
        >
          {loading ? "Creating..." : "Add All Targets"}
        </button>
      </div>
    </div>
  );
};
