import React, { useState, useEffect, useMemo } from 'react';
import { Registration, AnimalResult, TranslatableText } from '../types';
import { Icon } from './icons';
import { INDIAN_STATES, ALL_BREEDS } from '../constants';
import { INDIAN_STATES_AND_DISTRICTS } from '../utils/locationData';
import { useLanguage } from '../contexts/LanguageContext';
import { HealthRecordModal } from './HealthRecordModal';

interface HistoryPageProps {
  selectedRegistration: Registration | null;
  onBack: () => void;
  onEdit: (registration: Registration) => void;
  initialSearchTerm: string;
  registrations: Registration[];
  onUpdateRegistration: (registration: Registration) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ selectedRegistration, onBack, onEdit, initialSearchTerm, registrations, onUpdateRegistration }) => {
  const [activeRegistration, setActiveRegistration] = useState<Registration | null>(selectedRegistration);
  const [isMounted, setIsMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ state: '', district: '', species: '', breed: '' });
  const [districts, setDistricts] = useState<string[]>([]);
  const { t } = useLanguage();

  useEffect(() => {
    if (filters.state && INDIAN_STATES_AND_DISTRICTS[filters.state]) {
        setDistricts(INDIAN_STATES_AND_DISTRICTS[filters.state]);
    } else {
        setDistricts([]);
    }
  }, [filters.state]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    setFilters(prev => {
        const newFilters = { ...prev, [name]: value };
        if (name === 'state') {
            newFilters.district = '';
        }
        return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({ state: '', district: '', species: '', breed: '' });
    setSearchTerm('');
  };

  const filteredRegistrations = useMemo(() => 
    registrations
      .filter(reg => {
        const lowerSearchTerm = searchTerm.toLowerCase();

        const searchTermMatch = !lowerSearchTerm || 
          reg.owner.name.toLowerCase().includes(lowerSearchTerm) ||
          reg.owner.idNumber.includes(searchTerm);
        
        const stateMatch = !filters.state || reg.owner.state === filters.state;

        const districtMatch = !filters.district || reg.owner.district === filters.district;

        const speciesMatch = !filters.species || reg.animals.some(animal => animal.species === filters.species);

        const breedMatch = !filters.breed || reg.animals.some(animal => !animal.aiResult.error && animal.aiResult.breedName === filters.breed);

        return searchTermMatch && stateMatch && districtMatch && speciesMatch && breedMatch;
      })
      .sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [registrations, searchTerm, filters]
  );
  
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectRegistration = (reg: Registration) => {
    setActiveRegistration(reg);
  };

  const handleBackToList = () => {
    if (selectedRegistration) {
        onBack();
    } else {
        setActiveRegistration(null);
    }
  };

  const handleUpdateAndRefresh = (updatedReg: Registration) => {
    onUpdateRegistration(updatedReg);
    setActiveRegistration(updatedReg);
  };

  if (activeRegistration) {
    return <RegistrationDetail 
      registration={activeRegistration} 
      onBack={handleBackToList} 
      onEdit={() => onEdit(activeRegistration)} 
      onUpdate={handleUpdateAndRefresh}
    />;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-primary-900">{t('history.title')}</h1>
        <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-primary-700 font-semibold hover:bg-gray-50 text-sm transition-transform duration-150 active:scale-95 self-end sm:self-auto">{t('buttons.backToDash')}</button>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-cream-200 mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center">
              <div className="flex-grow relative">
                  <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"/>
                  <input
                      type="text"
                      placeholder={t('history.searchPlaceholder')}
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full p-3 pl-12 border border-gray-300 rounded-full bg-cream-50 text-gray-900 focus:ring-accent-500 focus:border-accent-500"
                  />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className="w-full sm:w-auto px-4 py-3 border border-gray-300 rounded-full text-primary-700 font-semibold hover:bg-gray-50 text-sm flex items-center justify-center gap-2">
                  <Icon name="filter" className="w-5 h-5" />
                  {t('history.filters')}
              </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-cream-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="state-filter" className="block text-sm font-medium text-primary-800">{t('ownerForm.state')}</label>
                  <select id="state-filter" name="state" value={filters.state} onChange={handleFilterChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900">
                    <option value="">{t('history.allStates')}</option>
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="district-filter" className="block text-sm font-medium text-primary-800">{t('ownerForm.district')}</label>
                  <select
                    id="district-filter"
                    name="district"
                    value={filters.district}
                    onChange={handleFilterChange}
                    disabled={!filters.state || districts.length === 0}
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900 disabled:bg-gray-100"
                  >
                    <option value="">{t('history.allDistricts')}</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="species-filter" className="block text-sm font-medium text-primary-800">{t('animalForm.species')}</label>
                  <select id="species-filter" name="species" value={filters.species} onChange={handleFilterChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900">
                    <option value="">{t('history.allSpecies')}</option>
                    <option value="Cattle">{t('species.cattle')}</option>
                    <option value="Buffalo">{t('species.buffalo')}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="breed-filter" className="block text-sm font-medium text-primary-800">{t('history.breed')}</label>
                  <select id="breed-filter" name="breed" value={filters.breed} onChange={handleFilterChange} className="mt-1 block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-accent-500 focus:border-accent-500 bg-white text-gray-900">
                    <option value="">{t('history.allBreeds')}</option>
                    {ALL_BREEDS.map(b => <option key={b.name} value={b.name}>{t(`breeds.${b.name}`)}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button onClick={clearFilters} className="text-sm font-semibold text-accent-600 hover:underline">{t('history.clearFilters')}</button>
              </div>
            </div>
          )}
      </div>
      
      {filteredRegistrations.length > 0 ? (
        <div className="space-y-4">
          {filteredRegistrations.map((reg, index) => (
            <div 
              key={reg.id} 
              className={`bg-white p-4 rounded-xl shadow-sm border border-cream-200 flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4 transition-all duration-300 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center flex-grow">
                <div className="w-12 h-12 rounded-lg bg-cream-100 flex-shrink-0 flex items-center justify-center mr-4 overflow-hidden">
                    {reg.animals[0]?.photos?.[0]?.previewUrl ? (
                        <img src={reg.animals[0].photos[0].previewUrl} alt="Animal" className="w-full h-full object-cover"/>
                    ) : (
                        null
                    )}
                </div>
                <div className="flex-grow">
                  <p className="font-bold text-lg text-primary-900">{reg.owner.name}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-primary-700">
                    <span>{new Date(reg.timestamp).toLocaleString()}</span>
                    <span className="text-gray-300">•</span>
                    <span>{t('history.animalCount', { count: reg.animals.length })}</span>
                    <span className="text-gray-300">•</span>
                    <span className={`inline-flex items-center gap-1.5`}>
                      <div className={`w-2 h-2 rounded-full ${reg.synced ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                      {reg.synced ? t('status.synced') : t('status.pending')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 text-center w-full sm:w-auto">
                <button
                    onClick={() => onEdit(reg)}
                    className="w-full sm:w-auto px-4 py-2 border border-gray-300 rounded-md text-primary-700 font-semibold hover:bg-gray-50 text-sm transition-transform duration-150 active:scale-95"
                >
                    {t('buttons.update')}
                </button>
                <button
                    onClick={() => handleSelectRegistration(reg)}
                    className="w-full sm:w-auto px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 text-sm font-semibold transition-transform duration-150 active:scale-95"
                >
                    {t('buttons.viewReport')}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-cream-200">
          <Icon name="search" className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">{t('history.noMatchTitle')}</h2>
          <p className="mt-2 text-gray-500">{searchTerm || filters.state || filters.district || filters.species || filters.breed ? t('history.noMatchSubtitleFilter') : t('history.noMatchSubtitleEmpty')}</p>
        </div>
      )}
    </div>
  );
};

const getValidityInfo = (animal: AnimalResult, issueDate: Date) => {
    const age = parseInt(animal.ageValue, 10);
    if (isNaN(age)) {
        const fallbackDate = new Date(issueDate);
        fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
        return {
            validUntil: fallbackDate,
            validityReason: "Standard 1-Year Validity",
            isSenior: false
        };
    }

    const ageInMonths = animal.ageUnit === 'Years' ? age * 12 : age;

    let validUntil: Date;
    let validityReason: string;
    let isSenior = false;

    if (ageInMonths <= 6) {
        // Calf
        const dob = new Date(issueDate);
        dob.setMonth(dob.getMonth() - ageInMonths);
        validUntil = new Date(dob);
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        validityReason = "Calf — Valid until 1st Birthday";
    } else if (ageInMonths > 6 && ageInMonths <= 36) {
        // Young Animal
        validUntil = new Date(issueDate);
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        validityReason = "Young Animal — 1-Year Validity";
    } else if (ageInMonths > 36 && ageInMonths <= 96) {
        // Mature Adult
        validUntil = new Date(issueDate);
        validUntil.setFullYear(validUntil.getFullYear() + 2);
        validityReason = "Mature Adult — 2-Year Validity";
    } else { // ageInMonths > 96
        // Senior Animal
        validUntil = new Date(issueDate);
        validUntil.setFullYear(validUntil.getFullYear() + 1);
        validityReason = "Senior Animal — 1-Year Validity";
        isSenior = true;
    }

    return { validUntil, validityReason, isSenior };
};

const RegistrationDetail: React.FC<{ registration: Registration; onBack: () => void; onEdit: () => void; onUpdate: (reg: Registration) => void; }> = ({ registration, onBack, onEdit, onUpdate }) => {
  const [maskData, setMaskData] = useState(true);
  const [activeAnimalIndex, setActiveAnimalIndex] = useState(0);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [healthModalAnimal, setHealthModalAnimal] = useState<AnimalResult | null>(null);
  const { t } = useLanguage();
  
  const issueDate = new Date(registration.timestamp);
  const year = issueDate.getFullYear();
  const regNum = registration.id.split('-')[1].slice(-4);
  const stateCode = registration.owner.state.substring(0, 2).toUpperCase();
  const districtCode = registration.owner.district.substring(0, 4).toUpperCase();
  
  const certificateId = `INAPH-CERT-${year}-${regNum}`;
  const referenceNumber = `BPA/${stateCode}/${districtCode}/${year}/${regNum}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=https://verify.pashuvision.gov.in/CERT/${certificateId}&qzone=1`;

  const mask = (value: string, visibleChars = 4) => {
      if (value.length <= visibleChars) return value;
      return 'X'.repeat(value.length - visibleChars) + value.slice(-visibleChars);
  }
  
  const animalValidityData = useMemo(() => {
    return registration.animals.map(animal => getValidityInfo(animal, issueDate));
  }, [registration.animals, issueDate]);

  const overallValidity = useMemo(() => {
      if (animalValidityData.length === 0) {
          const fallbackDate = new Date(issueDate);
          fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
          return {
              validUntil: fallbackDate,
              validityReason: "Standard 1-Year Validity"
          };
      }
      return animalValidityData.reduce((earliest, current) =>
          current.validUntil < earliest.validUntil ? current : earliest
      );
  }, [animalValidityData, issueDate]);

  const handlePrintFullReport = () => {
    setIsPrintingAll(true);
  };

  useEffect(() => {
    if (isPrintingAll) {
      const handleAfterPrint = () => {
        setIsPrintingAll(false);
        window.removeEventListener('afterprint', handleAfterPrint);
      };
      window.addEventListener('afterprint', handleAfterPrint);
      window.print();
    }
  }, [isPrintingAll]);


  const displayedAnimals = isPrintingAll ? registration.animals : (registration.animals[activeAnimalIndex] ? [registration.animals[activeAnimalIndex]] : []);
  const displayedValidityData = isPrintingAll ? animalValidityData : (animalValidityData[activeAnimalIndex] ? [animalValidityData[activeAnimalIndex]] : []);

  const activeAnimal = registration.animals[activeAnimalIndex];

  return (
    <div className="bg-cream-100 print:bg-white -m-4 p-4 font-serif print-container">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 no-print">
            <button 
                onClick={onBack} 
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-primary-700 font-semibold hover:bg-gray-50 text-sm transition-transform duration-150 active:scale-95"
            >
                <Icon name="chevron-left" className="w-4 h-4" />
                {t('buttons.backToList')}
            </button>
            <div className="flex items-center space-x-2">
                <button onClick={() => window.print()} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-gray-100 rounded-md border border-gray-300 transition-transform duration-150 active:scale-95"><Icon name="print" className="w-4 h-4"/>{t('buttons.printCert')}</button>
                {registration.animals.length > 1 &&
                    <button onClick={handlePrintFullReport} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-primary-700 hover:bg-gray-100 rounded-md border border-gray-300 transition-transform duration-150 active:scale-95"><Icon name="history" className="w-4 h-4"/>{t('buttons.printFull')}</button>
                }
                <button onClick={onEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-transform duration-150 active:scale-90" title={t('buttons.updateReport')}><Icon name="pencil-square" /></button>
            </div>
        </div>

        <div id="certificate" className="bg-white p-2 sm:p-4 shadow-lg rounded-xl border border-cream-200 print:shadow-none print:border-none print:rounded-none">
            <div className="border-2 sm:border-4 border-primary-800 p-1">
                <div className="border border-primary-700 p-4 md:p-6 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center z-0">
                        <p className="text-gray-200/50 text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-extrabold tracking-widest -rotate-[30deg] select-none pointer-events-none">
                            GOVERNMENT OF INDIA
                        </p>
                    </div>
                    <div className="relative z-10">
                        <header className="flex flex-col sm:flex-row justify-between items-center sm:items-start text-center border-b-2 border-primary-800 pb-2 sm:pb-4 mb-2 sm:mb-4 gap-2 sm:gap-0">
                           <div className="w-20 sm:w-24 flex-shrink-0 flex justify-center items-center">
                                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Logo_of_the_Department_of_Animal_Husbandry_and_Dairying.svg/240px-Logo_of_the_Department_of_Animal_Husbandry_and_Dairying.svg.png" alt="Ministry Logo" className="h-16 sm:h-20 w-auto" />
                           </div>
                           <div className="flex-grow px-1 order-first sm:order-none w-full sm:w-auto">
                               <h1 className="font-bold text-base sm:text-lg text-primary-900">भारत सरकार / Government of India</h1>
                               <p className="font-semibold text-sm sm:text-base text-primary-800 mt-1">पशुपालन और डेयरी विभाग</p>
                               <p className="text-xs sm:text-sm text-primary-700">Department of Animal Husbandry and Dairying</p>
                               <p className="text-[10px] sm:text-xs text-primary-600">Ministry of Fisheries, Animal Husbandry & Dairying</p>
                           </div>
                           <div className="w-20 sm:w-24 flex-shrink-0 flex flex-col items-center justify-center text-xs">
                               <div className="bg-white p-0.5 sm:p-1 border rounded-md">
                                  <img src={qrCodeUrl} alt="QR Code for Verification" className="w-full h-auto"/>
                               </div>
                               <p className="font-mono mt-1 text-[8px] tracking-tighter">Scan to Verify</p>
                           </div>
                        </header>
                        
                        <main>
                            <div className="text-right -mt-2 mb-2">
                                <p className="text-[10px] sm:text-xs"><strong>Report Reference:</strong> <span className="font-mono">{referenceNumber}</span></p>
                            </div>
                            <h2 className="text-center text-lg sm:text-xl md:text-2xl font-bold tracking-wider text-primary-900 uppercase">Animal Breed Identification Certificate</h2>
                            <p className="text-center font-mono font-semibold text-primary-800 mt-1 text-sm sm:text-base">CERTIFICATE NO: {certificateId}</p>

                            <div className="flex flex-col sm:flex-row justify-between items-baseline mt-4 text-xs sm:text-sm">
                                <p><strong>Issue Date:</strong> {issueDate.toLocaleDateString('en-GB')}</p>
                                <p><strong>Valid Until:</strong> {overallValidity.validUntil.toLocaleDateString('en-GB')} ({overallValidity.validityReason})</p>
                            </div>

                            <div className="mt-6">
                                <h3 className="font-bold text-base sm:text-lg text-primary-900 border-b border-primary-300 pb-1 mb-3">Owner Information</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm sm:text-base">
                                    <p><strong className="font-semibold text-primary-800">Name:</strong> {registration.owner.name}</p>
                                    <p><strong className="font-semibold text-primary-800">Location:</strong> {[registration.owner.village, registration.owner.district].filter(Boolean).join(', ')}</p>
                                    <p><strong className="font-semibold text-primary-800">Mobile:</strong> {maskData ? mask(registration.owner.mobile) : registration.owner.mobile}</p>
                                    <p><strong className="font-semibold text-primary-800">State:</strong> {registration.owner.state}</p>
                                    <p><strong className="font-semibold text-primary-800">{registration.owner.idType}:</strong> {maskData ? mask(registration.owner.idNumber) : registration.owner.idNumber}</p>
                                </div>
                                 <label className="flex items-center text-sm text-gray-600 pt-3 no-print">
                                    <input type="checkbox" checked={!maskData} onChange={() => setMaskData(!maskData)} className="mr-2 h-4 w-4 rounded text-accent-600 focus:ring-accent-500 border-gray-300" />
                                    Show sensitive data
                                </label>
                            </div>

                            <div className="mt-6">
                                <h3 className="font-bold text-base sm:text-lg text-primary-900 border-b border-primary-300 pb-1 mb-3">Registered Animal Details</h3>
                                
                                {registration.animals.length > 1 && !isPrintingAll && (
                                    <div className="border-b border-cream-200 mb-4 no-print">
                                        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto" aria-label="Tabs">
                                            {registration.animals.map((animal, index) => (
                                                <button
                                                    key={animal.id}
                                                    onClick={() => setActiveAnimalIndex(index)}
                                                    className={`
                                                        ${index === activeAnimalIndex
                                                        ? 'border-accent-500 text-accent-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                                                        whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm sm:text-base transition-all
                                                    `}
                                                >
                                                    {t('results.animalTab', { index: index + 1 })} - {animal.aiResult.error ? t('results.analysisFailed') : t(`breeds.${animal.aiResult.breedName}`)}
                                                </button>
                                            ))}
                                        </nav>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {displayedAnimals.map((animal, index) => <AnimalCertificateRecord key={animal.id} animal={animal} index={isPrintingAll ? index : activeAnimalIndex} isSenior={displayedValidityData[index].isSenior} />)}
                                </div>
                            </div>

                            <div className="mt-6">
                                <div className="flex justify-between items-center border-b border-primary-300 pb-1 mb-3">
                                  <h3 className="font-bold text-base sm:text-lg text-primary-900">{t('history.healthRecord.title')}</h3>
                                  <button onClick={() => setHealthModalAnimal(activeAnimal)} className="flex items-center gap-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-primary-700 font-semibold text-xs hover:bg-gray-50 no-print">
                                    <Icon name="syringe" className="w-4 h-4" />
                                    {t('history.healthRecord.add')}
                                  </button>
                                </div>
                                <VaccinationTable animal={activeAnimal} />
                            </div>

                        </main>

                        <footer className="mt-8 pt-4 border-t space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-end gap-4">
                                <div className="text-center">
                                    <div className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-primary-600 rounded-full flex items-center justify-center">
                                        <p className="text-xs text-primary-700">Official Seal Area</p>
                                    </div>
                                </div>

                                <div className="text-center text-sm w-full sm:w-1/3">
                                    <p className="font-['Caveat',_cursive] text-2xl text-primary-900 -mb-2">Dr. Priya Sharma</p>
                                    <p className="border-b border-primary-800 pb-1 font-semibold text-primary-800">Dr. Priya Sharma</p>
                                    <p className="font-semibold text-primary-800">Authorized Officer</p>
                                    <p className="text-xs text-primary-700">Designation: Veterinary Officer</p>
                                    <p className="text-xs text-primary-700">Registration ID: INAPH-VET-2023-MH-8891</p>
                                    <p className="text-xs text-primary-700">Contact: 91XXXXXX12 | vet.pune@nic.in</p>
                                </div>
                            </div>
                            <p className="text-xs text-gray-600 px-4 text-center">
                                This is a computer-generated document. Digitally authenticated — no physical signature required. For support: <span className="font-semibold">helpdesk@pashuvision.gov.in</span> | Helpline: <span className="font-semibold">1800-XXX-XXXX</span>
                            </p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
        {healthModalAnimal && (
            <HealthRecordModal
                isOpen={!!healthModalAnimal}
                onClose={() => setHealthModalAnimal(null)}
                animal={healthModalAnimal}
                registration={registration}
                onSave={onUpdate}
            />
        )}
      </div>
    </div>
  );
};


const ConfidenceIndicator: React.FC<{ score: number, isUserVerified?: boolean }> = ({ score, isUserVerified }) => {
  const getColor = () => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-300';
    if (score >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  const text = isUserVerified 
    ? <><Icon name="check" className="w-3 h-3 mr-1"/>{score}% (User Verified)</> 
    : `${score}% Confidence`;

  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getColor()}`}>{text}</span>;
};

const AnimalCertificateRecord: React.FC<{animal: AnimalResult, index: number, isSenior: boolean}> = ({ animal, index, isSenior }) => {
  const hasError = !!animal.aiResult.error;
  const { language, t } = useLanguage();

  const getTranslatedText = (content: TranslatableText | string) => {
    if (typeof content === 'object' && content !== null && language in content) {
      return content[language as keyof TranslatableText];
    }
    return String(content);
  };
  
  return (
    <div className={`p-2 sm:p-4 rounded-lg border ${hasError ? 'bg-red-50/50 border-red-200' : 'bg-cream-50/50 border-cream-200'} break-inside-avoid print:shadow-none`}>
        <div className="flex justify-between items-center pb-2 mb-3 border-b border-dashed border-primary-300">
            <h4 className="text-base sm:text-lg font-bold text-primary-900">{hasError ? t('history.healthRecord.animalTitle', { index: index + 1 }) : t(`breeds.${animal.aiResult.breedName}`)}</h4>
            {!hasError && <ConfidenceIndicator score={animal.aiResult.confidence} isUserVerified={animal.aiResult.isUserVerified} />}
        </div>
        {isSenior && !hasError && (
            <div className="mb-3 p-2 text-center bg-accent-yellow-100 border border-accent-yellow-200 rounded-md">
                <p className="font-bold text-xs text-accent-yellow-800 tracking-wider">{t('history.healthRecord.senior')}</p>
            </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="md:col-span-1">
                {animal.photos?.[0]?.previewUrl ? (
                    <img src={animal.photos[0].previewUrl} alt={t('history.healthRecord.animalAlt', { index: index + 1 })} className="w-full h-32 sm:h-40 object-cover rounded-md border p-1 bg-white"/>
                ) : (
                    <div className="w-full h-32 sm:h-40 flex items-center justify-center bg-cream-100 rounded-md border p-1">
                        
                    </div>
                )}
                <div className="text-sm mt-2 space-y-1 text-center bg-white p-2 rounded-md border">
                    <p><strong>{t('animalForm.species')}:</strong> {t(`species.${animal.species.toLowerCase()}`)}</p>
                    <p><strong>{t('animalForm.sex')}:</strong> {t(`sex.${animal.sex.toLowerCase()}`)}</p>
                    <p><strong>{t('animalForm.age')}:</strong> {`${animal.ageValue} ${animal.ageUnit}`}</p>
                </div>
            </div>
            <div className="md:col-span-2">
                {hasError ? (
                    <div className="flex items-center justify-center h-full bg-red-100/50 p-4 rounded-md text-red-700">
                      <p><strong>{t('results.analysisFailed')}:</strong> {animal.aiResult.error}</p>
                    </div>
                ) : (
                    <div className="space-y-3 text-xs sm:text-sm">
                        <div>
                            <h5 className="font-semibold text-primary-800 uppercase text-xs tracking-wider">{t('results.aiReasoning')}</h5>
                            <p className="text-primary-900 sm:text-base">{getTranslatedText(animal.aiResult.reasoning)}</p>
                        </div>
                         <div>
                            <h5 className="font-semibold text-primary-800 uppercase text-xs tracking-wider">{t('results.milkYield')}</h5>
                            <p className="text-primary-900 sm:text-base">{getTranslatedText(animal.aiResult.milkYieldPotential)}</p>
                        </div>
                         <div>
                            <h5 className="font-semibold text-primary-800 uppercase text-xs tracking-wider">{t('results.careNotes')}</h5>
                            <p className="text-primary-900 sm:text-base">{getTranslatedText(animal.aiResult.careNotes)}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  )
};

const VaccinationTable: React.FC<{ animal: AnimalResult }> = ({ animal }) => {
    const { t } = useLanguage();
    if (!animal.vaccinations || animal.vaccinations.length === 0) {
        return <p className="text-sm text-gray-500 text-center py-4">{t('history.healthRecord.none')}</p>;
    }

    const sortedVaccinations = [...animal.vaccinations].sort((a, b) => new Date(b.administeredDate).getTime() - new Date(a.administeredDate).getTime());

    return (
        <div className="overflow-x-auto text-sm">
            <table className="w-full">
                <thead className="bg-cream-50">
                    <tr>
                        <th className="px-2 py-2 text-left font-semibold text-primary-800">{t('history.healthRecord.vaccine')}</th>
                        <th className="px-2 py-2 text-left font-semibold text-primary-800">{t('history.healthRecord.administered')}</th>
                        <th className="px-2 py-2 text-left font-semibold text-primary-800">{t('history.healthRecord.due')}</th>
                    </tr>
                </thead>
                <tbody>
                    {sortedVaccinations.map(vac => (
                        <tr key={vac.id} className="border-b border-cream-200">
                            <td className="px-2 py-2 font-medium">{vac.vaccineName}</td>
                            <td className="px-2 py-2">{new Date(vac.administeredDate).toLocaleDateString()}</td>
                            <td className="px-2 py-2">{new Date(vac.dueDate).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};