const tokens = require('./design-system/tokens.json')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          surface: 'var(--bg-surface)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
        },
        success: tokens.color.light.success,
        warning: tokens.color.light.warning,
        error: tokens.color.light.error,
      },
      fontFamily: {
        display: [tokens.typography['font-display']],
        body: [tokens.typography['font-body']],
        mono: [tokens.typography['font-mono']],
      },
      fontSize: tokens.typography.size,
      spacing: tokens.spacing,
      borderRadius: tokens.radius,
      boxShadow: tokens.shadow,
      transitionDuration: {
        fast: tokens.animation['duration-fast'],
        normal: tokens.animation['duration-normal'],
        slow: tokens.animation['duration-slow'],
      },
      transitionTimingFunction: {
        default: tokens.animation['easing-default'],
        bounce: tokens.animation['easing-bounce'],
      },
    },
  },
  plugins: [],
}
