/**
 * Виджет быстрых счетчиков в хедере: Заказы, Избранное, Корзина
 * - Связь с бэкендом: заказы (история заказов) и корзина
 * - Локальное состояние: избранное (zustand)
 * - Периодическое обновление для актуальности бейджей
 * - Централизованная загрузка данных для предотвращения дублирования
 */

import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { getOrders } from '../api/shop'
import { useCartStore } from '../store/cartStore'
import { useFavoritesStore } from '../store/favoritesStore'
import { apiCache } from '../utils/apiCache'

// Иконка Заказы (коробка/накладная)
const OrdersIcon = ({ className = '' }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M3 7l9-4 9 4" />
		<path d="M21 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7" />
		<path d="M3 7l9 5 9-5" />
	</svg>
)

// Иконка Избранное (свой вариант сердца)
const HeartIcon = ({ className = '' }) => (
	<svg
		viewBox="0 0 24 24"
		fill="currentColor"
		className={className}
	>
		<path d="M12.001 20.727c-.292 0-.584-.094-.829-.281-2.596-1.961-4.594-3.684-6.03-5.265C2.55 12.488 1.5 10.84 1.5 9.047 1.5 6.5 3.55 4.5 6.05 4.5c1.272 0 2.468.48 3.351 1.352l.599.593.599-.593A4.72 4.72 0 0 1 14.95 4.5c2.5 0 4.55 2 4.55 4.547 0 1.793-1.05 3.441-3.643 6.134-1.437 1.581-3.436 3.304-6.033 5.265a1.23 1.23 0 0 1-.823.281z" />
	</svg>
)

// Иконка Корзина (минималистичная)
const CartIcon = ({ className = '' }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<circle cx="9" cy="20" r="1.8" />
		<circle cx="17" cy="20" r="1.8" />
		<path d="M3 4h2l2.2 10.5a2 2 0 0 0 2 1.5h7.8a2 2 0 0 0 2-1.5L21 8H7" />
	</svg>
)

function CounterBadge({ value, dark }) {
	if (!value || value <= 0) return null
	const text = value > 99 ? '99+' : value
	return (
		<span className={`absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] px-1 text-white text-[11px] leading-[20px] rounded-full font-semibold text-center shadow-md ${dark ? 'bg-red-500' : 'bg-pink-500'}`}>
			{text}
		</span>
	)
}

export default function HeaderCounters({ variant = 'light', compact = false }) {
	const location = useLocation()
	const dark = variant === 'dark'

	// Корзина
	const itemsCount = useCartStore(s => s.itemsCount)
	const refreshCartCount = useCartStore(s => s.refreshCount)

	// Избранное (реактивно через длины массивов)
	const favProductsLen = useFavoritesStore(s => s.products.length)
	const favCoursesLen = useFavoritesStore(s => s.courses.length)
	const favoritesCount = favProductsLen + favCoursesLen

	// Заказы (неоплаченные)
	const [pendingCount, setPendingCount] = useState(0)
	const hasInitialized = useRef(false)

	useEffect(() => {
		let mounted = true

		const loadOrders = async () => {
			try {
				// Используем глобальное кэширование с TTL 30 секунд
				const data = await apiCache.get('orders-history', getOrders, 30000)
				// считаем только ожидающие оплаты
				const count = (data.orders || []).reduce((acc, o) => acc + (o.status === 'pending' ? 1 : 0), 0)
				if (mounted) setPendingCount(count)
			} catch {
				if (mounted) setPendingCount(0)
			}
		}

		const load = async () => {
			// Корзина: быстрый рефреш количества (уже имеет защиту от дублирования в store)
			try {
				await refreshCartCount()
			} catch {}

			await loadOrders()
		}

		load()
		hasInitialized.current = true

		// Увеличиваем интервал обновления до 2 минут (было 1 минута)
		const interval = setInterval(load, 120000)
		return () => {
			mounted = false
			clearInterval(interval)
		}
	}, [refreshCartCount])

	// Активное состояние для подписи
	const isActive = useMemo(() => (path) => {
		return location.pathname === path || location.pathname.startsWith(path + '/')
	}, [location.pathname])

	const itemClass = dark
		? 'group relative flex flex-col items-center gap-1 px-2 py-1 text-white/80 hover:text-white transition-colors'
		: 'group relative flex flex-col items-center gap-1 px-2 py-1 text-slate-700 hover:text-slate-900 transition-colors'
	const itemClassCompact = dark
		? 'relative p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10'
		: 'relative p-2 text-slate-700 hover:text-slate-900 transition-colors rounded-full'
	const iconClass = dark
		? 'w-6 h-6 text-white group-hover:text-white transition-colors'
		: 'w-6 h-6 text-slate-700 group-hover:text-slate-900 transition-colors'
	const iconClassCompact = 'w-5 h-5 text-white'
	const labelClass = 'text-[12px] leading-none'

	if (compact) {
		return (
			<div className="flex items-center gap-2">
				<Link to="/orders" className={itemClassCompact} aria-label="Заказы">
					<div className="relative">
						<OrdersIcon className={iconClassCompact} />
						<CounterBadge value={pendingCount} dark={dark} />
					</div>
				</Link>
				<Link to="/favorites" className={itemClassCompact} aria-label="Избранное">
					<div className="relative">
						<HeartIcon className={iconClassCompact} />
						<CounterBadge value={favoritesCount} dark={dark} />
					</div>
				</Link>
				<Link to="/cart" className={itemClassCompact} aria-label="Корзина">
					<div className="relative">
						<CartIcon className={iconClassCompact} />
						<CounterBadge value={itemsCount} dark={dark} />
					</div>
				</Link>
			</div>
		)
	}

	return (
		<div className="flex items-end gap-6">
			<Link to="/orders" className={itemClass} aria-label="Заказы">
				<div className="relative">
					<OrdersIcon className={iconClass} />
					<CounterBadge value={pendingCount} dark={dark} />
				</div>
				<span className={`${labelClass} ${isActive('/orders') ? 'font-semibold' : ''}`}>Заказы</span>
			</Link>

			<Link to="/favorites" className={itemClass} aria-label="Избранное">
				<div className="relative">
					<HeartIcon className={iconClass} />
					<CounterBadge value={favoritesCount} dark={dark} />
				</div>
				<span className={`${labelClass} ${isActive('/favorites') ? 'font-semibold' : ''}`}>Избранное</span>
			</Link>

			<Link to="/cart" className={itemClass} aria-label="Корзина">
				<div className="relative">
					<CartIcon className={iconClass} />
					<CounterBadge value={itemsCount} dark={dark} />
				</div>
				<span className={`${labelClass} ${isActive('/cart') ? 'font-semibold' : ''}`}>Корзина</span>
			</Link>
		</div>
	)
}


