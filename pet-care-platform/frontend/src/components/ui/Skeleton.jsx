/**
 * Универсальные скелетон-компоненты для состояний загрузки
 *
 * @example
 * <Skeleton className="h-4 w-3/4" />
 * <Skeleton variant="circle" className="w-12 h-12" />
 * <SkeletonCard />
 * <SkeletonText lines={3} />
 */

import { forwardRef } from 'react'

const Skeleton = forwardRef(({
  variant = 'rect',
  className = '',
  ...props
}, ref) => {
  const variantClasses = {
    rect: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-4 w-full',
  }

  return (
    <div
      ref={ref}
      className={`animate-pulse bg-gray-200 ${variantClasses[variant] || variantClasses.rect} ${className}`}
      aria-hidden="true"
      {...props}
    />
  )
})

Skeleton.displayName = 'Skeleton'

export { Skeleton }

/**
 * Группа скелетон-строк текста
 */
export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        className={i === lines - 1 ? 'w-2/3' : 'w-full'}
      />
    ))}
  </div>
)

SkeletonText.displayName = 'SkeletonText'

/**
 * Скелетон карточки (изображение + текст + кнопка)
 */
export const SkeletonCard = ({ className = '' }) => (
  <div
    className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}
    aria-hidden="true"
  >
    <Skeleton className="aspect-video w-full rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-9 w-24 rounded-lg" />
      </div>
    </div>
  </div>
)

SkeletonCard.displayName = 'SkeletonCard'

/**
 * Скелетон-сетка из нескольких карточек
 */
export const SkeletonGrid = ({ count = 6, columns = 3, className = '' }) => (
  <div
    className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns} gap-4 ${className}`}
    aria-label="Загрузка..."
    role="status"
  >
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
)

SkeletonGrid.displayName = 'SkeletonGrid'

export default Skeleton
