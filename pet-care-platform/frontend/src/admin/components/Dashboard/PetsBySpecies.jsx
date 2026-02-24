import React from 'react';
import { Link } from 'react-router-dom';

const PetsBySpecies = ({ speciesData }) => {
  const getSpeciesIcon = (species) => {
    const icons = {
      dog: '🐕',
      cat: '🐈',
      bird: '🐦',
      rodent: '🐹',
      fish: '🐠',
      reptile: '🦎',
      other: '🐾',
    };
    return icons[species] || '🐾';
  };

  const getSpeciesName = (species) => {
    const names = {
      dog: 'Собаки',
      cat: 'Кошки',
      bird: 'Птицы',
      rodent: 'Грызуны',
      fish: 'Рыбки',
      reptile: 'Рептилии',
      other: 'Другие',
    };
    return names[species] || species;
  };

  const totalPets = speciesData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">🐾 Питомцы по видам</h2>
        <Link
          to="/admin-panel/pets"
          className="text-sm text-primary-600 hover:text-primary-800 font-medium"
        >
          Все питомцы →
        </Link>
      </div>

      {speciesData.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <div className="text-4xl mb-2">🐾</div>
          <p>Нет данных о питомцах</p>
        </div>
      ) : (
        <div className="space-y-4">
          {speciesData.map((item) => {
            const percentage = totalPets > 0 ? (item.count / totalPets * 100).toFixed(1) : 0;
            return (
              <div key={item.species} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{getSpeciesIcon(item.species)}</div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {getSpeciesName(item.species)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {percentage}% от общего числа
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {item.count}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPets > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Всего питомцев:</span>
            <span className="font-semibold">{totalPets}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PetsBySpecies;
