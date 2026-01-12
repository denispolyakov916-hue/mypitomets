/**
 * PetIdPage - Главная страница управления питомцами (PetID)
 * 
 * Отображает список питомцев пользователя с карточками и
 * возможностью создания/редактирования профилей.
 * Поддерживает черновики профилей.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, QrCode, Edit, Share2, Trash2, 
  AlertCircle, TrendingUp, Heart, Activity,
  FileEdit, Clock, ChevronRight
} from 'lucide-react';
import { getPets, createPet, updatePet, deletePet, getPetAnalysis, savePetDraft } from '../../api/pets';
import PetWizard from './components/PetWizard';
import PetProfileEditor from './components/PetProfileEditor';
import { PageLoader } from '../../components/Loader';

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
  if (percent >= 50) return 'from-yellow-500 to-orange-500';
  return 'from-red-500 to-orange-500';
};

// ============================================
// КОМПОНЕНТ КАРТОЧКИ ПИТОМЦА (оптимизирован с React.memo)
// ============================================

const PetCard = React.memo(({ pet, index, onEdit, onDelete, onViewAnalysis }) => {
  const [showActions, setShowActions] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }} // Уменьшили задержку для плавности
      className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all group"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Фото питомца */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-orange-100">
        {pet.photo ? (
          <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-7xl">
            {getSpeciesEmoji(pet.species)}
          </div>
        )}
        
        {/* Прогресс заполнения */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-gradient-to-r ${getProgressColor(pet.profile_completeness)} transition-all`}
                style={{ width: `${pet.profile_completeness || 0}%` }}
              />
            </div>
            <span className="text-xs text-white font-medium">
              {pet.profile_completeness || 0}%
            </span>
          </div>
        </div>
        
        {/* Действия (при наведении) */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute top-3 right-3 flex gap-2"
            >
              <button
                onClick={() => onDelete(pet)}
                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg shadow-md transition-colors"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                className="p-2 bg-white/90 hover:bg-white text-purple-600 rounded-lg shadow-md transition-colors"
                title="QR-код"
              >
                <QrCode className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Информация о питомце */}
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-800">{pet.name}</h3>
            <p className="text-gray-500 text-sm mt-0.5">
              {pet.breed || 'Порода не указана'} • {getSpeciesName(pet.species)}
            </p>
          </div>
          {pet.age !== null && (
            <span className="px-2.5 py-1 bg-purple-100 text-purple-600 text-xs font-medium rounded-full">
              {pet.age} {pet.age === 1 ? 'год' : pet.age < 5 ? 'года' : 'лет'}
            </span>
          )}
        </div>

        {/* Основные характеристики */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          {pet.weight && (
            <div className="text-center p-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Вес</p>
              <p className="font-semibold text-gray-700">{pet.weight} кг</p>
            </div>
          )}
          {pet.activity_level && (
            <div className="text-center p-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Активность</p>
              <p className="font-semibold text-gray-700 capitalize">
                {pet.activity_level === 'low' ? 'Низкая' : pet.activity_level === 'high' ? 'Высокая' : 'Средняя'}
              </p>
            </div>
          )}
          {pet.gender && pet.gender !== 'unknown' && (
            <div className="text-center p-2 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-400">Пол</p>
              <p className="font-semibold text-gray-700">
                {pet.gender === 'male' ? '♂️ М' : '♀️ Ж'}
              </p>
            </div>
          )}
        </div>
        
        {/* Предупреждения/подсказки */}
        {pet.profile_completeness < 50 && (
          <div className="mt-3 p-2.5 bg-orange-50 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <p className="text-xs text-orange-600">
              Заполните профиль для персонализации
            </p>
          </div>
        )}

        {/* Действия */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onEdit(pet)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all font-medium"
          >
            <Edit className="w-4 h-4" /> Редактировать
          </button>
          <button 
            onClick={() => onViewAnalysis(pet)}
            className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all"
            title="Анализ профиля"
          >
            <TrendingUp className="w-4 h-4" />
          </button>
          <button className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all" title="Поделиться">
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================
// КОМПОНЕНТ КАРТОЧКИ ЧЕРНОВИКА (оптимизирован)
// ============================================

const DraftCard = React.memo(({ draft, onContinue, onDelete }) => {
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-dashed border-amber-200 overflow-hidden"
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Иконка */}
          <div className="w-14 h-14 rounded-xl bg-white shadow-sm flex items-center justify-center text-3xl">
            {draft.species ? getSpeciesEmoji(draft.species) : '📝'}
          </div>
          
          {/* Информация */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <FileEdit className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wider">
                Черновик
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800 mt-1">
              {draft.name || 'Без имени'}
            </h3>
            <p className="text-gray-500 text-sm">
              {draft.breed || (draft.species ? getSpeciesName(draft.species) : 'Вид не выбран')}
            </p>
            
            {/* Прогресс */}
            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1 h-1.5 bg-amber-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs text-amber-600 font-medium">
                {progress}%
              </span>
            </div>
            <p className="text-xs text-amber-500 mt-1">
              Шаг {draftStep} из 4
            </p>
          </div>
        </div>

        {/* Действия */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onContinue(draft)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            Продолжить
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(draft)}
            className="p-2.5 bg-white text-gray-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
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
// ПУСТОЕ СОСТОЯНИЕ (оптимизировано)
// ============================================

const EmptyState = React.memo(({ onCreateClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, ease: 'easeOut' }}
    className="text-center py-16 px-8 bg-white rounded-3xl shadow-sm"
  >
    <div className="text-8xl mb-6">🐾</div>
    <h3 className="text-2xl font-bold text-gray-800 mb-2">
      У вас ещё нет питомцев
    </h3>
    <p className="text-gray-500 mb-8 max-w-md mx-auto">
      Создайте цифровой паспорт для вашего любимца и получите 
      персонализированные рекомендации по уходу, питанию и обучению
    </p>
    <button
      onClick={onCreateClick}
      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-2xl font-medium hover:shadow-lg transition-all flex items-center gap-2 mx-auto"
    >
      <Plus className="w-5 h-5" />
      Добавить первого питомца
    </button>
    
    {/* Преимущества */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12 text-left">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Heart className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-700">Здоровье</h4>
          <p className="text-sm text-gray-500">Отслеживание здоровья и напоминания о прививках</p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
          <Activity className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-700">Рекомендации</h4>
          <p className="text-sm text-gray-500">Персональный подбор товаров и курсов</p>
        </div>
      </div>
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
          <QrCode className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-gray-700">QR-код</h4>
          <p className="text-sm text-gray-500">Быстрый доступ к профилю в экстренных случаях</p>
        </div>
      </div>
    </div>
  </motion.div>
));

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ СТРАНИЦЫ
// ============================================

export default function PetIdPage() {
  const [pets, setPets] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [editingDraft, setEditingDraft] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Оптимизация: используем useCallback для предотвращения лишних ререндеров
  const fetchPets = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await getPets();
      const allPets = response.pets || [];

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

  const handleUpdate = useCallback(async (formData) => {
    if (!editingPet) return;

    setIsSubmitting(true);
    try {
      await updatePet(editingPet.id, formData);
      setEditingPet(null);
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

  // Просмотр анализа с оптимизацией
  const handleViewAnalysis = useCallback(async (pet) => {
    try {
      const analysis = await getPetAnalysis(pet.id);
      console.log('Анализ профиля:', analysis);
      alert(`Профиль заполнен на ${analysis.analysis?.profile_completeness || 0}%`);
    } catch (err) {
      console.error('Ошибка получения анализа:', err);
    }
  }, []);

  // Закрытие модалки создания с оптимизацией
  const handleCloseCreateModal = useCallback(async (openEditor = false) => {
    setShowCreateModal(false);
    setEditingDraft(null);
    
    // Всегда обновляем список питомцев после закрытия
    await fetchPets();

    if (openEditor) {
      // Открываем редактор для последнего созданного питомца
      const response = await getPets();
      const allPets = response.pets || [];
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
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
            Мои питомцы
          </h1>
          <p className="text-gray-500 mt-1">
            {pets.length > 0 
              ? `${pets.length} ${pets.length === 1 ? 'питомец' : pets.length < 5 ? 'питомца' : 'питомцев'}`
              : 'Цифровые паспорта ваших питомцев'
            }
            {drafts.length > 0 && ` • ${drafts.length} ${drafts.length === 1 ? 'черновик' : 'черновика'}`}
          </p>
        </div>
        
        {hasPetsOrDrafts && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Добавить питомца
          </button>
        )}
      </div>

      {/* Тихая обработка ошибок - больше не показываем красное сообщение */}

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
            <EmptyState onCreateClick={() => setShowCreateModal(true)} />
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
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                    <FileEdit className="w-5 h-5 text-amber-500" />
                    Незавершённые профили ({drafts.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {drafts.map((draft, index) => (
                      <DraftCard
                        key={draft.id}
                        draft={draft}
                        onContinue={handleContinueDraft}
                        onDelete={(d) => handleDelete(d, true)}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Готовые профили с оптимизацией */}
            <AnimatePresence>
              {pets.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {drafts.length > 0 && (
                    <h2 className="text-lg font-semibold text-gray-700 mb-4">
                      Профили питомцев ({pets.length})
                    </h2>
                  )}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {pets.map((pet, index) => (
                      <PetCard
                        key={pet.id}
                        pet={pet}
                        index={index}
                        onEdit={setEditingPet}
                        onDelete={handleDelete}
                        onViewAnalysis={handleViewAnalysis}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Модалка создания (новый wizard) */}
      <AnimatePresence>
        {showCreateModal && (
          <PetWizard
            onClose={handleCloseCreateModal}
            onSubmit={handleCreate}
            isLoading={isSubmitting}
            editingDraft={editingDraft}
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
