/**
 * StartPage — /start: выбор вида питомца, вход в персонализацию.
 */
import { useNavigate } from 'react-router-dom'
import { Cat, Dog, ArrowRight } from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandCard, PuffLottie } from '../../components/brand'
import { saveQuizDraft } from '../../utils/petQuizDraft'

export default function StartPage() {
  const navigate = useNavigate()
  const choose = (species) => {
    saveQuizDraft({ species })
    navigate(`/pet-quiz?species=${species}`)
  }
  return (
    <AppShell>
      <BrandSection bg="milk" align="center">
        <div className="mx-auto max-w-2xl text-center">
          <PuffLottie name="talk_gesture" size={150} className="mx-auto" alt="Пуфыч помогает выбрать" />
          <h1 className="mt-2 font-heading text-3xl font-bold text-primary-800 md:text-4xl">Кто ваш питомец?</h1>
          <p className="mt-3 text-primary-600">Начнём подбор — это займёт пару минут.</p>
        </div>
        <div className="mx-auto mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
          <BrandCard as="button" variant="default" hoverable clickable onClick={() => choose('cat')}
            className="group flex w-full flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
              <Cat className="h-10 w-10" />
            </div>
            <span className="font-heading text-xl font-bold text-primary-800">Кошка</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-600">Выбрать <ArrowRight className="h-4 w-4" /></span>
          </BrandCard>
          <BrandCard as="button" variant="default" hoverable clickable onClick={() => choose('dog')}
            className="group flex w-full flex-col items-center gap-4 py-10 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
              <Dog className="h-10 w-10" />
            </div>
            <span className="font-heading text-xl font-bold text-primary-800">Собака</span>
            <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-600">Выбрать <ArrowRight className="h-4 w-4" /></span>
          </BrandCard>
        </div>
      </BrandSection>
    </AppShell>
  )
}
