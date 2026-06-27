import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, UtensilsCrossed, Dog, HeartPulse, Tag } from 'lucide-react'

const SLIDES = [
  {
    id: 'all',
    eyebrow: 'Корма, игрушки и уход — с доставкой',
    title: 'Всё для питомца в одном месте',
    cta: 'В каталог',
    gradient: 'from-primary-700 via-primary-600 to-violet-600',
  },
  {
    id: 'premium',
    eyebrow: 'Рационы из проверенной базы',
    title: 'Премиальное питание под питомца',
    cta: 'Подобрать питание',
    to: '/food-recommendation',
    gradient: 'from-accent-500 via-accent-400 to-amber-300',
    dark: true,
  },
  {
    id: 'remind',
    eyebrow: 'Напомним докупить корм вовремя',
    title: 'Забота, которая не забывает',
    cta: 'Подобрать питание',
    to: '/food-recommendation',
    gradient: 'from-violet-600 via-primary-600 to-primary-700',
  },
]

const CATEGORIES = [
  { label: 'Премиальное питание', Icon: UtensilsCrossed, gradient: 'from-accent-400 to-amber-500' },
  { label: 'Игрушки и досуг', Icon: Dog, gradient: 'from-violet-400 to-violet-600' },
  { label: 'Здоровье и витамины', Icon: HeartPulse, gradient: 'from-emerald-400 to-emerald-600' },
  { label: 'Выгодные предложения', Icon: Tag, gradient: 'from-rose-400 to-rose-600' },
]

const scrollToCatalog = () => {
  document.getElementById('shop-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function ShopHeroBanner() {
  const [active, setActive] = useState(0)
  const hovering = useRef(false)
  const go = useCallback((dir) => setActive((a) => (a + dir + SLIDES.length) % SLIDES.length), [])

  useEffect(() => {
    const t = setInterval(() => {
      if (!hovering.current) setActive((a) => (a + 1) % SLIDES.length)
    }, 6000)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)]" aria-label="Баннеры магазина">
      {/* Главный баннер-карусель */}
      <div
        className="relative overflow-hidden rounded-3xl min-h-[230px] lg:min-h-[316px]"
        onMouseEnter={() => { hovering.current = true }}
        onMouseLeave={() => { hovering.current = false }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            aria-hidden={i !== active}
            className={`absolute inset-0 flex flex-col justify-end bg-gradient-to-br ${s.gradient} px-14 py-7 md:px-16 md:py-9 transition-opacity duration-700 ${i === active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
            <div className="pointer-events-none absolute bottom-8 right-16 h-24 w-24 rounded-full bg-white/10 blur-xl" />
            <div className={`relative max-w-lg ${s.dark ? 'text-primary-900' : 'text-white'}`}>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${s.dark ? 'bg-primary-900/10 text-primary-900' : 'bg-white/20 text-white'}`}>
                {s.eyebrow}
              </span>
              <h2 className="mt-3 font-heading text-2xl font-extrabold leading-[1.05] md:text-4xl">
                {s.title}
              </h2>
              <div className="mt-5">
                {s.to ? (
                  <Link
                    to={s.to}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold shadow-lg transition active:scale-95 ${s.dark ? 'bg-primary-800 text-white hover:bg-primary-900' : 'bg-white text-primary-800 hover:bg-white/90'}`}
                  >
                    <Sparkles className="h-4 w-4" aria-hidden /> {s.cta}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={scrollToCatalog}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-800 shadow-lg transition hover:bg-white/90 active:scale-95"
                  >
                    {s.cta} <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => go(-1)} aria-label="Предыдущий баннер" className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Следующий баннер" className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur transition hover:bg-black/40">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {SLIDES.map((s, i) => (
            <button key={s.id} type="button" onClick={() => setActive(i)} aria-label={`Баннер ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === active ? 'w-6 bg-white' : 'w-1.5 bg-white/50 hover:bg-white/80'}`} />
          ))}
        </div>
      </div>

      {/* Боковые категории */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:grid-rows-4">
        {CATEGORIES.map(({ label, Icon, gradient }) => (
          <button
            key={label}
            type="button"
            onClick={scrollToCatalog}
            className={`group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-3 text-left text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md lg:p-4`}
          >
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <span className="min-w-0 flex-1 text-sm font-bold leading-tight">{label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 opacity-80 transition group-hover:translate-x-0.5" aria-hidden />
          </button>
        ))}
      </div>
    </section>
  )
}
