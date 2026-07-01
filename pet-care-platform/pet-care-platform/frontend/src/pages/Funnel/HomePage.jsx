/**
 * HomePage — продуктовая главная (/): продающий лендинг сервиса спокойной заботы.
 * Эмоциональный вход, реальные боли владельца, Пуфыч как живой проводник,
 * и понятный маршрут / → /start → /pet-quiz. Все CTA ведут в воронку подбора.
 */
import { useState, Fragment } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, ShoppingBag, Stethoscope, GraduationCap, ArrowRight, Check, Cat, Dog,
  UtensilsCrossed, Scale, Syringe, Package, PawPrint, Wallet,
} from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandCard, BrandButton, BrandBadge, BrandTabs, PuffLottie } from '../../components/brand'
import NewsEventsTeaser from '../NewsEvents/NewsEventsTeaser'

/* ----------------------------- данные ----------------------------- */
const PAINS = {
  food: {
    label: 'Питание', icon: UtensilsCrossed,
    pain: 'В магазине десятки кормов, но непонятно, какой действительно подходит.',
    subs: ['Страшно ошибиться с составом', 'Не хочется переплачивать за красивую упаковку', 'Аллергия, стерилизация или чувствительное пищеварение'],
    solution: 'Пуфыч подбирает рацион под параметры питомца и показывает, почему вариант подходит.',
    cta: { label: 'Подобрать корм', to: '/start' },
  },
  health: {
    label: 'Здоровье', icon: Stethoscope,
    pain: 'Прививки, обработки, вес, кормление и лекарства легко забываются.',
    subs: ['Напоминания разбросаны по чатам и заметкам', 'Непонятно, когда закончится корм', 'Вес и реакции питомца никто системно не отслеживает'],
    solution: 'Дневник питомца хранит важные события и напоминает о следующем шаге.',
    cta: { label: 'Начать заботу', to: '/start' },
  },
  behavior: {
    label: 'Поведение', icon: GraduationCap,
    pain: 'Питомец ведёт себя сложно, а владелец не понимает, что делать.',
    subs: ['Кошка ходит мимо лотка', 'Собака тянет поводок', 'Боится гостей, грызёт вещи или плохо адаптируется'],
    solution: 'Курсы помогают спокойно разобраться с проблемой и получить пошаговый план.',
    cta: { label: 'Смотреть курсы', to: '/courses' },
  },
}
const STEPS = [
  { title: 'Расскажите о питомце', note: 'вид, возраст, вес, здоровье' },
  { title: 'Пуфыч подберёт рацион', note: 'рацион, расчёт и варианты' },
  { title: 'Добавьте набор в корзину', note: 'корм + товары на период' },
  { title: 'Сохраните профиль и дневник', note: 'вес, обработки, прививки, заметки' },
  { title: 'Получайте напоминания и курсы', note: 'корм заканчивается, пора обработка, помощь с поведением' },
]
const RESULT_TIERS = [
  { label: 'Оптимальный выбор', price: '900 ₽', badge: 'gold', tag: 'Рекомендуем' },
  { label: 'Экономный вариант', price: '433 ₽', badge: 'soft' },
  { label: 'Премиум-решение', price: '1 170 ₽', badge: 'violet' },
]
const DIARY = [
  { icon: Syringe, text: 'Следующая обработка через 12 дней' },
  { icon: Package, text: 'Корм закончится примерно через 7 дней' },
  { icon: Scale, text: 'Вес: 4,8 кг' },
]
const COURSES = ['Кошка ходит мимо лотка', 'Собака тянет поводок', 'Питомец боится гостей', 'И многое другое']
const CONSIDER_GROUPS = [
  { title: 'Питомец', icon: PawPrint, chips: ['возраст', 'вес', 'порода', 'стерилизация', 'активность'] },
  { title: 'Здоровье', icon: Stethoscope, chips: ['аллергии', 'пищеварение', 'вес', 'история кормления'] },
  { title: 'Владелец', icon: Wallet, chips: ['бюджет', 'цель', 'напоминания'] },
  { title: 'Поведение', icon: GraduationCap, chips: ['страхи', 'адаптация', 'лоток', 'поводок'] },
]

/* ----------------------------- мелкие части ----------------------------- */
function Bubble({ text, className = '' }) {
  return (
    <div className={`relative max-w-sm rounded-3xl bg-white px-5 py-4 text-sm text-primary-700 shadow-card ${className}`}>
      {text}
      <span className="absolute -bottom-2 left-10 h-4 w-4 rotate-45 bg-white" aria-hidden="true" />
    </div>
  )
}

function PainBlock() {
  const [tab, setTab] = useState('food')
  const p = PAINS[tab]
  const Icon = p.icon
  const items = Object.entries(PAINS).map(([value, v]) => ({ value, label: v.label, icon: <v.icon className="h-4 w-4" /> }))
  return (
    <>
      <BrandTabs items={items} value={tab} onChange={setTab} className="justify-center" />
      <BrandCard variant="default" padding="lg" className="relative mx-auto mt-6 max-w-4xl overflow-hidden">
        <div className="pointer-events-none absolute right-11 top-8 hidden sm:block" aria-hidden="true">
          <span className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-400/20 blur-2xl" />
          <span className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-300/20 blur-2xl" />
          <PuffLottie name="talk_gesture" size={88} className="relative" alt="" />
        </div>
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
            <Icon className="h-7 w-7" />
          </div>
          <h3 className="max-w-xl font-heading text-xl font-bold text-primary-800 md:text-2xl">{p.pain}</h3>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {p.subs.map((s) => (
            <div key={s} className="rounded-2xl border border-primary-100/70 bg-milk p-4 text-sm text-primary-600">
              {s}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-primary-700">
            <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" /><span>{p.solution}</span>
          </div>
          <BrandButton as={Link} to={p.cta.to} variant="primary" size="sm" className="flex-shrink-0" rightIcon={<ArrowRight className="h-4 w-4" />}>
            {p.cta.label}
          </BrandButton>
        </div>
      </BrandCard>
      <p className="mx-auto mt-6 max-w-2xl text-center font-heading text-lg font-semibold text-primary-700">
        Питомец Плюс собирает питание, здоровье и поведение в один понятный маршрут заботы.
      </p>
    </>
  )
}

function StepsTimeline() {
  return (
    <div className="flex flex-col items-stretch gap-3 lg:flex-row">
      {STEPS.map((s, i) => (
        <Fragment key={s.title}>
          <BrandCard variant="default" hoverable className="flex flex-1 flex-col items-center gap-2 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gold-400 font-heading text-lg font-bold text-primary-800">{i + 1}</span>
            <span className="font-heading text-sm font-bold text-primary-800">{s.title}</span>
            <span className="text-xs text-primary-400">{s.note}</span>
          </BrandCard>
          {i < STEPS.length - 1 ? (
            <ArrowRight className="mx-auto h-5 w-5 flex-shrink-0 rotate-90 self-center text-primary-300 lg:rotate-0" />
          ) : null}
        </Fragment>
      ))}
    </div>
  )
}

function ResultZone() {
  return (
    <BrandCard variant="elevated" padding="lg" className="lg:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-heading text-lg font-bold text-primary-800"><ShoppingBag className="h-5 w-5 text-primary-500" /> Рацион и набор</h3>
        <BrandBadge variant="gold" size="sm"><Sparkles className="mr-1 h-3 w-3" /> Подбор готов</BrandBadge>
      </div>
      <div className="mt-4 space-y-2">
        {RESULT_TIERS.map((t) => (
          <div key={t.label} className="flex items-center justify-between rounded-2xl bg-milk px-4 py-3">
            <span className="flex items-center gap-2">
              <BrandBadge variant={t.badge} size="sm">{t.label}</BrandBadge>
              {t.tag ? <span className="hidden text-xs font-semibold text-gold-500 sm:inline">{t.tag}</span> : null}
            </span>
            <span className="font-heading font-bold text-primary-900">{t.price}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-primary-600">Стоимость кормления в месяц ≈ 900 ₽</p>
      <BrandButton as={Link} to="/start" variant="primary" size="lg" fullWidth className="mt-4" leftIcon={<ShoppingBag className="h-5 w-5" />}>
        Добавить в корзину
      </BrandButton>
    </BrandCard>
  )
}

function PreviewZones() {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-3">
      <ResultZone />
      <div className="space-y-6">
        <BrandCard variant="default" padding="md">
          <h3 className="flex items-center gap-2 font-heading font-bold text-primary-800"><Stethoscope className="h-5 w-5 text-primary-500" /> Дневник и напоминания</h3>
          <div className="mt-3 space-y-2">
            {DIARY.map((d) => (
              <div key={d.text} className="flex items-center gap-2 rounded-xl bg-milk px-3 py-2 text-sm text-primary-700">
                <d.icon className="h-4 w-4 text-primary-500" /> {d.text}
              </div>
            ))}
          </div>
        </BrandCard>
        <BrandCard variant="default" padding="md">
          <h3 className="flex items-center gap-2 font-heading font-bold text-primary-800"><GraduationCap className="h-5 w-5 text-primary-500" /> Курсы по ситуации</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {COURSES.map((c) => <BrandBadge key={c} variant="soft">{c}</BrandBadge>)}
          </div>
        </BrandCard>
      </div>
    </div>
  )
}

function ConsiderGroups() {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CONSIDER_GROUPS.map((g) => (
          <BrandCard key={g.title} variant="default" hoverable>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-100 text-primary-700"><g.icon className="h-5 w-5" /></span>
              <h3 className="font-heading font-bold text-primary-800">{g.title}</h3>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {g.chips.map((c) => <BrandBadge key={c} variant="soft" size="sm">{c}</BrandBadge>)}
            </div>
          </BrandCard>
        ))}
      </div>
      <p className="mt-6 text-center text-sm text-primary-500">Чем точнее данные, тем полезнее рекомендации.</p>
    </>
  )
}

/* ----------------------------- страница ----------------------------- */
export default function HomePage() {
  const navigate = useNavigate()
  // Через /start: там, если у пользователя есть анкеты, предложим выбрать питомца,
  // а не гнать сразу в новую анкету. Для нового — /start сам уведёт в анкету по виду.
  const pick = (species) => navigate(`/start?species=${species}`)
  const scrollToHow = () => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <AppShell>
      {/* 1. HERO */}
      <BrandSection bg="white" className="!pt-6">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div className="order-2 md:order-1">
            <BrandBadge variant="soft"><Sparkles className="mr-1 h-3.5 w-3.5" /> Спокойная забота о питомце</BrandBadge>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-primary-800 md:text-5xl">
              Пуфыч подберёт питание и поможет заботиться о вашем питомце
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-600 md:text-lg">
              Ответьте на несколько вопросов — сервис учтёт возраст, вес, породу, здоровье, бюджет и поведение,
              а затем предложит рацион, товары, напоминания и полезные курсы.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <BrandButton as={Link} to="/start" variant="primary" size="lg" leftIcon={<Sparkles className="h-5 w-5" />}>Подобрать корм</BrandButton>
              <BrandButton variant="outline" size="lg" onClick={scrollToHow}>Как это работает</BrandButton>
            </div>
            <div className="mt-6">
              <p className="text-sm font-medium text-primary-600">Кто ваш питомец?</p>
              <div className="mt-2 flex flex-wrap gap-3">
                <BrandButton variant="secondary" onClick={() => pick('cat')} leftIcon={<Cat className="h-4 w-4" />}>Кошка</BrandButton>
                <BrandButton variant="secondary" onClick={() => pick('dog')} leftIcon={<Dog className="h-4 w-4" />}>Собака</BrandButton>
              </div>
            </div>
          </div>
          <div className="order-1 md:order-2 relative flex flex-col items-center gap-1">
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/40 blur-3xl" aria-hidden="true" />
            <Bubble className="z-10" text="Привет! Начнём с питомца — я подскажу, чем кормить, что не забыть по здоровью и как разобраться с поведением." />
            <PuffLottie name="hello_wave" size={300} className="relative z-10" alt="Пуфыч приветствует" />
          </div>
        </div>
      </BrandSection>

      {/* 2. БОЛЬ */}
      <BrandSection bg="white" title="Знакомо?" subtitle="У владельца питомца каждый день десятки мелких решений — и почти каждое влияет на здоровье и спокойствие." align="center">
        <PainBlock />
      </BrandSection>

      {/* 3. КАК ЭТО РАБОТАЕТ (сервис подстраивается) */}
      <BrandSection bg="white" id="how" title="Сервис подстраивается под вашего питомца" subtitle="Не универсальные советы, а маршрут заботы под возраст, вес, здоровье, поведение и бюджет." align="center">
        <div className="mb-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <PuffLottie name="talk_gesture" size={120} alt="Пуфыч-проводник" />
          <Bubble text="Я не просто показываю товары — я собираю маршрут заботы под конкретного питомца." />
        </div>
        <StepsTimeline />
      </BrandSection>

      {/* 4. PREVIEW РЕЗУЛЬТАТА */}
      <BrandSection bg="white" title="Ваш личный центр заботы" subtitle="После анкеты вы увидите рацион, дневник, напоминания и курсы — всё вокруг конкретного питомца." align="center">
        <div className="mb-5 text-center">
          <BrandBadge variant="gold" size="sm">Так выглядит результат после анкеты</BrandBadge>
        </div>
        <PreviewZones />
      </BrandSection>

      {/* 5. ЧТО УЧИТЫВАЕТ ПУФЫЧ */}
      <BrandSection bg="white">
        <header className="mb-8 text-center">
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <PuffLottie name="talk_gesture" size={88} className="flex-shrink-0" alt="Пуфыч" />
            <h2 className="font-heading text-3xl font-bold text-primary-800 md:text-4xl">Пуфыч смотрит на питомца целиком</h2>
          </div>
          <p className="mx-auto mt-3 max-w-2xl text-base text-primary-500 md:text-lg">
            Не только корм и цена — сервис учитывает здоровье, привычки и поведение.
          </p>
        </header>
        <ConsiderGroups />
      </BrandSection>

      {/* 5.5 НОВОСТИ И МЕРОПРИЯТИЯ — лента сообщества (скрывается, если контента нет) */}
      <NewsEventsTeaser />

      {/* 6. ФИНАЛЬНЫЙ CTA — премиальная кульминация лендинга */}
      <section className="relative isolate overflow-hidden text-center">
        {/* Фон: белый верх органично растворяется в фиолетовом тумане; низ совпадает с футером */}
        <div
          className="pointer-events-none absolute inset-0 -z-20"
          aria-hidden="true"
          style={{
            backgroundColor: '#ffffff',
            backgroundImage: [
              'radial-gradient(80% 55% at 50% 62%, rgba(40,24,69,0.45), rgba(40,24,69,0) 72%)',
              'radial-gradient(55% 42% at 14% 82%, rgba(124,58,184,0.5), rgba(124,58,184,0) 74%)',
              'radial-gradient(55% 42% at 86% 68%, rgba(82,47,129,0.55), rgba(82,47,129,0) 74%)',
              'radial-gradient(160% 120% at 50% 100%, #522f81 0%, #5e2f93 40%, #6b2da1 62%, rgba(107,45,161,0) 82%)',
            ].join(', '),
          }}
        />
        {/* Живые glow-облака: едва заметное движение света */}
        <span className="puff-fog puff-fog-a pointer-events-none absolute -z-10" aria-hidden="true" />
        <span className="puff-fog puff-fog-b pointer-events-none absolute -z-10" aria-hidden="true" />

        <div className="relative z-10 mx-auto max-w-2xl px-[clamp(1rem,4vw,2rem)] pb-[clamp(2.5rem,7vh,4.5rem)] pt-[clamp(4rem,13vh,7.5rem)]">
          {/* Пуфыч — герой финала, с золотисто-лавандовым свечением */}
          <div className="relative mx-auto mb-3 w-fit">
            <span className="puff-halo puff-halo-violet pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
            <span className="puff-halo puff-halo-gold pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2" aria-hidden="true" />
            <PuffLottie name="celebrate_jump2" size={168} className="relative" alt="Пуфыч радуется" />
          </div>
          <h2 className="font-heading text-3xl font-bold text-white drop-shadow-sm md:text-4xl">Начните с питомца — Пуфыч соберёт маршрут заботы за пару минут</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Сначала получите пользу: рацион, рекомендации и план. Регистрация понадобится только если захотите сохранить результат.
          </p>
          <p className="mt-2 text-white/70">Я рядом — подскажу на каждом шаге.</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <BrandButton as={Link} to="/start" variant="primary" size="lg" leftIcon={<Sparkles className="h-5 w-5" />}>Подобрать корм</BrandButton>
            <BrandButton as={Link} to="/shop" variant="ghost" size="lg" className="text-white hover:bg-white/10">Посмотреть магазин</BrandButton>
          </div>
        </div>

        <style>{`
          .puff-halo { border-radius: 9999px; filter: blur(44px); will-change: opacity; }
          .puff-halo-gold { background: radial-gradient(circle, rgba(251,186,45,0.5), rgba(251,186,45,0) 68%); animation: puffBreath 6s ease-in-out infinite; }
          .puff-halo-violet { background: radial-gradient(circle, rgba(181,110,250,0.42), rgba(181,110,250,0) 70%); animation: puffBreath 8s ease-in-out infinite; }
          .puff-fog { border-radius: 9999px; filter: blur(70px); opacity: .55; will-change: transform; }
          .puff-fog-a { width: 460px; height: 460px; left: -130px; bottom: -90px; background: radial-gradient(circle, rgba(124,58,184,0.6), rgba(124,58,184,0) 70%); animation: puffDriftA 18s ease-in-out infinite; }
          .puff-fog-b { width: 540px; height: 540px; right: -150px; bottom: -70px; background: radial-gradient(circle, rgba(82,47,129,0.65), rgba(82,47,129,0) 70%); animation: puffDriftB 22s ease-in-out infinite; }
          @keyframes puffBreath { 0%, 100% { opacity: .7; } 50% { opacity: 1; } }
          @keyframes puffDriftA { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(34px,-26px) scale(1.08); } }
          @keyframes puffDriftB { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,-20px) scale(1.06); } }
          @media (prefers-reduced-motion: reduce) {
            .puff-halo, .puff-fog { animation: none !important; }
          }
        `}</style>
      </section>
    </AppShell>
  )
}
