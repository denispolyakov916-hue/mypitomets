/**
 * Единый реестр типов «Событий дневника» (backend CalendarEvent.EVENT_TYPES).
 *
 * Один источник иконок/подписей/акцентов для «Карточки питомца» и «Дневника здоровья».
 * Иконки — lucide-react (как в остальном UI карточки).
 */

import {
  Stethoscope, Syringe, Scissors, Cake, Pill,
  GraduationCap, Footprints, Bone, FileText,
} from 'lucide-react'

/**
 * Тип события: { value, label, shortLabel, description, icon, tint, accent }
 * tint — Tailwind-классы для квадрата иконки (как в reminderCategoryMeta карточки).
 */
export const EVENT_TYPES = {
  veterinary: {
    value: 'veterinary', label: 'Ветеринарный визит', shortLabel: 'Ветеринар',
    description: 'Плановый или внеплановый визит к ветеринару.',
    hint: 'Сохраните визит, осмотр или консультацию',
    placeholder: 'Например: Осмотр у ветеринара',
    icon: Stethoscope, tint: 'bg-red-100 text-red-700', accent: 'red',
    color: '#ef4444', bgColor: '#fee2e2',
  },
  vaccination: {
    value: 'vaccination', label: 'Прививка', shortLabel: 'Прививка',
    description: 'Вакцинация по графику.',
    hint: 'Запишите дату прививки и следующую контрольную дату, если нужно',
    placeholder: 'Например: Прививка Nobivac',
    icon: Syringe, tint: 'bg-emerald-100 text-emerald-700', accent: 'emerald',
    color: '#10b981', bgColor: '#d1fae5',
  },
  grooming: {
    value: 'grooming', label: 'Груминг', shortLabel: 'Груминг',
    description: 'Уход за шерстью и гигиена.',
    hint: 'Стрижка, мытьё, уход за когтями и шерстью',
    placeholder: 'Например: Стрижка когтей',
    icon: Scissors, tint: 'bg-violet-100 text-violet-700', accent: 'violet',
    color: '#C86BFA', bgColor: '#ede0ff',
  },
  birthday: {
    value: 'birthday', label: 'День рождения', shortLabel: 'День рождения',
    description: 'Дата рождения питомца.',
    hint: 'Отметьте дату рождения питомца',
    placeholder: 'Например: День рождения',
    icon: Cake, tint: 'bg-amber-100 text-amber-700', accent: 'amber',
    color: '#f59e0b', bgColor: '#fef8e0',
  },
  medication: {
    value: 'medication', label: 'Лекарства / обработка', shortLabel: 'Обработка',
    description: 'Приём лекарств, обработка от паразитов.',
    hint: 'Подойдёт для обработки от клещей, блох или приёма лекарства',
    placeholder: 'Например: Обработка от клещей',
    icon: Pill, tint: 'bg-rose-100 text-rose-700', accent: 'rose',
    color: '#e11d48', bgColor: '#ffe4e6',
  },
  training: {
    value: 'training', label: 'Тренировка', shortLabel: 'Тренировка',
    description: 'Занятие или тренировка.',
    hint: 'Занятие, дрессировка или тренировка',
    placeholder: 'Например: Занятие по послушанию',
    icon: GraduationCap, tint: 'bg-indigo-100 text-indigo-700', accent: 'indigo',
    color: '#6366f1', bgColor: '#e0e7ff',
  },
  walking: {
    value: 'walking', label: 'Прогулка', shortLabel: 'Прогулка',
    description: 'Прогулка с питомцем.',
    hint: 'Прогулка или активность на улице',
    placeholder: 'Например: Долгая прогулка в парке',
    icon: Footprints, tint: 'bg-sky-100 text-sky-700', accent: 'sky',
    color: '#0ea5e9', bgColor: '#e0f2fe',
  },
  feeding: {
    value: 'feeding', label: 'Кормление', shortLabel: 'Кормление',
    description: 'Кормление по расписанию.',
    hint: 'Кормление или смена рациона',
    placeholder: 'Например: Новый корм',
    icon: Bone, tint: 'bg-amber-100 text-amber-700', accent: 'amber',
    color: '#f59e0b', bgColor: '#fef3c7',
  },
  other: {
    value: 'other', label: 'Заметка', shortLabel: 'Заметка',
    description: 'Произвольная запись в дневнике.',
    hint: 'Любое важное наблюдение о питомце',
    placeholder: 'Например: Аппетит стал лучше',
    icon: FileText, tint: 'bg-gray-100 text-gray-600', accent: 'gray',
    color: '#6b7280', bgColor: '#f3f4f6',
  },
}

export const DEFAULT_EVENT_TYPE = 'other'

/** Список для выпадающих списков при создании события. */
export const EVENT_TYPE_OPTIONS = Object.values(EVENT_TYPES)

/**
 * Маппинг старых localStorage-типов «Дневника здоровья» → backend CalendarEvent.
 * (vet/vaccine/grooming/birthday/other из HealthDiary.)
 */
export const LEGACY_TYPE_MAP = {
  vet: 'veterinary',
  vaccine: 'vaccination',
  grooming: 'grooming',
  birthday: 'birthday',
  other: 'other',
}

/** Мета типа события (с безопасным фолбэком на «Заметку»). */
export function getEventTypeMeta(type) {
  return EVENT_TYPES[type] || EVENT_TYPES[DEFAULT_EVENT_TYPE]
}

/** Старый тип localStorage → тип backend CalendarEvent. */
export function mapLegacyEventType(legacyType) {
  return LEGACY_TYPE_MAP[legacyType] || DEFAULT_EVENT_TYPE
}
