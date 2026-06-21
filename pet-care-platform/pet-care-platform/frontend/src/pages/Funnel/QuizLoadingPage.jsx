/**
 * QuizLoadingPage — /pet-quiz/loading: Пуфыч подбирает, этапы расчёта, авто-переход.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, PuffLottie } from '../../components/brand'

const STAGES = [
  'Учитываем возраст и вес',
  'Проверяем здоровье и аллергии',
  'Сравниваем состав кормов',
  'Считаем стоимость на месяц',
]

export default function QuizLoadingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  useEffect(() => {
    const tick = setInterval(() => setStep((s) => Math.min(s + 1, STAGES.length)), 850)
    const go = setTimeout(() => navigate('/recommendations'), 850 * STAGES.length + 700)
    return () => { clearInterval(tick); clearTimeout(go) }
  }, [navigate])
  return (
    <AppShell>
      <BrandSection bg="milk" align="center">
        <div className="mx-auto flex max-w-md flex-col items-center text-center">
          <PuffLottie name="think" size={200} alt="Пуфыч подбирает" />
          <h1 className="mt-3 font-heading text-2xl font-bold text-primary-800 md:text-3xl">Пуфыч подбирает варианты…</h1>
          <ul className="mt-6 w-full space-y-3 text-left">
            {STAGES.map((s, idx) => {
              const done = idx < step
              return (
                <li key={s} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${done ? 'border-primary-100 bg-white' : 'border-transparent bg-primary-50/40'}`}>
                  <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${done ? 'bg-green-100 text-green-600' : 'bg-primary-100 text-primary-400'}`}>
                    {done ? <Check className="h-4 w-4" /> : <span className="h-2 w-2 animate-pulse rounded-full bg-current" />}
                  </span>
                  <span className={done ? 'text-primary-700' : 'text-primary-400'}>{s}</span>
                </li>
              )
            })}
          </ul>
        </div>
      </BrandSection>
    </AppShell>
  )
}
