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
      className="md:hidden pointer-events-none fixed inset-x-0 top-0 z-[70] flex justify-center bg-transparent px-3 pb-2"
      style={{
        paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.375rem)',
      }}
    >
      <div
        className={`pointer-events-auto flex w-full max-w-[min(100%,36rem)] min-h-9 items-center gap-2 overflow-hidden rounded-full px-3 py-1 sm:px-3.5 ${mobileHeaderStripGlassClass}`}
        style={{ boxShadow: stripInsetShine }}
      >
        <div className="min-w-0 flex-1" aria-hidden />
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex shrink-0 items-center justify-center rounded-full px-1.5 py-0.5 transition-all active:scale-[0.98] ${
              isActive ? 'opacity-100' : 'opacity-95 hover:opacity-100'
            }`
          }
          aria-label="Питомец плюс — на главную"
        >
          <span className="inline-block max-w-[12rem] text-center font-['Poppins',sans-serif] text-sm font-black leading-tight tracking-tight sm:max-w-none sm:text-[0.95rem]">
            <span className="text-primary-700">Питомец </span>
            <span className="text-accent-500">плюс</span>
          </span>
        </NavLink>
        <div className="flex min-w-0 flex-1 justify-end">
          <span
            className="inline-flex max-w-full min-w-0 items-center gap-0.5 rounded-full bg-gradient-to-b from-accent-300 via-accent-400 to-accent-500 py-0.5 pl-1 pr-1.5 text-[9px] font-semibold leading-tight tracking-tight text-primary-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.42),inset_0_-1px_0_rgba(0,0,0,0.06)] sm:gap-1 sm:py-0.5 sm:pl-1.5 sm:pr-2 sm:text-[10px]"
            title="Ням-коины (заглушка)"
          >
            <Coins className="h-3 w-3 shrink-0 text-primary-800 sm:h-3.5 sm:w-3.5" strokeWidth={2} aria-hidden />
            <span className="min-w-0 whitespace-nowrap">Ням-коины: 0</span>
          </span>
        </div>
      </div>
    </header>
  )
}

export default MobileHomeStrip
