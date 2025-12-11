import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral (Light) - Complete palette from Figma
        neutral: {
          n0: '#FFFFFF',
          n10: '#FAFBFC',
          n20: '#F4F5F7',
          n30: '#EBECF0',
          n40: '#DFE1E6',
          n50: '#475467',
          n60: '#B3BAC5',
          n70: '#A5ADBA',
          n80: '#97A0AF',
          n90: '#8993A4',
          n100: '#7D8799',
          n200: '#6B7589',
          n300: '#556179',
          n400: '#414C62',
          n500: '#313B50',
          n600: '#29303F',
          n700: '#212630',
          n800: '#161B25',
          n900: '#0B0F16',
          n1000: '#000205',
        },
        // Neutral Alpha - For dark theme support
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
          s0: '#F9F9F6',    // Background 1
          s5: '#FEFEFB',    // Text Field BG
          s10: '#FCFCF9',   // Background 1
          s20: '#F5F4EF',   // Background 2
          s30: '#F0F0ED',   // Hover 1
          s40: '#E8E8E3',   // Press 1 / Border
          s50: '#E4E4D7',   // Border 1
          s60: '#D1D1C7',   // Border 2
          s70: '#73726C',
        },
        // Pixis Forest Green - Complete palette with semantic meanings
        forest: {
          f0: '#DCF1E8',
          f10: '#D6E5E5',   // Disabled Text
          f20: '#9BB1B0',
          f30: '#506766',   // Secondary Text (Note: Also #78B0B0 in some contexts)
          f40: '#136D6D',   // Primary action color (updated from #13606D)
          f50: '#0E4E4E',
          f60: '#072929',   // Primary Text
        },
        // Blue - Complete palette
        blue: {
          b0: '#E3EEFF',
          b10: '#3370FF',
          b10Alt: '#0869FB',
          b20: '#0350C3',
          b30: '#0346AB',
          b100: '#74AAFD',  // Link color, border highlights
          b400: '#0350C3',  // Same as b20, used for semantic tokens
        },
        // Red - Complete palette
        red: {
          r0: '#FFEBE6',
          r10: '#FFD6CC',
          r20: '#FFAD99',
          r30: '#CE1313',
          r40: '#B51111',
          r50: '#950E0E',
        },
        // Yellow - Complete palette
        yellow: {
          y0: '#FFECD6',
          y10: '#FF991F',
          y50: '#FFFAE6',   // Warning backgrounds
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
          p500: '#403294',  // Status indicators, design tokens
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
      },
      fontFamily: {
        sans: ['GT America Trial', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        agrandir: ['PP Agrandir', 'system-ui', 'sans-serif'],
        gtAmerica: ['GT America Trial', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
        poppins: ['Poppins', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Complete typography scale from Figma brand kit
        'h1300': ['32px', { lineHeight: 'auto', letterSpacing: '-1px' }],  // PP Agrandir Regular
        'h1250': ['28px', { lineHeight: '40px', letterSpacing: '0' }],     // PP Agrandir Regular
        'h1100': ['24px', { lineHeight: '40px', letterSpacing: '-1px' }],  // PP Agrandir Regular / Inter Medium
        'h1050': ['24px', { lineHeight: '40px', letterSpacing: '0' }],     // GT America Trial Medium
        'h1000': ['20px', { lineHeight: '32px', letterSpacing: '0' }],     // GT America Trial Medium
        'h900': ['18px', { lineHeight: '24px', letterSpacing: '0' }],       // GT America Trial Medium
        'h800': ['18px', { lineHeight: '28px', letterSpacing: '-0.2px' }], // GT America Trial Medium / Inter Semi Bold
        'h750': ['18px', { lineHeight: '28px', letterSpacing: '0' }],       // GT America Trial Regular
        'h700': ['16px', { lineHeight: '28px', letterSpacing: '0' }],       // GT America Trial Bold
        'h600': ['16px', { lineHeight: '26px', letterSpacing: '0' }],      // GT America Trial Medium
        'h550': ['16px', { lineHeight: '26px', letterSpacing: '0' }],      // GT America Trial Regular
        'h500': ['14px', { lineHeight: '20px', letterSpacing: '0' }],       // GT America Trial Bold
        'h450': ['14px', { lineHeight: '20px', letterSpacing: '0' }],      // GT America Trial Medium / Inter Medium
        'h400': ['14px', { lineHeight: '20px', letterSpacing: '0' }],     // GT America Trial Regular
        'h300': ['12px', { lineHeight: '18px', letterSpacing: '0' }],      // GT America Trial Medium
        'h200': ['12px', { lineHeight: '18px', letterSpacing: '0' }],      // GT America Trial Regular
        'h100': ['10px', { lineHeight: '14px', letterSpacing: '0' }],       // GT America Trial Medium
      },
      letterSpacing: {
        tight: '-1px',
        tighter: '-0.2px',
        normal: '0',
      },
    },
  },
  plugins: [],
}

export default config

