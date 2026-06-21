/**
 * PetQuizPage — /pet-quiz: лёгкая пошаговая анкета (skeleton, локальное состояние).
 * Данные хранятся в черновике (localStorage); реальное сохранение питомца — позже.
 */
import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Cat, Dog } from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandButton, BrandInput, PuffLottie } from '../../components/brand'
import { loadQuizDraft, saveQuizDraft } from '../../utils/petQuizDraft'

const PUFF_STEPS = ['talk_gesture', 'talk_gesture2']

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

export default function PetQuizPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const draft0 = loadQuizDraft()
  const [data, setData] = useState({ ...draft0, species: sp.get('species') || draft0.species || '' })
  const [i, setI] = useState(data.species ? 1 : 0)

  const set = (patch) => setData((d) => { saveQuizDraft(patch); return { ...d, ...patch } })

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
      render: () => <BrandInput label="Имя" placeholder="Например, Пуф" value={data.name || ''} onChange={(e) => set({ name: e.target.value })} />,
    },
    {
      key: 'breed', title: 'Какая порода?', valid: () => true,
      render: () => <BrandInput label="Порода" placeholder="Например, Британская" helper="Можно пропустить, если беспородный" value={data.breed || ''} onChange={(e) => set({ breed: e.target.value })} />,
    },
    {
      key: 'age', title: 'Сколько лет питомцу?', valid: () => data.age !== '' && data.age != null,
      render: () => <BrandInput label="Возраст (лет)" type="number" min="0" step="0.5" placeholder="3" value={data.age || ''} onChange={(e) => set({ age: e.target.value })} />,
    },
    {
      key: 'weight', title: 'Сколько весит питомец?', valid: () => data.weight !== '' && data.weight != null,
      render: () => <BrandInput label="Вес (кг)" type="number" min="0" step="0.1" placeholder="4.5" value={data.weight || ''} onChange={(e) => set({ weight: e.target.value })} />,
    },
    {
      key: 'neutered', title: 'Питомец стерилизован?', valid: () => data.neutered != null,
      render: () => <PillRow value={data.neutered} onPick={(v) => set({ neutered: v })} options={[{ value: true, label: 'Да' }, { value: false, label: 'Нет' }]} />,
    },
    {
      key: 'health', title: 'Здоровье и аллергии', valid: () => true,
      render: () => <BrandInput label="Особенности здоровья / аллергии" placeholder="Например, чувствительное пищеварение" helper="Необязательно" value={data.health || ''} onChange={(e) => set({ health: e.target.value })} />,
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
  ]), [data])

  const step = steps[i]
  const isLast = i === steps.length - 1
  const progress = Math.round(((i + 1) / steps.length) * 100)
  const next = () => {
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
