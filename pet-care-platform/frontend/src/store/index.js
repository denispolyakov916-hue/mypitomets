/**
 * Store Exports
 * 
 * Central export point for all Zustand stores.
 * Allows importing multiple stores from single location.
 * 
 * Usage:
 *   import { useAuthStore, useCartStore, useFavoritesStore, useToastStore } from './store'
 */

export { useAuthStore } from './authStore'
export { useCartStore } from './cartStore'
export { useFavoritesStore } from './favoritesStore'
export { useToastStore } from './toastStore'
// export { usePetStore } from './petStore' // УДАЛЕН - не используется

// Базовые утилиты для stores
export * from './baseStore'

