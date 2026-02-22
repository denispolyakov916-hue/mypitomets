/**
 * Компонент Badge (значок/бейдж)
 * 
 * Используется для отображения статусов, меток и счётчиков.
 * 
 * @example
 * <Badge variant="success">Активен</Badge>
 * <Badge variant="warning" size="lg">Ожидание</Badge>
 * <Badge dot variant="danger">Новый</Badge>
 */

import { forwardRef } from 'react'

/**
 * Варианты цветов
 */
const variants = {
  default: 'bg-gray-100 text-gray-800',
  primary: 'bg-primary-100 text-primary-800',
  secondary: 'bg-gray-100 text-gray-600',
  success: 'bg-green-100 text-green-800',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  purple: 'bg-primary-100 text-primary-800',
}

/**
 * Варианты с заливкой (solid)
 */
const solidVariants = {
  default: 'bg-gray-500 text-white',
  primary: 'bg-primary-600 text-white',
  secondary: 'bg-gray-500 text-white',
  success: 'bg-green-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-600 text-white',
  info: 'bg-blue-600 text-white',
  purple: 'bg-primary-600 text-white',
}

/**
 * Варианты с обводкой (outline)
 */
const outlineVariants = {
  default: 'border border-gray-300 text-gray-700 bg-transparent',
  primary: 'border border-primary-300 text-primary-700 bg-transparent',
  secondary: 'border border-gray-300 text-gray-600 bg-transparent',
  success: 'border border-green-300 text-green-700 bg-transparent',
  warning: 'border border-amber-300 text-amber-700 bg-transparent',
  danger: 'border border-red-300 text-red-700 bg-transparent',
  info: 'border border-blue-300 text-blue-700 bg-transparent',
  purple: 'border border-primary-300 text-primary-700 bg-transparent',
}

/**
 * Размеры
 */
const sizes = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-sm',
}

/**
 * Цвета точки
 */
const dotColors = {
  default: 'bg-gray-500',
  primary: 'bg-primary-600',
  secondary: 'bg-gray-400',
  success: 'bg-green-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
  purple: 'bg-primary-500',
}

/**
 * Компонент Badge
 */
const Badge = forwardRef(({
  children,
  variant = 'default',
  size = 'sm',
  appearance = 'subtle', // 'subtle' | 'solid' | 'outline'
  rounded = 'full',
  dot = false,
  removable = false,
  onRemove,
  className = '',
  ...props
}, ref) => {
  // Выбираем стили в зависимости от appearance
  const variantStyles = appearance === 'solid'
    ? solidVariants
    : appearance === 'outline'
      ? outlineVariants
      : variants
  
  const baseClasses = `
    inline-flex items-center font-medium
    rounded-${rounded}
    ${sizes[size] || sizes.sm}
    ${variantStyles[variant] || variantStyles.default}
    ${className}
  `.trim().replace(/\s+/g, ' ')
  
  return (
    <span ref={ref} className={baseClasses} {...props}>
      {/* Точка индикатор */}
      {dot && (
        <span
          className={`
            w-1.5 h-1.5 rounded-full mr-1.5
            ${dotColors[variant] || dotColors.default}
          `.trim().replace(/\s+/g, ' ')}
          aria-hidden="true"
        />
      )}
      
      {/* Контент */}
      {children}
      
      {/* Кнопка удаления */}
      {removable && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 -mr-0.5 p-0.5 rounded-full hover:bg-black/10 transition-colors focus:outline-none"
          aria-label="Удалить"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </span>
  )
})

Badge.displayName = 'Badge'

// Экспортируем Badge как именованный экспорт
export { Badge }

/**
 * Компонент StatusBadge для отображения статусов
 */
export const StatusBadge = ({ status, labels = {}, ...props }) => {
  const statusConfig = {
    // Заказы
    pending: { variant: 'warning', label: 'Ожидает' },
    processing: { variant: 'info', label: 'В обработке' },
    partially_delivered: { variant: 'purple', label: 'Частично доставлен' },
    shipped: { variant: 'purple', label: 'Отправлен' },
    delivered: { variant: 'success', label: 'Доставлен' },
    cancelled: { variant: 'default', label: 'Отменён' },
    expired: { variant: 'danger', label: 'Истёк' },
    
    // Возвраты
    requested: { variant: 'warning', label: 'Запрошен' },
    approved: { variant: 'info', label: 'Одобрен' },
    rejected: { variant: 'danger', label: 'Отклонён' },
    received: { variant: 'purple', label: 'Получен' },
    refunded: { variant: 'success', label: 'Возвращён' },
    
    // Курсы
    active: { variant: 'success', label: 'Активен' },
    inactive: { variant: 'default', label: 'Неактивен' },
    completed: { variant: 'success', label: 'Завершён' },
    in_progress: { variant: 'info', label: 'В процессе' },
    
    // Общие
    new: { variant: 'primary', label: 'Новый' },
    draft: { variant: 'default', label: 'Черновик' },
    published: { variant: 'success', label: 'Опубликован' },
  }
  
  const config = statusConfig[status] || { variant: 'default', label: status }
  const label = labels[status] || config.label
  
  return (
    <Badge variant={config.variant} dot {...props}>
      {label}
    </Badge>
  )
}

/**
 * Компонент CountBadge для отображения счётчиков
 */
export const CountBadge = ({
  count,
  max = 99,
  showZero = false,
  variant = 'danger',
  size = 'xs',
  ...props
}) => {
  if (count === 0 && !showZero) return null
  
  const displayCount = count > max ? `${max}+` : count
  
  return (
    <Badge
      variant={variant}
      size={size}
      appearance="solid"
      className="min-w-[1.25rem] justify-center"
      {...props}
    >
      {displayCount}
    </Badge>
  )
}

// Default экспорт для обратной совместимости
export default Badge

