# Color Usage Guide - Token Studio Colors

## Quick Start Examples

### 1. Basic Usage in JSX

```tsx
// Background colors
<div className="bg-red-500">Red background</div>
<div className="bg-blue-600">Blue background</div>
<div className="bg-green-400">Green background</div>

// Text colors
<p className="text-gray-800">Dark gray text</p>
<p className="text-blue-600">Blue text</p>

// Border colors
<div className="border border-gray-300">Gray border</div>
<div className="border-2 border-red-500">Red border</div>
```

### 2. Updating Your Existing StatusBadge Component

**Before (using hardcoded colors):**
```tsx
bg-[rgba(30,199,122,0.1)]
text-[#1ec77a]
```

**After (using Token Studio colors):**
```tsx
// Option 1: Using green scale
bg-green-100 text-green-700

// Option 2: Using custom colors with opacity
bg-green-50/10 text-green-600

// Option 3: Using rgba with Token Studio colors
bg-[rgba(34,197,94,0.1)] text-green-600
```

**Updated StatusBadge example:**
```tsx
const statusMap = {
  Enable: {
    bg: "bg-green-100",
    text: "text-green-700",
    label: "Enable",
  },
  Paused: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    label: "Paused",
  },
  Archived: {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: "Archived",
  },
};
```

### 3. Button Variants

```tsx
// Primary button
<button className="bg-forest-f40 hover:bg-forest-f50 text-white px-4 py-2 rounded-lg">
  Primary Action
</button>

// Secondary button with Token Studio blue
<button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
  Secondary Action
</button>

// Danger button
<button className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg">
  Delete
</button>

// Success button
<button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg">
  Save
</button>
```

### 4. Input Fields

```tsx
// Standard input
<input
  className="border border-gray-300 rounded-lg px-4 py-2 
             focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
/>

// Input with custom background
<input
  className="bg-background-field border border-sandstorm-s40 
             focus:border-forest-f40 focus:ring-2 focus:ring-forest-f0"
/>
```

### 5. Cards and Containers

```tsx
// Card with Token Studio colors
<div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
  <h3 className="text-gray-900 font-semibold">Title</h3>
  <p className="text-gray-600">Content</p>
</div>

// Card with custom colors
<div className="bg-sandstorm-s0 border border-sandstorm-s40 rounded-xl p-6">
  <h3 className="text-forest-f60 font-semibold">Title</h3>
  <p className="text-forest-f30">Content</p>
</div>
```

### 6. Status Indicators

```tsx
// Success
<span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
  Active
</span>

// Error
<span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">
  Error
</span>

// Warning
<span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
  Warning
</span>

// Info
<span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
  Info
</span>
```

### 7. Table Rows

```tsx
// Alternating row colors
<tr className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
  <td className="text-gray-900">Item</td>
  <td className="text-gray-600">Value</td>
</tr>

// Hover states
<tr className="bg-white hover:bg-gray-50 transition-colors">
  <td>Item</td>
</tr>
```

### 8. Icons and SVGs

```tsx
// Colored icons
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

### 9. Gradients

```tsx
// Linear gradient
<div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-8">
  Gradient background
</div>

// Multiple color gradient
<div className="bg-gradient-to-br from-green-400 via-blue-500 to-purple-600">
  Multi-color gradient
</div>
```

### 10. Focus and Hover States

```tsx
// Button with hover
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700">
  Click me
</button>

// Link with hover
<a className="text-blue-600 hover:text-blue-700 underline">
  Link
</a>

// Input with focus
<input className="border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200" />
```

## Color Scale Reference

All Token Studio colors follow this scale:

- `{color}-50` - Lightest (almost white)
- `{color}-100` - Very light
- `{color}-200` - Light
- `{color}-300` - Lighter medium
- `{color}-400` - Medium light
- `{color}-500` - **Base/Medium** (most common)
- `{color}-600` - Medium dark
- `{color}-700` - Darker
- `{color}-800` - Dark
- `{color}-900` - Very dark
- `{color}-950` - Darkest (almost black)

## Available Color Palettes

### Token Studio Colors (Standard)
- `red-*`, `blue-*`, `green-*`, `yellow-*`, `orange-*`
- `purple-*`, `pink-*`, `teal-*`, `cyan-*`, `sky-*`
- `gray-*`, `slate-*`, `zinc-*`, `stone-*`, `neutral-*`
- `lime-*`, `emerald-*`, `violet-*`, `fuchsia-*`, `indigo-*`
- `amber-*`, `rose-*`
- `black`, `white`

### Custom Colors (Your Brand)
- `sandstorm-*` (s0, s5, s10, s20, s30, s40, s50, s60, s70)
- `forest-*` (f0, f10, f20, f30, f40, f50, f60)
- `blue-*` (b0, b10, b10Alt, b20, b30, b100, b400)
- `red-*` (r0, r10, r20, r30, r40, r50)
- `yellow-*` (y0, y10, y50)
- `orange-*` (o0)
- `pink-*` (p0)
- `teal-*` (t0)
- `purple-*` (p500)

### Semantic Colors
- `text-primary`, `text-secondary`, `text-disabled`, `text-inverse`
- `background-primary`, `background-secondary`, `background-tertiary`, `background-field`
- `border-default`, `border-light`, `border-medium`
- `status-primary`, `status-danger`, `status-warning`, `status-success`

## Real-World Component Examples

### Campaign Status Badge (for your Campaigns page)
```tsx
const getStatusColor = (status: string) => {
  switch (status) {
    case 'Enable':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'Paused':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'Archived':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

<span className={`px-2 py-1 rounded text-xs border ${getStatusColor(status)}`}>
  {status}
</span>
```

### Filter Chip (for your FilterPanel)
```tsx
<span className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-sm">
  Filter: {filterName}
  <button className="ml-2 text-blue-600 hover:text-blue-800">×</button>
</span>
```

### KPI Card (for your dashboard)
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <p className="text-gray-600 text-sm mb-1">{label}</p>
  <p className="text-gray-900 text-2xl font-semibold">{value}</p>
  {trend && (
    <span className={`text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
      {trend === 'up' ? '↑' : '↓'} {percentage}%
    </span>
  )}
</div>
```

## Best Practices

1. **Use semantic colors for brand consistency**: Prefer `text-primary` over `text-forest-f60`
2. **Use Token Studio scales for standard UI**: Use `red-500`, `blue-600` for standard elements
3. **Consistent shade usage**: Use `-500` for primary actions, `-600` for hover states
4. **Accessibility**: Ensure WCAG contrast ratios (use darker shades for text)
5. **Hover states**: Typically use one shade darker (e.g., `hover:bg-blue-700` from `bg-blue-600`)

## Common Patterns

```tsx
// Primary action button
bg-blue-600 hover:bg-blue-700 text-white

// Secondary button
bg-gray-200 hover:bg-gray-300 text-gray-900

// Danger/Error
bg-red-500 hover:bg-red-600 text-white
bg-red-50 text-red-800 (for light backgrounds)

// Success
bg-green-500 hover:bg-green-600 text-white
bg-green-50 text-green-800 (for light backgrounds)

// Warning
bg-yellow-500 hover:bg-yellow-600 text-white
bg-yellow-50 text-yellow-800 (for light backgrounds)

// Info
bg-blue-500 hover:bg-blue-600 text-white
bg-blue-50 text-blue-800 (for light backgrounds)
```

## Migration Tips

When updating existing components:

1. Replace hardcoded hex colors with Token Studio equivalents
2. Use the color scale consistently (500 for base, 600 for hover)
3. Test contrast ratios for accessibility
4. Update both light and dark variants if you have dark mode

Example migration:
```tsx
// Before
className="bg-[#136d6d]"

// After
className="bg-forest-f40" // or bg-green-600 if using Token Studio
```

