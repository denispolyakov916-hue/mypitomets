import { Award, Star, BookOpen, TrendingUp } from 'lucide-react'

const EXPERTS = [
  { name: 'Елена Петрова', role: 'Кинолог-зоопсихолог', cred: 'Международный сертификат KYN, 15 лет опыта', tag: 'Коррекция поведения', rating: 4.9, courses: 12, students: '3,200+', grad: 'from-emerald-400 to-emerald-600' },
  { name: 'Алексей Соколов', role: 'Мастер спорта по кинологии', cred: 'РКФ, IPO-III, Шуцхунд тренер', tag: 'Дрессировка и спорт', rating: 4.8, courses: 18, students: '5,800+', grad: 'from-blue-400 to-indigo-600' },
  { name: 'Мария Волкова', role: 'Фелинолог-бихевиорист', cred: 'IAABC, специализация — кошки', tag: 'Поведение кошек', rating: 5, courses: 8, students: '2,100+', grad: 'from-rose-400 to-pink-600' },
]

/** Секция «Наши эксперты» — статичные карточки экспертов. */
export default function CourseExperts() {
  return (
    <section className="mb-6">
      <h2 className="mb-4 font-heading text-2xl font-bold text-primary-800">Наши эксперты</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {EXPERTS.map((e) => (
          <article key={e.name} className="rounded-2xl border border-primary-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${e.grad} text-white shadow-sm`}>
                <Award className="h-6 w-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate font-heading text-lg font-bold text-primary-800">{e.name}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm font-bold text-amber-500">
                    <Star className="h-4 w-4 fill-current" aria-hidden /> {e.rating}
                  </span>
                </div>
                <p className="text-sm text-primary-500">{e.role}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-snug text-gray-600">{e.cred}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
              <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{e.tag}</span>
              <span className="flex items-center gap-3 text-xs text-gray-400">
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" aria-hidden /> {e.courses} курсов</span>
                <span className="inline-flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5" aria-hidden /> {e.students}</span>
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
