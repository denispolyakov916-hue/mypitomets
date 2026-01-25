/**
 * Конфигурация Tailwind CSS для Питомец+
 * 
 * Кастомная тема включает:
 * - Брендовые цвета для платформы ухода за питомцами
 * - Расширенные отступы и размеры
 * - Кастомные шрифты
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Брендовые цвета
      colors: {
        primary: {
          50: '#faf5ff',   // light purple
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7', // Основной primary цвет - фиолетовый
          600: '#9333ea',
          700: '#7c3aed', // основной фиолетовый из внешнего проекта
          800: '#6b21a8',
          900: '#581c87',
        },
        secondary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e', // Основной secondary цвет
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        accent: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // Оранжевый из внешнего проекта
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7c3aed', // основной фиолетовый
          800: '#6b21a8',
          900: '#581c87',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316', // основной оранжевый
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        }
      },
      // Кастомное семейство шрифтов
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      // Кастомные анимации
      animation: {
        'fadeIn': 'fadeIn 0.3s ease-out',
        'fadeOut': 'fadeOut 0.2s ease-in',
        'slideUp': 'slideUp 0.3s ease-out',
        'slideDown': 'slideDown 0.3s ease-out',
        'slideLeft': 'slideLeft 0.3s ease-out',
        'slideRight': 'slideRight 0.3s ease-out',
        'scaleIn': 'scaleIn 0.2s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
        'slideUp-cubic': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slideDown-ease': 'slideDown 0.3s ease-out',
        'wiggle': 'wiggle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideLeft: {
          '0%': { opacity: '0', transform: 'translateX(10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideRight: {
          '0%': { opacity: '0', transform: 'translateX(-10px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-4px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(4px)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(-10deg)' },
          '50%': { transform: 'rotate(10deg)' },
          '75%': { transform: 'rotate(-10deg)' },
        },
        slideUpCubic: {
          '0%': { opacity: '0', transform: 'translateY(100px) scale(0.8)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        slideDownEase: {
          '0%': { opacity: '0', maxHeight: '0' },
          '100%': { opacity: '1', maxHeight: '2000px' },
        },
      },
      // Переходы
      transitionDuration: {
        '400': '400ms',
      },
    },
  },
  plugins: [],
}
