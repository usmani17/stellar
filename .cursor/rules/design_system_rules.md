# Design System Rules for Stellar Frontend

This document outlines the design system structure, patterns, and conventions used in the Stellar Frontend codebase to help integrate Figma designs using the Model Context Protocol.

**Last Updated:** Complete Figma Brand Kit Implementation (December 2024)
**Figma File:** PIXIS---Design-File (YTJsGwRne4kXLpWchqRqKH)
**Brand Kit Nodes:** Colors (438:34735), Typography (438:35262), Components (30+ nodes)

## Key Design Specifications from Figma

### Typography (Complete Brand Kit)
- **Primary Font Families**:
  - **PP Agrandir**: Used for headings (H1300, H1250, H1100)
  - **GT America Trial**: Used for body text and UI elements (Regular 400, Medium 500, Bold 700)
  - **Inter**: Used for UI text and labels (Regular 400, Medium 500, Semi Bold 600)
  - **Poppins**: Legacy support (Regular 400, Medium 500, SemiBold 600, Bold 700)
- **Complete Text Size Scale** (H100-H1300):
  - H1300: 32px (2rem), auto line-height, -1px letter-spacing (PP Agrandir)
  - H1250: 28px (1.75rem), 40px line-height (PP Agrandir)
  - H1100: 24px (1.5rem), 40px line-height, -1px letter-spacing (PP Agrandir/Inter)
  - H1050: 24px (1.5rem), 40px line-height (GT America Medium)
  - H1000: 20px (1.25rem), 32px line-height (GT America Medium)
  - H900: 18px (1.125rem), 24px line-height (GT America Medium)
  - H800: 18px (1.125rem), 28px line-height, -0.2px letter-spacing (GT America Medium/Inter Semi Bold)
  - H750: 18px (1.125rem), 28px line-height (GT America Regular)
  - H700: 16px (1rem), 28px line-height (GT America Bold)
  - H600: 16px (1rem), 26px line-height (GT America Medium)
  - H550: 16px (1rem), 26px line-height (GT America Regular)
  - H500: 14px (0.875rem), 20px line-height (GT America Bold)
  - H450: 14px (0.875rem), 20px line-height (GT America Medium/Inter Medium)
  - H400: 14px (0.875rem), 20px line-height (GT America Regular)
  - H300: 12px (0.75rem), 18px line-height (GT America Medium)
  - H200: 12px (0.75rem), 18px line-height (GT America Regular)
  - H100: 10px (0.625rem), 14px line-height (GT America Medium)

### Input Fields
- **Background**: `#f5f7fa` (not white)
- **Border**: `#e8e8e3` (1px solid)
- **Border Radius**: 12px (`rounded-xl`)
- **Height**: 48px (`h-12`)
- **Padding**: 12px horizontal (`px-3`)
- **Text Color**: `#bfbfbf` for placeholder
- **Label**: 16px, Poppins Medium, `#000000`

### Buttons
- **Primary Button**: 
  - Background: `#136d6d`
  - Hover: `#0e5a5a`
  - Height: 64px (`h-16`)
  - Border Radius: 12px (`rounded-xl`)
  - Font: Poppins SemiBold, 16px
- **OAuth Button**:
  - Background: White
  - Border: `#e8e8e3`
  - Border Radius: 16px (`rounded-2xl`)
  - Height: 56px (`h-14`)

### Layout
- **Split Screen**: 
  - Left: Form area (flex-1)
  - Right: Sidebar (720px fixed width, hidden on mobile)
- **Form Width**: 576px
- **Sidebar Background**: `#062121` with gradient overlay
- **Sidebar Border Radius**: Top-left and bottom-left corners (40px)

## 1. Token Definitions

### Location
Design tokens are primarily defined in:
- **Tailwind Config**: `/stellar-frontend/tailwind.config.ts`
- **Global Styles**: `/stellar-frontend/src/index.css`

### Color System

The design system uses a structured color palette defined in Tailwind config:

```typescript
// tailwind.config.ts - Complete Brand Kit Color System
colors: {
  // Neutral (Light) - Complete palette N0-N1000
  neutral: {
    n0: '#FFFFFF',      // Pure white
    n10: '#FAFBFC',     // Lightest gray
    n20: '#F4F5F7',
    n30: '#EBECF0',
    n40: '#DFE1E6',
    n50: '#475467',     // Base gray
    n60: '#B3BAC5',     // Updated from previous
    n70: '#A5ADBA',
    n80: '#97A0AF',
    n90: '#8993A4',     // Updated from previous
    n100: '#7D8799',    // Updated from previous
    n200: '#6B7589',    // Updated from previous
    n300: '#556179',
    n400: '#414C62',
    n500: '#313B50',    // Updated from previous
    n600: '#29303F',
    n700: '#212630',    // NEW
    n800: '#161B25',    // NEW
    n900: '#0B0F16',    // NEW
    n1000: '#000205',   // NEW - Darkest
  },
  // Neutral Alpha - For dark theme support (rgba values)
  neutralAlpha: {
    n10A: 'rgba(9, 30, 66, 0.02)',
    n20A: 'rgba(9, 30, 66, 0.04)',
    n30A: 'rgba(9, 30, 66, 0.08)',
    n40A: 'rgba(9, 30, 66, 0.13)',
    n50A: 'rgba(9, 30, 66, 0.25)',
    n60A: 'rgba(9, 30, 66, 0.31)',
    n70A: 'rgba(9, 30, 66, 0.36)',
    n80A: 'rgba(9, 30, 66, 0.42)',
    n90A: 'rgba(9, 30, 66, 0.48)',
    n100A: 'rgba(9, 30, 66, 0.54)',
    n200A: 'rgba(9, 30, 66, 0.60)',
    n300A: 'rgba(9, 30, 66, 0.66)',
    n400A: 'rgba(9, 30, 66, 0.71)',
    n500A: 'rgba(9, 30, 66, 0.77)',
    n600A: 'rgba(9, 30, 66, 0.82)',
    n700A: 'rgba(9, 30, 66, 0.89)',
    n800A: 'rgba(9, 30, 66, 0.95)',
    n900A: '#091E42',
  },
  // Pixis Sandstorm - Complete palette with semantic meanings
  sandstorm: {
    s0: '#F9F9F6',      // Background 1
    s5: '#FEFEFB',      // Text Field BG
    s10: '#FCFCF9',     // Background 1
    s20: '#F5F4EF',     // Background 2
    s30: '#F0F0ED',     // Hover 1 (updated from #F0FDED)
    s40: '#E8E8E3',     // Press 1 / Border (updated from #EBEBE3)
    s50: '#E4E4D7',     // Border 1
    s60: '#D1D1C7',     // Border 2
    s70: '#73726C',
  },
  // Pixis Forest Green - Complete palette with semantic meanings
  forest: {
    f0: '#DCF1E8',
    f10: '#D6E5E5',     // Disabled Text
    f20: '#9BB1B0',     // Updated from #98B1B0
    f30: '#506766',     // Secondary Text (Note: Also #78B0B0 in some contexts)
    f40: '#136D6D',     // Primary action color (updated from #13606D)
    f50: '#0E4E4E',
    f60: '#072929',     // Primary Text
  },
  // Blue - Complete palette
  blue: {
    b0: '#E3EEFF',
    b10: '#3370FF',     // Primary blue
    b10Alt: '#0869FB',
    b20: '#0350C3',
    b30: '#0346AB',
    b100: '#74AAFD',    // NEW - Link color, border highlights
    b400: '#0350C3',    // NEW - Semantic token (same as b20)
  },
  // Red - Complete palette
  red: {
    r0: '#FFEBE6',
    r10: '#FFD6CC',
    r20: '#FFAD99',
    r30: '#CE1313',     // Primary danger color
    r40: '#B51111',
    r50: '#950E0E',
  },
  // Yellow - Complete palette
  yellow: {
    y0: '#FFECD6',
    y10: '#FF991F',     // Warning color
    y50: '#FFFAE6',     // Warning backgrounds
  },
  // Orange - Complete palette
  orange: {
    o0: '#FF5C33',
  },
  // Pink - Complete palette
  pink: {
    p0: '#FD357C',
  },
  // Teal - Complete palette
  teal: {
    t0: '#258DC1',
  },
  // Purple - Complete palette
  purple: {
    p500: '#403294',    // Status indicators, design tokens
  },
  // Semantic color mappings for convenience
  text: {
    primary: '#072929',      // forest-f60
    secondary: '#506766',    // forest-f30
    disabled: '#D6E5E5',     // forest-f10
    inverse: '#F9F9F6',      // sandstorm-s0
  },
  background: {
    primary: '#F9F9F6',      // sandstorm-s0
    secondary: '#F5F4EF',    // sandstorm-s20
    tertiary: '#FCFCF9',    // sandstorm-s10
    field: '#FEFEFB',       // sandstorm-s5
  },
  border: {
    default: '#E8E8E3',      // sandstorm-s40
    light: '#E4E4D7',        // sandstorm-s50
    medium: '#D1D1C7',       // sandstorm-s60
  },
  status: {
    primary: '#136D6D',      // forest-f40
    danger: '#CE1313',       // red-r30
    warning: '#FF991F',      // yellow-y10
    success: '#136D6D',      // forest-f40 (can be customized)
  },
}
```

**Usage Pattern:**
- Use `forest-f40` for primary actions (buttons, links)
- Use `forest-f60` for primary text
- Use `forest-f30` for secondary text
- Use `forest-f10` for disabled text
- Use `neutral` scale for borders, backgrounds, and UI elements
- Use `sandstorm` for subtle backgrounds and surfaces
- Use `sandstorm-s5` for text field backgrounds
- Use `sandstorm-s40` for borders
- Use semantic tokens (`text-primary`, `background-primary`, `status-danger`) for consistent theming
- Use `neutralAlpha` colors for dark theme support

### Typography System

Typography tokens are defined using a hierarchical naming system:

```typescript
// tailwind.config.ts - Complete Typography System
fontSize: {
  'h1300': ['32px', { lineHeight: 'auto', letterSpacing: '-1px' }],  // PP Agrandir Regular
  'h1250': ['28px', { lineHeight: '40px', letterSpacing: '0' }],      // PP Agrandir Regular
  'h1100': ['24px', { lineHeight: '40px', letterSpacing: '-1px' }],  // PP Agrandir Regular / Inter Medium
  'h1050': ['24px', { lineHeight: '40px', letterSpacing: '0' }],     // GT America Trial Medium
  'h1000': ['20px', { lineHeight: '32px', letterSpacing: '0' }],     // GT America Trial Medium
  'h900': ['18px', { lineHeight: '24px', letterSpacing: '0' }],      // GT America Trial Medium
  'h800': ['18px', { lineHeight: '28px', letterSpacing: '-0.2px' }], // GT America Trial Medium / Inter Semi Bold
  'h750': ['18px', { lineHeight: '28px', letterSpacing: '0' }],       // GT America Trial Regular
  'h700': ['16px', { lineHeight: '28px', letterSpacing: '0' }],       // GT America Trial Bold
  'h600': ['16px', { lineHeight: '26px', letterSpacing: '0' }],      // GT America Trial Medium
  'h550': ['16px', { lineHeight: '26px', letterSpacing: '0' }],       // GT America Trial Regular
  'h500': ['14px', { lineHeight: '20px', letterSpacing: '0' }],      // GT America Trial Bold
  'h450': ['14px', { lineHeight: '20px', letterSpacing: '0' }],      // GT America Trial Medium / Inter Medium
  'h400': ['14px', { lineHeight: '20px', letterSpacing: '0' }],     // GT America Trial Regular
  'h300': ['12px', { lineHeight: '18px', letterSpacing: '0' }],      // GT America Trial Medium
  'h200': ['12px', { lineHeight: '18px', letterSpacing: '0' }],      // GT America Trial Regular
  'h100': ['10px', { lineHeight: '14px', letterSpacing: '0' }],      // GT America Trial Medium
}
```

**Font Family:**
```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
  agrandir: ['PP Agrandir', 'system-ui', 'sans-serif'],
  gtAmerica: ['GT America Trial', 'system-ui', 'sans-serif'],
  inter: ['Inter', 'system-ui', 'sans-serif'],
  poppins: ['Poppins', 'system-ui', 'sans-serif'],
}
```

**Usage Pattern:**
- Use `text-h1300` through `text-h1000` for large headings (with `font-agrandir` or `font-gtAmerica`)
- Use `text-h800` through `text-h600` for body text and UI labels
- Use `text-h700` and smaller for labels, captions, and metadata
- Apply appropriate font family classes: `font-agrandir`, `font-gtAmerica`, `font-inter`
- Use semantic font sizes that match Figma text styles

### Spacing System

Uses Tailwind's default spacing scale (4px base unit):
- `gap-1` = 4px
- `gap-4` = 16px
- `gap-5` = 20px
- `gap-8` = 32px
- `gap-16` = 64px

**Common Patterns:**
- Form fields: `gap-5` (20px)
- Section spacing: `gap-8` (32px)
- Large sections: `gap-16` (64px)

### Border Radius

- `rounded-lg` = 8px (small elements)
- `rounded-xl` = 12px (inputs, buttons)
- `rounded-2xl` = 16px (cards, modals)

## 2. Component Library

### Location
UI components are located in: `/stellar-frontend/src/components/ui/`

### Component Architecture

Components follow a functional component pattern with TypeScript:

```typescript
// Example: Button.tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}) => {
  // Implementation
};
```

### Existing Components

1. **Button** (`/src/components/ui/Button.tsx`)
   - Variants: `primary`, `secondary`, `outline`, `ghost`
   - Sizes: `sm`, `md`, `lg`
   - Uses design tokens for colors

2. **Input** (`/src/components/ui/Input.tsx`)
   - Supports label and error states
   - Uses consistent styling with design tokens

3. **Card** (`/src/components/ui/Card.tsx`)
   - Supports title and actions
   - Uses sandstorm background colors

### Component Export Pattern

All UI components are exported from `/src/components/ui/index.ts`:

```typescript
export { Button } from './Button';
export { Input } from './Input';
export { Card } from './Card';
```

## 3. Frameworks & Libraries

### Core Framework
- **React**: ^19.2.0 (with TypeScript)
- **React Router DOM**: ^7.10.1 (routing)

### Styling
- **Tailwind CSS**: ^4.1.17 (utility-first CSS)
- **@tailwindcss/vite**: ^4.1.17 (Vite plugin)
- **PostCSS**: ^8.5.6 (CSS processing)
- **Autoprefixer**: ^10.4.22 (browser compatibility)

### Build System
- **Vite**: ^7.2.4 (build tool and dev server)
- **TypeScript**: ~5.9.3
- **ESLint**: ^9.39.1 (code quality)

### Additional Libraries
- **@headlessui/react**: ^2.2.9 (accessible UI components)
- **axios**: ^1.13.2 (HTTP client)
- **recharts**: ^3.5.1 (data visualization)
- **react-datepicker**: ^9.0.0 (date selection)

## 4. Asset Management

### Location
Assets are stored in: `/stellar-frontend/src/assets/`

### Asset Types
- **SVG Icons**: 105+ SVG files (hash-based naming)
- **Images**: PNG files (e.g., `df808745d4eeae509bbfb902288411fb819999c2.png`)

### Asset Naming Convention
Assets use hash-based filenames (likely from a build process or asset pipeline):
- Format: `{hash}.svg` or `{hash}.png`
- Example: `0032ab45b12b02437247aac5951d4c124c2223cc.svg`

### Asset Import Pattern
```typescript
import iconName from '../assets/{hash}.svg';
```

### Optimization
- Vite handles asset optimization automatically
- SVGs are inlined or optimized during build
- No explicit CDN configuration found

## 5. Icon System

### Current State
- Icons are stored as individual SVG files in `/src/assets/`
- No centralized icon component found
- Icons are imported directly as needed

### Usage Pattern
```typescript
// Inline SVG (current pattern in Login.tsx)
<svg width="32" height="32" viewBox="0 0 32 32">
  <path d="..." fill="#4285F4"/>
</svg>
```

### Recommendations for Figma Integration
- Create an `Icon` component that accepts a name prop
- Map Figma icon names to asset imports
- Support size and color props for consistency

## 6. Styling Approach

### Methodology
**Utility-First CSS with Tailwind CSS**

### Global Styles
Located in `/src/index.css`:
```css
@import "tailwindcss";

:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  color: #072929;              /* forest-f60 */
  background-color: #F9F9F6;   /* sandstorm-s0 */
}
```

### Component Styling Pattern
Components use Tailwind utility classes directly:

```typescript
className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
```

### Responsive Design
- Uses Tailwind's responsive breakpoints:
  - `sm:` (640px)
  - `md:` (768px)
  - `lg:` (1024px)
  - `xl:` (1280px)
- Example: `hidden lg:flex` (hidden on mobile, flex on large screens)

### Focus States
Consistent focus ring pattern:
```typescript
focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40
```

## 7. Project Structure

### Overall Organization
```
stellar-frontend/
├── src/
│   ├── assets/           # Images, icons, SVGs
│   ├── components/       # React components
│   │   ├── accounts/     # Account-related components
│   │   ├── auth/         # Authentication components
│   │   ├── channels/     # Channel-related components
│   │   ├── layout/       # Layout components (Header, Sidebar)
│   │   └── ui/           # Reusable UI components
│   ├── contexts/         # React contexts (Auth, DateRange)
│   ├── pages/            # Page components (routes)
│   ├── services/         # API service functions
│   ├── styles/           # Additional styles/config
│   ├── App.tsx           # Main app component
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── tailwind.config.ts    # Tailwind configuration
├── vite.config.ts        # Vite configuration
└── package.json          # Dependencies
```

### Feature Organization Pattern
- **Feature-based folders**: Components grouped by feature (accounts, auth, channels)
- **Shared UI components**: Common components in `ui/` folder
- **Page-level components**: Route components in `pages/`
- **Service layer**: API calls separated in `services/`

### Naming Conventions
- **Components**: PascalCase (e.g., `Login.tsx`, `AuthLayout.tsx`)
- **Files**: Match component name
- **Exports**: Named exports (e.g., `export const Button`)
- **Props interfaces**: `{ComponentName}Props` (e.g., `ButtonProps`)

## 8. Authentication Pages Pattern

### Current Structure
Auth pages follow a consistent pattern:
- Logo positioned at top-left (`absolute left-20 top-20`)
- Centered card container with form
- Card background: `bg-[#f5f7fa]` with border `border-[#e6e6e6]`
- Card padding: `p-10`
- Card width: `w-[576px]`
- Card border radius: `rounded-2xl`

### Common Elements
1. **Header Section**: Title and description
2. **Form Section**: Input fields with consistent styling
3. **Action Button**: Full-width primary button
4. **Footer Links**: Navigation to other auth pages
5. **Divider/OR Section**: For OAuth options

### Input Field Pattern
```typescript
<div className="flex flex-col gap-1">
  <label className="text-base font-medium text-black leading-5">
    Label Text
  </label>
  <input
    className="w-full h-12 px-3 bg-white border border-[#e6e6e6] rounded-xl text-sm text-[#bfbfbf] placeholder:text-[#bfbfbf] focus:outline-none focus:ring-2 focus:ring-forest-f40 focus:border-forest-f40"
  />
</div>
```

## 9. Integration Guidelines for Figma Designs

### When Implementing from Figma:

1. **Extract Design Tokens**
   - Map Figma colors to Tailwind config tokens
   - Use existing token names when possible
   - Add new tokens if needed, following naming convention

2. **Component Creation**
   - Create reusable components in `/src/components/ui/`
   - Follow existing component patterns (props interface, TypeScript)
   - Export from `index.ts`

3. **Styling**
   - Use Tailwind utility classes
   - Reference design tokens from config
   - Maintain consistent spacing (gap-4, gap-5, gap-8, gap-16)
   - Use consistent border radius (rounded-xl, rounded-2xl)

4. **Responsive Design**
   - Use Tailwind breakpoints
   - Test mobile-first approach
   - Hide/show elements with `hidden lg:flex` pattern

5. **Icons**
   - Extract SVG from Figma
   - Save to `/src/assets/` if not already present
   - Consider creating Icon component for reusability

6. **Typography**
   - Map Figma text styles to existing `text-h{number}` classes
   - Use `font-semibold` or `font-medium` for weights
   - Maintain line-height consistency

7. **Spacing**
   - Use Tailwind spacing scale
   - Common gaps: `gap-4` (16px), `gap-5` (20px), `gap-8` (32px), `gap-16` (64px)

## 10. Common Patterns

### Button Styles
```typescript
// Primary button
className="w-full bg-[#136d6d] hover:bg-[#0e5a5a] text-white font-semibold text-base px-6 py-5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"

// OAuth button
className="w-full h-14 bg-white border border-[#e6e6e6] rounded-2xl flex items-center justify-center gap-2.5 hover:bg-sandstorm-s5 transition-colors"
```

### Card Container
```typescript
className="bg-[#f5f7fa] border border-[#e6e6e6] rounded-2xl p-10"
```

### Error Messages
```typescript
className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-h700"
```

### Links
```typescript
className="font-semibold text-forest-f60 hover:text-forest-f50"
```

## 11. Brand Kit Reference

### Figma Brand Kit Source
- **Figma File**: PIXIS---Design-File
- **File Key**: YTJsGwRne4kXLpWchqRqKH
- **Primary Brand Kit Nodes**:
  - **Colors**: node-id `438:34735` - Complete color system with all palettes
  - **Typography**: node-id `438:35262` - Complete typography system
  - **Components**: 30+ component specification nodes (Badges, Buttons, Avatars, etc.)

### Brand Kit Structure
The brand kit is organized into two key layers:

1. **Core Palette** - Base colors organized by hue and scale
   - Neutral (N0-N1000) + Neutral Alpha variants
   - Pixis Sandstorm (S0-S70)
   - Pixis Forest Green (F0-F60)
   - Blue (B0-B30, B100, B400)
   - Red (R0-R50)
   - Yellow (Y0-Y10, Y50)
   - Orange (O0)
   - Pink (P0)
   - Teal (T0)
   - Purple (P500)

2. **Semantic Tokens** - Contextual tokens mapped to purpose
   - Text colors (primary, secondary, disabled, inverse)
   - Background colors (primary, secondary, tertiary, field)
   - Border colors (default, light, medium)
   - Status colors (primary, danger, warning, success)

### Font Resources
- **PP Agrandir** and **GT America Trial** are custom fonts
- Download link: https://drive.google.com/drive/folders/1ScEH9LWDqYYFzqE5OQ9QoL-B-mV_k4sT?usp=sharing
- These fonts need to be downloaded and hosted locally or via a font service
- Currently using Inter and Poppins as fallbacks until custom fonts are set up

### Component Specifications
The brand kit includes detailed specifications for:
- **Badges**: Variants (added, important, primary, removed, low priority)
- **Buttons**: Multiple appearances (primary, secondary, tertiary, link, danger, special)
- **Text Fields**: Multiple sizes (48px, 40px, 36px, 28px)
- **Form Elements**: Checkboxes, radio buttons, toggles
- **Cards**: Default, hover, pressed/selected states
- **Tabs**: Box tabs, line tabs, chips
- **Tags**: Status variants (default, rejected, pending, warning, failed, executed)

### Using the Brand Kit
1. **Reference Tailwind Config**: All brand kit values are in `tailwind.config.ts`
2. **Use Semantic Tokens**: Prefer semantic tokens (`text-primary`, `status-danger`) over raw colors
3. **Follow Typography Scale**: Use `text-h{number}` classes matching Figma text styles
4. **Match Component Specs**: Refer to Figma component nodes for exact specifications
5. **Maintain Consistency**: Always use brand kit tokens instead of hardcoded values

## 12. Best Practices

1. **Always use design tokens** from Tailwind config instead of hardcoded colors
2. **Reference the brand kit** in Figma for component specifications
3. **Use semantic tokens** (`text-primary`, `status-danger`) when available
4. **Create reusable components** for repeated UI patterns
5. **Maintain consistent spacing** using Tailwind's spacing scale
6. **Use TypeScript** for all component props
7. **Follow existing naming conventions** for files and components
8. **Export components** from index files for cleaner imports
9. **Test responsive behavior** at different breakpoints
10. **Maintain accessibility** with proper focus states and ARIA attributes
11. **Match Figma specifications** exactly when implementing new components
12. **Use appropriate font families** (`font-agrandir`, `font-gtAmerica`, `font-inter`) based on Figma text styles

