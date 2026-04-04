/**
 * Вторая шапка только на мобильных: тонкая полоска с переходом на главную.
 * Десктопный Navbar не затрагивается (md:hidden).
 */

import { NavLink } from 'react-router-dom'

const stripShadow = '0 2px 12px rgba(82, 47, 129, 0.22)'

function MobileHomeStrip() {
  return (
    <header
      className="md:hidden fixed top-0 left-0 right-0 z-[60] bg-primary-800/98 backdrop-blur-[6px]"
      style={{
        paddingTop: 'max(0px, env(safe-area-inset-top))',
        boxShadow: stripShadow,
      }}
    >
      <div className="mx-auto flex h-9 max-w-4xl items-center justify-center px-3 sm:px-4">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-2 rounded-full px-3 py-1 transition-colors active:scale-[0.98] ${
              isActive ? 'text-[#F0EB93]' : 'text-white/90 hover:text-white'
            }`
          }
          aria-label="ПИТОМЕЦПЛЮС — на главную"
        >
          <img
            src="/landing/logo-pitometsplus.png"
            alt=""
            className="h-6 w-6 shrink-0 object-contain"
            width={24}
            height={24}
          />
          <span className="text-xs font-semibold tracking-tight">Главная</span>
        </NavLink>
      </div>
      <div
        className="h-px w-full"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(253,224,71,0.35) 25%, rgba(253,224,71,0.65) 50%, rgba(253,224,71,0.35) 75%, transparent 100%)',
        }}
        aria-hidden
      />
    </header>
  )
}

export default MobileHomeStrip
