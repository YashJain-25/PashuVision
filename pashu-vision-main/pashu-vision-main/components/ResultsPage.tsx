import React, { useState, useEffect, useRef } from 'react';
import { AnimalResult, OwnerData, ChatMessage, Registration, SchemeInfo, Species, TranslatableText } from '../types';
import { Icon } from './icons';
import { startChat, sendMessageToChat, getSchemeInfo } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { HealthRecordModal } from './HealthRecordModal';

interface ResultsPageProps {
  results: AnimalResult[];
  owner: OwnerData;
  onFinish: () => void;
  registration: Registration | null;
  onViewReport: (registration: Registration) => void;
  onUpdateRegistration: (registration: Registration) => void;
}

const ConfidenceIndicator: React.FC<{ score: number, isUserVerified?: boolean }> = ({ score, isUserVerified }) => {
  const { t } = useLanguage();
  const getColor = () => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className={`px-2.5 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getColor()}`}>
      {isUserVerified && <Icon name="check" className="w-4 h-4" title={t('results.userVerified')} />}
      <span>{score}% {t('results.confidence')}</span>
      {isUserVerified && <span className="font-bold text-xs">({t('results.verified')})</span>}
    </div>
  );
};

const ExplorePromptButton: React.FC<{ iconName: 'syringe' | 'light-bulb', text: string, onClick: () => void, disabled: boolean }> = ({ iconName, text, onClick, disabled }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center gap-3 text-left p-3 bg-cream-50 hover:bg-cream-100 border border-cream-200 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed group"
    >
        <div className="p-2 bg-secondary-100 rounded-md">
            <Icon name={iconName} className="w-5 h-5 text-secondary-700" />
        </div>
        <span className="flex-grow font-semibold text-primary-800 text-sm">{text}</span>
        <Icon name="chevron-right" className="w-5 h-5 text-gray-400 transition-transform group-hover:translate-x-1" />
    </button>
);

const AnimalResultCardWithChat: React.FC<{ 
    animal: AnimalResult; 
    index: number; 
    onCheckSchemes: (animal: AnimalResult) => void;
    onManageHealth: (animal: AnimalResult) => void;
}> = ({ animal, index, onCheckSchemes, onManageHealth }) => {
  const [activeChat, setActiveChat] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!animal.aiResult.error) {
      startChat(animal.aiResult.breedName);
      setActiveChat([{ role: 'model', parts: [{ text: t('results.chat.greeting', { breedName: t(`breeds.${animal.aiResult.breedName}`) }) }] }]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animal.aiResult.breedName, animal.aiResult.error, animal.id]); // Added animal.id to re-trigger effect on tab change

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChat]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const newHistory: ChatMessage[] = [...activeChat, { role: 'user', parts: [{ text: message }] }];
    setActiveChat(newHistory);
    setIsLoading(true);

    if (message === userInput) {
      setUserInput('');
    }

    const response = await sendMessageToChat(message);

    setActiveChat([...newHistory, { role: 'model', parts: [{ text: response }] }]);
    setIsLoading(false);
  };
  
  const handleExploreClick = (topic: 'vaccinations' | 'benefits') => {
    const breedName = animal.aiResult.breedName;
    const species = animal.species.toLowerCase();
    let prompt = '';
    switch (topic) {
        case 'vaccinations':
            prompt = `What are the recommended vaccinations for a ${breedName} ${species}? Please provide a typical schedule.`;
            break;
        case 'benefits':
            prompt = `What are the key benefits, characteristics, and care tips for the ${breedName} breed?`;
            break;
    }
    handleSendMessage(prompt);
  };


  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-cream-200">
      <h2 className="text-xl font-bold text-primary-900 mb-4">{t('results.title', { index: index + 1, species: t(`species.${animal.species.toLowerCase()}`) })}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="mb-4 overflow-hidden rounded-lg aspect-video bg-cream-100 flex items-center justify-center">
            {animal.photos?.[0]?.previewUrl ? (
                <img src={animal.photos[0].previewUrl} alt="Analyzed animal" className="w-full h-full object-cover" />
            ) : (
                 null
            )}
          </div>
          {animal.aiResult.error ? (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <h3 className="text-lg font-bold text-red-800">{t('results.analysisFailed')}</h3>
              <p className="text-red-700 mt-1">{animal.aiResult.error}</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-2xl font-bold text-primary-800">{t(`breeds.${animal.aiResult.breedName}`)}</h3>
                  <ConfidenceIndicator score={animal.aiResult.confidence} isUserVerified={animal.aiResult.isUserVerified} />
                </div>
                <ResultDetail label={t('results.aiReasoning')} content={animal.aiResult.reasoning} />
                <ResultDetail label={t('results.milkYield')} content={animal.aiResult.milkYieldPotential} />
                <ResultDetail label={t('results.careNotes')} content={animal.aiResult.careNotes} />
              </div>
               <div className="mt-6 space-y-3">
                    <button
                        onClick={() => onManageHealth(animal)}
                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 text-white font-semibold rounded-lg shadow-md hover:bg-rose-700 transition-transform duration-150 active:scale-95"
                    >
                        <Icon name="syringe" className="w-5 h-5" />
                        {t('results.manageHealth')}
                    </button>
                  <button
                      onClick={() => onCheckSchemes(animal)}
                      className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary-600 text-white font-semibold rounded-lg shadow-md hover:bg-secondary-700 transition-transform duration-150 active:scale-95"
                  >
                      <Icon name="building-library" className="w-5 h-5" />
                      {t('results.checkSchemes')}
                  </button>
              </div>

              <div className="pt-6 mt-6 border-t border-cream-200">
                <h4 className="font-semibold text-primary-800 mb-3">{t('results.explore')}</h4>
                <div className="space-y-2">
                  <ExplorePromptButton
                      iconName="syringe"
                      text={t('results.exploreVaccinations')}
                      onClick={() => handleExploreClick('vaccinations')}
                      disabled={isLoading}
                  />
                  <ExplorePromptButton
                      iconName="light-bulb"
                      text={t('results.exploreBenefits')}
                      onClick={() => handleExploreClick('benefits')}
                      disabled={isLoading}
                  />
                </div>
              </div>
            </>
          )}
        </div>
        
        {!animal.aiResult.error && (
          <div className="flex flex-col bg-cream-50 rounded-lg border border-secondary-200 min-h-[400px]">
            <div className="p-3 border-b border-secondary-200 bg-secondary-100 rounded-t-lg">
              <h4 className="font-bold text-secondary-900 flex items-center gap-2"><Icon name="chat-bubble" className="w-5 h-5"/>{t('results.chat.title', { breedName: t(`breeds.${animal.aiResult.breedName}`) })}</h4>
            </div>
            <div className="flex-grow p-4 space-y-4 h-64 overflow-y-auto">
              {activeChat.map((msg, index) => (
                <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && <div className="w-8 h-8 rounded-full bg-secondary-800 flex items-center justify-center text-white text-lg flex-shrink-0">🐮</div>}
                  <div className={`p-3 rounded-2xl max-w-xs text-sm shadow-sm ${msg.role === 'user' ? 'bg-accent-500 text-white rounded-br-none' : 'bg-white text-primary-900 rounded-bl-none'}`}>
                     {msg.role === 'user' ? (
                        msg.parts[0].text
                     ) : (
                        <MarkdownRenderer content={msg.parts[0].text} />
                     )}
                  </div>
                </div>
              ))}
              {isLoading && (
                 <div className="flex items-end gap-2 justify-start">
                   <div className="w-8 h-8 rounded-full bg-secondary-800 flex items-center justify-center text-white text-lg flex-shrink-0">🐮</div>
                   <div className="p-3 rounded-2xl bg-white text-gray-500 text-sm rounded-bl-none shadow-sm">{t('generic.thinking')}</div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t border-secondary-200 flex bg-secondary-50">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(userInput)}
                placeholder={t('results.chat.placeholder')}
                className="flex-grow p-2 border border-gray-300 rounded-l-md focus:ring-secondary-500 focus:border-secondary-500 bg-white text-gray-900"
                disabled={isLoading}
              />
              <button onClick={() => handleSendMessage(userInput)} disabled={isLoading} className="p-2 bg-secondary-600 text-white rounded-r-md hover:bg-secondary-700 disabled:bg-gray-400 transition-transform duration-150 active:scale-95">
                <Icon name="send" className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const SchemeCard: React.FC<{ scheme: SchemeInfo }> = ({ scheme }) => {
    const { t } = useLanguage();
    return (
        <div className="bg-cream-50 p-4 rounded-lg border border-cream-200">
            <div className="flex justify-between items-start">
                <div>
                    <h4 className="font-bold text-lg text-primary-900">{scheme.schemeName}</h4>
                    <p className="text-sm font-semibold text-primary-700">{scheme.issuingBody}</p>
                </div>
                {scheme.healthCheckRequired && (
                    <div className="text-center flex-shrink-0 ml-4">
                        <div className="p-2 bg-accent-yellow-100 rounded-full inline-block">
                            <Icon name="calendar-days" className="w-6 h-6 text-accent-yellow-700" />
                        </div>
                        <p className="text-xs font-bold text-accent-yellow-800 mt-1">{scheme.healthCheckFrequency}</p>
                    </div>
                )}
            </div>
            <div className="mt-3 pt-3 border-t border-dashed border-cream-200 space-y-2 text-sm">
                <div>
                    <h5 className="font-semibold text-primary-800">{t('results.schemes.benefits')}:</h5>
                    <p className="text-primary-800">{scheme.description}</p>
                </div>
                <div>
                    <h5 className="font-semibold text-primary-800">{t('results.schemes.eligibility')}:</h5>
                    <p className="text-primary-800">{scheme.eligibility}</p>
                </div>
            </div>
        </div>
    );
};


const SchemesModal: React.FC<{
    animal: AnimalResult | null;
    schemes: SchemeInfo[];
    error: string | null;
    isLoading: boolean;
    onClose: () => void;
}> = ({ animal, schemes, error, isLoading, onClose }) => {
    const { t } = useLanguage();
    if (!animal) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-cream-200 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-primary-900">{t('results.schemes.title', { breedName: t(`breeds.${animal.aiResult.breedName}`) })}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-cream-200"><Icon name="close" className="w-6 h-6 text-gray-500"/></button>
                </div>
                <div className="flex-grow p-4 overflow-y-auto">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                            <Icon name="ai-sparkles" className="w-12 h-12 text-gray-400 animate-pulse mb-2"/>
                            <p className="font-semibold">{t('results.schemes.loading')}</p>
                        </div>
                    ) : error ? (
                         <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg"><p className="text-red-700">{error}</p></div>
                    ) : schemes.length > 0 ? (
                        <div className="space-y-4">{schemes.map((scheme, i) => <SchemeCard key={i} scheme={scheme} />)}</div>
                    ) : (
                        <div className="text-center py-10">
                             <Icon name="search" className="w-12 h-12 mx-auto text-gray-400" />
                             <p className="mt-2 font-semibold text-primary-700">{t('results.schemes.noSchemes')}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


export const ResultsPage: React.FC<ResultsPageProps> = ({ results: initialResults, owner, onFinish, registration: initialRegistration, onViewReport, onUpdateRegistration }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [activeAnimalIndex, setActiveAnimalIndex] = useState(0);
  const [registration, setRegistration] = useState(initialRegistration);
  const [results, setResults] = useState(initialResults);
  const { t } = useLanguage();

  const [schemes, setSchemes] = useState<SchemeInfo[]>([]);
  const [schemesError, setSchemesError] = useState<string | null>(null);
  const [isLoadingSchemes, setIsLoadingSchemes] = useState(false);
  const [schemesForAnimal, setSchemesForAnimal] = useState<AnimalResult | null>(null);

  const [healthModalAnimal, setHealthModalAnimal] = useState<AnimalResult | null>(null);

  const handleCheckSchemes = async (animal: AnimalResult) => {
      if (!animal || animal.aiResult.error) return;
      setSchemesForAnimal(animal);
      setIsLoadingSchemes(true);
      setSchemes([]);
      setSchemesError(null);

      try {
        const { schemes: fetchedSchemes, error } = await getSchemeInfo(animal.aiResult.breedName, animal.species as Species);
        setSchemes(fetchedSchemes);
        setSchemesError(error);
      } catch (e) {
        setSchemesError("Failed to fetch schemes due to an unexpected error.");
      } finally {
        setIsLoadingSchemes(false);
      }
  };

  const handleCloseSchemesModal = () => {
      setSchemesForAnimal(null);
  };
  
  const handleManageHealth = (animal: AnimalResult) => {
    setHealthModalAnimal(animal);
  };
  
  const handleSaveHealthRecord = (updatedReg: Registration) => {
    onUpdateRegistration(updatedReg);
    setRegistration(updatedReg);
    setResults(updatedReg.animals);
  };


  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-8">
      <div className="text-center bg-white p-8 rounded-xl border border-cream-200">
        <div className={`transition-all duration-500 ease-out transform ${isMounted ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <Icon name="check" className="w-16 h-16 mx-auto text-accent-600 bg-accent-100 rounded-full p-3" />
        </div>
        <h1 className="text-3xl font-bold mt-4 text-primary-900">{t('results.pageTitle')}</h1>
        <p className="text-primary-700 mt-2">{t('results.pageSubtitle', { ownerName: owner.name })}</p>
      </div>

      {/* Tabs for multiple animals */}
      {results.length > 1 && (
        <div className="border-b border-cream-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {results.map((animal, index) => (
              <button
                key={animal.id}
                onClick={() => setActiveAnimalIndex(index)}
                className={`
                  ${index === activeAnimalIndex
                    ? 'border-accent-500 text-accent-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all
                `}
              >
                {t('results.animalTab', { index: index + 1 })} - {animal.aiResult.error ? t('results.analysisFailed') : t(`breeds.${animal.aiResult.breedName}`)}
              </button>
            ))}
          </nav>
        </div>
      )}

      {results.length > 0 && (
         <div 
            key={results[activeAnimalIndex].id} // Add key to force re-mount of child component on tab change
            className={`transition-all duration-500 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
          >
            <AnimalResultCardWithChat 
                animal={results[activeAnimalIndex]} 
                index={activeAnimalIndex} 
                onCheckSchemes={handleCheckSchemes}
                onManageHealth={handleManageHealth}
            />
          </div>
      )}


      <div className="text-center mt-10 flex justify-center items-center gap-4">
        <button 
          onClick={onFinish} 
          className="px-8 py-3 border border-gray-300 text-primary-700 font-semibold rounded-lg hover:bg-gray-50 transition-transform duration-150 active:scale-95"
        >
          {t('buttons.backToDash')}
        </button>
        <button 
          onClick={() => registration && onViewReport(registration)} 
          disabled={!registration}
          className="px-8 py-3 bg-accent-500 text-white font-semibold rounded-lg shadow-md hover:bg-accent-600 transition-transform duration-150 active:scale-95 disabled:bg-accent-300"
        >
          {t('buttons.viewOfficialReport')}
        </button>
      </div>

       <SchemesModal
        animal={schemesForAnimal}
        schemes={schemes}
        error={schemesError}
        isLoading={isLoadingSchemes}
        onClose={handleCloseSchemesModal}
      />
      
      {healthModalAnimal && registration && (
          <HealthRecordModal
            isOpen={!!healthModalAnimal}
            onClose={() => setHealthModalAnimal(null)}
            animal={healthModalAnimal}
            registration={registration}
            onSave={handleSaveHealthRecord}
          />
      )}
    </div>
  );
};

const ResultDetail: React.FC<{label: string, content: TranslatableText | string}> = ({label, content}) => {
    const { language } = useLanguage();

    const displayText = (typeof content === 'object' && content !== null && language in content)
        ? content[language as keyof TranslatableText]
        : String(content);
        
    return (
        <div>
            <h4 className="font-semibold text-primary-800">{label}</h4>
            <p className="text-primary-900">{displayText}</p>
        </div>
    );
};
