/**
 * PetEditPage - Страница расширенного профиля питомца (Этап 2)
 * 
 * Показывается сразу после создания PetID (Этап 1).
 * Отображает автозаполненные данные из породы и позволяет их редактировать.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Save, Sparkles, Info, CheckCircle2, 
  AlertCircle, Loader2, Home, UtensilsCrossed
} from 'lucide-react';
import { getPet, updatePet, updatePetPartial } from '../../api/pets';
import PetProfileEditor from './components/PetProfileEditor';

// Компонент баннера автозаполнения
const AutofillBanner = ({ petName, onDismiss }) => (
  <motion.div
    initial={{ opacity: 0, y: -20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-orange-50 rounded-2xl border border-purple-200"
  >
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 
                      flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-gray-800">
          Профиль {petName} создан! 🎉
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Некоторые данные были автоматически заполнены на основе породы и возраста. 
          Проверьте их и при необходимости измените.
        </p>
        <p className="text-sm text-gray-500 mt-2">
          Поля с меткой <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
            <Sparkles className="w-3 h-3" /> Авто
          </span> были заполнены автоматически.
        </p>
      </div>
      <button 
        onClick={onDismiss}
        className="text-gray-400 hover:text-gray-600 transition-colors p-1"
      >
        ✕
      </button>
    </div>
  </motion.div>
);

// Компонент карточки питомца (краткая информация)
const PetInfoCard = ({ pet }) => {
  const getSpeciesEmoji = () => {
    if (pet.species === 'dog') return '🐕';
    if (pet.species === 'cat') return '🐱';
    return '🐾';
  };
  
  const displayCompleteness = Math.min(pet.profile_completeness || 0, 100);
  
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
      <div className="flex items-center gap-4">
        {/* Фото */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-orange-100 
                        flex items-center justify-center overflow-hidden">
          {pet.photo ? (
            <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-4xl">{getSpeciesEmoji()}</span>
          )}
        </div>
        
        {/* Информация */}
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-800">{pet.name}</h2>
          <p className="text-gray-500">
            {pet.breed?.name || 'Порода не указана'} • {pet.sex === 'male' ? '♂ Мальчик' : '♀ Девочка'}
            {pet.age_months && (
              <span> • {Math.floor(pet.age_months / 12)} {Math.floor(pet.age_months / 12) === 1 ? 'год' : Math.floor(pet.age_months / 12) < 5 ? 'года' : 'лет'}</span>
            )}
          </p>
          
          {/* Прогресс */}
          <div className="mt-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm text-gray-600">Заполненность профиля</span>
              <span className="text-sm font-semibold text-purple-600">{displayCompleteness}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${displayCompleteness}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className={`h-full rounded-full ${
                  displayCompleteness >= 80 ? 'bg-green-500' : 
                  displayCompleteness >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                }`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PetEditPage() {
  const { petId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [pet, setPet] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [showAutofilledBanner, setShowAutofilledBanner] = useState(
    location.state?.isNewPet && location.state?.showAutofilledMessage
  );
  
  // Загрузка данных питомца
  useEffect(() => {
    const loadPet = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await getPet(petId);
        setPet(response.data || response);
      } catch (err) {
        console.error('Ошибка загрузки питомца:', err);
        setError('Не удалось загрузить данные питомца');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (petId) {
      loadPet();
    }
  }, [petId]);
  
  // Сохранение изменений
  const handleSave = useCallback(async (formData, options = {}) => {
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        is_draft: options.isDraft ?? formData.is_draft ?? false,
        draft_step: options.draftStep ?? formData.draft_step ?? null,
      };
      if (options.partial) {
        await updatePetPartial(petId, payload);
        return true;
      }
      await updatePet(petId, payload);
      // Перезагружаем данные
      const response = await getPet(petId);
      setPet(response.data || response);
      return true;
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [petId]);
  
  // Переход на главную
  const handleGoHome = useCallback(() => {
    navigate('/pet-id');
  }, [navigate]);
  
  // Переход к подбору корма
  const handleFoodRecommendation = useCallback(() => {
    navigate(`/food-recommendation?pet_id=${petId}`);
  }, [navigate, petId]);
  
  // Загрузка
  if (isLoading) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Загрузка профиля...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Ошибка
  if (error || !pet) {
    return (
      <div className="page-container animate-fadeIn">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {error || 'Питомец не найден'}
          </h2>
          <button
            onClick={handleGoHome}
            className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors"
          >
            Вернуться к питомцам
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="page-container animate-fadeIn">
      {/* Хедер */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={handleGoHome}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Паспорт {pet.name}
            </h1>
            <p className="text-gray-500 text-sm">
              Расширенный профиль питомца
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleFoodRecommendation}
            className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl 
                       hover:bg-orange-100 transition-colors font-medium"
          >
            <UtensilsCrossed className="w-4 h-4" />
            Подбор корма
          </button>
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl 
                       hover:bg-gray-200 transition-colors font-medium"
          >
            <Home className="w-4 h-4" />
            На главную
          </button>
        </div>
      </div>
      
      {/* Баннер автозаполнения (для новых питомцев) */}
      <AnimatePresence>
        {showAutofilledBanner && (
          <AutofillBanner 
            petName={pet.name}
            onDismiss={() => setShowAutofilledBanner(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Карточка питомца */}
      <PetInfoCard pet={pet} />
      
      {/* Редактор профиля (встроенный, не модальный) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <PetProfileEditor
          pet={pet}
          onSave={handleSave}
          onClose={handleGoHome}
          isLoading={isSaving}
          isEmbedded={true}
          showAutofilledFields={showAutofilledBanner}
        />
      </div>
    </div>
  );
}
