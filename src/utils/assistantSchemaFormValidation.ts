import type { CurrentQuestionSchemaItem } from "../types/agent";

export interface AssistantSchemaFormValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates form values against the assistant's current questions schema.
 * Use for the assistant "Fill in the details" form (required, max_length, URL, date, number min/max, etc.).
 */
export function validateAssistantSchemaForm(
  schema: CurrentQuestionSchemaItem[],
  values: Record<string, string>
): AssistantSchemaFormValidationResult {
  const errors: Record<string, string> = {};
  for (const item of schema) {
    const key = item.key;
    const value = values[key];
    const isRequired = item.required !== false;
    const label = item.label || key;

    if (item.ui_hint === "list_string") {
      const min = item.min ?? 1;
      const maxLength = item.max_length;
      const lines = value ? value.split("\n").map((s) => s.trim()).filter(Boolean) : [];
      if (isRequired && lines.length < min) {
        errors[key] = `At least ${min} item(s) required`;
      } else if (maxLength != null) {
        const over = lines.filter((line) => line.length > maxLength);
        if (over.length > 0) {
          errors[key] = `Each item must be ${maxLength} characters or fewer`;
        }
      }
      continue;
    }

    if (item.ui_hint === "channel_controls") {
      if (isRequired) {
        try {
          const obj = (value ? JSON.parse(value) : {}) as Record<string, boolean>;
          const hasAny = Object.values(obj).some((v) => v === true);
          if (!hasAny) errors[key] = "Select at least one option";
        } catch {
          errors[key] = "Select at least one option";
        }
      }
      continue;
    }

    if (item.ui_hint === "date") {
      if (isRequired && (!value || !value.trim())) {
        errors[key] = `${label} is required`;
      } else if (value && value.trim()) {
        const trimmed = value.trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          errors[key] = "Use date format MM/dd/yyyy";
        }
      }
      continue;
    }

    if (item.ui_hint === "dropdown") {
      if (isRequired && (!value || !value.trim())) {
        errors[key] = `${label} is required`;
      }
      continue;
    }

    if (item.ui_hint === "url" || item.ui_hint === "image_url") {
      if (isRequired && (!value || !value.trim())) {
        errors[key] = `${label} is required`;
      } else if (value && value.trim()) {
        try {
          new URL(value.trim());
        } catch {
          errors[key] = "Enter a valid URL";
        }
      }
      continue;
    }

    if (item.ui_hint === "youtube_video" || key === "video_id") {
      const trimmed = value != null ? value.trim() : "";
      if (isRequired && !trimmed) {
        errors[key] = `${label} is required`;
      } else if (trimmed) {
        if (trimmed.length !== 11) {
          errors[key] = "video_id must be 11 characters";
        } else if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
          errors[key] = "video_id must contain only letters, numbers, hyphens, and underscores";
        }
      }
      continue;
    }

    if (item.type === "number") {
      if (isRequired && (value === undefined || value === "" || value.trim() === "")) {
        errors[key] = `${label} is required`;
      } else if (value != null && value.trim() !== "") {
        const n = Number(value.trim());
        if (Number.isNaN(n)) {
          errors[key] = "Enter a valid number";
        } else {
          if (item.min != null && n < item.min) errors[key] = `Minimum is ${item.min}`;
          else if (item.max != null && n > item.max) errors[key] = `Maximum is ${item.max}`;
        }
      }
      continue;
    }

    if (isRequired && (!value || (typeof value === "string" && !value.trim()))) {
      errors[key] = `${label} is required`;
    } else if (item.max_length != null && value && value.length > item.max_length) {
      errors[key] = `Maximum ${item.max_length} characters`;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
