import { useState } from 'react'
import { BookOpen, Search, Sparkles } from 'lucide-react'

/**
 * Hero каталога курсов: фото-фон, поиск.
 *
 * Цифры показываем только реальные (фактическое число опубликованных курсов из API).
 * Если курсов пока нет — честный текст «Раздел в разработке», без выдуманной маркетинговой
 * статистики (см. баг P1.10: hero обещал «20+ курсов / 12 000+ владельцев / рейтинг 4.8»,
 * а список ниже показывал 0 курсов).
 */
export default function CourseHero({ courseCount = 0, isLoading = false, onSearch }) {
  const [q, setQ] = useState('')
  const submit = (e) => {
    e.preventDefault()
    onSearch?.(q.trim())
  }

  const hasCourses = courseCount > 0
  // Пока идёт первая загрузка — не утверждаем ни «есть курсы», ни «пусто».
  const isEmpty = !isLoading && !hasCourses

  return (
    <section className="relative mb-6 min-h-[260px] overflow-hidden rounded-3xl bg-primary-900 md:min-h-[320px]">
      <img src="/banners/dog-pointer.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary-950/90 via-primary-900/70 to-primary-900/25" />
      <div className="relative px-6 py-8 text-white md:px-10 md:py-10">
        <span className="text-xs font-bold uppercase tracking-[0.18em] text-white/80">Обучение для питомцев</span>

        {isEmpty ? (
          <>
            <h1 className="mt-2 max-w-2xl font-heading text-3xl font-extrabold leading-tight md:text-5xl">
              Курсы скоро появятся
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
              Раздел в разработке. Мы готовим курсы по воспитанию и коррекции поведения питомцев —
              с видео-уроками, заданиями и поддержкой специалистов. Загляните чуть позже.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
              <Sparkles className="h-5 w-5 text-accent-300" aria-hidden />
              <span className="text-sm font-semibold">Готовим первые курсы</span>
            </div>
          </>
        ) : (
          <>
            <h1 className="mt-2 max-w-2xl font-heading text-3xl font-extrabold leading-tight md:text-5xl">
              Курсы по воспитанию и коррекции поведения
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/85 md:text-base">
              Обучайте своего питомца правильно — от базовых команд до решения поведенческих проблем.
              Курсы с видео-уроками, заданиями и поддержкой специалистов.
            </p>

            {hasCourses && (
              <div className="mt-6 flex flex-wrap gap-3">
                <div className="flex items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20">
                    <BookOpen className="h-5 w-5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-lg font-extrabold leading-none">{courseCount}</span>
                    <span className="block text-xs text-white/80">{courseCount === 1 ? 'курс' : 'курсов'}</span>
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={submit} className="mt-6 flex max-w-2xl gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/60" aria-hidden />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Поиск курса..."
                  aria-label="Поиск курса"
                  className="w-full rounded-full border border-white/25 bg-white/15 py-3 pl-12 pr-4 text-white placeholder-white/60 outline-none backdrop-blur-sm transition focus:border-white/60"
                />
              </div>
              <button type="submit" className="shrink-0 rounded-full bg-white px-5 py-3 text-sm font-bold text-primary-800 transition hover:bg-white/90 active:scale-95">
                Найти курс
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
