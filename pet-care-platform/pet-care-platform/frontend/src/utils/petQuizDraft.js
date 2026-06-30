/**
 * Черновик анкеты подбора (локальное состояние воронки до сохранения питомца).
 * Хранится в localStorage, чтобы пройти / → /start → /pet-quiz → /recommendations
 * без авторизации. Сохранение реального питомца — отдельный шаг после результата.
 */
const KEY = 'petQuizDraft'

export function loadQuizDraft() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}') || {}
  } catch {
    return {}
  }
}

export function saveQuizDraft(patch) {
  try {
    const next = { ...loadQuizDraft(), ...patch }
    localStorage.setItem(KEY, JSON.stringify(next))
    return next
  } catch {
    return patch
  }
}

export function clearQuizDraft() {
  try { localStorage.removeItem(KEY) } catch { /* noop */ }
}

/**
 * Собирает черновик подбора из УЖЕ сохранённого питомца — чтобы по «Подбор питания»
 * можно было выбрать существующего питомца и сразу получить рекомендации, НЕ заполняя
 * анкету заново. Поля соответствуют тем, что читает recommendationsAdapter
 * (species/breed/weight/neutered/allergyTags/healthTags).
 */
export function petToQuizDraft(pet) {
  if (!pet) return {}
  const weight = pet.weight_kg ?? pet.weight ?? null
  return {
    petId: pet.id,
    petName: pet.name || '',
    species: pet.species || 'dog',
    breed: pet.breed_name || pet.breed_display_name || pet.breed || '',
    weight: weight != null ? Number(weight) : null,
    neutered: typeof pet.is_neutered === 'boolean' ? pet.is_neutered : null,
    allergyTags: Array.isArray(pet.allergies)
      ? pet.allergies
      : Array.isArray(pet.excluded_ingredients) ? pet.excluded_ingredients : [],
    healthTags: Array.isArray(pet.health_issues) ? pet.health_issues : [],
    date_of_birth: pet.date_of_birth || null,
    fromExistingPet: true,
  }
}
