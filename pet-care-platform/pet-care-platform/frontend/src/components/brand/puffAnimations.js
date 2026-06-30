/**
 * База анимаций маскота Пуфыч (Lottie) — единый реестр/манифест.
 *
 * Файлы лежат в /public/lottie/puff/puff_{name}.json и грузятся компонентом
 * <PuffLottie name="..."/>. Чтобы добавить анимацию: положи файл в
 * public/lottie/puff/ и добавь запись сюда.
 *
 * Поля записи:
 * - loop:  крутить циклично (покой/ожидание) или проиграть один раз (жест/событие)
 * - label: человеко-читаемое описание (для галереи в BrandKit)
 */

export const PUFF_ANIMATIONS = {
  // — Покой / ожидание (циклические) —
  bored_yawn:      { loop: true,  label: 'Скучает, зевает (покой)' },
  stay:            { loop: true,  label: 'Стоит, внимателен' },
  sit:             { loop: true,  label: 'Сидит' },
  think:           { loop: true,  label: 'Думает' },

  // — Приветствие (один раз) —
  hello_wave:      { loop: false, label: 'Машет рукой' },
  hello_corner:    { loop: false, label: 'Выглядывает из угла' },
  hello_corner2:   { loop: false, label: 'Выглядывает из угла (вариант)' },

  // — Разговор (один раз) —
  talk_gesture:    { loop: false, label: 'Говорит, жестикулирует' },
  talk_gesture2:   { loop: false, label: 'Говорит (вариант)' },

  // — Эмоции / события (один раз) —
  celebrate_jump2: { loop: false, label: 'Радуется, прыгает' },
  banana2:         { loop: false, label: 'Ест банан (пасхалка)' },

  // — Переходы поз (один раз) —
  sit_down:        { loop: false, label: 'Садится' },
  stand_up:        { loop: false, label: 'Встаёт' },
  stand_up2:       { loop: false, label: 'Встаёт (вариант)' },
  teleport_in:     { loop: false, label: 'Появляется (телепорт)' },
  teleport_out:    { loop: false, label: 'Исчезает (телепорт)' },
}

export const PUFF_ANIMATION_NAMES = Object.keys(PUFF_ANIMATIONS)
