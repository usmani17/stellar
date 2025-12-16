# Tailwind Colors Usage Examples

This guide shows how to use the Token Studio colors (from `global.json`) and existing custom colors in your React components.

## Available Color Palettes

### Token Studio Colors (Standard Scales)
- `red-50` through `red-950`
- `blue-50` through `blue-950`
- `green-50` through `green-950`
- `gray-50` through `gray-950`
- `yellow-50` through `yellow-950`
- `orange-50` through `orange-950`
- `purple-50` through `purple-950`
- `teal-50` through `teal-950`
- `cyan-50` through `cyan-950`
- `pink-50` through `pink-950`
- `sky-50` through `sky-950`
- And many more...

### Custom Colors (Preserved)
- `sandstorm-s0` through `sandstorm-s70`
- `forest-f0` through `forest-f60`
- `blue-b0`, `blue-b10`, `blue-b20`, etc.
- `red-r0`, `red-r10`, `red-r20`, etc.
- Semantic colors: `text-primary`, `background-primary`, `status-danger`, etc.

## Usage Examples

### 1. Basic Background Colors

```tsx
// Token Studio colors
<div className="bg-red-500">Red background</div>
<div className="bg-blue-600">Blue background</div>
<div className="bg-green-400">Green background</div>
<div className="bg-gray-100">Light gray background</div>

// Custom colors (existing)
<div className="bg-sandstorm-s0">Sandstorm background</div>
<div className="bg-forest-f40">Forest green background</div>
```

### 2. Text Colors

```tsx
// Token Studio colors
<p className="text-red-600">Error message</p>
<p className="text-blue-700">Information text</p>
<p className="text-gray-800">Dark text</p>
<p className="text-green-600">Success message</p>

// Custom semantic colors
<p className="text-primary">Primary text</p>
<p className="text-secondary">Secondary text</p>
<p className="text-disabled">Disabled text</p>
```

### 3. Border Colors

```tsx
// Token Studio colors
<div className="border border-red-300">Red border</div>
<div className="border-2 border-blue-500">Blue border</div>
<div className="border border-gray-200">Light gray border</div>

// Custom colors
<div className="border border-sandstorm-s40">Default border</div>
<div className="border border-forest-f40">Forest border</div>
```

### 4. Button Examples

```tsx
// Primary button with Token Studio colors
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Click me
</button>

// Success button
<button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
  Success
</button>

// Danger button
<button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
  Delete
</button>

// Using custom colors
<button className="bg-forest-f40 hover:bg-forest-f50 text-white px-4 py-2 rounded-lg">
  Primary Action
</button>
```

### 5. Card Components

```tsx
// Card with Token Studio colors
<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
  <h3 className="text-gray-900 text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-gray-600">Card content goes here</p>
</div>

// Card with custom colors
<div className="bg-sandstorm-s0 border border-sandstorm-s40 rounded-xl p-6">
  <h3 className="text-forest-f60 text-lg font-semibold mb-2">Card Title</h3>
  <p className="text-forest-f30">Card content goes here</p>
</div>
```

### 6. Status Badges

```tsx
// Using Token Studio colors
<span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
  Active
</span>
<span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
  Inactive
</span>
<span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
  Pending
</span>
<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
  Processing
</span>

// Using semantic colors
<span className="bg-status-success text-white px-2 py-1 rounded text-sm">
  Success
</span>
```

### 7. Input Fields

```tsx
// Input with Token Studio colors
<input
  type="text"
  className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-lg px-4 py-2"
  placeholder="Enter text"
/>

// Input with custom colors
<input
  type="text"
  className="bg-background-field border border-sandstorm-s40 focus:border-forest-f40 focus:ring-2 focus:ring-forest-f0 rounded-lg px-4 py-2"
  placeholder="Enter text"
/>
```

### 8. Gradient Backgrounds

```tsx
// Gradient with Token Studio colors
<div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8">
  Gradient background
</div>

<div className="bg-gradient-to-br from-green-400 to-teal-500 text-white p-8">
  Another gradient
</div>
```

### 9. Hover and Focus States

```tsx
// Hover states with Token Studio colors
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-4 py-2 rounded">
  Hover me
</button>

<div className="bg-gray-100 hover:bg-gray-200 cursor-pointer p-4 rounded">
  Hoverable card
</div>

// Focus states
<input className="border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded" />
```

### 10. Dark Mode Support (if needed)

```tsx
// Using gray scale for dark mode
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  Content that adapts to dark mode
</div>
```

### 11. Complete Component Example

```tsx
import React from 'react';

export const AlertCard: React.FC<{ type: 'success' | 'error' | 'warning' | 'info' }> = ({ type, children }) => {
  const colorClasses = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  return (
    <div className={`border rounded-lg p-4 ${colorClasses[type]}`}>
      {children}
    </div>
  );
};

// Usage
<AlertCard type="success">Operation completed successfully!</AlertCard>
<AlertCard type="error">Something went wrong.</AlertCard>
```

### 12. Table Rows with Alternating Colors

```tsx
// Using Token Studio gray scale
<table>
  <tbody>
    {items.map((item, index) => (
      <tr
        key={item.id}
        className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
      >
        <td className="text-gray-900">{item.name}</td>
        <td className="text-gray-600">{item.value}</td>
      </tr>
    ))}
  </tbody>
</table>
```

### 13. Icon Colors

```tsx
// Icons with Token Studio colors
<svg className="w-5 h-5 text-red-500" fill="currentColor">
  {/* Error icon */}
</svg>

<svg className="w-5 h-5 text-green-500" fill="currentColor">
  {/* Success icon */}
</svg>

<svg className="w-5 h-5 text-blue-500" fill="currentColor">
  {/* Info icon */}
</svg>
```

### 14. Combining Token Studio and Custom Colors

```tsx
// Mix and match as needed
<div className="bg-sandstorm-s0 border border-gray-200 p-6 rounded-xl">
  <h2 className="text-forest-f60 mb-4">Title</h2>
  <p className="text-gray-600 mb-4">Description</p>
  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
    Action Button
  </button>
</div>
```

## Color Scale Reference

Token Studio colors follow a standard scale:
- `50` - Lightest shade
- `100` - Very light
- `200` - Light
- `300` - Lighter
- `400` - Medium-light
- `500` - Base/Medium (most common)
- `600` - Medium-dark
- `700` - Darker
- `800` - Dark
- `900` - Very dark
- `950` - Darkest shade

## Best Practices

1. **Use semantic colors when available**: Prefer `text-primary` over `text-forest-f60` for better maintainability
2. **Use Token Studio scales for standard colors**: Use `red-500`, `blue-600`, etc. for standard UI elements
3. **Use custom colors for brand-specific elements**: Use `sandstorm-*` and `forest-*` for brand-specific styling
4. **Consistent color usage**: Use the same color scale (e.g., always use `-500` for primary actions)
5. **Accessibility**: Ensure sufficient contrast between text and background colors

## Quick Reference

```tsx
// Common patterns
bg-{color}-{shade}     // Background
text-{color}-{shade}   // Text color
border-{color}-{shade} // Border color
ring-{color}-{shade}   // Focus ring color

// Examples
bg-red-500 text-white border-red-600
bg-blue-100 text-blue-800 border-blue-200
bg-gray-50 text-gray-900 border-gray-200
```

