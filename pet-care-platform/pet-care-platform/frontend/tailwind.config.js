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
      colors: {
        primary: {
          50: '#f6f0ff',
          100: '#ede0ff',
          200: '#d9bfff',
          300: '#C86BFA',
          400: '#a94fe0',
          500: '#8a38c2',
          600: '#6b2da1',
          700: '#522f81',
          800: '#3e2362',
          900: '#2b1845',
        },
        secondary: {
          50: '#fffdf5',
          100: '#fef8e0',
          200: '#F0EB93',
          300: '#f5d760',
          400: '#fbba2d',
          500: '#e5a41e',
          600: '#c08716',
          700: '#966810',
          800: '#6d4b0b',
          900: '#453007',
        },
        accent: {
          50: '#fffdf5',
          100: '#fef8e0',
          200: '#F0EB93',
          300: '#f5d760',
          400: '#fbba2d',
          500: '#e5a41e',
          600: '#c08716',
          700: '#966810',
          800: '#6d4b0b',
          900: '#453007',
        },
        violet: {
          50: '#f6f0ff',
          100: '#ede0ff',
          200: '#d9bfff',
          300: '#C86BFA',
          400: '#b555f0',
          500: '#a040e0',
          600: '#8a30c8',
          700: '#7028a8',
          800: '#522f81',
          900: '#3a1f60',
        },
        gold: {
          50: '#fffdf5',
          100: '#fef8e0',
          200: '#F0EB93',
          300: '#f5d760',
          400: '#fbba2d',
          500: '#e5a41e',
          600: '#c08716',
          700: '#966810',
          800: '#6d4b0b',
          900: '#453007',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
      // Кастомное семейство шрифтов — как на лендинге
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
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
        'letterFadeIn': 'letterFadeIn 0.4s ease-out forwards',
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
        letterFadeIn: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
      // Тени в стиле лендинга (primary #522f81)
      boxShadow: {
        'card': '0 4px 20px rgba(82, 47, 129, 0.08)',
        'card-hover': '0 8px 28px rgba(82, 47, 129, 0.12)',
      },
    },
  },
  plugins: [],
}
