/**
 * BrandSection — секция с брендовым ритмом отступов и заголовком.
 */
const bgs = {
  milk: 'bg-milk text-primary-900',
  white: 'bg-white text-primary-900',
  purple: 'bg-primary-700 text-white',
  gradient: 'bg-gradient-to-br from-primary-700 to-primary-900 text-white',
}

export default function BrandSection({ bg = 'milk', title, subtitle, align = 'left', container = 'max-w-7xl', id, className = '', children }) {
  const pad = 'py-[clamp(2rem,6vh,4rem)] px-[clamp(1rem,4vw,2rem)]'
  const onDark = bg === 'purple' || bg === 'gradient'
  return (
    <section id={id} className={[bgs[bg] || bgs.milk, pad, className].join(' ')}>
      <div className={['mx-auto', container].join(' ')}>
        {(title || subtitle) ? (
          <header className={['mb-8', align === 'center' ? 'text-center' : ''].join(' ')}>
            {title ? <h2 className="font-heading font-bold text-3xl md:text-4xl">{title}</h2> : null}
            {subtitle ? <p className={['mt-3 text-base md:text-lg', onDark ? 'text-white/80' : 'text-primary-500'].join(' ')}>{subtitle}</p> : null}
          </header>
        ) : null}
        {children}
      </div>
    </section>
  )
}
