import React from 'react';
import { Link } from 'react-router-dom';

const RecentPets = ({ pets }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'Неизвестно';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getSpeciesIcon = (species) => {
    const icons = {
      dog: '🐕',
      cat: '🐱',
      bird: '🐦',
      fish: '🐠',
      rabbit: '🐰',
      hamster: '🐹',
      other: '🐾'
    };
    return icons[species] || '🐾';
  };

  const getGenderColor = (gender) => {
    const colors = {
      male: 'bg-blue-100 text-blue-800',
      female: 'bg-pink-100 text-pink-800',
      unknown: 'bg-gray-100 text-gray-800'
    };
    return colors[gender] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">🐾 Последние питомцы</h2>
        <Link
          to="/admin-panel/pets"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Все питомцы →
        </Link>
      </div>

      {pets.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🐕</div>
          <p>Нет данных о питомцах</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pets.map((pet, index) => (
            <div
              key={pet.id}
              className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">
                      {getSpeciesIcon(pet.species)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {pet.name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {pet.breed || 'Порода неизвестна'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getGenderColor(pet.gender)}`}>
                  {pet.gender === 'male' ? '♂' : pet.gender === 'female' ? '♀' : '?'}
                </span>
                <span className="text-xs text-gray-400">
                  #{index + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentPets;
