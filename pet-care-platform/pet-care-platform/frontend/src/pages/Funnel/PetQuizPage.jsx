/**
 * PetQuizPage — /pet-quiz: лёгкая пошаговая анкета (skeleton, локальное состояние).
 * Данные хранятся в черновике (localStorage); реальное сохранение питомца — позже.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Cat, Dog, Plus, X } from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandButton, BrandInput, PuffLottie } from '../../components/brand'
import { loadQuizDraft, saveQuizDraft } from '../../utils/petQuizDraft'
import { getBreeds, HEALTH_ISSUES_OPTIONS, EXCLUDED_INGREDIENTS_OPTIONS } from '../../api/pets'
import { hasValidAge, weightStepFor } from './petAge'

const PUFF_STEPS = ['talk_gesture', 'talk_gesture2']

/**
 * Подбор породы в анкете: вводим название → выбираем из списка (сохраняем breed_id).
 *
 * Список фильтруется по виду питомца (собака → только собаки, кошка → только кошки):
 * species передаётся в getBreeds, а при смене вида сбрасываем выбор/поиск.
 *
 * Поведение выпадашки повторяет дропдаун навбара: открывается по клику/клавиатуре,
 * закрывается по выбору / Escape / клику снаружи; НЕ всплывает сама и не залипает.
 */
function BreedQuizField({ species, value, breedId, onSet }) {
  const [search, setSearch] = useState(value || '')
  const [breeds, setBreeds] = useState([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const wrapRef = useRef(null)
  const prevSpecies = useRef(species)

  // Смена вида питомца → сбрасываем выбранную породу и поиск (нельзя оставить
  // собачью породу при выборе кошки). Делаем только при реальной смене species.
  useEffect(() => {
    if (prevSpecies.current !== species) {
      prevSpecies.current = species
      setSearch('')
      setBreeds([])
      setOpen(false)
      onSet({ breed: '', breed_id: null })
    }
  }, [species, onSet])

  // Дебаунс-загрузка пород по виду + поиску. Пустой ввод → показываем популярные.
  useEffect(() => {
    const q = (search || '').trim()
    const t = setTimeout(async () => {
      try {
        const params = q.length >= 1
          ? { species, search: q, limit: 8 }
          : { species, popular_only: true, limit: 8 }
        const r = await getBreeds(params)
        setBreeds(r?.breeds || [])
      } catch { setBreeds([]) }
    }, 250)
    return () => clearTimeout(t)
  }, [search, species])

  // Закрытие по клику снаружи / Escape (как дропдаун навбара).
  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const pick = (b) => {
    setSearch(b.name)
    onSet({ breed: b.name, breed_id: b.id })
    setBreeds([])
    setOpen(false)
    setActiveIdx(-1)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) { setOpen(true); return }
      setActiveIdx((i) => Math.min(i + 1, breeds.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && open && activeIdx >= 0 && breeds[activeIdx]) {
      e.preventDefault()
      pick(breeds[activeIdx])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showList = open && breeds.length > 0

  return (
    <div className="relative" ref={wrapRef}>
      <BrandInput
        label="Порода"
        placeholder="Например, Британская"
        helper="Начните вводить и выберите из списка. Можно пропустить, если беспородный"
        value={search}
        role="combobox"
        aria-expanded={showList}
        aria-autocomplete="list"
        onChange={(e) => { setSearch(e.target.value); setOpen(true); setActiveIdx(-1); onSet({ breed: e.target.value, breed_id: null }) }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <div className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-2xl border border-primary-100 bg-white shadow-card" role="listbox">
          {breeds.map((b, idx) => (
            <button
              key={b.id}
              type="button"
              role="option"
              aria-selected={breedId === b.id || idx === activeIdx}
              onClick={() => pick(b)}
              className={`block w-full px-4 py-2.5 text-left text-sm text-primary-800 ${idx === activeIdx ? 'bg-primary-50' : 'hover:bg-primary-50'}`}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Возраст: режим лет / месяцев / даты рождения. Для малышей корректно считается
 * через месяцы или ДР (раньше всегда годы×0.5 → у щенков/котят возраст врал).
 */
function AgeQuizField({ data, set }) {
  const mode = data.ageMode || 'years'
  const tabs = [
    { value: 'years', label: 'Лет' },
    { value: 'months', label: 'Месяцев' },
    { value: 'dob', label: 'Дата рождения' },
  ]
  const today = new Date().toISOString().split('T')[0]
  return (
    <div className="space-y-4">
      <div className="inline-flex flex-wrap gap-1 rounded-full bg-primary-50 p-1">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => set({ ageMode: t.value })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${mode === t.value ? 'bg-primary-700 text-white shadow-card' : 'text-primary-600 hover:text-primary-800'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {mode === 'years' && (
        <BrandInput label="Возраст (лет)" type="number" min="0" step="0.5" inputMode="decimal"
          helper="Для малышей удобнее месяцы или дата рождения"
          placeholder="3" value={data.ageYears ?? ''} onChange={(e) => set({ ageYears: e.target.value })} />
      )}
      {mode === 'months' && (
        <BrandInput label="Возраст (месяцев)" type="number" min="0" step="1" inputMode="numeric"
          placeholder="6" value={data.ageMonths ?? ''} onChange={(e) => set({ ageMonths: e.target.value })} />
      )}
      {mode === 'dob' && (
        <BrandInput label="Дата рождения" type="date" max={today}
          value={data.dob ?? ''} onChange={(e) => set({ dob: e.target.value })} />
      )}
    </div>
  )
}

/**
 * Здоровье/аллергии: чипы-подсказки (множественный выбор) + свободный ввод.
 * Раньше было только текстовое поле — теперь и список, и кастомный текст.
 */
function HealthQuizField({ data, set }) {
  const selected = Array.isArray(data.healthTags) ? data.healthTags : []
  const allergies = Array.isArray(data.allergyTags) ? data.allergyTags : []
  const healthOpts = HEALTH_ISSUES_OPTIONS.filter((o) => o.value !== 'none')
  const allergyOpts = EXCLUDED_INGREDIENTS_OPTIONS.filter((o) => o.value !== 'none')

  const toggle = (key, label) => {
    const next = selected.includes(label) ? selected.filter((x) => x !== label) : [...selected, label]
    set({ healthTags: next })
  }
  const toggleAllergy = (label) => {
    const next = allergies.includes(label) ? allergies.filter((x) => x !== label) : [...allergies, label]
    set({ allergyTags: next })
  }

  const Chip = ({ label, active, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-primary-700 text-white shadow-card' : 'border border-primary-100 bg-white text-primary-700 hover:bg-primary-50'}`}
    >
      {active ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}{label}
    </button>
  )

  return (
    <div className="space-y-5">
      <div>
        <div className="mb-2 text-sm font-medium text-primary-700">Особенности здоровья</div>
        <div className="flex flex-wrap gap-2">
          {healthOpts.map((o) => (
            <Chip key={o.value} label={o.label} active={selected.includes(o.label)} onClick={() => toggle(o.value, o.label)} />
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 text-sm font-medium text-primary-700">Аллергии / исключить ингредиенты</div>
        <div className="flex flex-wrap gap-2">
          {allergyOpts.map((o) => (
            <Chip key={o.value} label={o.label} active={allergies.includes(o.label)} onClick={() => toggleAllergy(o.label)} />
          ))}
        </div>
      </div>
      <BrandInput
        label="Своё описание"
        placeholder="Например, чувствительное пищеварение"
        helper="Необязательно — добавьте то, чего нет в списке"
        value={data.health || ''}
        onChange={(e) => set({ health: e.target.value })}
      />
    </div>
  )
}

function PillRow({ options, value, onPick }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onPick(o.value)}
            className={`min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-primary-700 text-white shadow-card' : 'border border-primary-100 bg-white text-primary-700 hover:bg-primary-50'}`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Заголовок поля «кастрация/стерилизация» — адаптируется под пол, если он известен. */
function neuterTitle(sex) {
  if (sex === 'male') return 'Питомец кастрирован?'
  if (sex === 'female') return 'Питомец стерилизована?'
  return 'Кастрация / стерилизация'
}

export default function PetQuizPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const draft0 = loadQuizDraft()
  const [data, setData] = useState({ ...draft0, species: sp.get('species') || draft0.species || '' })
  const [i, setI] = useState(data.species ? 1 : 0)

  const set = useCallback((patch) => setData((d) => { saveQuizDraft(patch); return { ...d, ...patch } }), [])

  const steps = useMemo(() => ([
    {
      key: 'species', title: 'Кто ваш питомец?', valid: () => !!data.species,
      render: () => (
        <div className="flex gap-3">
          {[{ value: 'cat', label: 'Кошка', Icon: Cat }, { value: 'dog', label: 'Собака', Icon: Dog }].map(({ value, label, Icon }) => (
            <button key={value} type="button" onClick={() => set({ species: value })}
              className={`flex flex-1 flex-col items-center gap-2 rounded-3xl border-2 py-6 transition ${data.species === value ? 'border-primary-600 bg-primary-50' : 'border-primary-100 hover:bg-primary-50'}`}>
              <Icon className="h-8 w-8 text-primary-700" />
              <span className="font-medium text-primary-800">{label}</span>
            </button>
          ))}
        </div>
      ),
    },
    {
      key: 'name', title: 'Как зовут питомца?', valid: () => !!(data.name || '').trim(),
      render: () => <BrandInput label="Имя" required placeholder="Например, Пуф"
        error={data._nameTouched && !(data.name || '').trim() ? 'Введите имя питомца' : undefined}
        value={data.name || ''}
        onChange={(e) => set({ name: e.target.value, _nameTouched: true })} />,
    },
    {
      key: 'breed', title: 'Какая порода?', valid: () => true,
      render: () => <BreedQuizField species={data.species} value={data.breed} breedId={data.breed_id} onSet={set} />,
    },
    {
      key: 'age', title: 'Сколько лет питомцу?', valid: () => hasValidAge(data),
      render: () => <AgeQuizField data={data} set={set} />,
    },
    {
      key: 'weight', title: 'Сколько весит питомец?', valid: () => data.weight !== '' && data.weight != null,
      render: () => <BrandInput label="Вес (кг)" type="number" min="0" inputMode="decimal"
        step={weightStepFor(data, data.weight)}
        helper="Для малышей и мелких пород шаг 0,05 кг"
        placeholder="4.5" value={data.weight || ''} onChange={(e) => set({ weight: e.target.value })} />,
    },
    {
      key: 'neutered', title: neuterTitle(data.sex), valid: () => data.neutered != null,
      render: () => <PillRow value={data.neutered} onPick={(v) => set({ neutered: v })} options={[{ value: true, label: 'Да' }, { value: false, label: 'Нет' }]} />,
    },
    {
      key: 'health', title: 'Здоровье и аллергии', valid: () => true,
      render: () => <HealthQuizField data={data} set={set} />,
    },
    {
      key: 'budget', title: 'Бюджет и цель', valid: () => !!data.budget,
      render: () => (
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-medium text-primary-700">Бюджет</div>
            <PillRow value={data.budget} onPick={(v) => set({ budget: v })} options={[{ value: 'economy', label: 'Экономно' }, { value: 'balanced', label: 'Сбалансированно' }, { value: 'premium', label: 'Премиум' }]} />
          </div>
          <div>
            <div className="mb-2 text-sm font-medium text-primary-700">Цель</div>
            <PillRow value={data.goal} onPick={(v) => set({ goal: v })} options={[{ value: 'maintain', label: 'Поддержание' }, { value: 'weight', label: 'Контроль веса' }, { value: 'sensitive', label: 'Чувствительность' }]} />
          </div>
        </div>
      ),
    },
  ]), [data, set])

  const step = steps[i]
  const isLast = i === steps.length - 1
  const progress = Math.round(((i + 1) / steps.length) * 100)
  const next = () => {
    if (step.key === 'name' && !step.valid()) { set({ _nameTouched: true }); return }
    if (!step.valid()) return
    if (isLast) navigate('/pet-quiz/loading')
    else setI((v) => v + 1)
  }

  return (
    <AppShell>
      <BrandSection bg="milk">
        <div className="mx-auto max-w-xl">
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-primary-400">
              <span>Шаг {i + 1} из {steps.length}</span><span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary-100">
              <div className="h-full rounded-full bg-gold-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex items-start gap-4">
            <PuffLottie name={PUFF_STEPS[i % PUFF_STEPS.length]} size={84} className="hidden flex-shrink-0 sm:block" alt="Пуфыч подсказывает" />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-2xl font-bold text-primary-800">{step.title}</h1>
              <div className="mt-5">{step.render()}</div>
            </div>
          </div>
          <div className="mt-8 flex items-center justify-between">
            <BrandButton variant="ghost" onClick={() => setI((v) => Math.max(0, v - 1))} disabled={i === 0} leftIcon={<ArrowLeft className="h-5 w-5" />}>Назад</BrandButton>
            <BrandButton variant="primary" onClick={next} disabled={!step.valid()} rightIcon={<ArrowRight className="h-5 w-5" />}>{isLast ? 'Подобрать' : 'Далее'}</BrandButton>
          </div>
        </div>
      </BrandSection>
    </AppShell>
  )
}
