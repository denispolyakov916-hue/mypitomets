/**
 * executePendingFunnelAction — этап 1B.
 *
 * Выполняет сохранённое в 1A намерение из «Подбора питания» ПОСЛЕ авторизации
 * (или сразу, если пользователь уже авторизован):
 *   - create_pet_profile → создаём профиль питомца из анкеты, ведём на «Карточку питомца»;
 *   - save_ration        → создаём питомца + пишем выбранный корм в current_food, ведём на карточку;
 *   - add_ration_to_cart → кладём рацион в «Корзину», ведём в корзину (питомца НЕ создаём).
 *
 * Питомец создаётся как ЧЕРНОВИК (is_draft): анкета воронки не собирает пол (sex),
 * который обязателен для готового питомца на backend. Недостающее (пол, порода, фото)
 * пользователь дозаполняет на карточке. Ничего не выдумываем.
 *
 * Гарантия отсутствия дублей: id созданного питомца пишется обратно в
 * pendingFunnelAction (createdPetId). Повторный запуск (refresh) переиспользует его
 * и НЕ создаёт второго питомца. После успешного действия намерение очищается.
 *
 * Использует только существующие API: createPet, updatePetPartial, cartStore.addItem.
 */
import { createPet, updatePetPartial } from '../api/pets'
import { useCartStore } from '../store/cartStore'
import {
  loadPendingFunnelAction,
  clearPendingFunnelAction,
  updatePendingFunnelAction,
} from './pendingFunnelAction'

// Защита от двойного запуска (StrictMode double-effect / гонка mount + клик по CTA).
let inFlight = false

/** Возраст в годах (строка/число) → дата рождения 'YYYY-MM-DD' или null. */
function ageToDateOfBirth(age) {
  const years = parseFloat(age)
  if (!Number.isFinite(years) || years < 0) return null
  const whole = Math.floor(years)
  const months = Math.round((years - whole) * 12)
  const d = new Date()
  d.setFullYear(d.getFullYear() - whole)
  d.setMonth(d.getMonth() - months)
  return d.toISOString().split('T')[0]
}

/** Payload питомца из анкеты воронки — только поля, которые анкета реально собирает. */
function petPayloadFromDraft(draft = {}) {
  // is_draft: анкета не собирает пол (sex) — он обязателен для готового питомца,
  // поэтому сохраняем как черновик; пол/породу/фото владелец добавит на карточке.
  const payload = {
    name: (draft.name || '').trim() || 'Питомец',
    species: draft.species,
    is_draft: true,
  }
  const dob = ageToDateOfBirth(draft.age)
  if (dob) payload.date_of_birth = dob
  const weight = parseFloat(draft.weight)
  if (Number.isFinite(weight) && weight > 0) payload.weight_kg = weight
  if (typeof draft.neutered === 'boolean') payload.is_neutered = draft.neutered
  return payload
}

/** Создаёт питомца один раз; повторно переиспользует id из pending. Возвращает petId или null. */
async function ensurePet(pending) {
  if (pending.createdPetId) return { petId: pending.createdPetId, pet: null }
  if (!pending.draft || !pending.draft.species) return { petId: null, pet: null } // без вида питомца создать нельзя
  const res = await createPet(petPayloadFromDraft(pending.draft))
  const created = (res && res.data && res.data.data) || (res && res.data) || null
  const petId = created && created.id ? created.id : null
  if (petId) updatePendingFunnelAction({ createdPetId: petId })
  return { petId, pet: created }
}

/** Запасной путь: если корм не удалось записать в питомца — не теряем выбор пользователя. */
function saveRationFallback(petId, selectedRation) {
  try {
    // TODO(1C): перенести в полноценное хранилище рациона питомца (PetRation), когда появится API.
    localStorage.setItem(`petRationDraft:${petId}`, JSON.stringify(selectedRation || null))
  } catch { /* noop */ }
}

/** Сценарий 2: пишем выбранный корм в current_food (source:'other'); при ошибке — fallback. */
async function saveRationToPet(petId, selectedRation) {
  const main = selectedRation && selectedRation.main
  if (main && main.brand_name && main.name) {
    const currentFood = { source: 'other', brand_name: main.brand_name, product_name: main.name }
    try {
      await updatePetPartial(petId, { current_food: currentFood })
      return currentFood // отдаём наверх, чтобы сразу показать рацион в карточке без F5
    } catch { /* в карточку рацион не записать — уходим в fallback, не падаем */ }
  }
  saveRationFallback(petId, selectedRation)
  return null
}

/** Сценарий 3: кладём основной товар (и доп, если есть) в корзину существующим методом. */
async function addRationToCart(selectedRation) {
  const { addItem } = useCartStore.getState()
  const main = selectedRation && selectedRation.main
  const addon = selectedRation && selectedRation.addon
  if (main && main.id) await addItem(main.id, 1)
  if (addon && addon.id) await addItem(addon.id, 1)
}

/**
 * Выполнить отложенное действие воронки.
 * @param {{navigate?: function}} ctx
 * @returns {Promise<{ok: boolean, navigated?: boolean, petId?: number|string|null, error?: string}>}
 */
export async function executePendingFunnelAction({ navigate } = {}) {
  if (inFlight) return { ok: false, error: 'in_flight' }
  const pending = loadPendingFunnelAction()
  if (!pending) return { ok: false, error: 'no_pending' }

  inFlight = true
  try {
    // Сценарий 3: «Добавить рацион в корзину» — питомца НЕ создаём (продуктовое решение).
    // Пользователь хочет купить корм, а не заводить профиль; это убирает дубль-черновик.
    if (pending.type === 'add_ration_to_cart') {
      await addRationToCart(pending.selectedRation)
      clearPendingFunnelAction()
      if (navigate) navigate('/cart')
      return { ok: true, navigated: true, petId: null }
    }

    // Сценарии 1 (create_pet_profile) и 2 (save_ration): создаём питомца РОВНО один раз.
    // ensurePet переиспользует pending.createdPetId, поэтому повторный запуск
    // (refresh / повторный mount до очистки) не плодит дубль.
    const { petId, pet } = await ensurePet(pending)
    if (!petId) return { ok: false, error: 'pet_not_created' }

    // Bug 1: собираем свежие данные питомца, чтобы карточка показала их сразу (без F5).
    let freshPet = pet
    if (pending.type === 'save_ration') {
      const currentFood = await saveRationToPet(petId, pending.selectedRation)
      if (freshPet && currentFood) freshPet = { ...freshPet, current_food: currentFood }
    }

    // Намерение чистим только после успешного создания/сохранения, перед переходом.
    clearPendingFunnelAction()
    if (navigate) {
      navigate(`/pet-id/${petId}`, freshPet ? { state: { pet: freshPet } } : undefined)
    }
    return { ok: true, navigated: true, petId }
  } catch (e) {
    return { ok: false, error: (e && e.message) || 'execute_failed' }
  } finally {
    inFlight = false
  }
}
