import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral (Light)
        neutral: {
          n0: '#FFFFFF',
          n10: '#FAFBFC',
          n20: '#F4F5F7',
          n30: '#EBECF0',
          n40: '#DFE1E6',
          n50: '#475467',
          n60: '#83BAC5',
          n70: '#A5ADBA',
          n80: '#97A0AF',
          n90: '#899344',
          n100: '#708799',
          n200: '#687589',
          n300: '#556179',
          n400: '#414C62',
          n500: '#313850',
          n600: '#29303F',
        },
        // Pixis Sandstorm
        sandstorm: {
          s0: '#F9F9F6',
          s5: '#FEFEFB',
          s10: '#FCFCF9',
          s20: '#F5F4EF',
          s30: '#F0FDED',
          s40: '#EBEBE3',
          s50: '#E4E4D7',
          s60: '#D1D1C7',
          s70: '#73726C',
        },
        // Pixis Forest Green
        forest: {
          f0: '#DCF1E8',
          f10: '#D6E5E5',
          f20: '#98B1B0',
          f30: '#506766',
          f40: '#13606D',
          f50: '#0E4E4E',
          f60: '#072929',
        },
        // Blue
        blue: {
          b0: '#E3EEFF',
          b10: '#3370FF',
          b10Alt: '#0869FB',
          b20: '#0350C3',
          b30: '#0346AB',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'h1300': ['32px', { lineHeight: '40px' }], // 2rem / 2.5rem
        'h1200': ['28px', { lineHeight: '36px' }],
        'h1100': ['24px', { lineHeight: '32px' }],
        'h1000': ['20px', { lineHeight: '28px' }],
        'h900': ['18px', { lineHeight: '24px' }],
        'h800': ['16px', { lineHeight: '24px' }],
        'h700': ['14px', { lineHeight: '20px' }],
        'h600': ['12px', { lineHeight: '16px' }],
        'h500': ['11px', { lineHeight: '14px' }],
        'h400': ['10px', { lineHeight: '14px' }], // 0.625rem
        'h300': ['10px', { lineHeight: 'auto' }],
        'h200': ['10px', { lineHeight: 'auto' }],
        'h100': ['10px', { lineHeight: 'auto' }],
      },
    },
  },
  plugins: [],
}

export default config

