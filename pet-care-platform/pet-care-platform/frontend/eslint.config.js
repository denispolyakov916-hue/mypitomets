// ============================================================
// ESLint flat config — фронтенд (React 18 + Vite, JSX)
// ============================================================
// Цель: не пропускать спагетти-код, мёртвые переменные, console-отладку,
// слишком длинные/сложные компоненты. Проверяет только src/.
// Правила проекта: ../.cursor/rules/frontend-*.mdc

import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    ignores: [
      'dist/**', 'build/**', 'node_modules/**', 'public/**',
      'coverage/**', '*.config.js', 'vite.config.js',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      // --- React ---
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules, // automatic runtime — import React не нужен
      'react/prop-types': 'off',             // проект не использует prop-types
      // --- Hooks (критично для корректности) ---
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // --- Отладочный мусор ---
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      // --- Мёртвый код ---
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-var': 'error',
      'prefer-const': 'error',
      'eqeqeq': ['error', 'smart'],
      // --- Анти-спагетти: ограничения сложности и размера ---
      'complexity': ['error', 15],
      'max-depth': ['error', 4],
      'max-lines': ['error', { max: 600, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 150, skipBlankLines: true, skipComments: true }],
      'max-nested-callbacks': ['error', 4],
      'max-params': ['error', 5],
      'no-nested-ternary': 'error',
    },
  },
  {
    // Тесты: послабления
    files: ['src/**/*.{test,spec}.{js,jsx}', 'src/**/__tests__/**'],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: {
      'max-lines-per-function': 'off',
      'max-lines': 'off',
      'no-console': 'off',
    },
  },
];
