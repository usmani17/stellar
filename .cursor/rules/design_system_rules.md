# PIXIS Design System Rules

This document defines the design system rules and patterns for the PIXIS frontend application. **Always follow these rules when implementing new features or components to maintain design consistency.**

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Typography](#typography)
3. [Color System](#color-system)
4. [Component Library](#component-library)
5. [Styling Approach](#styling-approach)
6. [Asset Management](#asset-management)
7. [Icon System](#icon-system)
8. [Spacing & Layout](#spacing--layout)
9. [Component Patterns](#component-patterns)
10. [Project Structure](#project-structure)

---

## Design Tokens

### Location
Design tokens are defined in **`tailwind.config.ts`** using Tailwind CSS's theme extension system.

### Token Structure
All design tokens follow a semantic naming convention organized by category:

```typescript
// File: tailwind.config.ts
theme: {
  extend: {
    colors: { /* Color tokens */ },
    fontFamily: { /* Typography tokens */ },
    fontSize: { /* Font size tokens */ },
    // ... other tokens
  }
}
```

### Token Categories

1. **Colors**: Organized by palette (neutral, sandstorm, forest, blue, red, yellow, etc.)
2. **Typography**: Font families, sizes, line heights, letter spacing
3. **Spacing**: Standard spacing scale (via Tailwind defaults + custom)
4. **Border Radius**: Standard border radius values
5. **Shadows**: Elevation and shadow definitions

### Usage Rules

- **ALWAYS** use design tokens from `tailwind.config.ts` instead of hardcoded values
- Use semantic color names (e.g., `text-primary`, `background-primary`) when available
- Prefer Tailwind utility classes over inline styles
- For custom values not in tokens, add them to `tailwind.config.ts` first

### Example
```tsx
// ✅ CORRECT - Using design tokens
<div className="bg-sandstorm-s0 text-forest-f60 border border-sandstorm-s40">

// ❌ WRONG - Hardcoded values
<div style={{ backgroundColor: '#F9F9F6', color: '#072929' }}>
```

---

## Typography

### Font Families

Defined in `tailwind.config.ts`:

- **Primary**: `Inter` (system fallback: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)
- **Brand**: `PP Agrandir` (for headings)
- **Secondary**: `GT America Trial` (for specific UI elements)
- **Auth Pages**: `Poppins` (for authentication pages)

### Font Size Scale

The typography scale uses a hierarchical naming system (h1300 → h100):

```typescript
// Typography scale (from largest to smallest)
h1300: 32px  // PP Agrandir Regular, -1px letter spacing
h1250: 28px  // PP Agrandir Regular
h1100: 24px  // PP Agrandir Regular / Inter Medium, -1px letter spacing
h1050: 24px  // GT America Trial Medium
h1000: 20px  // GT America Trial Medium
h900: 18px   // GT America Trial Medium
h800: 18px   // GT America Trial Medium / Inter Semi Bold, -0.2px letter spacing
h750: 18px   // GT America Trial Regular
h700: 16px   // GT America Trial Bold
h600: 16px   // GT America Trial Medium
h550: 16px   // GT America Trial Regular
h500: 14px   // GT America Trial Bold
h450: 14px   // GT America Trial Medium / Inter Medium
h400: 14px   // GT America Trial Regular
h300: 12px   // GT America Trial Medium
h200: 12px   // GT America Trial Regular
h100: 10px   // GT America Trial Medium
```

### Typography Usage Rules

1. **Headings**: Use `PP Agrandir` or `GT America Trial` for headings
2. **Body Text**: Use `Inter` for body text and general UI
3. **Auth Pages**: Use `Poppins` specifically for authentication pages
4. **Font Weights**: 
   - Regular: 400
   - Medium: 500
   - Semi Bold: 600
   - Bold: 700
5. **Line Heights**: Defined per font size in the config
6. **Letter Spacing**: Use `-1px`, `-0.2px`, or `0` as defined in scale

### Example
```tsx
// ✅ CORRECT
<h1 className="text-h1300 font-agrandir">Welcome</h1>
<p className="text-h400 font-inter text-text-primary">Body text</p>

// ❌ WRONG
<h1 style={{ fontSize: '32px' }}>Welcome</h1>
```

---

## Color System

### Color Palettes

#### 1. Neutral Palette (Light Theme)
- **n0** to **n1000**: Complete grayscale from white (#FFFFFF) to near-black (#000205)
- **n10A** to **n900A**: Alpha variants for transparency effects

#### 2. Sandstorm Palette (Backgrounds & Borders)
- **s0** (#F9F9F6): Primary background
- **s5** (#FEFEFB): Text field background
- **s10** (#FCFCF9): Background 1
- **s20** (#F5F4EF): Background 2
- **s30** (#F0F0ED): Hover state
- **s40** (#E8E8E3): Press state / Border
- **s50** (#E4E4D7): Border 1
- **s60** (#D1D1C7): Border 2
- **s70** (#73726C): Dark border

#### 3. Forest Green Palette (Primary Brand Colors)
- **f0** (#DCF1E8): Lightest
- **f10** (#D6E5E5): Disabled text
- **f20** (#9BB1B0): Light accent
- **f30** (#506766): Secondary text
- **f40** (#136D6D): **PRIMARY ACTION COLOR** - Use for primary buttons, links, active states
- **f50** (#0E4E4E): Darker variant
- **f60** (#072929): Primary text color

#### 4. Blue Palette
- **b0** (#E3EEFF): Lightest
- **b10** (#3370FF): Primary blue
- **b10Alt** (#0869FB): Alternative blue
- **b20** (#0350C3): Darker blue
- **b30** (#0346AB): Darkest blue
- **b100** (#74AAFD): Link color, border highlights
- **b400** (#0350C3): Semantic token

#### 5. Status Colors
- **Red** (r0-r50): Error states, destructive actions
- **Yellow** (y0-y50): Warning states
- **Orange** (o0): Alert states
- **Pink** (p0): Special highlights
- **Teal** (t0): Information states
- **Purple** (p500): Status indicators

### Semantic Color Mappings

Use semantic names when available:

```typescript
text: {
  primary: '#072929',      // forest-f60
  secondary: '#506766',    // forest-f30
  disabled: '#D6E5E5',     // forest-f10
  inverse: '#F9F9F6',      // sandstorm-s0
}

background: {
  primary: '#F9F9F6',      // sandstorm-s0
  secondary: '#F5F4EF',    // sandstorm-s20
  tertiary: '#FCFCF9',    // sandstorm-s10
  field: '#FEFEFB',        // sandstorm-s5
}

status: {
  primary: '#136D6D',      // forest-f40
  danger: '#CE1313',       // red-r30
  warning: '#FF991F',      // yellow-y10
  success: '#136D6D',      // forest-f40
}
```

### Color Usage Rules

1. **Primary Actions**: Always use `forest-f40` (#136D6D) for primary buttons and CTAs
2. **Text Colors**: 
   - Primary text: `text-forest-f60` or `text-text-primary`
   - Secondary text: `text-forest-f30` or `text-text-secondary`
   - Disabled text: `text-forest-f10` or `text-text-disabled`
3. **Backgrounds**: Use sandstorm palette for backgrounds
4. **Borders**: Use sandstorm palette (s40, s50, s60) for borders
5. **Status Colors**: Use semantic status colors for alerts, errors, warnings
6. **Hover States**: Use `forest-f50` (#0E4E4E) for primary button hovers

### Example
```tsx
// ✅ CORRECT
<button className="bg-forest-f40 hover:bg-forest-f50 text-white">
<Text className="text-text-primary">Content</Text>

// ❌ WRONG
<button className="bg-green-600">  // Don't use generic colors
```

---

## Component Library

### Location
Components are organized in **`src/components/`** with the following structure:

```
components/
  ├── ui/              # Base UI components (Button, Input, Card, etc.)
  ├── auth/            # Authentication-specific components
  ├── layout/          # Layout components (Header, Sidebar, Layout)
  ├── accounts/        # Feature-specific components
  ├── channels/        # Feature-specific components
  └── ...
```

### Base UI Components

Located in **`src/components/ui/`**:

1. **Button** (`Button.tsx`): Base button component with variants
2. **AuthButton** (`AuthButton.tsx`): Specialized button for auth pages
3. **Input** (`Input.tsx`): Form input component
4. **Card** (`Card.tsx`): Container component
5. **AuthCard** (`AuthCard.tsx`): Specialized card for auth pages
6. **Alert** (`Alert.tsx`): Alert/notification component
7. **Divider** (`Divider.tsx`): Divider component
8. **Logo** (`Logo.tsx`): Logo component
9. **GoogleButton** (`GoogleButton.tsx`): OAuth button component
10. **AuthFormField** (`AuthFormField.tsx`): Form field wrapper
11. **AuthHeader** (`AuthHeader.tsx`): Header for auth pages
12. **AuthPageLayout** (`AuthPageLayout.tsx`): Layout wrapper for auth pages
13. **AuthSidebar** (`AuthSidebar.tsx`): Sidebar for auth pages

### Component Export Pattern

All UI components are exported from **`src/components/ui/index.ts`**:

```typescript
// ✅ CORRECT - Import from index
import { Button, Input, Card } from '../components/ui';

// ❌ WRONG - Direct import
import { Button } from '../components/ui/Button';
```

### Component Architecture

1. **Functional Components**: All components use React functional components with TypeScript
2. **Props Interface**: Each component defines a TypeScript interface for props
3. **Default Props**: Use default parameters for optional props
4. **Composition**: Prefer composition over configuration
5. **Accessibility**: Include proper ARIA attributes and semantic HTML

### Component Patterns

#### Button Component Pattern
```tsx
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

#### Input Component Pattern
```tsx
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  // Implementation
};
```

### Component Usage Rules

1. **Always use base UI components** from `src/components/ui/` when available
2. **Extend, don't duplicate**: Create new components by extending base components
3. **TypeScript**: All components must have proper TypeScript interfaces
4. **Props spreading**: Use `{...props}` to pass through HTML attributes
5. **ClassName merging**: Always allow `className` prop and merge with base styles
6. **Consistent naming**: Use PascalCase for component names

---

## Styling Approach

### Framework
- **Tailwind CSS v4.1.17**: Primary styling framework
- **PostCSS**: CSS processing
- **Vite**: Build tool with Tailwind plugin

### Configuration
- **Config File**: `tailwind.config.ts`
- **Global Styles**: `src/index.css`
- **Component Styles**: Inline Tailwind classes (preferred) or component-specific CSS files

### Styling Methodology

1. **Utility-First**: Use Tailwind utility classes for styling
2. **Component Classes**: Extract repeated patterns into component classes when needed
3. **Custom CSS**: Only use custom CSS for complex animations or third-party library overrides
4. **Responsive Design**: Use Tailwind's responsive prefixes (`sm:`, `md:`, `lg:`, etc.)

### Global Styles

Global styles are defined in **`src/index.css`**:

```css
:root {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light;
  color: #072929;              /* forest-f60 */
  background-color: #F9F9F6;   /* sandstorm-s0 */
}
```

### Styling Rules

1. **Prefer Tailwind utilities** over inline styles
2. **Use design tokens** from `tailwind.config.ts`
3. **Responsive breakpoints**: Follow Tailwind's default breakpoints
4. **State variants**: Use Tailwind's state variants (`hover:`, `focus:`, `active:`, `disabled:`)
5. **Custom values**: Add to `tailwind.config.ts` if used multiple times

### Example
```tsx
// ✅ CORRECT - Tailwind utilities
<div className="bg-sandstorm-s0 text-forest-f60 p-6 rounded-xl border border-sandstorm-s40 hover:bg-sandstorm-s10">

// ❌ WRONG - Inline styles
<div style={{ backgroundColor: '#F9F9F6', padding: '24px' }}>
```

---

## Asset Management

### Location
Assets are stored in **`src/assets/`** directory.

### Asset Types
- **Icons**: SVG files (105 SVG files)
- **Images**: PNG files (1 PNG file)
- **Other**: Additional media assets

### Asset Naming Convention
Assets use hash-based naming (e.g., `0032ab45b12b02437247aac5951d4c124c2223cc.svg`)

### Asset Usage

1. **Import assets** directly in components:
```tsx
import logo from '../assets/react.svg';
<img src={logo} alt="Logo" />
```

2. **SVG Icons**: Can be imported as React components or used as image sources
3. **Optimization**: Vite handles asset optimization automatically

### Asset Rules

1. **Store in `src/assets/`**: All static assets go in the assets directory
2. **Optimize before commit**: Ensure images are optimized
3. **Use appropriate formats**: SVG for icons, PNG/JPG for photos
4. **Alt text**: Always include alt text for images

---

## Icon System

### Location
Icons are stored in **`src/assets/`** as SVG files.

### Icon Usage Patterns

1. **As Image Source**:
```tsx
import icon from '../assets/icon-name.svg';
<img src={icon} alt="Icon" />
```

2. **Inline SVG** (for custom styling):
```tsx
<svg width="32" height="32" viewBox="0 0 32 32">
  {/* SVG content */}
</svg>
```

### Icon Guidelines

1. **Size**: Standard icon sizes: 16px, 20px, 24px, 32px
2. **Color**: Icons should inherit text color or use design tokens
3. **Accessibility**: Include proper ARIA labels
4. **Consistency**: Use consistent icon style throughout the app

### Google Icon Example
The GoogleButton component includes an inline SVG with specific colors:
- Blue: `#4285F4`
- Green: `#34A853`
- Yellow: `#FBBC05`
- Red: `#EB4335`

---

## Spacing & Layout

### Spacing Scale
Use Tailwind's default spacing scale (4px base unit):
- `p-1` = 4px
- `p-2` = 8px
- `p-4` = 16px
- `p-6` = 24px
- `p-8` = 32px
- etc.

### Layout Patterns

#### Auth Pages Layout
- **Card Width**: 576px (fixed)
- **Card Padding**: 40px
- **Section Gap**: 64px (gap-16)
- **Form Gap**: 32px (gap-8)
- **Input Gap**: 20px (gap-5)
- **Field Gap**: 4px (gap-1)

#### Dashboard Layout
- Uses flexbox and grid layouts
- Responsive breakpoints for mobile/tablet/desktop

### Spacing Rules

1. **Consistent spacing**: Use the spacing scale consistently
2. **Gap utilities**: Prefer `gap-*` for flex/grid containers
3. **Padding/Margin**: Use `p-*` and `m-*` utilities
4. **Responsive spacing**: Adjust spacing for different screen sizes

### Example
```tsx
// ✅ CORRECT
<div className="flex flex-col gap-8 p-6">

// ❌ WRONG
<div style={{ display: 'flex', gap: '32px', padding: '24px' }}>
```

---

## Component Patterns

### Form Components

#### Input Fields
- **Height**: 48px standard
- **Border Radius**: 12px (rounded-xl)
- **Border**: 1px solid `sandstorm-s40` (#E8E8E3)
- **Focus**: 2px ring `forest-f40` (#136D6D)
- **Padding**: 12px horizontal
- **Font**: Inter, 14px

#### Buttons
- **Primary Button**:
  - Background: `forest-f40` (#136D6D)
  - Hover: `forest-f50` (#0E4E4E)
  - Border Radius: 12px (rounded-xl)
  - Padding: 20px vertical, 24px horizontal (py-5 px-6)
  - Font: Poppins, 16px, semibold (600)

- **OAuth Button**:
  - Background: White
  - Border: 1px solid `sandstorm-s40` (#e8e8e3)
  - Height: 56px (h-14)
  - Border Radius: 16px (rounded-2xl)
  - Hover: `sandstorm-s5` (#FEFEFB)

#### Cards
- **Background**: `sandstorm-s0` (#F9F9F6)
- **Border**: 1px solid `sandstorm-s40` (#E8E8E3)
- **Border Radius**: 16px (rounded-2xl) for auth cards, 12px (rounded-xl) for dashboard cards
- **Padding**: 40px for auth cards, 24px (p-6) for dashboard cards

### State Patterns

#### Hover States
- **Primary Button**: Darker shade of primary color
- **Links**: Darker shade of link color
- **Interactive Elements**: Lighter background (`sandstorm-s30` or `sandstorm-s5`)

#### Focus States
- **Inputs**: 2px ring in primary color (`forest-f40`)
- **Buttons**: 2px ring in primary color
- **Accessibility**: Always include focus states for keyboard navigation

#### Disabled States
- **Opacity**: 0.5 (50%)
- **Cursor**: `not-allowed`
- **Pointer Events**: Disabled

#### Error States
- **Border Color**: Red (`red-r30` or `#CE1313`)
- **Text Color**: Red (`red-r40` or `#B51111`)
- **Background**: Light red (`red-r0` or `#FFEBE6`)

### Example
```tsx
// ✅ CORRECT - Complete form field with states
<AuthFormField
  label="Email"
  type="email"
  value={email}
  onChange={handleChange}
  error={errors.email}
  required
/>

// Button with all states
<AuthButton
  loading={isLoading}
  loadingText="Signing in..."
  disabled={!isValid}
>
  Sign In
</AuthButton>
```

---

## Project Structure

### Directory Organization

```
stellar-frontend/
├── src/
│   ├── assets/           # Static assets (icons, images)
│   ├── components/       # React components
│   │   ├── ui/          # Base UI components
│   │   ├── auth/        # Auth-specific components
│   │   ├── layout/      # Layout components
│   │   ├── accounts/    # Feature components
│   │   └── channels/    # Feature components
│   ├── contexts/        # React contexts (Auth, DateRange)
│   ├── pages/           # Page components
│   ├── services/        # API services
│   ├── styles/          # Style definitions (JSON, CSS)
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Entry point
│   └── index.css        # Global styles
├── public/              # Public assets
├── .cursor/             # Cursor IDE rules
│   └── rules/          # Design system rules (this file)
├── tailwind.config.ts   # Tailwind configuration
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies
```

### File Naming Conventions

1. **Components**: PascalCase (e.g., `Button.tsx`, `AuthButton.tsx`)
2. **Utilities**: camelCase (e.g., `api.ts`, `auth.ts`)
3. **Constants**: UPPER_SNAKE_CASE (e.g., `API_BASE_URL`)
4. **Types/Interfaces**: PascalCase (e.g., `User`, `AuthContextType`)

### Import Organization

1. **React imports** first
2. **Third-party libraries** second
3. **Internal components** third
4. **Utilities/services** fourth
5. **Types** last (or inline with components)

### Example
```tsx
// ✅ CORRECT - Organized imports
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from '../components/ui';
import { authService } from '../services/auth';
import type { User } from '../services/auth';
```

---

## Frameworks & Libraries

### Core Stack
- **React 19.2.0**: UI library
- **TypeScript 5.9.3**: Type safety
- **Vite 7.2.4**: Build tool and dev server
- **Tailwind CSS 4.1.17**: Styling framework

### Key Dependencies
- **@auth0/auth0-react**: Authentication
- **react-router-dom**: Routing
- **axios**: HTTP client
- **react-datepicker**: Date picker component
- **recharts**: Charting library
- **@headlessui/react**: Headless UI components

### Build System
- **Vite**: Fast build tool with HMR
- **Tailwind Vite Plugin**: Direct integration
- **TypeScript**: Type checking and compilation
- **ESLint**: Code linting

---

## Authentication Pages Specific Rules

### Auth Page Styling
Auth pages have specific styling defined in **`src/styles/auth-styles.json`**:

#### Layout
- **Page Background**: White (#FFFFFF)
- **Card Background**: Light gray (#f5f7fa)
- **Card Border**: 1px solid #e6e6e6
- **Card Border Radius**: 16px
- **Card Width**: 576px (fixed)
- **Card Padding**: 40px

#### Typography
- **Font Family**: Poppins (specifically for auth pages)
- **Heading**: 32px, font-weight 600, color #000205
- **Subtitle**: 20px, color #808080
- **Label**: 16px, font-weight 500, color #000000
- **Body Text**: 16px, color #000000
- **Small Text**: 12px, font-weight 600

#### Colors
- **Primary Button**: #136d6d (forest-f40)
- **Primary Button Hover**: #0e5a5a (forest-f50)
- **Text Primary**: #000205 (neutral-n1000)
- **Text Secondary**: #808080
- **Link Color**: #072929 (forest-f60)
- **Link Hover**: #0E4E4E (forest-f50)

#### Components
- Use `AuthPageLayout` for page wrapper
- Use `AuthButton` for primary actions
- Use `AuthFormField` for form inputs
- Use `AuthHeader` for page headers
- Use `GoogleButton` for OAuth buttons

### Auth Page Rules

1. **Always use Poppins font** for auth pages
2. **Use Auth-specific components** from `components/ui/`
3. **Follow spacing guidelines** from auth-styles.json
4. **Maintain 576px card width** for consistency
5. **Use semantic colors** from the design system

---

## Responsive Design

### Breakpoints
Use Tailwind's default breakpoints:
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

### Responsive Patterns

1. **Mobile-First**: Design for mobile, then enhance for larger screens
2. **Flexible Layouts**: Use flexbox and grid for responsive layouts
3. **Responsive Typography**: Adjust font sizes for different screen sizes
4. **Touch Targets**: Ensure minimum 44px touch targets on mobile

### Example
```tsx
// ✅ CORRECT - Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div className="text-h900 md:text-h1000 lg:text-h1100">Content</div>
</div>
```

---

## Accessibility Guidelines

### Requirements

1. **Semantic HTML**: Use proper HTML elements
2. **ARIA Labels**: Include ARIA labels for interactive elements
3. **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
4. **Focus States**: Always include visible focus states
5. **Color Contrast**: Maintain WCAG AA contrast ratios
6. **Alt Text**: Include alt text for all images

### Example
```tsx
// ✅ CORRECT - Accessible button
<button
  type="button"
  aria-label="Close dialog"
  className="focus:outline-none focus:ring-2 focus:ring-forest-f40"
>
  Close
</button>
```

---

## Code Quality Standards

### TypeScript

1. **Strict Types**: Always define proper types for props and state
2. **Interface Definitions**: Use interfaces for component props
3. **Type Exports**: Export types when shared across components
4. **No `any` Types**: Avoid using `any` type

### React Patterns

1. **Functional Components**: Use functional components with hooks
2. **Custom Hooks**: Extract reusable logic into custom hooks
3. **Context API**: Use contexts for global state (Auth, Theme, etc.)
4. **Error Boundaries**: Implement error boundaries for error handling

### Performance

1. **Code Splitting**: Use React.lazy for route-based code splitting
2. **Memoization**: Use React.memo, useMemo, useCallback when appropriate
3. **Image Optimization**: Optimize images before adding to assets
4. **Bundle Size**: Monitor and optimize bundle size

---

## Testing Considerations

### Component Testing

1. **Test Component Rendering**: Ensure components render correctly
2. **Test User Interactions**: Test button clicks, form submissions, etc.
3. **Test Accessibility**: Verify ARIA labels and keyboard navigation
4. **Test Responsive Behavior**: Test on different screen sizes

---

## Common Patterns & Examples

### Button Variants
```tsx
// Primary button
<Button variant="primary" size="md">Submit</Button>

// Outline button
<Button variant="outline" size="md">Cancel</Button>

// Auth button (specialized)
<AuthButton loading={isLoading}>Sign In</AuthButton>
```

### Form Fields
```tsx
// Standard input
<Input
  label="Email"
  type="email"
  value={email}
  onChange={handleChange}
  error={errors.email}
/>

// Auth form field (specialized)
<AuthFormField
  label="Password"
  type="password"
  value={password}
  onChange={handleChange}
  required
/>
```

### Cards
```tsx
// Standard card
<Card title="Card Title" actions={<Button>Action</Button>}>
  Content here
</Card>

// Auth card (specialized)
<AuthCard>
  <AuthHeader title="Welcome" description="Sign in to continue" />
  {/* Form content */}
</AuthCard>
```

---

## Important Reminders

### ⚠️ Critical Rules

1. **ALWAYS use design tokens** from `tailwind.config.ts` - never hardcode colors, spacing, or typography
2. **ALWAYS use base UI components** when available - don't create duplicate components
3. **ALWAYS follow the color system** - use semantic color names and palette tokens
4. **ALWAYS use Poppins font** for authentication pages
5. **ALWAYS maintain 576px card width** for auth pages
6. **ALWAYS include TypeScript types** for all components
7. **ALWAYS use Tailwind utilities** instead of inline styles
8. **ALWAYS follow the project structure** - organize files correctly
9. **ALWAYS test responsive behavior** - ensure mobile compatibility
10. **ALWAYS include accessibility features** - ARIA labels, keyboard navigation, focus states

### ✅ Best Practices

- Use semantic HTML elements
- Follow the component composition pattern
- Export components from index files
- Use consistent naming conventions
- Document complex logic
- Keep components focused and reusable
- Use TypeScript for type safety
- Follow React best practices

### ❌ Common Mistakes to Avoid

- Hardcoding colors, spacing, or font sizes
- Creating duplicate components instead of extending base components
- Using inline styles instead of Tailwind utilities
- Ignoring the design system tokens
- Mixing font families incorrectly
- Not including TypeScript types
- Skipping accessibility features
- Breaking responsive design patterns

---

## Quick Reference

### Primary Colors
- **Primary Action**: `forest-f40` (#136D6D)
- **Primary Text**: `forest-f60` (#072929)
- **Background**: `sandstorm-s0` (#F9F9F6)
- **Border**: `sandstorm-s40` (#E8E8E3)

### Typography
- **Auth Pages**: Poppins
- **Headings**: PP Agrandir or GT America Trial
- **Body**: Inter

### Spacing
- **Card Padding**: 40px (auth), 24px (dashboard)
- **Section Gap**: 64px (gap-16)
- **Form Gap**: 32px (gap-8)
- **Input Gap**: 20px (gap-5)

### Border Radius
- **Cards**: 16px (auth), 12px (dashboard)
- **Buttons**: 12px (primary), 16px (OAuth)
- **Inputs**: 12px

---

**Last Updated**: December 2025
**Version**: 1.0.0
**Maintained By**: Development Team
