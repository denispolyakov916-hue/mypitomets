import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../api/axios';
import BreedComparisonWidget from '../../components/PetID/BreedComparisonWidget';
import DietCalculationWidget from '../../components/PetID/DietCalculationWidget';
import HealthRiskAlertsWidget from '../../components/PetID/HealthRiskAlertsWidget';
import PersonalizedProductsList from '../../components/Shop/PersonalizedProductsList';
import './PetProfilePage.css';

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
      <div className="pet-profile-page loading">
        <div className="spinner"></div>
        <p>Загрузка профиля...</p>
      </div>
    );
  }

  if (!pet) {
    return (
      <div className="pet-profile-page error">
        <p>Питомец не найден</p>
      </div>
    );
  }

  return (
    <div className="pet-profile-page">
      {/* Шапка профиля */}
      <div className="profile-header">
        <div className="pet-avatar">
          {pet.photo ? (
            <img src={pet.photo} alt={pet.name} />
          ) : (
            <div className="avatar-placeholder">
              {pet.species === 'dog' ? '🐕' : '🐱'}
            </div>
          )}
        </div>
        
        <div className="pet-info">
          <h1>{pet.name}</h1>
          {pet.breed && <p className="breed">{pet.breed}</p>}
          <div className="pet-meta">
            <span>{pet.species === 'dog' ? 'Собака' : 'Кошка'}</span>
            {pet.age && <span>• {pet.age} лет</span>}
            {pet.weight && <span>• {pet.weight} кг</span>}
            {pet.gender && <span>• {pet.gender === 'male' ? 'Мальчик' : 'Девочка'}</span>}
          </div>
        </div>
      </div>

      {/* Табы */}
      <div className="profile-tabs">
        <button
          className={activeTab === 'overview' ? 'active' : ''}
          onClick={() => setActiveTab('overview')}
        >
          Обзор
        </button>
        <button
          className={activeTab === 'health' ? 'active' : ''}
          onClick={() => setActiveTab('health')}
        >
          Здоровье
        </button>
        <button
          className={activeTab === 'diet' ? 'active' : ''}
          onClick={() => setActiveTab('diet')}
        >
          Питание
        </button>
        <button
          className={activeTab === 'shop' ? 'active' : ''}
          onClick={() => setActiveTab('shop')}
        >
          Товары
        </button>
      </div>

      {/* Контент */}
      <div className="profile-content">
        {activeTab === 'overview' && (
          <div className="tab-content overview-tab">
            <div className="widgets-grid">
              <BreedComparisonWidget petId={petId} />
              {pet.breed && (
                <HealthRiskAlertsWidget breedId={pet.breed_id} petAge={pet.age} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="tab-content health-tab">
            {pet.breed ? (
              <HealthRiskAlertsWidget breedId={pet.breed_id} petAge={pet.age} />
            ) : (
              <div className="no-breed-message">
                <p>Добавьте породу для просмотра генетических рисков</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'diet' && (
          <div className="tab-content diet-tab">
            <DietCalculationWidget petId={petId} />
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="tab-content shop-tab">
            <PersonalizedProductsList petId={petId} limit={24} />
          </div>
        )}
      </div>
    </div>
  );
};

export default PetProfilePage;

