/**
 * Вторая шапка только на мобильных: бренд «Питомец плюс» по центру, справа — ням-коины.
 * Избранное / вишлист / корзина — в MobileRightActionsRail.
 */

import { NavLink } from 'react-router-dom'
import { Coins } from 'lucide-react'
import { mobileHeaderStripGlassClass } from './mobileLiquidGlass'

const stripInsetShine = 'inset 0 1px 0 rgba(255, 255, 255, 0.38)'

function MobileHomeStrip() {
  return (
    <header
      className="md:hidden pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center bg-transparent pl-3 pr-1 pb-2 sm:pr-1.5"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)',
      }}
    >
      <div
        className={`pointer-events-auto relative flex min-h-11 w-full max-w-[min(100%,36rem)] items-center overflow-hidden rounded-full py-1.5 pl-3 pr-0 sm:min-h-12 sm:py-2 sm:pl-3.5 sm:pr-0 ${mobileHeaderStripGlassClass}`}
        style={{ boxShadow: stripInsetShine }}
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `absolute left-1/2 top-1/2 z-0 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full px-1.5 py-0.5 transition-all active:scale-[0.98] ${
              isActive ? 'opacity-100' : 'opacity-95 hover:opacity-100'
            }`
          }
          aria-label="Питомец плюс — на главную"
        >
          <span className="inline-block text-center font-['Poppins',sans-serif] text-sm font-black leading-tight tracking-tight sm:text-[0.95rem]">
            <span className="text-primary-700">Питомец </span>
            <span className="text-accent-500">плюс</span>
          </span>
        </NavLink>
        <span
          className="relative z-[1] ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-b from-accent-300 via-accent-400 to-accent-500 py-1.5 pl-2.5 pr-4 text-xs font-semibold leading-tight tracking-tight text-primary-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(0,0,0,0.06)] sm:gap-2 sm:py-2 sm:pl-3 sm:pr-5 sm:text-sm"
          title="Ням-коины (заглушка)"
        >
          <Coins className="h-4 w-4 shrink-0 text-primary-800 sm:h-5 sm:w-5" strokeWidth={2} aria-hidden />
          <span className="whitespace-nowrap pr-0.5 tabular-nums">Ням-коины: 0</span>
        </span>
      </div>
    </header>
  )
}

export default MobileHomeStrip
