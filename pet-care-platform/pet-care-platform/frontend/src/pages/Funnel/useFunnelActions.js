/**
 * useFunnelActions — исполнение отложенного действия воронки на /recommendations.
 *
 * Сводит воедино:
 *   - запуск pending-действия после логина/клика по CTA (создать питомца / сохранить
 *     рацион / положить в корзину) РОВНО один раз, без «вечного» лоадера;
 *   - плашку выбора питомца: если у пользователя уже есть питомцы — даём выбрать
 *     существующего вместо создания нового (баг 12);
 *   - снятие спиннера при no_pending / in_flight (баг 10).
 */
import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPets } from '../../api/pets'
import { loadPendingFunnelAction } from '../../utils/pendingFunnelAction'
import { executePendingFunnelAction } from '../../utils/executePendingFunnelAction'

export function useFunnelActions() {
  const navigate = useNavigate()
  const [savedNotice, setSavedNotice] = useState(false)
  const [actionError, setActionError] = useState(false)
  const [picker, setPicker] = useState({ open: false, pets: [] })
  const executedRef = useRef(false)

  // chosenPetId — id питомца, выбранного в плашке (тогда нового не создаём).
  const runPendingAction = useCallback((chosenPetId = null) => {
    setSavedNotice(true)
    setActionError(false)
    setPicker({ open: false, pets: [] })
    executePendingFunnelAction({ navigate, chosenPetId }).then((r) => {
      if (r.ok) return // навигация увела со страницы — оставляем «готовим…» до ухода
      // Нет намерения / уже выполняется другим запуском — снимаем спиннер (баг 10).
      if (r.error === 'no_pending' || r.error === 'in_flight') {
        setSavedNotice(false)
        return
      }
      setActionError(true)
      setSavedNotice(false)
      executedRef.current = false // разрешаем повтор
    })
  }, [navigate])

  // Если у пользователя уже есть питомцы — сначала плашка выбора (баг 12);
  // для корзины питомец не нужен.
  const startSavedAction = useCallback(async () => {
    const pending = loadPendingFunnelAction()
    if (!pending || pending.type === 'add_ration_to_cart') { runPendingAction(); return }
    try {
      const res = await getPets({ is_draft: 'false' })
      const allPets = res?.pets || res?.data || res?.results || []
      // В плашке показываем только питомцев ТОГО ЖЕ вида, что и в анкете: иначе
      // собачий рацион можно ошибочно сохранить/добавить в корзину коту (и наоборот).
      // Если подходящих нет — падаем в runPendingAction (создастся новый нужного вида).
      const species = pending.draft?.species
      const pets = species && Array.isArray(allPets)
        ? allPets.filter((p) => p.species === species)
        : allPets
      if (Array.isArray(pets) && pets.length > 0) {
        setPicker({ open: true, pets })
        return
      }
    } catch { /* не удалось получить список — просто создаём нового, не блокируем */ }
    runPendingAction()
  }, [runPendingAction])

  // Идемпотентный запуск при возврате с логина: срабатывает РОВНО один раз
  // (executedRef), второй mount/StrictMode не плодит повтор. Сбрасывается при ошибке.
  const startOnceIfPending = useCallback(() => {
    if (executedRef.current) return
    if (!loadPendingFunnelAction()) return
    executedRef.current = true
    startSavedAction()
  }, [startSavedAction])

  const closePicker = useCallback(() => {
    setPicker({ open: false, pets: [] })
    setSavedNotice(false)
  }, [])

  return {
    savedNotice, actionError, picker,
    runPendingAction, startSavedAction, startOnceIfPending, closePicker,
  }
}
