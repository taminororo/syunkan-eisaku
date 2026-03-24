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
          bg: 'var(--accent-bg)',
          border: 'var(--accent-border)',
        },
        success: {
          DEFAULT: 'var(--success)',
          bg: 'var(--success-bg)',
        },
        warning: {
          DEFAULT: 'var(--warning)',
          bg: 'var(--warning-bg)',
          border: 'var(--warning-border)',
        },
        error: {
          DEFAULT: 'var(--error)',
          bg: 'var(--error-bg)',
        },
        border: {
          DEFAULT: 'var(--border)',
          hover: 'var(--border-hover)',
        },
      },
      fontFamily: {
        display: [tokens.typography['font-display']],
        body: [tokens.typography['font-body']],
        mono: [tokens.typography['font-mono']],
      },
      fontSize: tokens.typography.size,
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
