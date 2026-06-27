import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Sparkles, UtensilsCrossed, Dog, HeartPulse, Tag } from 'lucide-react'

const SLIDES = [
  {
    id: 'feed',
    media: { type: 'image', src: '/banners/cat-treat.jpg', pos: 'object-[center_28%]' },
    eyebrow: 'Питание и лакомства под питомца',
    title: 'Подберём рацион под вашего любимца',
    cta: 'Подобрать питание',
    to: '/food-recommendation',
  },
  {
    id: 'all',
    media: { type: 'video', src: '/banners/cats-cozy.mp4', poster: '/banners/cats-cozy.jpg' },
    eyebrow: 'Корма, игрушки и уход — с доставкой',
    title: 'Всё для питомца в одном месте',
    cta: 'В каталог',
  },
  {
    id: 'play',
    media: { type: 'video', src: '/banners/dog-jack.mp4', poster: '/banners/dog-jack.jpg' },
    eyebrow: 'Игрушки и активный досуг',
    title: 'Больше игр — счастливее питомец',
    cta: 'В каталог',
  },
  {
    id: 'health',
    media: { type: 'video', src: '/banners/dog-pointer.mp4', poster: '/banners/dog-pointer.jpg' },
    eyebrow: 'Здоровье и витамины',
    title: 'Забота о здоровье каждый день',
    cta: 'В каталог',
  },
  {
    id: 'deals',
    media: { type: 'video', src: '/banners/cat-tabby.mp4', poster: '/banners/cat-tabby.jpg' },
    eyebrow: 'Выгодные предложения',
    title: 'Заботиться о питомце выгодно',
    cta: 'В каталог',
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

function SlideMedia({ slide, isActive }) {
  const { media } = slide
  if (media.type === 'image') {
    return <img src={media.src} alt="" className={`absolute inset-0 h-full w-full object-cover ${media.pos || ''}`} />
  }
  // Видео грузим/проигрываем только у активного слайда; иначе — постер (экономим трафик).
  if (isActive) {
    return (
      <video
        src={media.src}
        poster={media.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  }
  return <img src={media.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
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
        className="relative overflow-hidden rounded-3xl min-h-[240px] lg:min-h-[330px] bg-primary-900"
        onMouseEnter={() => { hovering.current = true }}
        onMouseLeave={() => { hovering.current = false }}
      >
        {SLIDES.map((s, i) => (
          <div
            key={s.id}
            aria-hidden={i !== active}
            className={`absolute inset-0 flex flex-col justify-end px-14 py-7 md:px-16 md:py-9 transition-opacity duration-700 ${i === active ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
          >
            <SlideMedia slide={s} isActive={i === active} />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/10" />
            <div className="relative max-w-lg text-white">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide backdrop-blur-sm">
                {s.eyebrow}
              </span>
              <h2 className="mt-3 font-heading text-2xl font-extrabold leading-[1.05] drop-shadow md:text-4xl">
                {s.title}
              </h2>
              <div className="mt-5">
                {s.to ? (
                  <Link to={s.to} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-800 shadow-lg transition hover:bg-white/90 active:scale-95">
                    <Sparkles className="h-4 w-4" aria-hidden /> {s.cta}
                  </Link>
                ) : (
                  <button type="button" onClick={scrollToCatalog} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-primary-800 shadow-lg transition hover:bg-white/90 active:scale-95">
                    {s.cta} <ChevronRight className="h-4 w-4" aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        <button type="button" onClick={() => go(-1)} aria-label="Предыдущий баннер" className="absolute left-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55">
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <button type="button" onClick={() => go(1)} aria-label="Следующий баннер" className="absolute right-3 top-1/2 z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition hover:bg-black/55">
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>

        <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
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
