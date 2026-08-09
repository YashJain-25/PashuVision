
import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { AnimalResult, Registration, VaccinationRecord } from '../types';
import { getVaccinationSchedule } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface HealthRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  animal: AnimalResult;
  registration: Registration;
  onSave: (updatedReg: Registration) => void;
}

interface AISuggestion {
  vaccineName: string;
  schedule: string;
  importance: string;
}

const today = new Date().toISOString().split('T')[0];

const EMPTY_VACCINE: Omit<VaccinationRecord, 'id'> = {
  vaccineName: '',
  administeredDate: today,
  dueDate: '',
  notes: '',
};

export const HealthRecordModal: React.FC<HealthRecordModalProps> = ({ isOpen, onClose, animal, registration, onSave }) => {
  const [vaccinations, setVaccinations] = useState(animal.vaccinations || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVaccine, setNewVaccine] = useState(EMPTY_VACCINE);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setVaccinations(animal.vaccinations || []);
      setShowAddForm(false);
      setNewVaccine(EMPTY_VACCINE);
      setSuggestions([]);
      setError(null);
    }
  }, [isOpen, animal]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewVaccine(prev => {
        const updated = { ...prev, [name]: value };
        if (name === 'administeredDate') {
            // If the new administered date is on or after the current due date, clear the due date.
            if (updated.dueDate && new Date(updated.dueDate) <= new Date(value)) {
                updated.dueDate = '';
            }
        }
        return updated;
    });
    if (error) {
        setError(null);
    }
  };

  const handleGetSuggestions = async () => {
    setIsLoadingSuggestions(true);
    // Fix: Added a check to prevent passing an empty string for the 'species' parameter, which expects type 'Species'.
    if (!animal.species) {
        setError("Cannot get AI suggestions because the animal's species is not specified.");
        setIsLoadingSuggestions(false);
        return;
    }
    const result = await getVaccinationSchedule(animal.aiResult.breedName, animal.species);
    if (result.error) {
      setError(result.error);
    } else {
      setSuggestions(result.suggestions);
    }
    setIsLoadingSuggestions(false);
  };
  
  const handleSuggestionClick = (suggestion: AISuggestion) => {
    setNewVaccine(prev => ({
      ...prev,
      vaccineName: suggestion.vaccineName,
      notes: `${suggestion.schedule}. ${suggestion.importance}`
    }));
  };

  const handleAddVaccination = () => {
    if (!newVaccine.vaccineName || !newVaccine.administeredDate || !newVaccine.dueDate) {
        setError(t('healthModal.errors.required'));
        return;
    }
    if (new Date(newVaccine.dueDate) <= new Date(newVaccine.administeredDate)) {
        setError(t('healthModal.errors.dueDate'));
        return;
    }
    const newRecord: VaccinationRecord = {
        id: `vac-${Date.now()}`,
        ...newVaccine,
    };
    const updatedVaccinations = [...vaccinations, newRecord];
    setVaccinations(updatedVaccinations);
    
    // Create updated registration object and save
    const updatedAnimals = registration.animals.map(a => 
        a.id === animal.id ? { ...a, vaccinations: updatedVaccinations } : a
    );
    onSave({ ...registration, animals: updatedAnimals });
    
    setNewVaccine(EMPTY_VACCINE);
    setShowAddForm(false);
    setError(null);
  };

  const handleDeleteVaccination = (id: string) => {
    if (window.confirm(t('healthModal.confirmDelete'))) {
        const updatedVaccinations = vaccinations.filter(v => v.id !== id);
        setVaccinations(updatedVaccinations);
        const updatedAnimals = registration.animals.map(a => 
            a.id === animal.id ? { ...a, vaccinations: updatedVaccinations } : a
        );
        onSave({ ...registration, animals: updatedAnimals });
    }
  };


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-cream-200 flex justify-between items-center">
                <h2 className="text-xl font-bold text-primary-900 flex items-center gap-2">
                    <Icon name="syringe" className="w-6 h-6 text-accent-yellow-600"/> 
                    {t('healthModal.title', { breedName: animal.aiResult.breedName })}
                </h2>
                <button onClick={onClose} className="p-1 rounded-full hover:bg-cream-200">
                    <Icon name="close" className="w-6 h-6 text-gray-500"/>
                </button>
            </div>

            <div className="flex-grow p-4 overflow-y-auto">
                {showAddForm ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Form Side */}
                        <div className="bg-white p-4 rounded-lg border border-cream-200 space-y-4">
                            <h3 className="font-bold text-lg text-primary-800">{t('healthModal.addTitle')}</h3>
                            {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{error}</p>}
                            <div>
                                <label className="block text-sm font-medium text-primary-800">{t('healthModal.form.name')}</label>
                                <input type="text" name="vaccineName" value={newVaccine.vaccineName} onChange={handleInputChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-800">{t('healthModal.form.administered')}</label>
                                <input type="date" name="administeredDate" value={newVaccine.administeredDate} onChange={handleInputChange} max={today} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-800">{t('healthModal.form.due')}</label>
                                <input type="date" name="dueDate" value={newVaccine.dueDate} onChange={handleInputChange} min={newVaccine.administeredDate} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-primary-800">{t('healthModal.form.notes')}</label>
                                <textarea name="notes" value={newVaccine.notes} onChange={handleInputChange} rows={2} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
                            </div>
                             <div className="flex gap-2">
                                <button onClick={() => { setShowAddForm(false); setError(null); }} className="w-full px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-md hover:bg-gray-300">{t('buttons.cancel')}</button>
                                <button onClick={handleAddVaccination} className="w-full px-4 py-2 bg-accent-500 text-white font-semibold rounded-md hover:bg-accent-600">{t('buttons.save')}</button>
                            </div>
                        </div>

                        {/* Suggestions Side */}
                        <div className="bg-cream-100 p-4 rounded-lg border border-cream-200">
                           <button onClick={handleGetSuggestions} disabled={isLoadingSuggestions} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary-600 text-white font-semibold rounded-md hover:bg-secondary-700 disabled:bg-secondary-400">
                               <Icon name="ai-sparkles" className="w-5 h-5"/>
                               {isLoadingSuggestions ? t('generic.thinking') : t('healthModal.aiSuggest')}
                           </button>
                           {suggestions.length > 0 ? (
                            <div className="mt-4 space-y-2">
                               {suggestions.map((s, i) => (
                                   <button key={i} onClick={() => handleSuggestionClick(s)} className="w-full p-3 bg-white hover:bg-blue-50 border border-cream-200 rounded-md text-left">
                                       <p className="font-bold text-primary-800">{s.vaccineName}</p>
                                       <p className="text-xs text-primary-700">{s.schedule}</p>
                                   </button>
                               ))}
                            </div>
                           ) : !isLoadingSuggestions && (
                            <div className="text-center mt-4 text-sm text-gray-500 p-4">
                               {t('healthModal.noSuggestions')}
                            </div>
                           )}
                        </div>
                    </div>
                ) : (
                    <div>
                         <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-lg text-primary-800">{t('healthModal.recordsTitle')}</h3>
                            <button onClick={() => setShowAddForm(true)} className="flex items-center gap-2 px-3 py-1.5 bg-accent-500 text-white text-sm font-semibold rounded-md hover:bg-accent-600">
                               <Icon name="syringe" className="w-4 h-4"/> {t('healthModal.addNew')}
                            </button>
                        </div>
                        {vaccinations.length > 0 ? (
                           <div className="space-y-2">
                               {vaccinations.map(vac => (
                                   <div key={vac.id} className="bg-white p-3 rounded-md border border-cream-200 flex justify-between items-start">
                                       <div>
                                           <p className="font-bold text-primary-900">{vac.vaccineName}</p>
                                           <p className="text-sm text-primary-700">{t('healthModal.administeredOn', { date: new Date(vac.administeredDate).toLocaleDateString() })}</p>
                                           <p className="text-sm text-primary-700">{t('healthModal.dueOn', { date: new Date(vac.dueDate).toLocaleDateString() })}</p>
                                       </div>
                                       <button onClick={() => handleDeleteVaccination(vac.id)} className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50">
                                            <Icon name="trash" className="w-4 h-4" />
                                       </button>
                                   </div>
                               ))}
                           </div>
                        ) : (
                            <div className="text-center py-10 bg-cream-100 rounded-lg">
                                <Icon name="syringe" className="w-12 h-12 mx-auto text-gray-400" />
                                <p className="mt-2 font-semibold text-primary-700">{t('healthModal.noRecords')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
