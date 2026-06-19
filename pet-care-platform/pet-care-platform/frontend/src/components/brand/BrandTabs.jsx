/**
 * BrandTabs — брендовые табы/чипы (pill или underline). Управляемый компонент.
 */
export default function BrandTabs({ items = [], value, onChange, variant = 'pill', className = '' }) {
  if (variant === 'underline') {
    return (
      <div role="tablist" className={['flex flex-wrap gap-6 border-b border-primary-100', className].join(' ')}>
        {items.map((it) => {
          const active = it.value === value
          return (
            <button
              key={it.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange?.(it.value)}
              className={['relative -mb-px pb-3 font-medium transition-colors border-b-2', active ? 'text-primary-700 border-gold-400' : 'text-primary-400 border-transparent hover:text-primary-600'].join(' ')}
            >
              {it.icon ? <span className="mr-1.5 inline-flex align-middle">{it.icon}</span> : null}{it.label}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div role="tablist" className={['flex flex-wrap gap-2', className].join(' ')}>
      {items.map((it) => {
        const active = it.value === value
        return (
          <button
            key={it.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(it.value)}
            className={['inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all min-h-[44px]', active ? 'bg-primary-700 text-white shadow-card' : 'bg-white text-primary-700 border border-primary-100 hover:bg-primary-50'].join(' ')}
          >
            {it.icon ? <span className="inline-flex">{it.icon}</span> : null}{it.label}
          </button>
        )
      })}
    </div>
  )
}
