/**
 * BrandCard — брендовая карточка: большое скругление (24px), мягкая фиолетовая тень.
 */
import { forwardRef } from 'react'

const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }
const variants = {
  default: 'bg-white border border-primary-100/60 shadow-card',
  elevated: 'bg-white shadow-brand-lg',
  soft: 'bg-milk border border-primary-100/50',
  ghost: 'bg-transparent',
}

const BrandCard = forwardRef(function BrandCard(
  { as: Comp = 'div', variant = 'default', padding = 'md', hoverable = false, clickable = false, className = '', children, ...rest },
  ref,
) {
  const base = 'rounded-3xl transition-all duration-300'
  const lift = hoverable || clickable ? 'hover:-translate-y-1.5 hover:shadow-brand-lg' : ''
  const click = clickable ? 'cursor-pointer active:scale-[0.99]' : ''
  const cls = [base, variants[variant] || variants.default, paddings[padding] ?? paddings.md, lift, click, className].join(' ')
  return (
    <Comp ref={ref} className={cls} {...rest}>
      {children}
    </Comp>
  )
})

export default BrandCard
