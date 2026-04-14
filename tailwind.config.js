/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
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
        bg: {
          base: '#f5f5f5',
          surface: '#cecece',
          elevated: '#c7c7c7',
          card: '#505b69',
        },
        brand: {
          amber: '#F59E0B',
          amberDark: '#D97706',
          amberLight: '#FCD34D',
        },
        status: {
          onsite: '#10B981',
          enroute: '#F59E0B',
          available: '#3B82F6',
          off: '#64748B',
          urgent: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(20px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(245,158,11,0.3)',
        'glow-green': '0 0 20px rgba(16,185,129,0.3)',
      },
    },
  },
  plugins: [],
}
