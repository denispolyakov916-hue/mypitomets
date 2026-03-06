/**
 * Виджет быстрых счетчиков в хедере: Уведомления, Избранное, Корзина
 * - Связь с бэкендом: корзина
 * - Локальное состояние: избранное (zustand)
 * - Периодическое обновление для актуальности бейджей
 */

import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCartStore } from '../store/cartStore'
import { useFavoritesStore } from '../store/favoritesStore'

// Иконка Уведомления (конверт)
const NotificationsIcon = ({ className = '' }) => (
	<svg
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="1.8"
		strokeLinecap="round"
		strokeLinejoin="round"
		className={className}
	>
		<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
		<polyline points="22,6 12,13 2,6" />
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
		<span className={`absolute -top-4 left-[calc(50%+10px)] -translate-x-1/2 min-w-[20px] h-[20px] px-1 text-white text-[11px] leading-[20px] rounded-full font-semibold text-center shadow-md flex items-center justify-center ${dark ? 'bg-red-500' : 'bg-pink-500'}`}>
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

	// Уведомления (пока заглушка — счётчик можно подключить к API позже)
	const [notificationsCount] = useState(0)
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const notificationsRef = useRef(null)

	// Закрытие выпадающего блока уведомлений по клику снаружи
	useEffect(() => {
		if (!notificationsOpen) return
		const handleClickOutside = (e) => {
			if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
				setNotificationsOpen(false)
			}
		}
		document.addEventListener('click', handleClickOutside)
		return () => document.removeEventListener('click', handleClickOutside)
	}, [notificationsOpen])

	useEffect(() => {
		let mounted = true
		const load = async () => {
			try {
				await refreshCartCount()
			} catch {}
		}
		load()
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
				<div className="relative" ref={notificationsRef}>
					<button
						type="button"
						onClick={() => setNotificationsOpen((v) => !v)}
						className={itemClassCompact}
						aria-label="Уведомления"
						aria-expanded={notificationsOpen}
					>
						<div className="relative">
							<NotificationsIcon className={iconClassCompact} />
							<CounterBadge value={notificationsCount} dark={dark} />
						</div>
					</button>
					{notificationsOpen && (
						<div
							className={`absolute right-0 top-full mt-2 w-72 rounded-xl border shadow-lg z-50 ${
								dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
							}`}
							role="dialog"
							aria-label="Окно уведомлений"
						>
							<div className={`p-4 text-center ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
								<p className="font-medium">Пока нет уведомлений</p>
								<p className="text-sm mt-1 opacity-80">Здесь будут отображаться ваши уведомления</p>
							</div>
						</div>
					)}
				</div>
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
			<div className="relative flex flex-col items-center gap-1" ref={notificationsRef}>
				<button
					type="button"
					onClick={() => setNotificationsOpen((v) => !v)}
					className={itemClass}
					aria-label="Уведомления"
					aria-expanded={notificationsOpen}
				>
					<div className="relative">
						<NotificationsIcon className={iconClass} />
						<CounterBadge value={notificationsCount} dark={dark} />
					</div>
					<span className={`${labelClass} ${notificationsOpen ? 'font-semibold' : ''}`}>Уведомления</span>
				</button>
				{notificationsOpen && (
					<div
						className={`absolute left-1/2 top-full mt-2 w-72 -translate-x-1/2 rounded-xl border shadow-lg z-50 ${
							dark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
						}`}
						role="dialog"
						aria-label="Окно уведомлений"
					>
						<div className={`p-4 text-center ${dark ? 'text-slate-300' : 'text-slate-600'}`}>
							<p className="font-medium">Пока нет уведомлений</p>
							<p className="text-sm mt-1 opacity-80">Здесь будут отображаться ваши уведомления</p>
						</div>
					</div>
				)}
			</div>

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


