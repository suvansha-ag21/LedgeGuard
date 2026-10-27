/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: '#F8F7F3',
          alt: '#F0EEE6',
          subtle: '#E7E4D8',
        },
        forest: {
          DEFAULT: '#102B24',
          dark: '#0B1E19',
          card: '#15362E',
          hover: '#194035',
          light: '#235749',
        },
        coral: {
          DEFAULT: '#F15B43',
          hover: '#DE4A32',
          light: '#FEF2F0',
          badge: '#FEE6E2',
        },
        sage: {
          DEFAULT: '#059669',
          light: '#ECFDF5',
          dark: '#047857',
        },
        amber: {
          DEFAULT: '#D97706',
          light: '#FEF3C7',
          dark: '#B45309',
        },
        ink: {
          DEFAULT: '#1F2937',
          muted: '#6B7280',
          light: '#9CA3AF',
        },
        cardborder: '#E5E2D9',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 4px rgba(16, 43, 36, 0.04)',
        'medium': '0 4px 16px rgba(16, 43, 36, 0.06)',
        'elevated': '0 10px 25px rgba(16, 43, 36, 0.08)',
      },
    },
  },
  plugins: [],
};
