# CSS Custom Properties Usage Guide

This guide shows how to use the CSS custom properties (CSS variables) defined in `src/index.css` within the `@theme` block.

## Available Semantic Variables

### Border Colors

- `--color-semantic-border-default: #E8E8E3`
- `--color-semantic-border-light: #E4E4D7`
- `--color-semantic-border-medium: #D1D1C7`

### Status Colors

- `--color-semantic-status-primary: #136D6D`
- `--color-semantic-status-danger: #CE1313`
- `--color-semantic-status-warning: #FF991F`
- `--color-semantic-status-success: #136D6D`

## Usage Examples

### 1. In CSS Files

```css
/* Basic usage */
.my-button {
  border: 1px solid var(--color-semantic-border-default);
  background-color: var(--color-semantic-status-primary);
  color: var(--color-semantic-text-inverse);
}

/* With hover states */
.my-button:hover {
  border-color: var(--color-semantic-border-medium);
}

/* In pseudo-elements */
.card::before {
  background-color: var(--color-semantic-status-primary);
}

/* In media queries */
@media (max-width: 768px) {
  .responsive-element {
    border-color: var(--color-semantic-border-light);
  }
}

/* In gradients */
.gradient-bg {
  background: linear-gradient(
    to right,
    var(--color-semantic-status-primary),
    var(--color-semantic-status-success)
  );
}

/* In box-shadow */
.shadow-card {
  box-shadow: 0 2px 4px var(--color-semantic-border-default);
}
```

### 2. In React/JSX Inline Styles

```tsx
// Basic usage
<div style={{
  border: '1px solid var(--color-semantic-border-default)',
  backgroundColor: 'var(--color-semantic-status-primary)',
  color: 'var(--color-semantic-text-inverse)'
}}>
  Content
</div>

// Button component example
<button style={{
  border: '1px solid var(--color-semantic-border-default)',
  backgroundColor: 'var(--color-common-white)',
  color: 'var(--color-semantic-text-primary)',
  padding: '8px 16px',
  borderRadius: '8px'
}}>
  Click me
</button>

// Status badge example
<span style={{
  backgroundColor: 'var(--color-semantic-status-danger)',
  color: 'var(--color-semantic-text-inverse)',
  padding: '4px 8px',
  borderRadius: '4px'
}}>
  Error
</span>
```

### 3. In Tailwind CSS (Recommended)

Since these variables are defined in `@theme`, Tailwind automatically generates utility classes:

```tsx
// Border colors
<div className="border border-border-default">
<div className="border border-border-light">
<div className="border border-border-medium">

// Status colors
<div className="bg-status-primary text-white">
<div className="bg-status-danger text-white">
<div className="bg-status-warning text-black">
<div className="bg-status-success text-white">

// Text colors
<p className="text-text-primary">
<p className="text-text-secondary">
<p className="text-text-disabled">
<p className="text-text-inverse">

// Background colors
<div className="bg-background-primary">
<div className="bg-background-secondary">
<div className="bg-background-tertiary">
<div className="bg-[#FEFEFB]">
```

### 4. In Styled Components (if using CSS-in-JS)

```tsx
import styled from "styled-components";

const StyledButton = styled.button`
  border: 1px solid var(--color-semantic-border-default);
  background-color: var(--color-semantic-status-primary);
  color: var(--color-semantic-text-inverse);

  &:hover {
    border-color: var(--color-semantic-border-medium);
  }
`;
```

### 5. Dynamic Values with JavaScript

```tsx
// Get computed value
const borderColor = getComputedStyle(document.documentElement).getPropertyValue(
  "--color-semantic-border-default"
);

// Set value dynamically
document.documentElement.style.setProperty(
  "--color-semantic-border-default",
  "#NEW_COLOR"
);
```

### 6. Common Patterns

#### Secondary Button

```css
.btn-secondary {
  background-color: var(--color-common-white);
  border: 1px solid var(--color-semantic-border-default);
  color: var(--color-semantic-text-primary);
}

.btn-secondary:hover {
  border-color: var(--color-semantic-border-medium);
}
```

#### Input Field

```css
.input-field {
  background-color: var(--color-semantic-background-field);
  border: 1px solid var(--color-semantic-border-default);
  color: var(--color-semantic-text-primary);
}

.input-field:focus {
  border-color: var(--color-semantic-status-primary);
}
```

#### Alert/Notification

```css
.alert-success {
  background-color: var(--color-semantic-background-tertiary);
  border: 2px solid var(--color-semantic-status-success);
  color: var(--color-semantic-text-primary);
}

.alert-danger {
  background-color: var(--color-semantic-background-tertiary);
  border: 2px solid var(--color-semantic-status-danger);
  color: var(--color-semantic-text-primary);
}
```

## Best Practices

1. **Prefer Tailwind classes** when possible - they're more performant and easier to maintain
2. **Use semantic variables** for design tokens (border-default, status-primary, etc.)
3. **Use direct color variables** (like `--color-forest-f40`) for specific brand colors
4. **Always use `var()`** when referencing CSS custom properties
5. **Fallback values** can be added: `var(--color-semantic-border-default, #E8E8E3)`

## Complete Example Component

```tsx
// React component using CSS variables
const ExampleComponent = () => {
  return (
    <div
      style={{
        backgroundColor: "var(--color-semantic-background-primary)",
        border: "1px solid var(--color-semantic-border-default)",
        padding: "16px",
        borderRadius: "8px",
      }}
    >
      <h2 style={{ color: "var(--color-semantic-text-primary)" }}>Title</h2>
      <p style={{ color: "var(--color-semantic-text-secondary)" }}>
        Description text
      </p>
      <button
        style={{
          backgroundColor: "var(--color-semantic-status-primary)",
          color: "var(--color-semantic-text-inverse)",
          border: "none",
          padding: "8px 16px",
          borderRadius: "4px",
        }}
      >
        Action
      </button>
    </div>
  );
};
```
