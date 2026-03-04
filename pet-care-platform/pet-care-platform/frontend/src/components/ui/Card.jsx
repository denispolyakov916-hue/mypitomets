/**
 * Универсальный компонент карточки
 * 
 * Предоставляет стилизованный контейнер с различными вариантами.
 * Поддерживает заголовок, футер и интерактивные состояния.
 * 
 * @example
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Заголовок</CardTitle>
 *   </CardHeader>
 *   <CardBody>
 *     Контент карточки
 *   </CardBody>
 *   <CardFooter>
 *     <Button>Действие</Button>
 *   </CardFooter>
 * </Card>
 */

import { forwardRef } from 'react'

/**
 * Стили вариантов карточки
 */
/* Тени и границы в стиле лендинга (primary #522f81) */
const variants = {
  default: 'bg-white border border-primary-200/50 shadow-sm',
  elevated: 'bg-white border border-primary-200/40 shadow-card',
  outline: 'bg-transparent border-2 border-primary-200',
  filled: 'bg-[#F5F5F5] border border-primary-200/50',
  ghost: 'bg-transparent',
}

/**
 * Стили padding карточки
 */
const paddings = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
  xl: 'p-8',
}

/**
 * Основной компонент Card
 */
const Card = forwardRef(({
  children,
  variant = 'default',
  padding = 'none',
  rounded = '2xl',
  hoverable = false,
  clickable = false,
  as: Component = 'div',
  className = '',
  onClick,
  ...props
}, ref) => {
  const baseClasses = `
    rounded-${rounded}
    ${variants[variant] || variants.default}
    ${paddings[padding] || ''}
    ${hoverable ? 'transition-shadow duration-200 hover:shadow-md' : ''}
    ${clickable ? 'cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.99]' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ')
  
  return (
    <Component
      ref={ref}
      className={baseClasses}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      {...props}
    >
      {children}
    </Component>
  )
})

Card.displayName = 'Card'

// Экспортируем Card как именованный экспорт
export { Card }

/**
 * Заголовок карточки
 */
export const CardHeader = forwardRef(({
  children,
  className = '',
  borderBottom = true,
  ...props
}, ref) => (
  <div
    ref={ref}
    className={`
      px-4 py-3 sm:px-6 sm:py-4
      ${borderBottom ? 'border-b border-primary-100' : ''}
      ${className}
    `.trim().replace(/\s+/g, ' ')}
    {...props}
  >
    {children}
  </div>
))

CardHeader.displayName = 'CardHeader'

/**
 * Заголовок-текст карточки
 */
export const CardTitle = forwardRef(({
  children,
  as: Component = 'h3',
  className = '',
  ...props
}, ref) => (
  <Component
    ref={ref}
    className={`text-lg font-semibold text-primary-800 ${className}`}
    {...props}
  >
    {children}
  </Component>
))

CardTitle.displayName = 'CardTitle'

/**
 * Подзаголовок карточки
 */
export const CardSubtitle = forwardRef(({
  children,
  className = '',
  ...props
}, ref) => (
  <p
    ref={ref}
    className={`text-sm text-primary-600/80 mt-1 ${className}`}
    {...props}
  >
    {children}
  </p>
))

CardSubtitle.displayName = 'CardSubtitle'

/**
 * Тело карточки
 */
export const CardBody = forwardRef(({
  children,
  className = '',
  padding = 'md',
  ...props
}, ref) => {
  const bodyPaddings = {
    none: '',
    sm: 'px-3 py-2',
    md: 'px-4 py-4 sm:px-6',
    lg: 'px-6 py-6',
  }
  
  return (
    <div
      ref={ref}
      className={`${bodyPaddings[padding] || bodyPaddings.md} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
})

CardBody.displayName = 'CardBody'

/**
 * Футер карточки
 */
export const CardFooter = forwardRef(({
  children,
  className = '',
  borderTop = true,
  justify = 'end',
  ...props
}, ref) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  }
  
  return (
    <div
      ref={ref}
      className={`
        px-4 py-3 sm:px-6 sm:py-4
        flex items-center gap-3 flex-wrap
        ${justifyClasses[justify] || justifyClasses.end}
        ${borderTop ? 'border-t border-primary-100' : ''}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {children}
    </div>
  )
})

CardFooter.displayName = 'CardFooter'

/**
 * Медиа-контейнер карточки (для изображений)
 */
export const CardMedia = forwardRef(({
  children,
  src,
  alt = '',
  aspectRatio = 'video',
  className = '',
  ...props
}, ref) => {
  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    portrait: 'aspect-[3/4]',
    wide: 'aspect-[2/1]',
  }
  
  return (
    <div
      ref={ref}
      className={`
        overflow-hidden
        ${aspectClasses[aspectRatio] || aspectClasses.video}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      {...props}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : children}
    </div>
  )
})

CardMedia.displayName = 'CardMedia'

export default Card

