/**
 * Страница «Мой вишлист» — подарочный список для шаринга.
 *
 * Показывает товары в вишлисте и ссылку, которой можно поделиться,
 * чтобы другие пользователи могли оплатить товары.
 */

import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { useShareableWishlistStore } from '../../store/shareableWishlistStore'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { PageLoader } from '../../components/Loader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Alert } from '../../components/ui/Alert'
import ProductCard from '../../components/ProductCard'

function WishlistPage() {
  const wishlist = useShareableWishlistStore((s) => s.wishlist)
  const isLoading = useShareableWishlistStore((s) => s.isLoading)
  const error = useShareableWishlistStore((s) => s.error)
  const fetchWishlist = useShareableWishlistStore((s) => s.fetchWishlist)
  const removeProduct = useShareableWishlistStore((s) => s.removeProduct)

  const success = useToastStore((s) => s.success)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetchWishlist()
  }, [fetchWishlist])

  const shareUrl = wishlist?.share_url
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}${wishlist.share_url}`
    : ''

  const handleCopyLink = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true)
      success('Ссылка скопирована в буфер обмена')
      setTimeout(() => setCopied(false), 2000)
    })
  }, [shareUrl, success])

  const items = wishlist?.items ?? []
  const hasItems = items.length > 0

  if (isLoading && !wishlist) {
    return <PageLoader />
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Мой вишлист</h1>
          <p className="text-gray-600">
            Добавляйте сюда товары и делитесь ссылкой — друзья смогут оплатить их вам в подарок.
          </p>
        </div>
        <Link
          to="/favorites"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-purple-600 text-white font-medium hover:from-orange-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg"
        >
          <Heart className="w-5 h-5" strokeWidth={2} />
          Избранное
        </Link>
      </div>

      {error && (
        <Alert variant="error" className="mb-6">
          {error}
        </Alert>
      )}

      {hasItems && (
        <div className="mb-8 p-4 bg-primary-50 border border-primary-200 rounded-2xl">
          <h2 className="font-semibold text-gray-800 mb-2">Ссылка для шаринга</h2>
          <p className="text-sm text-gray-600 mb-3">
            Отправьте эту ссылку друзьям или родственникам — они смогут открыть список и добавить товары в корзину для оплаты.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-gray-200 bg-white text-gray-700 text-sm"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-xl font-medium transition-colors ${
                copied
                  ? 'bg-green-100 text-green-800'
                  : 'bg-primary-600 text-white hover:bg-primary-700'
              }`}
            >
              {copied ? 'Скопировано' : 'Копировать ссылку'}
            </button>
          </div>
        </div>
      )}

      {!hasItems && !isLoading && (
        <EmptyState
          icon="🎁"
          title="Вишлист пуст"
          description="Добавляйте товары с карточки в магазине кнопкой с подарком — затем делитесь ссылкой, чтобы другие могли их оплатить."
          action={
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              В магазин
            </Link>
          }
        />
      )}

      {hasItems && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Товары в списке ({items.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <ProductCard product={item.product} />
                <button
                  type="button"
                  onClick={() => removeProduct(item.product.id)}
                  className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/90 text-gray-500 hover:text-red-600 hover:bg-red-50 flex items-center justify-center text-sm shadow-sm"
                  aria-label="Удалить из вишлиста"
                  title="Удалить из вишлиста"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default WishlistPage
