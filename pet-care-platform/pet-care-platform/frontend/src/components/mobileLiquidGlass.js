/**
 * «Жидкое стекло»: правая плашка и шапка (разные градиенты).
 * Внешних теней и обводок нет; у шапки — только внутренний блик (задаётся в компоненте).
 */

/** Правая колонка избранное / вишлист / корзина */
export const mobileLiquidGlassSurfaceClass =
  'bg-gradient-to-b from-white/58 via-white/42 to-white/28 backdrop-blur-2xl backdrop-saturate-[1.85]'

/**
 * Капсула «Питомец плюс» (как на макете): тёплый тон слева → холоднее справа, сильное размытие.
 */
/** Лёгкая тонировка — без «молочной» плашки; фон страницы читается через blur */
export const mobileHeaderStripGlassClass =
  'bg-gradient-to-r from-[rgba(245,236,220,0.28)] via-white/[0.14] to-[rgba(228,234,242,0.24)] backdrop-blur-2xl backdrop-saturate-[1.75]'
