/**
 * Вертикальная плашка у правого края экрана (только мобильные): избранное, вишлист, корзина.
 */

import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Heart, Gift, ShoppingCart } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useCartStore } from '../store/cartStore'
import { useFavoritesStore } from '../store/favoritesStore'
import { useShareableWishlistStore } from '../store/shareableWishlistStore'
import { mobileLiquidGlassSurfaceClass } from './mobileLiquidGlass'

function IconBadge({ value }) {
  if (!value || value <= 0) return null
  const text = value > 99 ? '99+' : value
  return (
    <span className="absolute -right-px -top-px flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-[2px] text-[8px] font-bold leading-none text-white">
      {text}
    </span>
  )
}

function RailButton({ to, label, icon: Icon, count, iconClassName }) {
  return (
    <Link
      to={to}
      className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 transition-colors hover:bg-white/45 active:scale-[0.95]"
      aria-label={label}
      title={label}
    >
      <Icon className={`h-[17px] w-[17px] ${iconClassName || ''}`} strokeWidth={1.65} aria-hidden />
      <IconBadge value={count} />
    </Link>
  )
}

function MobileRightActionsRail() {
  const location = useLocation()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const itemsCount = useCartStore((s) => s.itemsCount)
  const refreshCount = useCartStore((s) => s.refreshCount)
  const favProductsLen = useFavoritesStore((s) => s.products.length)
  const favCoursesLen = useFavoritesStore((s) => s.courses.length)
  const favoritesCount = favProductsLen + favCoursesLen

  const wishlist = useShareableWishlistStore((s) => s.wishlist)
  const fetchWishlist = useShareableWishlistStore((s) => s.fetchWishlist)
  const wishlistItemsLen = wishlist?.items?.length ?? 0

  useEffect(() => {
    refreshCount()
  }, [location.pathname, refreshCount])

  useEffect(() => {
    if (isAuthenticated) fetchWishlist()
  }, [isAuthenticated, fetchWishlist])

  return (
    <aside
      className="md:hidden fixed right-0 top-1/2 z-[60000] flex -translate-y-1/2 flex-col pointer-events-auto isolate"
      aria-label="Быстрые действия"
    >
      <div
        className={`flex flex-col gap-px rounded-l-xl py-1 pl-1 pr-0.5 ${mobileLiquidGlassSurfaceClass}`}
      >
        <RailButton to="/favorites" label="Избранное" icon={Heart} count={favoritesCount} />
        <RailButton
          to="/favorites?view=wishlist"
          label="Вишлист"
          icon={Gift}
          count={wishlistItemsLen}
          iconClassName="text-amber-600"
        />
        <RailButton to="/cart" label="Корзина" icon={ShoppingCart} count={itemsCount} />
      </div>
    </aside>
  )
}

export default MobileRightActionsRail
