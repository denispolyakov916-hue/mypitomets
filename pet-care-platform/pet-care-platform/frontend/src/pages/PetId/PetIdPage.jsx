/**
 * PetIdPage - Главная страница управления питомцами (PetID)
 * 
 * Отображает список питомцев пользователя с карточками и
 * возможностью создания/редактирования профилей.
 * Поддерживает черновики профилей.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, QrCode, Edit, Share2, Trash2,
  AlertCircle, Heart, Activity,
  FileEdit, Clock, ChevronRight, UtensilsCrossed, BarChart3,
  MoreVertical, Stethoscope, BookOpen, Search, Sparkles, ClipboardList,
} from 'lucide-react';
import { getPets, createPet, updatePet, updatePetPartial, deletePet, getPetAnalysis, savePetDraft } from '../../api/pets';
import PetCreateForm from './components/PetCreateForm';
import PetProfileEditor from './components/PetProfileEditor';
import { PageLoader } from '../../components/Loader';
import { EmptyState } from '../../components/ui/EmptyState';

// Иконка вида животного
const getSpeciesEmoji = (species) => {
  const emojis = {
    dog: '🐕',
    cat: '🐱',
    bird: '🐦',
    fish: '🐠',
    rodent: '🐹',
    reptile: '🦎',
    other: '🐾'
  };
  return emojis[species] || '🐾';
};

// Название вида на русском
const getSpeciesName = (species) => {
  const names = {
    dog: 'Собака',
    cat: 'Кошка',
    bird: 'Птица',
    fish: 'Рыбка',
    rodent: 'Грызун',
    reptile: 'Рептилия',
    other: 'Другое'
  };
  return names[species] || 'Питомец';
};

// Цвет прогресс-бара по проценту заполнения
const getProgressColor = (percent) => {
  if (percent >= 80) return 'from-green-500 to-emerald-500';
  if (percent >= 50) return 'from-yellow-500 to-accent-500';
  return 'from-red-500 to-accent-500';
};

const SPECIES_ACCENT = {
  dog: { border: 'border-l-amber-400', tint: 'from-amber-50/70 to-white' },
  cat: { border: 'border-l-violet-400', tint: 'from-violet-50/70 to-white' },
  bird: { border: 'border-l-sky-400', tint: 'from-sky-50/70 to-white' },
  fish: { border: 'border-l-cyan-400', tint: 'from-cyan-50/70 to-white' },
  rodent: { border: 'border-l-orange-400', tint: 'from-orange-50/70 to-white' },
  reptile: { border: 'border-l-emerald-400', tint: 'from-emerald-50/70 to-white' },
  other: { border: 'border-l-gray-300', tint: 'from-gray-50/60 to-white' },
};

function getSpeciesAccent(species) {
  return SPECIES_ACCENT[species] || SPECIES_ACCENT.other;
}

/** Следующий шаг заполнения профиля по полям питомца */
function getNextProfileStep(pet) {
  const pct = pet.profile_completeness ?? 0;
  if (pct >= 100) return null;
  if (!pet.breed && !pet.breed_name && !pet.breed_id) return 'Укажите породу';
  if (!(pet.weight_kg || pet.weight)) return 'Добавьте вес';
  if (!pet.date_of_birth) return 'Укажите дату рождения';
  if (!pet.activity_level) return 'Укажите уровень активности';
  const g = pet.sex || pet.gender;
  if (!g || g === 'unknown') return 'Укажите пол';
  if (!pet.photo) return 'Добавьте фото питомца';
  return 'Дополните профиль для точных рекомендаций';
}

/** Строка «сегодня» из localStorage дневника (без API) */
function getDiaryTodayLine(petId) {
  try {
    const raw = localStorage.getItem(`calendar_events_${petId}`);
    if (!raw) return null;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr) || arr.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayEv = arr.filter((e) => {
      const d = new Date(e.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });
    if (todayEv.length === 0) return null;
    if (todayEv.length === 1) return `Сегодня в дневнике: «${todayEv[0].title}»`;
    return `Сегодня в дневнике: ${todayEv.length} события`;
  } catch {
    return null;
  }
}

function petHasDiaryEntries(petId) {
  try {
    const raw = localStorage.getItem(`calendar_events_${petId}`);
    if (!raw) return false;
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

// ============================================
// КОМПОНЕНТ КАРТОЧКИ ПИТОМЦА
// ============================================

const PetCard = React.memo(({ pet, index, isFeatured, onEdit, onDelete, onViewAnalysis, onNavigate, onFoodRecommendation }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const accent = getSpeciesAccent(pet.species);
  const nextStep = getNextProfileStep(pet);
  const diaryToday = getDiaryTodayLine(pet.id);
  const microLine =
    diaryToday || (nextStep ? `Совет: ${nextStep}` : 'Можно записать событие в дневник или проверить напоминания');
  const completeness = pet.profile_completeness || 0;
  const badges = [];
  if (completeness >= 100) badges.push({ key: 'full', label: 'Профиль полон', className: 'bg-emerald-100 text-emerald-800' });
  if (petHasDiaryEntries(pet.id)) badges.push({ key: 'diary', label: 'Дневник ведётся', className: 'bg-sky-100 text-sky-800' });

  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    if (menuOpen) document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const imgHeight = isFeatured ? 'min-h-[14rem] sm:min-h-[16rem]' : 'min-h-[12rem]';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35, type: 'spring', stiffness: 380, damping: 28 }}
      className={`rounded-2xl shadow-sm overflow-hidden border border-gray-100/80 bg-gradient-to-br ${accent.tint} border-l-4 ${accent.border} transition-shadow hover:shadow-md ${
        isFeatured ? 'ring-2 ring-primary-300/70 shadow-md md:scale-[1.02] md:z-[1]' : ''
      }`}
    >
      {isFeatured && (
        <div className="px-3 py-1.5 bg-gradient-to-r from-primary-600/90 to-accent-500/90 text-white text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0" />
          Питомец дня
        </div>
      )}

      <div className={`relative ${imgHeight} bg-gradient-to-br from-primary-100 to-accent-100`}>
        <button
          type="button"
          className="absolute inset-0 w-full text-left cursor-pointer group/img"
          onClick={() => onNavigate(pet.id)}
        >
          {pet.photo ? (
            <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover min-h-[inherit]" />
          ) : (
            <div className="w-full h-full min-h-[inherit] flex items-center justify-center text-7xl">
              {getSpeciesEmoji(pet.species)}
            </div>
          )}
        </button>

        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/55 to-transparent pointer-events-none">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getProgressColor(completeness)} transition-all`}
                style={{ width: `${completeness}%` }}
              />
            </div>
            <span className="text-xs text-white font-medium shrink-0">{completeness}%</span>
          </div>
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1" ref={menuRef}>
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((o) => !o);
              }}
              className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white/95 text-gray-700 shadow-md hover:bg-white border border-gray-200/80"
              aria-expanded={menuOpen}
              aria-label="Ещё действия"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full mt-1 w-48 py-1 bg-white rounded-xl shadow-lg border border-gray-200 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(pet);
                    }}
                  >
                    <Edit className="w-4 h-4" /> Редактировать
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <QrCode className="w-4 h-4" /> QR-код
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Share2 className="w-4 h-4" /> Поделиться
                  </button>
                  <button
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete(pet);
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Удалить
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-5 bg-white/80 backdrop-blur-[2px]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{pet.name}</h3>
            <p className="text-gray-500 text-sm mt-0.5 line-clamp-2">
              {pet.breed_name || pet.breed || 'Порода не указана'} • {getSpeciesName(pet.species)}
            </p>
          </div>
          {(pet.age_years ?? pet.age) != null && (pet.age_years ?? pet.age) !== undefined && (
            <span className="px-2.5 py-1 bg-primary-100 text-primary-600 text-xs font-medium rounded-full shrink-0">
              {(() => {
                const age = pet.age_years ?? pet.age;
                return `${age} ${age === 1 ? 'год' : age < 5 ? 'года' : 'лет'}`;
              })()}
            </span>
          )}
        </div>

        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {badges.map((b) => (
              <span key={b.key} className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${b.className}`}>
                {b.label}
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-600 mt-2 line-clamp-2 flex items-start gap-1.5">
          <ClipboardList className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
          {microLine}
        </p>

        <div className="grid grid-cols-3 gap-2 mt-3">
          {(pet.weight_kg || pet.weight) && (
            <div className="text-center p-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Вес</p>
              <p className="font-semibold text-gray-700 text-sm">{pet.weight_kg || pet.weight} кг</p>
            </div>
          )}
          {pet.activity_level && (
            <div className="text-center p-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Активность</p>
              <p className="font-semibold text-gray-700 text-sm capitalize">
                {pet.activity_level === 'low' ? 'Низкая' : pet.activity_level === 'high' ? 'Высокая' : 'Средняя'}
              </p>
            </div>
          )}
          {(pet.sex || pet.gender) && (pet.sex || pet.gender) !== 'unknown' && (
            <div className="text-center p-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Пол</p>
              <p className="font-semibold text-gray-700 text-sm">{(pet.sex || pet.gender) === 'male' ? '♂ М' : '♀ Ж'}</p>
            </div>
          )}
        </div>

        {completeness < 50 && (
          <div className="mt-3 p-2.5 bg-accent-50 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-accent-600 shrink-0" />
            <p className="text-xs text-accent-800">Заполните профиль для персонализации магазина и курсов</p>
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigate(pet.id)}
          className="w-full mt-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-primary-600 to-accent-500 hover:shadow-lg transition-all flex items-center justify-center gap-2 min-h-[48px]"
        >
          Открыть профиль
          <ChevronRight className="w-4 h-4" />
        </button>

        <div className="flex flex-wrap gap-2 mt-3">
          <Link
            to={`/health-diary?pet_id=${encodeURIComponent(pet.id)}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-teal-50 text-teal-800 border border-teal-100 hover:bg-teal-100 transition-colors"
          >
            <Stethoscope className="w-3.5 h-3.5" />
            Дневник
          </Link>
          <Link
            to={`/food-recommendation?pet_id=${encodeURIComponent(pet.id)}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-amber-50 text-amber-900 border border-amber-100 hover:bg-amber-100 transition-colors"
          >
            <UtensilsCrossed className="w-3.5 h-3.5" />
            Корм
          </Link>
          <Link
            to="/courses"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-violet-50 text-violet-800 border border-violet-100 hover:bg-violet-100 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            Курсы
          </Link>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => onViewAnalysis(pet)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition-all text-sm font-medium"
          >
            <BarChart3 className="w-4 h-4" /> Анализ
          </button>
          <button
            type="button"
            onClick={() => onFoodRecommendation(pet)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 min-h-[44px] bg-accent-50 text-accent-700 rounded-xl hover:bg-accent-100 transition-all text-sm font-medium"
          >
            <UtensilsCrossed className="w-4 h-4" /> Подбор
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// КОМПОНЕНТ КАРТОЧКИ ЧЕРНОВИКА (оптимизирован)
// ============================================

const DraftCard = React.memo(({ draft, index, onContinue, onDelete }) => {
  // Расчёт реального прогресса на основе заполненных полей
  const calculateDraftProgress = () => {
    let filled = 0;
    let total = 10; // Всего базовых полей
    
    if (draft.name) filled++;
    if (draft.species) filled++;
    if (draft.breed) filled++;
    if (draft.gender) filled++;
    if (draft.date_of_birth) filled++;
    if (draft.weight) filled++;
    if (draft.health_issues?.length > 0) filled++;
    if (draft.excluded_ingredients?.length > 0) filled++;
    if (draft.activity_level || draft.housing_type) filled++;
    if (draft.behavioral_problems?.length > 0) filled++;
    
    return Math.round((filled / total) * 100);
  };
  
  const progress = calculateDraftProgress();
  const draftStep = draft.draft_step || 1;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index || 0) * 0.05, duration: 0.35 }}
      className="rounded-2xl border-2 border-dashed border-amber-300/90 bg-gradient-to-br from-amber-50 via-orange-50/80 to-secondary-50 shadow-sm overflow-hidden ring-1 ring-amber-200/50"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Иконка */}
          <div className="w-14 h-14 rounded-xl bg-white/90 shadow-md border border-amber-200/60 flex items-center justify-center text-3xl">
            {draft.species ? getSpeciesEmoji(draft.species) : '📝'}
          </div>
          
          {/* Информация */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 text-amber-900 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 border border-amber-400/40">
                <FileEdit className="w-3 h-3" />
                Черновик
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mt-1.5 truncate">
              {draft.name || 'Без имени'}
            </h3>
            <p className="text-gray-600 text-sm">
              {draft.breed || (draft.species ? getSpeciesName(draft.species) : 'Вид не выбран')}
            </p>
            
            {/* Прогресс */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-secondary-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-secondary-400 to-accent-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-secondary-600 font-medium">
                {progress}%
              </span>
            </div>
            <p className="text-xs text-secondary-500 mt-1">
              Шаг {draftStep} из 4
            </p>
          </div>
        </div>

        {/* Действия */}
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={() => onContinue(draft)}
            className="flex-1 min-h-[48px] flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-secondary-500 to-accent-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            Продолжить
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(draft)}
            className="p-2.5 min-w-[48px] min-h-[48px] flex items-center justify-center bg-white text-gray-500 rounded-xl border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all"
            title="Удалить черновик"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Время */}
        {draft.updated_at && (
          <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>
              Изменён {new Date(draft.updated_at).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

// ============================================
// ПУСТОЕ СОСТОЯНИЕ (использует общий EmptyState)
// ============================================

const PetsEmptyState = React.memo(({ onCreateClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
  >
    <div className="px-6 sm:px-10 py-8 sm:py-10 bg-gradient-to-b from-primary-50/80 via-white to-white">
      <EmptyState
        icon="🐾"
        title="У вас ещё нет питомцев"
        description="PetID — цифровой паспорт: один раз заполняете данные — дальше персональные подсказки по уходу, корму и обучению."
        size="lg"
        action={
          <button
            type="button"
            onClick={onCreateClick}
            className="px-8 py-4 bg-gradient-to-r from-primary-600 to-accent-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-all flex items-center gap-2 min-h-[52px]"
          >
            <Plus className="w-5 h-5" />
            Добавить питомца
          </button>
        }
      >
        <p className="text-center text-sm text-gray-500 mt-4 max-w-xl mx-auto">
          Присоединяйтесь к сообществу заботливых хозяев — ведите профили питомцев в одном месте.
        </p>

        <div className="mt-10 max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide text-center mb-4">
            Зачем нужен PetID — три шага
          </p>
          <ol className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <li className="flex gap-3 rounded-2xl border border-primary-100 bg-primary-50/50 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600 text-white text-sm font-bold">1</span>
              <div>
                <h4 className="font-semibold text-gray-900">Паспорт</h4>
                <p className="text-sm text-gray-600 mt-1">Порода, возраст, вес и особенности — основа для всех сервисов.</p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-accent-100 bg-accent-50/50 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white text-sm font-bold">2</span>
              <div>
                <h4 className="font-semibold text-gray-900">Рекомендации</h4>
                <p className="text-sm text-gray-600 mt-1">Корм, товары и курсы под вашего питомца, а не «в среднем по зоомагазину».</p>
              </div>
            </li>
            <li className="flex gap-3 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white text-sm font-bold">3</span>
              <div>
                <h4 className="font-semibold text-gray-900">Напоминания</h4>
                <p className="text-sm text-gray-600 mt-1">Прививки, визиты и дневник здоровья — меньше шансов что-то забыть.</p>
              </div>
            </li>
          </ol>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-10 text-left w-full border-t border-gray-100 pt-8">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Здоровье</h4>
              <p className="text-sm text-gray-500">Дневник событий и риски породы рядом с профилем</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-100 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5 text-accent-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">Удобство</h4>
              <p className="text-sm text-gray-500">Один профиль — магазин, курсы и подбор рациона</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <QrCode className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-gray-700">QR-паспорт</h4>
              <p className="text-sm text-gray-500">Быстрый доступ к ключевым данным при необходимости</p>
            </div>
          </div>
        </div>
      </EmptyState>
    </div>
  </motion.div>
));

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ
// ============================================

function pluralRu(n, one, few, many) {
  const abs = Math.abs(n) % 100;
  const rem = abs % 10;
  if (abs > 10 && abs < 20) return `${n} ${many}`;
  if (rem === 1) return `${n} ${one}`;
  if (rem >= 2 && rem <= 4) return `${n} ${few}`;
  return `${n} ${many}`;
}

export default function PetIdPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('updated');
  const [searchQuery, setSearchQuery] = useState('');

  const processedPets = useMemo(() => {
    let list = [...pets];
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name || '').toLowerCase().includes(q));
    if (sortBy === 'name') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ru'));
    } else {
      list.sort((a, b) => {
        const da = new Date(a.updated_at || a.created_at || 0).getTime();
        const db = new Date(b.updated_at || b.created_at || 0).getTime();
        return db - da;
      });
    }
    return list;
  }, [pets, sortBy, searchQuery]);

  const speciesSummary = useMemo(() => {
    if (pets.length < 2) return null;
    const m = {};
    pets.forEach((p) => {
      const sp = p.species || 'other';
      m[sp] = (m[sp] || 0) + 1;
    });
    const parts = [];
    if (m.dog) parts.push(pluralRu(m.dog, 'собака', 'собаки', 'собак'));
    if (m.cat) parts.push(pluralRu(m.cat, 'кошка', 'кошки', 'кошек'));
    const otherKeys = ['bird', 'fish', 'rodent', 'reptile', 'other'];
    const other = otherKeys.reduce((s, k) => s + (m[k] || 0), 0);
    if (other > 0) parts.push(pluralRu(other, 'другой питомец', 'других питомца', 'других питомцев'));
    return parts.join(' · ');
  }, [pets]);

  const featuredPetId = useMemo(() => {
    if (processedPets.length === 0) return null;
    const idx = new Date().getDate() % processedPets.length;
    return processedPets[idx].id;
  }, [processedPets]);

  // Оптимизация: используем useCallback для предотвращения лишних ререндеров
  const fetchPets = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await getPets();
      // API возвращает {pets: [...], count: ...} или {data: [...]}
      const allPets = response.data?.pets || response.pets || response.data || [];
      
      console.log('Loaded pets:', allPets);

      // Разделяем на готовые профили и черновики с оптимизацией
      const completedPets = [];
      const draftPets = [];

      allPets.forEach(pet => {
        if (pet.is_draft) {
          draftPets.push(pet);
        } else {
          completedPets.push(pet);
        }
      });

      // Используем функциональное обновление состояния для лучшей производительности
      setPets(completedPets);
      setDrafts(draftPets);
    } catch (err) {
      console.error('Ошибка загрузки питомцев:', err);
      // Не показываем ошибку пользователю - просто загружаем пустые массивы
      setPets([]);
      setDrafts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Загрузка питомцев и черновиков с оптимизацией
  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  // Оптимизированные обработчики с улучшенной UX
  const handleCreate = useCallback(async (formData, isDraft = false) => {
    setIsSubmitting(true);
    try {
      let result;
      if (isDraft) {
        // Сохранение черновика
        result = await savePetDraft(formData, editingDraft?.id);
        // Обновляем данные после сохранения черновика
        await fetchPets();
      } else {
        // Создание готового профиля
        if (editingDraft?.id) {
          result = await updatePet(editingDraft.id, { ...formData, is_draft: false });
        } else {
          result = await createPet(formData);
        }
        // Обновляем данные после успешного создания
        await fetchPets();
      }

      return result; // Возвращаем результат для обработки в PetWizard
    } catch (err) {
      console.error('Ошибка:', err);
      throw err; // Перебрасываем ошибку, чтобы PetWizard мог её обработать
    } finally {
      setIsSubmitting(false);
    }
  }, [editingDraft, fetchPets]);

  const handleUpdate = useCallback(async (formData, options = {}) => {
    if (!editingPet) return;

    setIsSubmitting(true);
    try {
      const payload = {
        ...formData,
        is_draft: options.isDraft ?? formData.is_draft ?? false,
        draft_step: options.draftStep ?? formData.draft_step ?? null,
      };
      if (options.partial) {
        await updatePetPartial(editingPet.id, payload);
      } else {
        await updatePet(editingPet.id, payload);
      }
      if (!options.partial) {
        setEditingPet(null);
      }
      await fetchPets();
    } catch (err) {
      console.error('Ошибка обновления питомца:', err);
      alert('Не удалось сохранить изменения. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  }, [editingPet, fetchPets]);

  const handleDelete = useCallback(async (pet, isDraft = false) => {
    const message = isDraft
      ? `Удалить черновик "${pet.name || 'Без имени'}"?`
      : `Вы уверены, что хотите удалить профиль "${pet.name}"?`;

    if (!window.confirm(message)) {
      return;
    }

    try {
      await deletePet(pet.id);
      // Оптимистичное обновление состояния
      if (isDraft) {
        setDrafts(prev => prev.filter(p => p.id !== pet.id));
      } else {
        setPets(prev => prev.filter(p => p.id !== pet.id));
      }
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert('Не удалось удалить');
      // В случае ошибки перезагружаем данные
      fetchPets();
    }
  }, [fetchPets]);

  // Продолжение заполнения черновика (оптимизировано)
  const handleContinueDraft = useCallback((draft) => {
    // Преобразуем данные черновика для формы
    const draftFormData = {
      ...draft,
      date_of_birth: draft.date_of_birth ? new Date(draft.date_of_birth) : null,
      health_issues: draft.health_issues || [],
      excluded_ingredients: draft.excluded_ingredients || [],
      behavioral_problems: draft.behavioral_problems || [],
    };
    setEditingDraft(draftFormData);
    setShowCreateModal(true);
  }, []);

  // Просмотр анализа питомца
  const handleViewAnalysis = useCallback((pet) => {
    navigate(`/pets/${pet.id}/analysis`);
  }, [navigate]);
  
  // Переход к подбору питания
  const handleFoodRecommendation = useCallback((pet) => {
    navigate(`/food-recommendation?pet_id=${pet.id}`);
  }, [navigate]);

  // Переход к детальной странице питомца
  const handleNavigateToPet = useCallback((petId) => {
    navigate(`/pet-id/${petId}`);
  }, [navigate]);

  // Закрытие модалки создания с оптимизацией
  const handleCloseCreateModal = useCallback(async (openEditor = false) => {
    setShowCreateModal(false);
    setEditingDraft(null);
    
    // Всегда обновляем список питомцев после закрытия
    await fetchPets();

    if (openEditor) {
      // Открываем редактор для последнего созданного питомца
      const response = await getPets();
      const allPets = response.data?.pets || response.pets || response.data || [];
      const completedPets = allPets.filter(p => !p.is_draft);
      if (completedPets.length > 0) {
        // Сортируем по дате создания и берём последнего
        const sortedPets = completedPets.sort((a, b) => 
          new Date(b.created_at || 0) - new Date(a.created_at || 0)
        );
        setEditingPet(sortedPets[0]);
      }
    }
  }, [fetchPets]);

  // Оптимизированная загрузка с плавными переходами
  if (isLoading) {
    return (
      <div className="page-container animate-fadeIn">
        {/* Скелетон для заголовка */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
            <div className="h-4 bg-gray-100 rounded w-64 animate-pulse" />
          </div>
          <div className="h-12 bg-gray-200 rounded-xl w-40 animate-pulse" />
        </div>

        {/* Скелетоны для карточек */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
              <div className="h-48 bg-gray-200" />
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-200 rounded-full" />
                  <div className="space-y-1">
                    <div className="h-5 bg-gray-200 rounded w-32" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3].map(j => (
                    <div key={j} className="h-16 bg-gray-100 rounded-xl" />
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="h-10 bg-gray-200 rounded-xl flex-1" />
                  <div className="h-10 bg-gray-100 rounded-xl w-10" />
                  <div className="h-10 bg-gray-100 rounded-xl w-10" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasPetsOrDrafts = pets.length > 0 || drafts.length > 0;

  return (
    <div className="page-container animate-fadeIn">
      <div className="relative rounded-3xl overflow-hidden mb-8 border border-primary-100/60 bg-gradient-to-br from-primary-50/90 via-white to-accent-50/70">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.12) 0%, transparent 45%), radial-gradient(circle at 80% 0%, rgba(251, 191, 36, 0.15) 0%, transparent 40%)',
          }}
        />
        <div className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-6 sm:p-8">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">
              Мои питомцы
            </h1>
            <p className="text-gray-600 mt-1">
              {pets.length > 0
                ? `${pets.length} ${pets.length === 1 ? 'питомец' : pets.length < 5 ? 'питомца' : 'питомцев'}`
                : 'Цифровые паспорта ваших питомцев'}
              {drafts.length > 0 && ` · ${drafts.length} ${drafts.length === 1 ? 'черновик' : drafts.length < 5 ? 'черновика' : 'черновиков'}`}
            </p>
            {speciesSummary && (
              <p className="text-sm text-primary-700/90 font-medium mt-2">В семье: {speciesSummary}</p>
            )}
          </div>

          {hasPetsOrDrafts && (
            <button
              type="button"
              onClick={() => { setEditingDraft(null); setShowCreateModal(true); }}
              className="flex items-center gap-2 px-6 py-3 min-h-[48px] bg-gradient-to-r from-primary-600 to-accent-500 text-white rounded-xl hover:shadow-lg transition-all font-semibold shrink-0"
            >
              <Plus className="w-5 h-5" />
              Добавить питомца
            </button>
          )}
        </div>
      </div>

      {pets.length >= 5 && (
        <div className="mb-6">
          <label className="sr-only" htmlFor="pet-id-search">Поиск по имени</label>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" aria-hidden />
            <input
              id="pet-id-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по кличке…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-primary-400 focus:border-primary-400"
            />
          </div>
        </div>
      )}

      {pets.length >= 2 && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm text-gray-500 mr-1">Сортировка:</span>
          <button
            type="button"
            onClick={() => setSortBy('updated')}
            className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
              sortBy === 'updated' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            По обновлению
          </button>
          <button
            type="button"
            onClick={() => setSortBy('name')}
            className={`px-4 py-2 rounded-xl text-sm font-medium min-h-[44px] transition-colors ${
              sortBy === 'name' ? 'bg-primary-600 text-white shadow-sm' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            По имени
          </button>
        </div>
      )}

      {/* Контент с плавными переходами */}
      <AnimatePresence mode="wait">
        {!hasPetsOrDrafts ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <PetsEmptyState onCreateClick={() => { setEditingDraft(null); setShowCreateModal(true); }} />
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Черновики с оптимизацией */}
            <AnimatePresence>
              {drafts.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-3xl border border-amber-200/60 bg-gradient-to-b from-amber-50/40 to-stone-50/30 p-5 sm:p-6"
                >
                  <h2 className="text-lg sm:text-xl font-bold text-amber-950 flex items-center gap-2 mb-1">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/25 text-amber-900">
                      <FileEdit className="w-5 h-5" />
                    </span>
                    Незавершённые профили
                    <span className="text-amber-800/80 font-semibold text-base">({drafts.length})</span>
                  </h2>
                  <p className="text-sm text-amber-900/70 mb-5 max-w-2xl">
                    Завершите мастер — черновики не участвуют в рекомендациях магазина и дневника, пока не станут полноценным PetID.
                  </p>
                  <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drafts.map((draft, index) => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        index={index}
                        onContinue={handleContinueDraft}
                        onDelete={(d) => handleDelete(d, true)}
                      />
                    ))}
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {pets.length > 0 && (
                <motion.div
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="rounded-3xl border border-gray-200/80 bg-white/60 p-5 sm:p-6 shadow-sm"
                >
                  {drafts.length > 0 && (
                    <h2 className="section-title text-gray-800 flex items-center gap-2 mb-1">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                        <Heart className="w-5 h-5" />
                      </span>
                      Готовые профили ({pets.length})
                    </h2>
                  )}
                  {drafts.length === 0 && pets.length > 0 && (
                    <h2 className="section-title text-gray-800 mb-4 flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-100 text-primary-700">
                        <Heart className="w-5 h-5" />
                      </span>
                      Ваши питомцы
                    </h2>
                  )}
                  {processedPets.length === 0 && searchQuery.trim() ? (
                    <p className="text-center text-gray-500 py-10">По запросу «{searchQuery.trim()}» никого не нашли — попробуйте другую кличку.</p>
                  ) : (
                    <motion.div layout className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {processedPets.map((pet, index) => (
                        <PetCard
                          key={pet.id}
                          pet={pet}
                          index={index}
                          isFeatured={pet.id === featuredPetId && processedPets.length > 1}
                          onEdit={setEditingPet}
                          onDelete={handleDelete}
                          onViewAnalysis={handleViewAnalysis}
                          onNavigate={handleNavigateToPet}
                          onFoodRecommendation={handleFoodRecommendation}
                        />
                      ))}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модалка создания PetID (одна страница) */}
      <AnimatePresence>
        {showCreateModal && (
          <PetCreateForm
            editingDraft={editingDraft}
            onClose={() => {
              setShowCreateModal(false);
              setEditingDraft(null);
              fetchPets();
            }}
          />
        )}
      </AnimatePresence>

      {/* Модалка редактирования */}
      <AnimatePresence>
        {editingPet && (
          <PetProfileEditor
            pet={editingPet}
            onClose={() => setEditingPet(null)}
            onSave={handleUpdate}
            isLoading={isSubmitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
