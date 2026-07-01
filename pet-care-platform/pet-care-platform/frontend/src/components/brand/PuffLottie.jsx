/**
 * PuffLottie — маскот Пуфыч на Lottie. Ленивая загрузка нужной анимации из
 * /lottie/puff/{name}.json. Уважает prefers-reduced-motion и имеет статичный fallback.
 *
 * Доступные name см. в реестре ./puffAnimations.js (PUFF_ANIMATIONS): hello_wave,
 * hello_corner(2), think, talk_gesture(2), celebrate_jump2, banana2, sit, sit_down,
 * stand_up(2), stay, bored_yawn, teleport_in, teleport_out.
 *
 * onComplete вызывается, когда НЕциклическая (loop=false) анимация доиграла —
 * удобно для сценариев-цепочек (сыграть жест → вернуться в покой).
 */
import { useEffect, useState } from 'react'
import Lottie from 'lottie-react'

function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Модуль-уровневый кэш Lottie JSON по имени — без перекачивания при смене name.
const lottieCache = new Map()
function loadLottie(name) {
  if (!lottieCache.has(name)) {
    lottieCache.set(name, fetch(`/lottie/puff/puff_${name}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('not found')))))
  }
  return lottieCache.get(name)
}

export default function PuffLottie({
  name = 'stay',
  size = 160,
  loop = true,
  autoplay = true,
  className = '',
  alt = 'Пуфыч',
  onComplete,
}) {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reduced, setReduced] = useState(() => prefersReducedMotion())
  const box = { width: size, height: size }

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e) => setReduced(e.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])

  useEffect(() => {
    let alive = true
    setData(null)
    setFailed(false)
    loadLottie(name)
      .then((j) => { if (alive) setData(j) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [name])

  // Пока JSON грузится или при ошибке — ПУСТОЙ бокс (никаких старых картинок,
  // чтобы ничего не «мигало»; старый /purple-monster.png удалён из системы).
  if (failed || !data) {
    return <span style={box} className={`inline-block align-middle ${className}`} aria-label={alt} role="img" />
  }

  // reduced-motion → показываем НОВЫЙ маскот статично (без автоплея и цикла).
  return (
    <Lottie
      animationData={data}
      loop={reduced ? false : loop}
      autoplay={reduced ? false : autoplay}
      onComplete={onComplete}
      style={box}
      className={`select-none ${className}`}
      aria-label={alt}
      role="img"
    />
  )
}
