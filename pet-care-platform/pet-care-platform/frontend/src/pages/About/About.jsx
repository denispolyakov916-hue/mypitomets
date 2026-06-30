/**
 * About — страница «О нас»: история проекта, миссия и ценности «Питомец+».
 * Публичная страница, открывается из футера. Использует брендовые компоненты.
 */
import { Link } from 'react-router-dom'
import {
  Sparkles, HeartPulse, UtensilsCrossed, GraduationCap, ShieldCheck, Users, ArrowRight,
} from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandCard, BrandButton, BrandBadge, PuffLottie } from '../../components/brand'

const TIMELINE = [
  {
    year: '2024',
    title: 'Идея',
    text: 'Команда владельцев питомцев устала собирать заботу из десятка чатов, заметок и закладок. Так родилась идея единой экосистемы.',
  },
  {
    year: '2025',
    title: 'Первая версия',
    text: 'Запустили цифровой паспорт PetID, дневник здоровья и умный подбор питания на основе породы, возраста и особенностей.',
  },
  {
    year: '2026',
    title: 'Экосистема заботы',
    text: 'Добавили магазин с экспертизой, обучающие курсы и помощника Пуфыча, который собирает маршрут заботы под конкретного питомца.',
  },
]

const VALUES = [
  {
    icon: HeartPulse,
    title: 'Здоровье прежде всего',
    text: 'Ранняя профилактика и понятная аналитика важнее красивых обещаний. Мы помогаем замечать отклонения раньше симптомов.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Питание под питомца',
    text: 'Никаких универсальных советов: рацион подбирается под вид, возраст, вес, здоровье и бюджет.',
  },
  {
    icon: ShieldCheck,
    title: 'Честность и прозрачность',
    text: 'Только проверенные товары и понятные рекомендации. Мы объясняем, почему вариант подходит вашему любимцу.',
  },
  {
    icon: GraduationCap,
    title: 'Знание вместо тревоги',
    text: 'Курсы от специалистов помогают спокойно разобраться с поведением и уходом без паники и догадок.',
  },
]

export default function About() {
  return (
    <AppShell>
      {/* Hero */}
      <BrandSection bg="white" className="!pt-8">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <BrandBadge variant="soft"><Sparkles className="mr-1 h-3.5 w-3.5" /> О проекте</BrandBadge>
            <h1 className="mt-4 font-heading text-3xl font-bold leading-tight text-primary-800 md:text-5xl">
              «Питомец+» — умная экосистема заботы о вашем питомце
            </h1>
            <p className="mt-4 max-w-xl text-base text-primary-600 md:text-lg">
              Мы создаём нечто большее, чем сервис. «Питомец+» — это персональный цифровой помощник,
              который становится надёжным проводником в вопросах здоровья, питания, обучения и комфорта вашего друга.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <BrandButton as={Link} to="/start" variant="primary" size="lg" leftIcon={<Sparkles className="h-5 w-5" />}>
                Подобрать заботу
              </BrandButton>
              <BrandButton as={Link} to="/shop" variant="outline" size="lg">
                Открыть магазин
              </BrandButton>
            </div>
          </div>
          <div className="relative flex justify-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-200/40 blur-3xl" aria-hidden="true" />
            <PuffLottie name="hello_wave" size={280} alt="Пуфыч приветствует" />
          </div>
        </div>
      </BrandSection>

      {/* Миссия */}
      <BrandSection bg="milk" title="Наша миссия" align="center"
        subtitle="Сделать заботу о питомце спокойной, системной и доступной — чтобы у каждого любимца была долгая и счастливая жизнь.">
        <BrandCard variant="elevated" padding="lg" className="mx-auto max-w-3xl text-center">
          <p className="text-lg leading-relaxed text-primary-700">
            Большинство проблем со здоровьем питомцев можно предотвратить вниманием и заботой вовремя.
            Мы объединяем питание, здоровье, обучение и магазин в один понятный маршрут, чтобы владельцу
            не приходилось держать всё в голове, а питомец получал ровно то, что ему нужно.
          </p>
        </BrandCard>
      </BrandSection>

      {/* История / таймлайн */}
      <BrandSection bg="white" title="История проекта" align="center"
        subtitle="Как «Питомец+» прошёл путь от идеи до экосистемы заботы.">
        <div className="grid gap-6 md:grid-cols-3">
          {TIMELINE.map((item) => (
            <BrandCard key={item.year} variant="default" hoverable className="flex flex-col">
              <span className="inline-flex w-fit items-center rounded-full bg-primary-100 px-3 py-1 font-heading text-sm font-bold text-primary-700">
                {item.year}
              </span>
              <h3 className="mt-3 font-heading text-xl font-bold text-primary-800">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-600">{item.text}</p>
            </BrandCard>
          ))}
        </div>
      </BrandSection>

      {/* Ценности */}
      <BrandSection bg="milk" title="Во что мы верим" align="center">
        <div className="grid gap-4 sm:grid-cols-2">
          {VALUES.map((value) => (
            <BrandCard key={value.title} variant="default" hoverable>
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
                  <value.icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="font-heading text-lg font-bold text-primary-800">{value.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-primary-600">{value.text}</p>
                </div>
              </div>
            </BrandCard>
          ))}
        </div>
      </BrandSection>

      {/* CTA */}
      <BrandSection bg="gradient" align="center">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-2 flex items-center justify-center gap-2 text-white/90">
            <Users className="h-5 w-5" />
            <span className="text-sm font-medium">Присоединяйтесь к заботливым владельцам</span>
          </div>
          <h2 className="font-heading text-3xl font-bold text-white md:text-4xl">
            Начните заботиться о питомце вместе с нами
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/85">
            Подбор питания, дневник здоровья, курсы и магазин — всё вокруг вашего любимца.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <BrandButton as={Link} to="/start" variant="primary" size="lg" rightIcon={<ArrowRight className="h-5 w-5" />}>
              Начать бесплатно
            </BrandButton>
          </div>
        </div>
      </BrandSection>
    </AppShell>
  )
}
