// import type { Config } from "tailwindcss";
import { tokenStudioColors } from "./tailwind-colors-generated";

const config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  safelist: [
    // Neutral Token Studio colors - background (flexible pattern for any numeric shade)
  ],
  theme: {
    extend: {
      colors: {
        // Colors from Token Studio (global.json) - Standard color palettes
        // These provide standard Tailwind color scales (red-50, blue-500, etc.)
        // Note: Some colors (red, blue, yellow, orange, pink, teal, purple, neutral) are merged below
        // to preserve custom variants alongside Token Studio scales
        ...Object.fromEntries(
          Object.entries(tokenStudioColors).filter(([key]) => 
            !['red', 'blue', 'yellow', 'orange', 'pink', 'teal', 'purple', 'neutral'].includes(key)
          )
        ),
        
        // Neutral (Light) - Complete palette from Figma
        // Explicitly list all colors to ensure Tailwind JIT detects them
        neutral: {

          50: tokenStudioColors.neutral[50],
          100: tokenStudioColors.neutral[100],
          200: tokenStudioColors.neutral[200],
          300: tokenStudioColors.neutral[300],
          400: tokenStudioColors.neutral[400],
          500: tokenStudioColors.neutral[500],
          600: tokenStudioColors.neutral[600],
          700: tokenStudioColors.neutral[700],
          750: tokenStudioColors.neutral[750],
          800: tokenStudioColors.neutral[800],
          900: tokenStudioColors.neutral[900],
          950: tokenStudioColors.neutral[950],
          n0: tokenStudioColors.neutralVariants.n0,
          n10: tokenStudioColors.neutralVariants.n10,
          n20: tokenStudioColors.neutralVariants.n20,
          n30: tokenStudioColors.neutralVariants.n30,
          n40: tokenStudioColors.neutralVariants.n40,
          n50: tokenStudioColors.neutralVariants.n50,
          n60: tokenStudioColors.neutralVariants.n60,
          n70: tokenStudioColors.neutralVariants.n70,
          n80: tokenStudioColors.neutralVariants.n80,
          n90: tokenStudioColors.neutralVariants.n90,
          n100: tokenStudioColors.neutralVariants.n100,
          n200: tokenStudioColors.neutralVariants.n200,
          n300: tokenStudioColors.neutralVariants.n300,
          n400: tokenStudioColors.neutralVariants.n400,
          n500: tokenStudioColors.neutralVariants.n500,
          n600: tokenStudioColors.neutralVariants.n600,
          n700: tokenStudioColors.neutralVariants.n700,
          n800: tokenStudioColors.neutralVariants.n800,
          n900: tokenStudioColors.neutralVariants.n900,
          n1000: tokenStudioColors.neutralVariants.n1000,
          },
        // Neutral Alpha - For dark theme support
        neutralAlpha: {
          n10A: "rgba(9, 30, 66, 0.02)",
          n20A: "rgba(9, 30, 66, 0.04)",
          n30A: "rgba(9, 30, 66, 0.08)",
          n40A: "rgba(9, 30, 66, 0.13)",
          n50A: "rgba(9, 30, 66, 0.25)",
          n60A: "rgba(9, 30, 66, 0.31)",
          n70A: "rgba(9, 30, 66, 0.36)",
          n80A: "rgba(9, 30, 66, 0.42)",
          n90A: "rgba(9, 30, 66, 0.48)",
          n100A: "rgba(9, 30, 66, 0.54)",
          n200A: "rgba(9, 30, 66, 0.60)",
          n300A: "rgba(9, 30, 66, 0.66)",
          n400A: "rgba(9, 30, 66, 0.71)",
          n500A: "rgba(9, 30, 66, 0.77)",
          n600A: "rgba(9, 30, 66, 0.82)",
          n700A: "rgba(9, 30, 66, 0.89)",
          n800A: "rgba(9, 30, 66, 0.95)",
          n900A: "#091E42",
        },
        // Pixis Sandstorm - Complete palette with semantic meanings
        sandstorm: {
          s0: "#F9F9F6", // Background 1
          s5: "#FEFEFB", // Text Field BG
          s10: "#FCFCF9", // Background 1
          s20: "#F5F4EF", // Background 2
          s30: "#F0F0ED", // Hover 1
          s40: "#E8E8E3", // Press 1 / Border
          s50: "#E4E4D7", // Border 1
          s60: "#D1D1C7", // Border 2
          s70: "#73726C",
        },
        // Pixis Forest Green - Complete palette with semantic meanings
        forest: {
          f0: "#DCF1E8",
          f10: "#D6E5E5", // Disabled Text
          f20: "#9BB1B0",
          f30: "#506766", // Secondary Text (Note: Also #78B0B0 in some contexts)
          f40: "#136D6D", // Primary action color (updated from #13606D)
          f50: "#0E4E4E",
          f60: "#072929", // Primary Text
        },
        // Blue - Custom palette (preserved alongside Token Studio blue scale)
        // Token Studio provides: blue-50, blue-100, etc.
        // Custom variants: blue-b0, blue-b10, etc.
        blue: {
          50: tokenStudioColors.blue[50],
          100: tokenStudioColors.blue[100],
          200: tokenStudioColors.blue[200],
          300: tokenStudioColors.blue[300],
          400: tokenStudioColors.blue[400],
          500: tokenStudioColors.blue[500],
          600: tokenStudioColors.blue[600],
          700: tokenStudioColors.blue[700],
          800: tokenStudioColors.blue[800],
          900: tokenStudioColors.blue[900],
          950: tokenStudioColors.blue[950],
          b0: "#E3EEFF",
          b10: "#3370FF",
          b10Alt: "#0869FB",
          b20: "#0350C3",
          b30: "#0346AB",
          b100: "#74AAFD", // Link color, border highlights
          b400: "#0350C3", // Same as b20, used for semantic tokens
        },
        // Red - Custom palette (preserved alongside Token Studio red scale)
        // Token Studio provides: red-50, red-100, etc.
        // Custom variants: red-r0, red-r10, etc.
        red: {
          50: tokenStudioColors.red[50],
          100: tokenStudioColors.red[100],
          200: tokenStudioColors.red[200],
          300: tokenStudioColors.red[300],
          400: tokenStudioColors.red[400],
          500: tokenStudioColors.red[500],
          600: tokenStudioColors.red[600],
          700: tokenStudioColors.red[700],
          800: tokenStudioColors.red[800],
          900: tokenStudioColors.red[900],
          950: tokenStudioColors.red[950],
          r0: "#FFEBE6",
          r10: "#FFD6CC",
          r20: "#FFAD99",
          r30: "#CE1313",
          r40: "#B51111",
          r50: "#950E0E",
        },
        // Yellow - Custom palette (preserved alongside Token Studio yellow scale)
        yellow: {
          50: tokenStudioColors.yellow[50],
          100: tokenStudioColors.yellow[100],
          200: tokenStudioColors.yellow[200],
          300: tokenStudioColors.yellow[300],
          400: tokenStudioColors.yellow[400],
          500: tokenStudioColors.yellow[500],
          600: tokenStudioColors.yellow[600],
          700: tokenStudioColors.yellow[700],
          800: tokenStudioColors.yellow[800],
          900: tokenStudioColors.yellow[900],
          950: tokenStudioColors.yellow[950],
          y0: "#FFECD6",
          y10: "#FF991F",
          y50: "#FFFAE6", // Warning backgrounds
        },
        // Orange - Custom palette (preserved alongside Token Studio orange scale)
        orange: {
          50: tokenStudioColors.orange[50],
          100: tokenStudioColors.orange[100],
          200: tokenStudioColors.orange[200],
          300: tokenStudioColors.orange[300],
          400: tokenStudioColors.orange[400],
          500: tokenStudioColors.orange[500],
          600: tokenStudioColors.orange[600],
          700: tokenStudioColors.orange[700],
          800: tokenStudioColors.orange[800],
          900: tokenStudioColors.orange[900],
          950: tokenStudioColors.orange[950],
          o0: "#FF5C33",
        },
        // Pink - Custom palette (preserved alongside Token Studio pink scale)
        pink: {
          50: tokenStudioColors.pink[50],
          100: tokenStudioColors.pink[100],
          200: tokenStudioColors.pink[200],
          300: tokenStudioColors.pink[300],
          400: tokenStudioColors.pink[400],
          500: tokenStudioColors.pink[500],
          600: tokenStudioColors.pink[600],
          700: tokenStudioColors.pink[700],
          800: tokenStudioColors.pink[800],
          900: tokenStudioColors.pink[900],
          950: tokenStudioColors.pink[950],
          p0: "#FD357C",
        },
        // Teal - Custom palette (preserved alongside Token Studio teal scale)
        teal: {
          50: tokenStudioColors.teal[50],
          100: tokenStudioColors.teal[100],
          200: tokenStudioColors.teal[200],
          300: tokenStudioColors.teal[300],
          400: tokenStudioColors.teal[400],
          500: tokenStudioColors.teal[500],
          600: tokenStudioColors.teal[600],
          700: tokenStudioColors.teal[700],
          800: tokenStudioColors.teal[800],
          900: tokenStudioColors.teal[900],
          950: tokenStudioColors.teal[950],
          t0: "#258DC1",
        },
        // Purple - Custom palette (preserved alongside Token Studio purple scale)
        purple: {
          50: tokenStudioColors.purple[50],
          100: tokenStudioColors.purple[100],
          200: tokenStudioColors.purple[200],
          300: tokenStudioColors.purple[300],
          400: tokenStudioColors.purple[400],
          500: tokenStudioColors.purple[500],
          600: tokenStudioColors.purple[600],
          700: tokenStudioColors.purple[700],
          800: tokenStudioColors.purple[800],
          900: tokenStudioColors.purple[900],
          950: tokenStudioColors.purple[950],
          p500: "#403294", // Status indicators, design tokens
        },
        // Semantic color mappings for convenience
        text: {
          primary: "#072929", // forest-f60
          secondary: "#506766", // forest-f30
          disabled: "#D6E5E5", // forest-f10
          inverse: "#F9F9F6", // sandstorm-s0
        },
        background: {
          primary: "#F9F9F6", // sandstorm-s0
          secondary: "#F5F4EF", // sandstorm-s20
          tertiary: "#FCFCF9", // sandstorm-s10
          field: "#FEFEFB", // sandstorm-s5
        },
        border: {
          default: "#E8E8E3", // sandstorm-s40
          light: "#E4E4D7", // sandstorm-s50
          medium: "#D1D1C7", // sandstorm-s60
          common: "#E6E6E6", // commonly used border color
        },
        status: {
          primary: "#136D6D", // forest-f40
          danger: "#CE1313", // red-r30
          warning: "#FF991F", // yellow-y10
          success: "#136D6D", // forest-f40 (can be customized)
        },
      },
      fontFamily: {
        sans: [
          "GT America Trial",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        agrandir: ["PP Agrandir", "system-ui", "sans-serif"],
        gtAmerica: ["GT America Trial", "system-ui", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
        poppins: ["Poppins", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Complete typography scale from Figma brand kit
        h1300: ["32px", { lineHeight: "auto", letterSpacing: "-1px" }], // PP Agrandir Regular
        h1250: ["28px", { lineHeight: "40px", letterSpacing: "0" }], // PP Agrandir Regular
        h1100: ["24px", { lineHeight: "40px", letterSpacing: "-1px" }], // PP Agrandir Regular / Inter Medium
        h1050: ["24px", { lineHeight: "40px", letterSpacing: "0" }], // GT America Trial Medium
        h1000: ["20px", { lineHeight: "32px", letterSpacing: "0" }], // GT America Trial Medium
        h900: ["18px", { lineHeight: "24px", letterSpacing: "0" }], // GT America Trial Medium
        h800: ["18px", { lineHeight: "28px", letterSpacing: "-0.2px" }], // GT America Trial Medium / Inter Semi Bold
        h750: ["18px", { lineHeight: "28px", letterSpacing: "0" }], // GT America Trial Regular
        h700: ["16px", { lineHeight: "28px", letterSpacing: "0" }], // GT America Trial Bold
        h600: ["16px", { lineHeight: "26px", letterSpacing: "0" }], // GT America Trial Medium
        h550: ["16px", { lineHeight: "26px", letterSpacing: "0" }], // GT America Trial Regular
        h500: ["14px", { lineHeight: "20px", letterSpacing: "0" }], // GT America Trial Bold
        h450: ["14px", { lineHeight: "20px", letterSpacing: "0" }], // GT America Trial Medium / Inter Medium
        h400: ["14px", { lineHeight: "20px", letterSpacing: "0" }], // GT America Trial Regular
        h300: ["12px", { lineHeight: "18px", letterSpacing: "0" }], // GT America Trial Medium
        h200: ["12px", { lineHeight: "18px", letterSpacing: "0" }], // GT America Trial Regular
        h100: ["10px", { lineHeight: "14px", letterSpacing: "0" }], // GT America Trial Medium
        "button-text": ["11.2px", { lineHeight: "auto", letterSpacing: "0" }], // Button text size
      },
      letterSpacing: {
        tight: "-1px",
        tighter: "-0.2px",
        normal: "0",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
