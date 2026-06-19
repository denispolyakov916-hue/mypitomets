/**
 * BrandBadge — брендовый бейдж/таблетка статуса.
 */
const variants = {
  purple: 'bg-primary-700 text-white',
  gold: 'bg-gold-400 text-primary-800',
  soft: 'bg-primary-100 text-primary-700',
  violet: 'bg-violet-100 text-violet-700',
  success: 'bg-green-100 text-green-700',
  danger: 'bg-red-100 text-red-600',
  info: 'bg-violet-100 text-violet-700',
  neutral: 'bg-gray-100 text-gray-600',
}
const sizes = { sm: 'text-xs px-2 py-0.5', md: 'text-sm px-3 py-1' }

export default function BrandBadge({ variant = 'soft', size = 'md', className = '', children, ...rest }) {
  return (
    <span className={['inline-flex items-center font-medium rounded-full whitespace-nowrap', sizes[size] || sizes.md, variants[variant] || variants.soft, className].join(' ')} {...rest}>
      {children}
    </span>
  )
}
