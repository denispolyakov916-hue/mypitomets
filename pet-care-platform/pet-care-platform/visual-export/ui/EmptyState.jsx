/**
 * Компонент пустого состояния
 *
 * Отображает заглушку, когда данные отсутствуют.
 *
 * @example
 * <EmptyState
 *   icon="🛒"
 *   title="Корзина пуста"
 *   description="Добавьте товары из каталога"
 *   action={<Button to="/shop">Перейти в магазин</Button>}
 * />
 */

import { forwardRef } from 'react'

const EmptyState = forwardRef(({
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  size = 'md',
  className = '',
  ...props
}, ref) => {
  const sizes = {
    sm: { wrapper: 'py-8', icon: 'text-4xl mb-3', title: 'text-lg', desc: 'text-sm' },
    md: { wrapper: 'py-12', icon: 'text-5xl mb-4', title: 'text-xl', desc: 'text-base' },
    lg: { wrapper: 'py-16', icon: 'text-6xl mb-5', title: 'text-2xl', desc: 'text-lg' },
  }

  const s = sizes[size] || sizes.md

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center justify-center text-center px-4 ${s.wrapper} ${className}`}
      {...props}
    >
      {icon && (
        <div className={s.icon} aria-hidden="true">
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}

      {title && (
        <h3 className={`font-bold text-gray-900 ${s.title}`}>
          {title}
        </h3>
      )}

      {description && (
        <p className={`text-gray-500 mt-2 max-w-md ${s.desc}`}>
          {description}
        </p>
      )}

      {children}

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          {action}
          {secondaryAction}
        </div>
      )}
    </div>
  )
})

EmptyState.displayName = 'EmptyState'

export { EmptyState }
export default EmptyState
