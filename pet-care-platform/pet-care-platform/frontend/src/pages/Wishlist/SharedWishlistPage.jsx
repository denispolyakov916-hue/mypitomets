/**
 * Публичная страница вишлиста по ссылке.
 *
 * Открывается по ссылке вида /wishlist/shared/:token.
 * Показывает список товаров владельца вишлиста; можно добавить в корзину и оплатить.
 */

import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getSharedWishlist } from '../../api/shop'
import { useCartStore } from '../../store/cartStore'
import { useToastStore } from '../../store/toastStore'
import { PageLoader } from '../../components/Loader'
import { EmptyState } from '../../components/ui/EmptyState'
import { Alert } from '../../components/ui/Alert'
import ProductCard from '../../components/ProductCard'

function SharedWishlistPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const addItem = useCartStore((s) => s.addItem)
  const success = useToastStore((s) => s.success)

  useEffect(() => {
    if (!token) {
      setError('Ссылка на вишлист не указана')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    getSharedWishlist(token)
      .then((res) => {
        if (!cancelled) {
          setData(res)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.data?.error || 'Вишлист не найден или ссылка устарела')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [token])

  const handleAddAllToCart = async () => {
    if (!data?.items?.length) return
    for (const item of data.items) {
      if (item.product?.id) {
        await addItem(item.product.id, 1)
      }
    }
    success(`В корзину добавлено товаров: ${data.items.length}`)
    navigate('/cart')
  }

  if (loading) return <PageLoader />
  if (error || !data) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <EmptyState
          icon="🎁"
          title="Вишлист не найден"
          description={error || 'Ссылка могла устареть или быть неверной.'}
          action={
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700"
            >
              В магазин
            </Link>
          }
        />
      </div>
    )
  }

  const items = data.items ?? []
  const ownerName = data.owner_name || 'Пользователь'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Вишлист: {data.name || 'Подарочный список'}
        </h1>
        <p className="text-gray-600 mt-1">
          Список подарков от {ownerName}. Вы можете добавить товары в корзину и оплатить их.
        </p>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="В списке пока нет товаров"
          description="Владелец вишлиста ещё не добавил сюда товары."
          action={
            <Link
              to="/shop"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700"
            >
              В магазин
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <button
              type="button"
              onClick={handleAddAllToCart}
              className="px-4 py-2 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors"
            >
              Добавить всё в корзину
            </button>
            <Link
              to="/cart"
              className="px-4 py-2 rounded-xl border border-primary-600 text-primary-600 font-medium hover:bg-primary-50 transition-colors"
            >
              Перейти в корзину
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => (
              <ProductCard key={item.id} product={item.product} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default SharedWishlistPage
