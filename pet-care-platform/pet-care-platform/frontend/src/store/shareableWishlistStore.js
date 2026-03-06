/**
 * Zustand store для вишлиста (подарочного списка для шаринга).
 *
 * Данные хранятся на сервере; store кэширует последнее состояние после fetch/add/remove.
 */

import { create } from 'zustand'
import { getMyWishlist, addToWishlist as apiAdd, removeFromWishlist as apiRemove } from '../api/shop'
import { handleStoreError } from './baseStore'

export const useShareableWishlistStore = create((set, get) => ({
  /** Текущие данные вишлиста с сервера: { id, name, share_token, share_url, items } */
  wishlist: null,
  isLoading: false,
  error: null,

  /**
   * Загрузить вишлист текущего пользователя с сервера.
   */
  fetchWishlist: async () => {
    set({ isLoading: true, error: null })
    try {
      const data = await getMyWishlist()
      set({ wishlist: data, isLoading: false, error: null })
      return data
    } catch (e) {
      handleStoreError(e, set, 'error')
      set({ isLoading: false })
      return null
    }
  },

  /**
   * Добавить товар в вишлист (API + обновление state).
   */
  addProduct: async (productId) => {
    set({ error: null })
    try {
      const res = await apiAdd(productId)
      const wishlist = res.data != null ? res.data : res
      set({ wishlist })
      return true
    } catch (e) {
      handleStoreError(e, set, 'error')
      return false
    }
  },

  /**
   * Удалить товар из вишлиста (API + обновление state).
   */
  removeProduct: async (productId) => {
    set({ error: null })
    try {
      const res = await apiRemove(productId)
      const wishlist = res.data != null ? res.data : res
      set({ wishlist })
      return true
    } catch (e) {
      handleStoreError(e, set, 'error')
      return false
    }
  },

  /**
   * Переключить товар в вишлисте: добавить, если нет, иначе удалить.
   * @returns {Promise<boolean>} true если товар добавлен, false если удалён
   */
  toggleProduct: async (productId) => {
    const inList = get().isInWishlist(productId)
    if (inList) {
      await get().removeProduct(productId)
      return false
    }
    await get().addProduct(productId)
    return true
  },

  /**
   * Проверить, есть ли товар в вишлисте (по кэшированным данным).
   */
  isInWishlist: (productId) => {
    const { wishlist } = get()
    if (!wishlist || !wishlist.items) return false
    return wishlist.items.some((item) => item.product && item.product.id === productId)
  },

  /** Сбросить вишлист при выходе. */
  reset: () => set({ wishlist: null, error: null }),
}))
