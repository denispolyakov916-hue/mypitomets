/**
 * PetIdPage - Главная страница управления питомцами (PetID)
 * 
 * Отображает список питомцев пользователя с карточками и
 * возможностью создания/редактирования профилей.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, QrCode, Edit, Share2, Download, Trash2, 
  AlertCircle, TrendingUp, Heart, Activity
} from 'lucide-react';
import { getPets, createPet, updatePet, deletePet, getPetAnalysis } from '../../api/pets';
import PetQuickCreate from './components/PetQuickCreate';
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

// Компонент карточки питомца
const PetCard = ({ pet, index, onEdit, onDelete, onViewAnalysis }) => {
  const [showActions, setShowActions] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
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
};

// Пустое состояние
const EmptyState = ({ onCreateClick }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
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
      Создать первый Pet ID
    </button>
    
    {/* Преимущества */}
    <div className="grid grid-cols-3 gap-6 mt-12 text-left">
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
);

export default function PetIdPage() {
  const [pets, setPets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPet, setEditingPet] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Загрузка питомцев
  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      setError(null);
      const response = await getPets();
      setPets(response.pets || []);
    } catch (err) {
      console.error('Ошибка загрузки питомцев:', err);
      setError('Не удалось загрузить список питомцев');
    } finally {
      setIsLoading(false);
    }
  };

  // Создание питомца
  const handleCreate = async (formData) => {
    setIsSubmitting(true);
    try {
      await createPet(formData);
      setShowCreateModal(false);
      await fetchPets();
    } catch (err) {
      console.error('Ошибка создания питомца:', err);
      alert('Не удалось создать питомца. Попробуйте ещё раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Обновление питомца
  const handleUpdate = async (formData) => {
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
  };

  // Удаление питомца
  const handleDelete = async (pet) => {
    if (!window.confirm(`Вы уверены, что хотите удалить профиль "${pet.name}"?`)) {
      return;
    }
    
    try {
      await deletePet(pet.id);
      await fetchPets();
    } catch (err) {
      console.error('Ошибка удаления питомца:', err);
      alert('Не удалось удалить питомца');
    }
  };

  // Просмотр анализа
  const handleViewAnalysis = async (pet) => {
    try {
      const analysis = await getPetAnalysis(pet.id);
      console.log('Анализ профиля:', analysis);
      // TODO: показать модалку с анализом
      alert(`Профиль заполнен на ${analysis.analysis?.profile_completeness || 0}%`);
    } catch (err) {
      console.error('Ошибка получения анализа:', err);
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="page-container animate-fadeIn">
      {/* Заголовок */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-orange-500 bg-clip-text text-transparent">
            Pet ID
          </h1>
          <p className="text-gray-500 mt-1">
            {pets.length > 0 
              ? `${pets.length} ${pets.length === 1 ? 'питомец' : pets.length < 5 ? 'питомца' : 'питомцев'}`
              : 'Цифровые паспорта ваших питомцев'
            }
          </p>
        </div>
        
        {pets.length > 0 && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Добавить питомца
          </button>
        )}
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchPets}
            className="ml-auto px-4 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
          >
            Повторить
          </button>
        </div>
      )}

      {/* Контент */}
      {pets.length === 0 ? (
        <EmptyState onCreateClick={() => setShowCreateModal(true)} />
      ) : (
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
      )}

      {/* Модалка создания */}
      <AnimatePresence>
        {showCreateModal && (
          <PetQuickCreate
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreate}
            isLoading={isSubmitting}
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
