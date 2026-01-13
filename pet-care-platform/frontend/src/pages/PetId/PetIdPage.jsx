import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, QrCode, Edit, Share2, Download, Trash2, Eye, BarChart3 } from 'lucide-react';
import { getPets, createPet, updatePet, deletePet } from '../../api/pets';
import PetIdWizard from './PetIdWizard';
import { PageLoader } from '../../components/Loader';

// Функция маппинга данных формы в API формат
const transformFormDataToApi = (formData) => {
  const result = {
    // Основные данные
    name: formData.name,
    species: formData.species,
    breed: formData.breed || null,
    gender: formData.gender || 'unknown',
    date_of_birth: formData.birthDate || null,
    is_neutered: formData.neutered === 'yes',

    // Физические параметры
    weight: formData.currentWeight ? parseFloat(formData.currentWeight) : null,
    size: formData.size || null,
    body_type: formData.bodyType || null,
    activity_level: formData.activityLevel || 'medium',

    // Контакты владельца (переопределяемые)
    owner_phone: formData.phone || null,
    owner_email: formData.email || null,
    owner_city: formData.city || null,

    // Питание
    diet_type: formData.dietType || null,
    feeding_frequency: formData.feedingFrequency || null,
    favorite_foods: [
      ...(formData.favoriteFlavors || []),
      ...(formData.customFlavors || []).filter(flavor => flavor && flavor.trim())
    ],
    allergies: formData.allergies ? [formData.allergies] : [],
    sensitive_digestion: formData.sensitiveBelly || false,
    excluded_ingredients: formData.excludedIngredients ? formData.excludedIngredients.split(',').map(s => s.trim()).filter(Boolean) : [],
    vitamins_supplements: formData.vitamins || '',

    // Поведение
    character_traits: [
      ...(formData.traits || []),
      ...(formData.customTraits || []).filter(trait => trait && trait.trim())
    ],
    behavioral_problems: formData.behaviorProblems || [],
    training_experience: formData.trainingLevel || null,
    training_goals: formData.goals || '',

    // Здоровье
    chronic_conditions: formData.chronicConditions || '',
    vaccinations: formData.vaccinations || '',
    medications: formData.medications || '',
    dental_health: formData.dentalHealth || null,
    vet_visits: formData.vetVisits || '',

    // Образ жизни
    housing_type: formData.housingType || null,
    has_yard: formData.hasYard || false,
    other_pets: formData.otherPets || '',
    has_children: formData.hasChildren || false,
    walk_frequency: formData.walkFrequency || '',
    walk_duration: formData.walkDuration || '',
  };

  return result;
};

export default function PetIdPage() {
  const navigate = useNavigate();
  const [pets, setPets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedPet, setSelectedPet] = useState(null);
  const [editingPet, setEditingPet] = useState(null);

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

  const handleEditPet = (pet) => {
    setEditingPet(pet);
    setShowWizard(true);
  };

  const handleDeletePet = async (pet) => {
    if (window.confirm(`Вы уверены, что хотите удалить питомца "${pet.name}"?`)) {
      try {
        await deletePet(pet.id);
        fetchPets(); // Обновить список
        console.log('Питомец успешно удалён');
      } catch (error) {
        console.error('Ошибка удаления питомца:', error);
        alert('Не удалось удалить питомца');
      }
    }
  };

  const handleCloseWizard = () => {
    setShowWizard(false);
    setEditingPet(null); // Сбросить режим редактирования
  };

  const handlePetIdSubmit = async (formData) => {
    try {
      console.log(`${editingPet ? 'Обновление' : 'Создание'} PetID:`, formData);

      const apiData = transformFormDataToApi(formData);
      console.log('API данные:', apiData);

      let response;
      if (editingPet) {
        // Обновление существующего питомца
        response = await updatePet(editingPet.id, apiData);
        console.log('PetID успешно обновлен:', response);
      } else {
        // Создание нового питомца
        response = await createPet(apiData);
        console.log('PetID успешно создан:', response);
      }

      // Сбросить режим редактирования и обновить список
      setEditingPet(null);
      fetchPets();

    } catch (error) {
      console.error(`Ошибка ${editingPet ? 'обновления' : 'создания'} PetID:`, error);
      console.error(`Не удалось ${editingPet ? 'обновить' : 'создать'} PetID`);
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
          <p className="text-gray-500 mt-1">Цифровые паспорта ваших питомцев</p>
        </div>
        <button
          onClick={() => {
            setEditingPet(null); // Убедиться, что режим редактирования сброшен
            setShowWizard(true);
          }}
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
            onClick={() => {
              setEditingPet(null);
              setShowWizard(true);
            }}
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
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all group"
            >
              {/* Фото питомца - кликабельное */}
              <div 
                className="relative h-48 bg-gradient-to-br from-purple-100 to-orange-100 cursor-pointer"
                onClick={() => navigate(`/pet-id/${pet.id}`)}
              >
                {pet.photo_url ? (
                  <img src={pet.photo_url} alt={pet.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {pet.species === 'dog' ? '🐕' : pet.species === 'cat' ? '🐱' : '🐾'}
                  </div>
                )}
                {/* Overlay при наведении */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                    <div className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-xl shadow-lg flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-gray-800">Открыть профиль</span>
                    </div>
                  </div>
                </div>
                {/* Кнопки в правом верхнем углу */}
                <div className="absolute top-4 right-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                  {/* Кнопка удаления */}
                  <button
                    onClick={() => handleDeletePet(pet)}
                    className="bg-red-500 hover:bg-red-600 p-2 rounded-lg shadow-md transition-colors"
                    title="Удалить питомца"
                  >
                    <Trash2 className="w-5 h-5 text-white" />
                  </button>
                  {/* QR-код миниатюра */}
                  <div className="bg-white p-2 rounded-lg shadow-md">
                    <QrCode className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Информация */}
              <div className="p-5">
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/pet-id/${pet.id}`)}
                >
                  <h3 className="text-xl font-semibold text-gray-800 hover:text-purple-600 transition-colors">{pet.name}</h3>
                  <p className="text-gray-500 text-sm mt-1">
                    {pet.breed || 'Порода не указана'} • {pet.species === 'dog' ? 'Собака' : 'Кошка'}
                  </p>
                </div>
                
                {/* ID номер */}
                <div className="mt-3 p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 mb-1">Pet ID</p>
                  <p className="font-mono text-sm text-gray-700">#{pet.id?.toString().slice(0, 8)}</p>
                </div>

                {/* Действия */}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => navigate(`/pet-id/${pet.id}`)}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-purple-600 to-orange-500 text-white rounded-xl hover:shadow-md transition-all"
                  >
                    <Eye className="w-4 h-4" /> Профиль
                  </button>
                  <button
                    onClick={() => handleEditPet(pet)}
                    className="p-2 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-100 transition-all"
                    title="Изменить"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-2 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-all" title="Поделиться">
                    <Share2 className="w-4 h-4" />
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
          onClose={handleCloseWizard}
          onSubmit={handlePetIdSubmit}
          editData={editingPet}
        />
      )}
    </div>
  );
}