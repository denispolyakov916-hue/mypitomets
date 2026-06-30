/**
 * RecommendationsPage — /recommendations: страница «Рацион питомца».
 * Персональный результат подбора как рабочий инструмент: intro + профиль,
 * двухколоночный конструктор рациона (варианты слева, расчёт ккал/БЖУ/расписание
 * справа), набор заботы на период, «почему подходит», мягкое сохранение.
 * Анонимно; покупка/сохранение → мягкий логин. Реальные товары магазина.
 */
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles, Check, ShoppingCart, Bell, Flame, Sunrise, Sun, Sunset,
  PawPrint, Cake, Scale, Heart, Stethoscope, Wallet, Target, UtensilsCrossed, Calendar, UserPlus,
} from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandCard, BrandButton, BrandBadge, BrandEmptyState, BrandModal, PuffLottie } from '../../components/brand'
import { loadQuizDraft } from '../../utils/petQuizDraft'
import { buildRecommendations } from './recommendationsAdapter'
import { computeRation } from './rationPlan'
import { formatPrice } from '../../utils/format'
import { useAuthStore } from '../../store/authStore'
import { savePendingFunnelAction } from '../../utils/pendingFunnelAction'
import { useFunnelActions } from './useFunnelActions'

const PROFILE_ICONS = {
  species: PawPrint, breed: PawPrint, age: Cake, weight: Scale,
  neutered: Heart, health: Stethoscope, budget: Wallet, goal: Target,
}
const MEAL_ICONS = { morning: Sunrise, day: Sun, evening: Sunset }
const MACRO_BAR = { protein: 'bg-primary-600', fat: 'bg-gold-400', carbs: 'bg-violet-300' }

function ProductImage({ product, fallbackSize = 90 }) {
  if (product?.image_url) {
    return <img src={product.image_url} alt={product.name || 'Товар'} className="h-full w-full object-contain p-2" />
  }
  return <PuffLottie name="sit" size={fallbackSize} alt={product?.name || 'Товар'} />
}

/** Чипы профиля питомца. */
function ProfileChips({ profile }) {
  if (!profile?.length) return null
  return (
    <div className="mt-6 flex flex-wrap justify-center gap-2">
      {profile.map((row) => {
        const Icon = PROFILE_ICONS[row.key] || PawPrint
        return (
          <span key={row.key} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm text-primary-700 shadow-card">
            <Icon className="h-4 w-4 text-primary-400" />
            <span className="text-primary-400">{row.label}:</span>
            <span className="font-medium text-primary-800 line-clamp-1">{row.value}</span>
          </span>
        )
      })}
    </div>
  )
}

/** Блок 3: «Параметры подбора» — то, что собрал Пуфыч (не техническая форма). */
function ParamsCard({ petName, ration, periodDays, profile }) {
  const goal = profile.find((p) => p.key === 'goal')?.value || '—'
  const budget = profile.find((p) => p.key === 'budget')?.value || '—'
  const rows = [
    { label: 'Питомец', value: petName },
    { label: 'Тип питания', value: ration.wet ? 'Влажный корм' : 'Сухой корм' },
    { label: 'Период', value: `${periodDays} дней` },
    { label: 'Сухой / влажный', value: '70% / 30%' },
    { label: 'Бюджет', value: budget },
    { label: 'Цель', value: goal },
  ]
  return (
    <BrandCard variant="soft" padding="lg">
      <div className="flex items-center gap-2">
        <PuffLottie name="talk_gesture" size={40} className="hidden sm:inline-block" alt="" />
        <h2 className="font-heading text-lg font-bold text-primary-800">Пуфыч собрал параметры</h2>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label}>
            <dt className="text-xs uppercase tracking-wide text-primary-400">{r.label}</dt>
            <dd className="text-sm font-medium text-primary-800">{r.value}</dd>
          </div>
        ))}
      </dl>
    </BrandCard>
  )
}

/** Один вариант рациона внутри конструктора (выбираемый). */
function VariantRow({ tier, selected, onSelect, periodCost, periodDays }) {
  const p = tier.product
  return (
    <BrandCard
      as="div"
      variant={selected ? 'elevated' : 'default'}
      padding="md"
      clickable
      onClick={onSelect}
      className={selected ? 'ring-1 ring-gold-300/70' : ''}
    >
      <div className="flex items-center justify-between gap-2">
        <BrandBadge variant={selected ? 'gold' : tier.badge} size="sm">{tier.label}</BrandBadge>
        {selected ? (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-green-600"><Check className="h-4 w-4" /> Выбрано</span>
        ) : null}
      </div>
      <div className="mt-3 flex gap-3">
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-milk">
          <ProductImage product={p} fallbackSize={56} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary-500">{p.brand_name || 'Корм'}</p>
          <p className="line-clamp-2 text-sm text-primary-800">{p.name}</p>
          <p className="mt-1 text-lg font-bold text-primary-900">{formatPrice(p.price)}</p>
        </div>
      </div>
      <div className="mt-2 flex items-start gap-1.5 text-sm text-primary-600">
        <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" /><span>{tier.why}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-primary-400">≈ {formatPrice(periodCost)} за {periodDays} дн.</span>
        {selected
          ? <span className="text-xs font-medium text-primary-400">Активный рацион</span>
          : <BrandButton variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSelect() }}>Выбрать рацион</BrandButton>}
      </div>
    </BrandCard>
  )
}

/** Блок 4: «Конструктор рациона» — варианты, главный активен. */
function RationConstructor({ tiers, selectedKey, onSelect, periodDays, periodCostOf }) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <UtensilsCrossed className="h-5 w-5 text-primary-500" />
        <h2 className="font-heading text-xl font-bold text-primary-800">Конструктор рациона</h2>
      </div>
      <div className="space-y-3">
        {tiers.map((t) => (
          <VariantRow
            key={t.key}
            tier={t}
            selected={t.key === selectedKey}
            onSelect={() => onSelect(t.key)}
            periodCost={periodCostOf(t.product)}
            periodDays={periodDays}
          />
        ))}
      </div>
    </div>
  )
}

/** Визуальный split БЖУ без тяжёлых библиотек. */
function MacroSplit({ macros }) {
  if (!macros) return null
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        {macros.map((m) => (
          <div key={m.key} className={MACRO_BAR[m.key]} style={{ width: `${m.pct}%` }} title={`${m.label} ${m.pct}%`} />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {macros.map((m) => (
          <div key={m.key}>
            <span className={`mx-auto block h-2 w-2 rounded-full ${MACRO_BAR[m.key]}`} />
            <p className="mt-1 text-xs text-primary-400">{m.label}</p>
            <p className="text-sm font-semibold text-primary-800">{m.grams} г</p>
            <p className="text-xs text-primary-400">{m.pct}%</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Блок 5: «Расчёт рациона» — ккал, БЖУ, расписание (sticky на десктопе). */
function CalcCard({ ration }) {
  return (
    <BrandCard variant="default" padding="lg" className="lg:sticky lg:top-24">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-gold-500" />
        <h2 className="font-heading text-xl font-bold text-primary-800">Расчёт рациона</h2>
      </div>

      <div className="mt-4 rounded-2xl bg-milk p-4 text-center">
        <p className="text-xs uppercase tracking-wide text-primary-400">Суточная норма</p>
        <p className="font-heading text-3xl font-bold text-primary-900">
          {ration.mer != null ? `${ration.mer} ккал` : '—'}
        </p>
        {ration.gramsPerDay != null ? (
          <p className="mt-1 text-sm text-primary-500">≈ {ration.gramsPerDay} г корма в день</p>
        ) : null}
      </div>

      {ration.macros ? (
        <div className="mt-5">
          <p className="mb-2 text-sm font-semibold text-primary-700">Белки / жиры / углеводы</p>
          <MacroSplit macros={ration.macros} />
        </div>
      ) : null}

      <div className="mt-5">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-primary-700">
          <Calendar className="h-4 w-4 text-primary-400" /> Расписание кормления
        </p>
        <div className="space-y-2">
          {ration.meals.map((m) => {
            const Icon = MEAL_ICONS[m.key] || Sun
            return (
              <div key={m.key} className="flex items-center justify-between rounded-xl bg-milk px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-primary-700"><Icon className="h-4 w-4 text-primary-400" /> {m.label}</span>
                <span className="text-sm font-semibold text-primary-800">{m.grams != null ? `${m.grams} г` : '—'}</span>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-4 text-xs text-primary-400">
        Значения ориентировочные — уточним по составу корма после сохранения питомца.
      </p>
    </BrandCard>
  )
}

/** Строка товара в наборе. periodPrice — цена за выбранный период (14/30 дн). */
function BundleItem({ label, product, periodPrice }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-xl bg-milk">
        <ProductImage product={product} fallbackSize={40} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-primary-400">{label}</p>
        <p className="line-clamp-1 text-sm font-medium text-primary-800">{product.name}</p>
        <p className="text-sm text-primary-600">{formatPrice(periodPrice != null ? periodPrice : product.price)}</p>
      </div>
    </div>
  )
}

/** Блок 6: «Набор заботы на период» с переключателем 14/30 дней. */
function BundleSection({ main, addon, addonLabel, periodDays, setPeriodDays, total, periodCostOf, onAddToCart }) {
  if (!main) return null
  return (
    <BrandCard variant="elevated" padding="lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-heading text-xl font-bold text-primary-800">Набор заботы на период</h2>
        <div className="inline-flex rounded-full bg-milk p-1">
          {[14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPeriodDays(d)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${periodDays === d ? 'bg-primary-700 text-white shadow-card' : 'text-primary-600 hover:text-primary-800'}`}
            >
              {d} дней
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-col items-stretch gap-4 md:flex-row md:items-center">
        <div className="flex-1"><BundleItem label="Основной корм" product={main} periodPrice={periodCostOf(main)} /></div>
        <div className="flex items-center justify-center text-primary-300 font-bold">+</div>
        <div className="flex-1">
          {addon
            ? <BundleItem label={addonLabel || 'Дополнение'} product={addon} periodPrice={periodCostOf(addon)} />
            : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-2 text-sm text-primary-600">
                <Sparkles className="h-4 w-4 text-gold-500" /> Лакомство-комплимент от Пуфыча
              </span>
            )}
        </div>
        <div className="flex flex-col gap-2 md:border-l md:border-primary-100 md:pl-6">
          <p className="font-heading text-lg font-bold text-primary-900">Итого: {formatPrice(total)}</p>
          <p className="text-sm text-primary-600">Хватит примерно на {periodDays} дней</p>
          <BrandButton variant="primary" size="lg" fullWidth leftIcon={<ShoppingCart className="h-5 w-5" />} onClick={onAddToCart}>
            Добавить рацион в корзину
          </BrandButton>
          <p className="text-xs text-primary-400">Состав и сроки ориентировочные — уточним после сохранения питомца.</p>
        </div>
      </div>
    </BrandCard>
  )
}

/** Блок 7: «Почему подходит». */
function WhyBlock({ reasons, petName }) {
  if (!reasons?.length) return null
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-heading text-2xl font-bold text-primary-800">Почему рацион подходит {petName}</h2>
        <PuffLottie name="think" size={64} className="hidden lg:block" alt="Пуфыч думает" />
      </div>
      <BrandCard variant="default" padding="lg" className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {reasons.map((r) => (
            <div key={r.key} className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                <Check className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-primary-800">{r.title}</p>
                <p className="text-sm text-primary-500">{r.text}</p>
              </div>
            </div>
          ))}
        </div>
      </BrandCard>
    </>
  )
}

/** Блок 8: компактное мягкое сохранение. */
function SaveBlock({ onSave, onCreateProfile }) {
  return (
    <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
      <PuffLottie name="stay" size={84} alt="Пуфыч ждёт" />
      <div className="flex-1">
        <h2 className="font-heading text-2xl font-bold text-white">Сохранить рацион и напоминание</h2>
        <p className="mt-1 text-white/80">Пуфыч напомнит, когда корм будет заканчиваться.</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <BrandButton variant="primary" leftIcon={<Bell className="h-5 w-5" />} onClick={onSave}>Сохранить рацион</BrandButton>
        <BrandButton variant="outline" leftIcon={<UserPlus className="h-5 w-5" />} onClick={onCreateProfile} className="border-white/40 text-white hover:bg-white/10">Создать профиль питомца</BrandButton>
        <BrandButton as={Link} to="/shop" variant="ghost" className="text-white hover:bg-white/10">Продолжить без сохранения</BrandButton>
      </div>
    </div>
  )
}

// 1B: уведомление о ходе/ошибке выполнения отложенного действия воронки.
function FunnelActionNotice({ actionError, savedNotice, onRetry }) {
  if (actionError) {
    return (
      <BrandSection bg="milk" container="max-w-6xl" className="!pb-0">
        <div className="flex flex-col items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Не удалось выполнить действие. Данные подбора сохранены — попробуйте ещё раз.</span>
          <BrandButton variant="secondary" onClick={onRetry}>Попробовать ещё раз</BrandButton>
        </div>
      </BrandSection>
    )
  }
  if (savedNotice) {
    return (
      <BrandSection bg="milk" container="max-w-6xl" className="!pb-0">
        <div className="flex items-start gap-3 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
          <span>Готовим всё для вашего питомца…</span>
        </div>
      </BrandSection>
    )
  }
  return null
}

/**
 * Плашка выбора питомца: если у пользователя уже есть питомцы, даём выбрать
 * существующего (или создать нового), вместо того чтобы всегда плодить новых.
 * Рендерится в BrandModal (центрирована, ESC/клик-вне, scroll-lock) — не «улетает».
 */
function PetPickerModal({ open, pets, onPick, onCreateNew, onClose }) {
  return (
    <BrandModal open={open} onClose={onClose} size="md" title="Для какого питомца?">
      <p className="text-sm text-primary-500">Выберите питомца или заведите нового.</p>
      <div className="mt-4 max-h-72 space-y-2 overflow-auto">
        {pets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onPick(p.id)}
            className="flex w-full items-center gap-3 rounded-2xl border border-primary-100 bg-white px-4 py-3 text-left transition hover:bg-primary-50"
          >
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-milk">
              {p.photo_url || p.photo
                ? <img src={p.photo_url || p.photo} alt={p.name} className="h-full w-full object-cover" />
                : <PawPrint className="h-5 w-5 text-primary-400" />}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium text-primary-800">{p.name || 'Питомец'}</span>
              <span className="block text-xs text-primary-400">{p.species === 'dog' ? 'Собака' : 'Кошка'}{p.breed_name ? ` · ${p.breed_name}` : ''}</span>
            </span>
          </button>
        ))}
      </div>
      <BrandButton variant="outline" fullWidth className="mt-4" leftIcon={<UserPlus className="h-5 w-5" />} onClick={onCreateNew}>
        Создать нового питомца
      </BrandButton>
    </BrandModal>
  )
}

export default function RecommendationsPage() {
  const navigate = useNavigate()
  const [draft] = useState(() => loadQuizDraft())
  const [state, setState] = useState({ loading: true, data: null, error: false })
  const [selectedKey, setSelectedKey] = useState('optimal')
  const [periodDays, setPeriodDays] = useState(30)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const {
    savedNotice, actionError, picker,
    runPendingAction, startSavedAction, startOnceIfPending, closePicker,
  } = useFunnelActions()

  useEffect(() => {
    let alive = true
    buildRecommendations(draft)
      .then((d) => { if (alive) setState({ loading: false, data: d, error: false }) })
      .catch(() => { if (alive) setState({ loading: false, data: null, error: true }) })
    return () => { alive = false }
  }, [draft])

  // 1B: вернулись с логина (или уже авторизованы) и есть подготовленное намерение —
  // выполняем его (создаём питомца / сохраняем рацион / кладём в корзину) и уходим дальше.
  useEffect(() => {
    if (isAuthenticated) startOnceIfPending()
  }, [isAuthenticated, startOnceIfPending])

  const petName = draft.name || 'вашего питомца'

  const tiers = useMemo(() => state.data?.tiers || [], [state.data])
  const selectedTier = useMemo(
    () => tiers.find((t) => t.key === selectedKey) || tiers[0] || null,
    [tiers, selectedKey],
  )
  const ration = useMemo(() => computeRation(draft, selectedTier?.product), [draft, selectedTier])
  // Стоимость на период: базовая цена товара рассчитана на ~30 дней, масштабируем по periodDays.
  const periodCostOf = (p) => Math.round(((p?.price) || 0) * (periodDays / 30))

  if (state.loading) {
    return (
      <AppShell>
        <BrandSection bg="milk" align="center" container="max-w-5xl">
          <div className="mx-auto flex max-w-md flex-col items-center">
            <PuffLottie name="think" size={160} alt="Пуфыч считает рацион" />
            <p className="mt-4 text-primary-500">Пуфыч рассчитывает рацион для {petName}…</p>
          </div>
        </BrandSection>
      </AppShell>
    )
  }

  if (state.error || !tiers.length || !selectedTier) {
    return (
      <AppShell>
        <BrandSection bg="milk" container="max-w-5xl">
          <BrandCard variant="default" padding="lg">
            <BrandEmptyState
              icon={<Sparkles className="h-8 w-8" />}
              title="Пока не удалось собрать рацион"
              description="Загляните в магазин — там уже есть товары для заботы о питомце."
              action={<BrandButton as={Link} to="/shop" variant="secondary">В магазин</BrandButton>}
            />
          </BrandCard>
        </BrandSection>
      </AppShell>
    )
  }

  const { bundle, profile, reasons } = state.data
  // Полная цена набора за выбранный период (корм + доп) — пересчитывается при смене 14/30.
  const bundleTotal = periodCostOf(selectedTier.product) + periodCostOf(bundle?.addon)

  const pickProduct = (pr) => (pr ? { id: pr.id, name: pr.name, brand_name: pr.brand_name, price: pr.price, image_url: pr.image_url } : null)

  // 1A: только сохраняем намерение + снапшот; питомца/корзину НЕ создаём.
  const startFunnelAuth = (type) => {
    savePendingFunnelAction({
      type,
      returnTo: '/recommendations',
      draft: { ...draft },
      selectedRation: {
        tierKey: selectedTier.key,
        periodDays,
        main: pickProduct(selectedTier.product),
        addon: pickProduct(bundle?.addon),
        total: bundleTotal,
      },
    })
    if (isAuthenticated) { startSavedAction(); return }
    navigate('/login?redirect=/recommendations')
  }

  return (
    <AppShell>
      <FunnelActionNotice actionError={actionError} savedNotice={savedNotice} onRetry={startSavedAction} />
      <PetPickerModal
        open={picker.open}
        pets={picker.pets}
        onPick={(id) => runPendingAction(id)}
        onCreateNew={() => runPendingAction(null)}
        onClose={closePicker}
      />
      <BrandSection bg="milk" container="max-w-6xl">
        <div className="text-center">
          <div className="flex justify-center">
            <PuffLottie name="celebrate_jump2" size={120} alt="Пуфыч радуется" />
          </div>
          <BrandBadge variant="gold" className="mt-2"><Sparkles className="mr-1 h-3.5 w-3.5" /> Рацион готов</BrandBadge>
          <h1 className="mt-3 font-heading text-3xl font-bold text-primary-800 md:text-4xl">Рацион для {petName} готов</h1>
          <p className="mx-auto mt-2 max-w-2xl text-primary-600">
            Пуфыч учёл возраст, вес, особенности здоровья, бюджет и цель владельца.
          </p>
        </div>
        <ProfileChips profile={profile} />
      </BrandSection>

      <BrandSection bg="milk" container="max-w-6xl" className="pt-0">
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <ParamsCard petName={petName} ration={ration} periodDays={periodDays} profile={profile} />
            <RationConstructor
              tiers={tiers}
              selectedKey={selectedTier.key}
              onSelect={setSelectedKey}
              periodDays={periodDays}
              periodCostOf={periodCostOf}
            />
          </div>
          <CalcCard ration={ration} />
        </div>
      </BrandSection>

      <BrandSection bg="white" container="max-w-6xl">
        <BundleSection
          main={selectedTier.product}
          addon={bundle?.addon}
          addonLabel={bundle?.addonLabel}
          periodDays={periodDays}
          setPeriodDays={setPeriodDays}
          total={bundleTotal}
          periodCostOf={periodCostOf}
          onAddToCart={() => startFunnelAuth('add_ration_to_cart')}
        />
      </BrandSection>

      <BrandSection bg="milk" container="max-w-6xl" id="why">
        <WhyBlock reasons={reasons} petName={petName} />
      </BrandSection>

      <BrandSection bg="gradient" container="max-w-5xl">
        <SaveBlock onSave={() => startFunnelAuth('save_ration')} onCreateProfile={() => startFunnelAuth('create_pet_profile')} />
      </BrandSection>
    </AppShell>
  )
}
