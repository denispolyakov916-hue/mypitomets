/**
 * BrandButton — брендовая кнопка «Питомец Плюс».
 * Эталон pitometsplus.ru: pill-форма, золотой CTA со свечением, глубокий фиолетовый.
 */
import { forwardRef } from 'react'

const sizes = {
  sm: 'px-4 py-2 text-sm gap-1.5',
  md: 'px-6 py-2.5 text-base gap-2',
  lg: 'px-8 py-4 text-lg gap-2.5',
}

const variants = {
  primary: 'bg-gold-400 text-primary-800 shadow-gold-glow hover:shadow-gold-glow-lg hover:brightness-105 focus-visible:ring-gold-300/60',
  secondary: 'bg-primary-700 text-white shadow-card hover:bg-primary-800 hover:shadow-card-hover focus-visible:ring-primary-300/60',
  outline: 'border-2 border-primary-300 text-primary-700 bg-transparent hover:bg-primary-50 focus-visible:ring-primary-300/50',
  ghost: 'text-primary-700 bg-transparent hover:bg-primary-50 focus-visible:ring-primary-200/50',
  link: 'text-violet-500 bg-transparent underline-offset-4 hover:underline !px-0 !py-0 !shadow-none focus-visible:ring-0',
}

const BASE = 'inline-flex items-center justify-center font-heading font-semibold rounded-full transition-all duration-200 outline-none focus-visible:ring-4 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'

function buttonClasses({ variant, size, fullWidth, className }) {
  return [BASE, sizes[size] || sizes.md, variants[variant] || variants.primary, fullWidth ? 'w-full' : '', className].join(' ')
}

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

const BrandButton = forwardRef(function BrandButton(
  { as: Comp = 'button', variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon, fullWidth = false, className = '', children, disabled, ...rest },
  ref,
) {
  const nativeDisabled = Comp === 'button' ? (disabled || isLoading) : undefined
  const content = isLoading
    ? <Spinner />
    : <>{leftIcon}{children ? <span>{children}</span> : null}{rightIcon}</>
  return (
    <Comp
      ref={ref}
      className={buttonClasses({ variant, size, fullWidth, className })}
      disabled={nativeDisabled}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {content}
    </Comp>
  )
})

export default BrandButton
