/**
 * StartPage — /start: вход в персонализацию подбора питания.
 * Если пользователь авторизован и у него уже есть сохранённые питомцы — предлагаем
 * ВЫБРАТЬ питомца (и сразу перейти к рекомендациям), а не заполнять анкету заново.
 * Иначе (нет питомцев / гость / «добавить нового») — выбор вида → анкета.
 */
import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Cat, Dog, ArrowRight, PawPrint, Plus } from 'lucide-react'
import AppShell from '../../components/app/AppShell'
import { BrandSection, BrandCard, PuffLottie } from '../../components/brand'
import { saveQuizDraft, clearQuizDraft } from '../../utils/petQuizDraft'
import { useAuthStore } from '../../store/authStore'
import { getPets } from '../../api/pets'

function speciesIcon(species) {
  if (species === 'cat') return <Cat className="h-6 w-6" />
  if (species === 'dog') return <Dog className="h-6 w-6" />
  return <PawPrint className="h-6 w-6" />
}

export default function StartPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const speciesHint = searchParams.get('species')
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const [pets, setPets] = useState([])
  const [loadingPets, setLoadingPets] = useState(true)
  const [addingNew, setAddingNew] = useState(false)

  useEffect(() => {
    let mounted = true
    const goNewQuiz = (sp) => { clearQuizDraft(); saveQuizDraft({ species: sp }); navigate(`/pet-quiz?species=${sp}`) }
    if (!isAuthenticated) {
      setLoadingPets(false)
      if (speciesHint) goNewQuiz(speciesHint) // гость с подсказкой вида — сразу в анкету
      return undefined
    }
    getPets({ is_draft: 'false' })
      .then(res => {
        const list = res?.pets || res?.data || res?.results || []
        const arr = Array.isArray(list) ? list : []
        if (!mounted) return
        // Нет анкет, но вид уже выбран на главной — не задерживаем выбором вида.
        if (arr.length === 0 && speciesHint) { goNewQuiz(speciesHint); return }
        setPets(arr)
      })
      .catch(() => { /* список не получили — покажем обычный выбор вида */ })
      .finally(() => { if (mounted) setLoadingPets(false) })
    return () => { mounted = false }
  }, [isAuthenticated, speciesHint, navigate])

  // Новый питомец: чистим черновик и идём в анкету.
  const chooseSpecies = (species) => {
    clearQuizDraft()
    saveQuizDraft({ species })
    navigate(`/pet-quiz?species=${species}`)
  }

  // Существующий питомец: открываем страницу подбора рациона (FoodRecommendationPage) по pet_id.
  const choosePet = (pet) => {
    navigate(`/food-recommendation?pet_id=${pet.id}`)
  }

  const hasPets = pets.length > 0
  const showSpeciesChoice = !loadingPets && (!hasPets || addingNew)
  const showPetPicker = !loadingPets && hasPets && !addingNew

  return (
    <AppShell>
      <BrandSection bg="milk" align="center">
        <div className="mx-auto max-w-2xl text-center">
          <PuffLottie name="talk_gesture" size={150} className="mx-auto" alt="Пуфыч помогает выбрать" />
          <h1 className="mt-2 font-heading text-3xl font-bold text-primary-800 md:text-4xl">
            {showPetPicker ? 'Для кого подбираем питание?' : 'Кто ваш питомец?'}
          </h1>
          <p className="mt-3 text-primary-600">
            {showPetPicker
              ? 'Выберите питомца из ваших анкет — или добавьте нового.'
              : 'Начнём подбор — это займёт пару минут.'}
          </p>
        </div>

        {loadingPets && (
          <div className="mx-auto mt-10 flex max-w-2xl justify-center">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        )}

        {/* Выбор из существующих анкет питомцев */}
        {showPetPicker && (
          <div className="mx-auto mt-8 grid max-w-2xl gap-4">
            {pets.map(pet => (
              <BrandCard
                key={pet.id}
                as="button"
                variant="default"
                hoverable
                clickable
                onClick={() => choosePet(pet)}
                className="flex w-full items-center gap-4 px-5 py-4 text-left"
              >
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-700">
                  {speciesIcon(pet.species)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-heading text-lg font-bold text-primary-800">{pet.name || 'Питомец'}</div>
                  <div className="truncate text-sm text-primary-500">
                    {pet.breed_name || pet.breed_display_name || (pet.species === 'cat' ? 'Кошка' : 'Собака')}
                    {pet.weight_kg ? ` · ${pet.weight_kg} кг` : ''}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 flex-shrink-0 text-violet-600" />
              </BrandCard>
            ))}
            <button
              type="button"
              onClick={() => setAddingNew(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary-200 px-5 py-4 text-sm font-semibold text-primary-700 transition-colors hover:border-primary-400 hover:bg-primary-50"
            >
              <Plus className="h-5 w-5" /> Добавить нового питомца
            </button>
          </div>
        )}

        {/* Выбор вида для нового питомца */}
        {showSpeciesChoice && (
          <>
            <div className="mx-auto mt-8 grid max-w-2xl gap-5 sm:grid-cols-2">
              <BrandCard as="button" variant="default" hoverable clickable onClick={() => chooseSpecies('cat')}
                className="group flex w-full flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
                  <Cat className="h-10 w-10" />
                </div>
                <span className="font-heading text-xl font-bold text-primary-800">Кошка</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-600">Выбрать <ArrowRight className="h-4 w-4" /></span>
              </BrandCard>
              <BrandCard as="button" variant="default" hoverable clickable onClick={() => chooseSpecies('dog')}
                className="group flex w-full flex-col items-center gap-4 py-10 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-primary-700 transition-colors group-hover:bg-primary-700 group-hover:text-white">
                  <Dog className="h-10 w-10" />
                </div>
                <span className="font-heading text-xl font-bold text-primary-800">Собака</span>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-violet-600">Выбрать <ArrowRight className="h-4 w-4" /></span>
              </BrandCard>
            </div>
            {hasPets && addingNew && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => setAddingNew(false)}
                  className="text-sm font-medium text-primary-600 underline hover:text-primary-800"
                >
                  ← Назад к моим питомцам
                </button>
              </div>
            )}
          </>
        )}
      </BrandSection>
    </AppShell>
  )
}
