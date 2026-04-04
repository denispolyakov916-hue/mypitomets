/**
 * Компонент прогресс-бара
 * 
 * Отображает прогресс выполнения задачи.
 * Поддерживает различные варианты, размеры и анимации.
 * 
 * @example
 * <Progress value={75} />
 * <Progress value={50} variant="success" showLabel />
 * <Progress value={30} size="lg" animated />
 */

import { forwardRef } from 'react'

/**
 * Варианты цветов
 */
const variants = {
  primary: 'bg-primary-600',
  secondary: 'bg-gray-500',
  success: 'bg-green-500',
  warning: 'bg-secondary-500',
  danger: 'bg-red-500',
  info: 'bg-blue-500',
}

/**
 * Фоновые цвета трека
 */
const trackVariants = {
  primary: 'bg-primary-100',
  secondary: 'bg-gray-200',
  success: 'bg-green-100',
  warning: 'bg-secondary-100',
  danger: 'bg-red-100',
  info: 'bg-blue-100',
}

/**
 * Размеры
 */
const sizes = {
  xs: 'h-1',
  sm: 'h-2',
  md: 'h-3',
  lg: 'h-4',
  xl: 'h-6',
}

/**
 * Компонент Progress
 */
const Progress = forwardRef(({
  value = 0,
  max = 100,
  variant = 'primary',
  size = 'md',
  rounded = 'full',
  showLabel = false,
  labelPosition = 'right', // 'right' | 'inside' | 'top'
  animated = false,
  striped = false,
  className = '',
  'aria-label': ariaLabel,
  ...props
}, ref) => {
  // Вычисляем процент
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  // Определяем, можно ли показать лейбл внутри
  const canShowLabelInside = size === 'lg' || size === 'xl'
  const actualLabelPosition = labelPosition === 'inside' && !canShowLabelInside
    ? 'right'
    : labelPosition
  
  // Базовые классы трека
  const trackClasses = `
    w-full overflow-hidden
    rounded-${rounded}
    ${trackVariants[variant] || trackVariants.primary}
    ${sizes[size] || sizes.md}
  `.trim().replace(/\s+/g, ' ')
  
  // Классы заполнения
  const fillClasses = `
    h-full
    rounded-${rounded}
    transition-all duration-500 ease-out
    ${variants[variant] || variants.primary}
    ${animated ? 'animate-pulse-slow' : ''}
    ${striped ? 'bg-stripes' : ''}
  `.trim().replace(/\s+/g, ' ')
  
  // Лейбл
  const label = `${Math.round(percentage)}%`
  
  return (
    <div
      ref={ref}
      className={`${showLabel && actualLabelPosition === 'top' ? 'space-y-1' : ''} ${className}`}
      {...props}
    >
      {/* Лейбл сверху */}
      {showLabel && actualLabelPosition === 'top' && (
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Прогресс</span>
          <span className="font-medium text-gray-900">{label}</span>
        </div>
      )}
      
      {/* Контейнер прогресс-бара */}
      <div className={`flex items-center gap-3 ${showLabel && actualLabelPosition === 'right' ? '' : ''}`}>
        {/* Трек */}
        <div
          className={trackClasses}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={ariaLabel || `Прогресс: ${label}`}
        >
          {/* Заполнение */}
          <div
            className={fillClasses}
            style={{ width: `${percentage}%` }}
          >
            {/* Лейбл внутри */}
            {showLabel && actualLabelPosition === 'inside' && canShowLabelInside && (
              <span className="flex items-center justify-center h-full text-xs font-medium text-white">
                {percentage >= 10 && label}
              </span>
            )}
          </div>
        </div>
        
        {/* Лейбл справа */}
        {showLabel && actualLabelPosition === 'right' && (
          <span className="text-sm font-medium text-gray-700 min-w-[3rem] text-right">
            {label}
          </span>
        )}
      </div>
    </div>
  )
})

Progress.displayName = 'Progress'

// Экспортируем Progress как именованный экспорт
export { Progress }

/**
 * Компонент прогресса курса
 */
export const CourseProgress = ({
  completedLessons = 0,
  totalLessons = 1,
  completedPercent,
  showDetails = true,
  variant = 'primary',
  size = 'md',
  className = '',
}) => {
  // Используем переданный процент или вычисляем
  const percentage = completedPercent !== undefined
    ? completedPercent
    : Math.round((completedLessons / totalLessons) * 100)
  
  // Определяем вариант на основе прогресса
  const autoVariant = percentage === 100
    ? 'success'
    : percentage >= 50
      ? 'primary'
      : 'info'
  
  return (
    <div className={`space-y-2 ${className}`}>
      {showDetails && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {completedLessons} из {totalLessons} уроков
          </span>
          <span className={`font-medium ${percentage === 100 ? 'text-green-600' : 'text-gray-900'}`}>
            {percentage}%
            {percentage === 100 && ' ✓'}
          </span>
        </div>
      )}
      
      <Progress
        value={percentage}
        variant={variant === 'auto' ? autoVariant : variant}
        size={size}
        animated={percentage > 0 && percentage < 100}
      />
    </div>
  )
}

/**
 * Компонент кругового прогресса
 */
export const CircularProgress = ({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showLabel = true,
  strokeWidth,
  className = '',
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100))
  
  const sizes = {
    sm: { size: 32, stroke: 3 },
    md: { size: 48, stroke: 4 },
    lg: { size: 64, stroke: 5 },
    xl: { size: 96, stroke: 6 },
  }
  
  const config = sizes[size] || sizes.md
  const actualStroke = strokeWidth || config.stroke
  const svgSize = config.size
  const radius = (svgSize - actualStroke) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  
  const colors = {
    primary: 'text-primary-600',
    secondary: 'text-gray-500',
    success: 'text-green-500',
    warning: 'text-secondary-500',
    danger: 'text-red-500',
    info: 'text-blue-500',
  }
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={svgSize}
        height={svgSize}
        className="transform -rotate-90"
      >
        {/* Фоновый круг */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={actualStroke}
          className="text-gray-200"
        />
        {/* Прогресс */}
        <circle
          cx={svgSize / 2}
          cy={svgSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={actualStroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={`${colors[variant] || colors.primary} transition-all duration-500 ease-out`}
        />
      </svg>
      
      {/* Лейбл в центре */}
      {showLabel && (
        <span className={`
          absolute
          font-semibold
          ${size === 'sm' ? 'text-xs' : size === 'md' ? 'text-sm' : 'text-base'}
          text-gray-900
        `.trim().replace(/\s+/g, ' ')}>
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  )
}

export default Progress

