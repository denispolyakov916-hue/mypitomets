import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/axios';
import BreedComparisonWidget from '../../components/PetID/BreedComparisonWidget';
import DietCalculationWidget from '../../components/PetID/DietCalculationWidget';
import HealthRiskAlertsWidget from '../../components/PetID/HealthRiskAlertsWidget';
import PersonalizedProductsList from '../../components/Shop/PersonalizedProductsList';

/**
 * Страница профиля питомца с персонализацией
 * 
 * Включает:
 * - Основную информацию о питомце
 * - Сравнение с эталоном породы
 * - Риски здоровья
 * - Расчет рациона
 * - Персонализированные товары
 */
const PetProfilePage = () => {
  const { petId } = useParams();
  const [pet, setPet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadPet();
  }, [petId]);

  const loadPet = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/pets/${petId}/`);
      setPet(response.data);
    } catch (err) {
      console.error('Error loading pet:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto p-6 flex flex-col items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="max-w-[1200px] mx-auto py-[100px] px-6 text-center text-red-600 text-lg">
        <p>Питомец не найден</p>
      </div>
    );
  }

  const tabBase = "flex-1 py-3 px-6 border-0 rounded-lg text-[15px] font-medium cursor-pointer transition-all duration-200 max-md:flex-[1_1_45%]";
  const tabActive = "bg-blue-500 text-white";
  const tabInactive = "bg-transparent text-gray-500 hover:bg-gray-50 hover:text-gray-800";

  return (
    <div className="max-w-[1200px] mx-auto p-6">
      {/* Шапка профиля */}
      <div className="flex items-center gap-6 p-8 bg-white rounded-xl shadow-md mb-6 max-md:flex-col max-md:text-center">
        <div className="w-[120px] h-[120px] rounded-full overflow-hidden bg-gray-50 flex items-center justify-center border-4 border-blue-500 shrink-0">
          {pet.photo ? (
            <img src={pet.photo} alt={pet.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-6xl">
              {pet.species === 'dog' ? '🐕' : '🐱'}
            </div>
          )}
        </div>
        
        <div>
          <h1 className="text-3xl max-md:text-2xl font-bold text-gray-800 mb-2">{pet.name}</h1>
          {pet.breed && <p className="text-lg text-gray-500 font-medium mb-3">{pet.breed}</p>}
          <div className="flex gap-3 text-sm text-gray-400 max-md:justify-center max-md:flex-wrap">
            <span>{pet.species === 'dog' ? 'Собака' : 'Кошка'}</span>
            {pet.age && <span>• {pet.age} лет</span>}
            {pet.weight && <span>• {pet.weight} кг</span>}
            {pet.gender && <span>• {pet.gender === 'male' ? 'Мальчик' : 'Девочка'}</span>}
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="flex gap-2 p-2 bg-white rounded-xl shadow-md mb-6 max-md:flex-wrap">
        <button
          className={`${tabBase} ${activeTab === 'overview' ? tabActive : tabInactive}`}
          onClick={() => setActiveTab('overview')}
        >
          Обзор
        </button>
        <button
          className={`${tabBase} ${activeTab === 'health' ? tabActive : tabInactive}`}
          onClick={() => setActiveTab('health')}
        >
          Здоровье
        </button>
        <button
          className={`${tabBase} ${activeTab === 'diet' ? tabActive : tabInactive}`}
          onClick={() => setActiveTab('diet')}
        >
          Питание
        </button>
        <button
          className={`${tabBase} ${activeTab === 'shop' ? tabActive : tabInactive}`}
          onClick={() => setActiveTab('shop')}
        >
          Товары
        </button>
      </div>

      {/* Контент */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="animate-slideUp">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BreedComparisonWidget petId={petId} />
              {pet.breed && (
                <HealthRiskAlertsWidget breedId={pet.breed_id} petAge={pet.age} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="animate-slideUp">
            {pet.breed ? (
              <HealthRiskAlertsWidget breedId={pet.breed_id} petAge={pet.age} />
            ) : (
              <div className="py-20 px-6 text-center bg-white rounded-xl shadow-md">
                <p className="text-base text-gray-500">Добавьте породу для просмотра генетических рисков</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="animate-slideUp">
            <DietCalculationWidget petId={petId} />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="animate-slideUp">
            <PersonalizedProductsList petId={petId} limit={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PetProfilePage;
