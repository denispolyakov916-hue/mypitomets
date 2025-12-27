import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, QrCode, Edit, Share2, Download } from 'lucide-react';
import { getPets } from '../../api/pets';
import PetIdWizard from './PetIdWizard';
import { PageLoader } from '../../components/Loader';

export default function PetIdPage() {
  const [pets, setPets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);

  useEffect(() => {
    fetchPets();
  }, []);

  const fetchPets = async () => {
    try {
      const response = await getPets();
      setPets(response.pets || []);
    } catch (err) {
      console.error('Ошибка загрузки питомцев:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePetId = (formData) => {
    console.log('Pet ID создан:', formData);
    // TODO: Отправить на бэкенд
    fetchPets();
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
          <p className="text-gray-500 mt-1">Цифровые паспорта ваших питомцев</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl hover:shadow-lg transition-all"
        >
          <Plus className="w-5 h-5" />
          Создать Pet ID
        </button>
      </div>

      {/* Список карточек питомцев */}
      {pets.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <div className="text-6xl mb-4">🐾</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Нет Pet ID</h3>
          <p className="text-gray-500 mb-6">Создайте цифровой паспорт для вашего питомца</p>
          <button
            onClick={() => setShowWizard(true)}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl"
          >
            Создать первый Pet ID
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet, index) => (
            <motion.div
              key={pet.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all"
            >
              {/* Фото питомца */}
              <div className="relative h-48 bg-gradient-to-br from-purple-100 to-orange-100">
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                  </div>
                )}
                {/* QR-код миниатюра */}
                <div className="absolute top-4 right-4 bg-white p-2 rounded-lg shadow-md">
                  <QrCode className="w-6 h-6 text-purple-600" />
                </div>
              </div>

              {/* Информация */}
              <div className="p-5">
                <h3 className="text-xl font-semibold text-gray-800">{pet.name}</h3>
                <p className="text-gray-500 text-sm mt-1">
                  {pet.breed || 'Порода не указана'} • {pet.species === 'dog' ? 'Собака' : 'Кошка'}
                </p>
                
                {/* ID номер */}
                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Pet ID</p>
                  <p className="font-mono text-sm text-gray-700">#{pet.id?.toString().padStart(8, '0')}</p>
                </div>

                {/* Действия */}
                <div className="flex gap-2 mt-4">
                  <button className="flex-1 flex items-center justify-center gap-2 py-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all">
                    <Edit className="w-4 h-4" /> Изменить
                  </button>
                  <button className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Модальный визард */}
      {showWizard && (
        <PetIdWizard
          onClose={() => setShowWizard(false)}
          onSubmit={handleCreatePetId}
        />
      )}
    </div>
  );
}