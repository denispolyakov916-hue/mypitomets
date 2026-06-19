/**
 * BrandPage — единая оболочка страницы: молочный фон, ритм, заголовок Manrope.
 */
export default function BrandPage({ title, subtitle, bg = 'milk', maxWidth = 'max-w-7xl', headerRight, className = '', children }) {
  const bgCls = bg === 'white' ? 'bg-white' : 'bg-milk'
  return (
    <div className={['min-h-[calc(100vh-4rem)]', bgCls, 'px-[clamp(1rem,4vw,2rem)] py-8', className].join(' ')}>
      <div className={['mx-auto', maxWidth].join(' ')}>
        {(title || headerRight) ? (
          <div className="flex items-start justify-between gap-4 mb-8">
            <div>
              {title ? <h1 className="font-heading font-bold text-3xl md:text-4xl text-primary-800">{title}</h1> : null}
              {subtitle ? <p className="mt-2 text-primary-500">{subtitle}</p> : null}
            </div>
            {headerRight}
          </div>
        ) : null}
        {children}
      </div>
    </div>
  )
}
