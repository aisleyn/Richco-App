/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        /* Primary brand colors */
        primary: {
          base: 'var(--primary-base)',
          dark: 'var(--primary-dark)',
        },
        /* Success colors */
        success: {
          base: 'var(--success-base)',
          medium: 'var(--success-medium)',
          dark: 'var(--success-dark)',
          darker: 'var(--success-darker)',
          light: 'var(--success-light)',
          lighter: 'var(--success-lighter)',
        },
        /* Error colors */
        error: {
          base: 'var(--error-base)',
          dark: 'var(--error-dark)',
          light: 'var(--error-light)',
        },
        /* Warning colors */
        warning: {
          base: 'var(--warning-base)',
          darker: 'var(--warning-darker)',
          light: 'var(--warning-light)',
        },
        /* Accent colors */
        accent: {
          teal: 'var(--accent-teal)',
          cyan: 'var(--accent-cyan)',
          blue: 'var(--accent-blue)',
          'bright-blue': 'var(--accent-bright-blue)',
        },
        /* Background colors */
        bg: {
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          lighter: 'var(--bg-lighter)',
          lightest: 'var(--bg-lightest)',
          light: 'var(--bg-light)',
        },
        /* Text colors */
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          dark: 'var(--text-dark)',
          muted: 'var(--text-muted)',
          placeholder: 'var(--text-placeholder)',
        },
        /* Border colors */
        border: {
          DEFAULT: 'var(--border-color)',
          light: 'var(--border-light)',
        },
        /* Neutral colors */
        neutral: {
          white: 'var(--neutral-white)',
          black: 'var(--neutral-black)',
        },
        /* Legacy brand colors */
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#d4e8ff',
          300: '#b5d9ee',
          400: '#9dd5f5',
          500: '#79bee6',
          600: '#52b0e6',
          700: '#47a0d3',
          800: '#4794d3',
          900: '#3382b1',
        },
        brand: {
          amber: '#F59E0B',
          amberDark: '#D97706',
          amberLight: '#FCD34D',
          green: '#16A34A',
          greenDark: '#15803D',
        },
        status: {
          onsite: '#10B981',
          enroute: '#F59E0B',
          available: '#3B82F6',
          off: '#64748B',
          urgent: '#EF4444',
        },
      },
      spacing: {
        xs: 'var(--space-xs)',
        sm: 'var(--space-sm)',
        md: 'var(--space-md)',
        lg: 'var(--space-lg)',
        xl: 'var(--space-xl)',
        '2xl': 'var(--space-2xl)',
        '3xl': 'var(--space-3xl)',
        '4xl': 'var(--space-4xl)',
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
        full: 'var(--radius-full)',
      },
      fontFamily: {
        sans: ['Source Sans 3', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 8s linear infinite',
        'rc-pulse': 'rc-pulse 0.9s infinite',
        'rc-pulse-delayed-1': 'rc-pulse 0.9s infinite 0.15s',
        'rc-pulse-delayed-2': 'rc-pulse 0.9s infinite 0.3s',
        'rc-pulse-slow': 'rc-pulse 2s infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        card: 'var(--shadow-md)',
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        xl: 'var(--shadow-xl)',
        xxl: 'var(--shadow-xxl)',
        'success-glow': 'var(--shadow-success-glow)',
        glow: '0 0 20px rgba(245,158,11,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
      },
    },
  },
  plugins: [],
}
