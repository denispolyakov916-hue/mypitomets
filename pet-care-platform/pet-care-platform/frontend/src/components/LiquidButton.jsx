/**
 * Кнопка в стиле «жидкого стекла» (liquid): морфинг границы по движению мыши,
 * градиентная заливка. Референс: стилистика кнопок магазина ПИТОМЕЦПЛЮС.
 *
 * Структура: обёртка с canvas (z-1) и контент (z-2). Цвета — primary и accent темы.
 */

import { useRef, useEffect, useCallback } from 'react'

const POINTS = 8
const VISCOSITY = 20
const MOUSE_DIST = 70
const DAMPING = 0.05
const PAD = 50

/** Точка контура с физикой от мыши */
function makePoint(x, y, level) {
  return {
    x: PAD + x,
    y: PAD + y,
    ix: PAD + x,
    iy: PAD + y,
    vx: 0,
    vy: 0,
    cx1: 0,
    cy1: 0,
    cx2: 0,
    cy2: 0,
    level,
  }
}

function movePoint(p, relMouseX, relMouseY, mouseDirX, mouseDirY, mouseSpeedX, mouseSpeedY) {
  p.vx += (p.ix - p.x) / (VISCOSITY * p.level)
  p.vy += (p.iy - p.y) / (VISCOSITY * p.level)

  const dx = p.ix - relMouseX
  const dy = p.iy - relMouseY
  const relDist = 1 - Math.sqrt(dx * dx + dy * dy) / MOUSE_DIST

  if ((mouseDirX > 0 && relMouseX > p.x) || (mouseDirX < 0 && relMouseX < p.x)) {
    if (relDist > 0 && relDist < 1) p.vx = (mouseSpeedX / 4) * relDist
  }
  p.vx *= 1 - DAMPING
  p.x += p.vx

  if ((mouseDirY > 0 && relMouseY > p.y) || (mouseDirY < 0 && relMouseY < p.y)) {
    if (relDist > 0 && relDist < 1) p.vy = (mouseSpeedY / 4) * relDist
  }
  p.vy *= 1 - DAMPING
  p.y += p.vy
}

/**
 * @param {React.RefObject<HTMLDivElement>} containerRef
 * @param {React.RefObject<HTMLCanvasElement>} canvasRef
 * @param {{ width: number, height: number }} size
 * @param {{ gradientStart: string, gradientEnd: string, background: string }} colors
 */
function useLiquidCanvas(containerRef, canvasRef, size, colors) {
  const stateRef = useRef({
    pointsA: [],
    pointsB: [],
    mouseX: 0,
    mouseY: 0,
    relMouseX: 0,
    relMouseY: 0,
    mouseLastX: 0,
    mouseLastY: 0,
    mouseDirX: 0,
    mouseDirY: 0,
    mouseSpeedX: 0,
    mouseSpeedY: 0,
    rafId: null,
  })

  const { width, height } = size
  const w = width || 160
  const h = height || 44

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const canvasW = w + PAD * 2
    const canvasH = h + PAD * 2
    canvas.width = canvasW
    canvas.height = canvasH

    const pointsA = []
    const pointsB = []

    const addPoint = (x, y) => {
      pointsA.push(makePoint(x, y, 1))
      pointsB.push(makePoint(x, y, 2))
    }

    const x0 = h / 2
    for (let j = 1; j < POINTS; j++) {
      addPoint(x0 + ((w - h) / POINTS) * j, 0)
    }
    addPoint(w - h / 5, 0)
    addPoint(w + h / 10, h / 2)
    addPoint(w - h / 5, h)
    for (let j = POINTS - 1; j > 0; j--) {
      addPoint(x0 + ((w - h) / POINTS) * j, h)
    }
    addPoint(h / 5, h)
    addPoint(-h / 10, h / 2)
    addPoint(h / 5, 0)

    stateRef.current.pointsA = pointsA
    stateRef.current.pointsB = pointsB

    const render = () => {
      const s = stateRef.current
      const rect = container.getBoundingClientRect()
      s.relMouseX = s.mouseX - rect.left + PAD
      s.relMouseY = s.mouseY - rect.top + PAD

      ctx.clearRect(0, 0, canvasW, canvasH)
      ctx.fillStyle = '#fff'
      ctx.fillRect(0, 0, canvasW, canvasH)

      pointsA.forEach((p, i) => {
        movePoint(p, s.relMouseX, s.relMouseY, s.mouseDirX, s.mouseDirY, s.mouseSpeedX, s.mouseSpeedY)
      })
      pointsB.forEach((p, i) => {
        movePoint(p, s.relMouseX, s.relMouseY, s.mouseDirX, s.mouseDirY, s.mouseSpeedX, s.mouseSpeedY)
      })

      const gradientX = Math.min(Math.max(s.relMouseX, 0), canvasW)
      const gradientY = Math.min(Math.max(s.relMouseY, 0), canvasH)
      const distance = Math.sqrt(
        Math.pow(gradientX - canvasW / 2, 2) + Math.pow(gradientY - canvasH / 2, 2)
      ) / Math.sqrt(Math.pow(canvasW / 2, 2) + Math.pow(canvasH / 2, 2))
      const gradient = ctx.createRadialGradient(
        gradientX,
        gradientY,
        300 + 300 * distance,
        gradientX,
        gradientY,
        0
      )
      gradient.addColorStop(0, colors.gradientStart)
      gradient.addColorStop(1, colors.gradientEnd)

      const groups = [pointsA, pointsB]
      for (let j = 0; j <= 1; j++) {
        const points = groups[j]
        ctx.fillStyle = j === 0 ? colors.background : gradient
        ctx.beginPath()
        ctx.moveTo(points[0].x, points[0].y)
        for (let i = 0; i < points.length; i++) {
          const p = points[i]
          const nextP = points[i + 1] ?? points[0]
          const cx = (p.x + nextP.x) / 2
          const cy = (p.y + nextP.y) / 2
          ctx.bezierCurveTo(p.x, p.y, cx, cy, cx, cy)
        }
        ctx.fill()
      }

      s.rafId = requestAnimationFrame(render)
    }

    render()
    return () => {
      if (stateRef.current.rafId) cancelAnimationFrame(stateRef.current.rafId)
    }
  }, [w, h, colors.gradientStart, colors.gradientEnd, colors.background])

  const onMouseMove = useCallback((e) => {
    const s = stateRef.current
    s.mouseSpeedX = e.pageX - s.mouseX
    s.mouseSpeedY = e.pageY - s.mouseY
    s.mouseDirX = s.mouseX < e.pageX ? 1 : s.mouseX > e.pageX ? -1 : 0
    s.mouseDirY = s.mouseY < e.pageY ? 1 : s.mouseY > e.pageY ? -1 : 0
    s.mouseX = e.pageX
    s.mouseY = e.pageY
  }, [])

  return onMouseMove
}

const defaultColors = {
  gradientStart: '#522f81',   // primary-700
  gradientEnd: '#fbba2d',    // accent-400
  background: '#a94fe0',    // primary-400 (бирюзовый в референсе заменён на фиолетовый)
}

/**
 * LiquidButton — кнопка с жидким эффектом границы.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children — текст/иконка внутри
 * @param {number} [props.width] — ширина (по умолчанию под контент, минимум ~120)
 * @param {number} [props.height] — высота
 * @param {string} [props.className] — доп. классы обёртки
 * @param {string} [props.innerClassName] — классы для .inner
 * @param {Object} [props.colors] — { gradientStart, gradientEnd, background }
 * @param {boolean} [props.asButton] — рендерить button (true) или span (false, для обёртки своей кнопки)
 */
function LiquidButton({
  children,
  width = 160,
  height = 44,
  className = '',
  innerClassName = '',
  colors = defaultColors,
  asButton = true,
  ...rest
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const onMouseMove = useLiquidCanvas(containerRef, canvasRef, { width, height }, colors)

  const style = {
    width: width ? `${width}px` : undefined,
    height: height ? `${height}px` : undefined,
  }

  const content = (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute -top-[50px] -right-[50px] -bottom-[50px] -left-[50px] z-[1]"
        aria-hidden
      />
      <span className={`inner relative z-[2] inline-flex items-center justify-center gap-1 ${innerClassName}`}>
        {children}
      </span>
    </>
  )

  const common = {
    ref: containerRef,
    onMouseMove,
    style: { ...style, minWidth: width ? `${width}px` : undefined, minHeight: height ? `${height}px` : undefined },
    className: `btn-liquid inline-flex items-center justify-center rounded-[27px] text-white font-bold text-sm tracking-wide text-center no-underline uppercase overflow-visible select-none ${className}`,
  }

  if (asButton) {
    return (
      <button type="button" {...common} {...rest}>
        {content}
      </button>
    )
  }
  return (
    <span {...common} {...rest}>
      {content}
    </span>
  )
}

export default LiquidButton
