/**
 * WeightSparkline — простой мини-график веса на чистом SVG (без сторонних библиотек).
 *
 * < 3 точек → «Недостаточно данных для графика».
 * 3+ точек → линия + тренд (растёт / снижается / стабилен, порог 3%).
 *
 * @param {Array<{ date: any, weight: number }>} points — по возрастанию даты.
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { formatWeightDisplay } from '../../constants/weight'

const STABLE_THRESHOLD = 0.03 // ±3% = «стабилен»

function computeTrend(points) {
  if (points.length < 2) return { status: 'insufficient' }
  const first = points[0].weight
  const last = points[points.length - 1].weight
  const deltaKg = last - first
  const pct = first ? deltaKg / first : 0
  let status = 'stable'
  if (pct > STABLE_THRESHOLD) status = 'up'
  else if (pct < -STABLE_THRESHOLD) status = 'down'
  return { status, deltaKg, last }
}

export default function WeightSparkline({ points = [] }) {
  if (!points || points.length < 3) {
    return (
      <div className="rounded-2xl bg-gray-50 px-3 py-2.5 text-center">
        <p className="text-xs text-gray-500">Недостаточно данных для графика</p>
        <p className="text-[11px] text-gray-400 mt-0.5">Запишите вес минимум 3 раза</p>
      </div>
    )
  }

  const W = 240
  const H = 56
  const PAD = 6
  const weights = points.map((p) => p.weight)
  const min = Math.min(...weights)
  const max = Math.max(...weights)
  const span = max - min || 1
  const stepX = (W - PAD * 2) / (points.length - 1)

  const coords = points.map((p, i) => {
    const x = PAD + i * stepX
    const y = PAD + (1 - (p.weight - min) / span) * (H - PAD * 2)
    return { x, y }
  })
  const linePts = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')
  const last = coords[coords.length - 1]

  const trend = computeTrend(points)
  const trendMeta = {
    up: { Icon: TrendingUp, label: 'Вес растёт', cls: 'text-amber-600' },
    down: { Icon: TrendingDown, label: 'Вес снижается', cls: 'text-sky-600' },
    stable: { Icon: Minus, label: 'Вес стабилен', cls: 'text-emerald-600' },
  }[trend.status] || { Icon: Minus, label: 'Вес стабилен', cls: 'text-emerald-600' }
  const { Icon } = trendMeta

  const ariaLabel = `Динамика веса: ${trendMeta.label.toLowerCase()}, последний замер ${formatWeightDisplay(trend.last)}, всего точек ${points.length}`

  return (
    <div className="rounded-2xl bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold text-gray-600">Динамика веса</span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trendMeta.cls}`}>
          <Icon className="w-3.5 h-3.5" /> {trendMeta.label}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-14"
        preserveAspectRatio="none"
        role="img"
        aria-label={ariaLabel}
      >
        <polyline
          points={linePts}
          fill="none"
          stroke="#522f81"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="2" fill="#a78bda" vectorEffect="non-scaling-stroke" />
        ))}
        <circle cx={last.x} cy={last.y} r="3.5" fill="#522f81" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex items-center justify-between mt-1 text-[11px] text-gray-400">
        <span>{formatWeightDisplay(min)}</span>
        <span className="font-semibold text-gray-600">сейчас {formatWeightDisplay(trend.last)}</span>
        <span>{formatWeightDisplay(max)}</span>
      </div>
    </div>
  )
}
