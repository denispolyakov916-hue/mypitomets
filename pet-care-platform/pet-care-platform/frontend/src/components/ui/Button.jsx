/**
 * Универсальный компонент кнопки
 * 
 * Поддерживает различные варианты, размеры и состояния.
 * Включает поддержку доступности (a11y).
 * 
 * @example
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Нажми меня
 * </Button>
 * 
 * <Button variant="outline" isLoading>
 *   Загрузка...
 * </Button>
 * 
 * <Button as={Link} to="/shop" variant="ghost">
 *   Перейти в магазин
 * </Button>
 */

import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'

/** Единая анимация кнопок: лёгкое увеличение при наведении, прожатие при нажатии */
const buttonMotion = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.98 },
  transition: { type: 'spring', stiffness: 400, damping: 17 },
}

/**
 * Спиннер загрузки для кнопки
 */
const ButtonSpinner = ({ className = '' }) => (
  <svg
    className={`animate-spin h-4 w-4 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

/**
 * Стили вариантов кнопки
 */
/* Стили как на лендинге: primary — фиолетовый, warning — оранжевый CTA */
const variants = {
  primary: `
    bg-primary-600 text-white 
    hover:bg-primary-700 
    focus:ring-primary-400
    disabled:bg-primary-300
    shadow-md hover:shadow-lg
  `,
  secondary: `
    bg-[#F5F5F5] text-primary-800 
    hover:bg-primary-100 border border-primary-200
    focus:ring-primary-400
    disabled:bg-gray-100 disabled:text-gray-400
  `,
  outline: `
    border-2 border-primary-600 text-primary-600 bg-transparent
    hover:bg-primary-50 
    focus:ring-primary-400
    disabled:border-gray-300 disabled:text-gray-400
  `,
  ghost: `
    text-primary-700 bg-transparent
    hover:bg-primary-50 
    focus:ring-primary-400
    disabled:text-gray-400
  `,
  danger: `
    bg-red-600 text-white 
    hover:bg-red-700 
    focus:ring-red-500
    disabled:bg-red-300
  `,
  success: `
    bg-green-600 text-white 
    hover:bg-green-700 
    focus:ring-green-500
    disabled:bg-green-300
  `,
  warning: `
    bg-accent-400 text-primary-800 
    hover:bg-accent-300 
    focus:ring-accent-300
    disabled:bg-accent-200
    shadow-md hover:shadow-lg font-semibold
  `,
  orange: `
    bg-secondary-500 text-white
    hover:bg-secondary-600
    focus:ring-secondary-400
    disabled:bg-secondary-300
    shadow-md hover:shadow-lg
  `,
  link: `
    text-primary-600 bg-transparent underline-offset-4
    hover:underline hover:text-primary-700
    focus:ring-primary-400
    disabled:text-gray-400
  `,
}

/**
 * Стили размеров кнопки
 */
const sizes = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
  xl: 'px-6 py-3 text-lg gap-2.5',
}

/**
 * Компонент Button
 */
const Button = forwardRef(({
  children,
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  to,
  href,
  isLoading = false,
  isDisabled = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  rounded = 'xl',
  className = '',
  type = 'button',
  onClick,
  ...props
}, ref) => {
  // Определяем компонент для рендера
  let RenderComponent = Component
  const componentProps = { ...props }
  
  if (to) {
    RenderComponent = Link
    componentProps.to = to
  } else if (href) {
    RenderComponent = 'a'
    componentProps.href = href
  }

  const MotionTag = RenderComponent === Link ? motion(Link) : RenderComponent === 'a' ? motion.a : motion.button
  const isButtonDisabled = isDisabled || isLoading
  const motionProps = isButtonDisabled ? {} : buttonMotion
  
  // Оранжевые кнопки (warning) — скругление как у фиолетовых тегов (pill)
  const effectiveRounded = variant === 'warning' ? 'full' : rounded
  const roundedClasses = { none: 'rounded-none', sm: 'rounded-sm', md: 'rounded-md', lg: 'rounded-lg', xl: 'rounded-xl', '2xl': 'rounded-2xl', full: 'rounded-full' }
  // Базовые классы
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium
    transition-[color,background-color,border-color,box-shadow] duration-300 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:cursor-not-allowed
    ${roundedClasses[effectiveRounded] ?? 'rounded-xl'}
    ${fullWidth ? 'w-full' : ''}
    ${variants[variant] || variants.primary}
    ${sizes[size] || sizes.md}
    ${className}
  `.trim().replace(/\s+/g, ' ')
  
  // Определяем props для кнопки
  const buttonProps = RenderComponent === 'button' ? {
    type,
    disabled: isButtonDisabled,
    'aria-disabled': isButtonDisabled,
    'aria-busy': isLoading,
  } : {
    'aria-disabled': isButtonDisabled,
    role: 'button',
    tabIndex: isButtonDisabled ? -1 : 0,
  }
  
  return (
    <MotionTag
      ref={ref}
      className={baseClasses}
      onClick={isButtonDisabled ? undefined : onClick}
      {...motionProps}
      {...buttonProps}
      {...componentProps}
    >
      {/* Левая иконка или спиннер */}
      {isLoading ? (
        <ButtonSpinner className="-ml-1" />
      ) : leftIcon ? (
        <span className="flex-shrink-0" aria-hidden="true">
          {leftIcon}
        </span>
      ) : null}
      
      {/* Контент */}
      {children && (
        <span className={isLoading ? 'opacity-70' : ''}>
          {children}
        </span>
      )}
      
      {/* Правая иконка */}
      {rightIcon && !isLoading && (
        <span className="flex-shrink-0" aria-hidden="true">
          {rightIcon}
        </span>
      )}
    </MotionTag>
  )
})

Button.displayName = 'Button'

// Экспортируем Button как именованный экспорт
export { Button }

/**
 * Группа кнопок
 */
export const ButtonGroup = ({
  children,
  className = '',
  orientation = 'horizontal',
  spacing = 'sm',
}) => {
  const spacingClasses = {
    none: '',
    xs: orientation === 'horizontal' ? 'gap-1' : 'gap-1',
    sm: orientation === 'horizontal' ? 'gap-2' : 'gap-2',
    md: orientation === 'horizontal' ? 'gap-3' : 'gap-3',
    lg: orientation === 'horizontal' ? 'gap-4' : 'gap-4',
  }
  
  return (
    <div
      className={`
        flex
        ${orientation === 'horizontal' ? 'flex-row flex-wrap' : 'flex-col'}
        ${spacingClasses[spacing] || spacingClasses.sm}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      role="group"
    >
      {children}
    </div>
  )
}

/**
 * Кнопка-иконка
 */
export const IconButton = forwardRef(({
  icon,
  'aria-label': ariaLabel,
  size = 'md',
  ...props
}, ref) => {
  const iconSizes = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3',
  }
  
  return (
    <Button
      ref={ref}
      size={size}
      className={`!px-0 !py-0 ${iconSizes[size] || iconSizes.md}`}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </Button>
  )
})

IconButton.displayName = 'IconButton'

export default Button

