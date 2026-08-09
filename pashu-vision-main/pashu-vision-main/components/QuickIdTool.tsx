import React, { useState, useRef, useCallback, useEffect } from 'react';
import { PhotoFile, BreedIdentificationResult, TranslatableText } from '../types';
import { Icon } from './icons';
import { toBase64 } from '../utils/fileUtils';
import { identifyBreed } from '../services/geminiService';
import { CameraModal } from './CameraModal';
import { ANALYSIS_MESSAGES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

type Step = 'input' | 'loading' | 'result';

const LoadingState: React.FC = () => {
    const [messageIndex, setMessageIndex] = useState(0);
    const { t } = useLanguage();

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % ANALYSIS_MESSAGES.length);
        }, 2500);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center max-w-lg mx-auto">
            <div className="relative inline-flex items-center justify-center mb-6">
                <div className="absolute w-24 h-24 bg-secondary-200 rounded-full animate-ping"></div>
                <div className="relative bg-secondary-600 text-white p-5 rounded-full">
                    <Icon name="ai-sparkles" className="w-12 h-12" />
                </div>
            </div>
            <h2 className="text-3xl font-bold text-primary-800 mb-2">{t('generic.analysisInProgress')}</h2>
            <p className="text-primary-700 mb-6">{t('generic.analysisSub')}</p>
            <div className="w-full bg-cream-100 p-4 rounded-md text-center transition-all duration-500">
                <p className="text-primary-800 font-medium">{ANALYSIS_MESSAGES[messageIndex]}</p>
            </div>
        </div>
    );
};

const ConfidenceIndicator: React.FC<{ score: number }> = ({ score }) => {
  const { t } = useLanguage();
  const getColor = () => {
    if (score >= 85) return 'bg-green-100 text-green-800 border-green-200';
    if (score >= 75) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <div className={`px-2.5 py-1 rounded-full text-sm font-medium border flex items-center gap-1.5 ${getColor()}`}>
      <span>{score}% {t('results.confidence')}</span>
    </div>
  );
};


const ResultState: React.FC<{
    result: BreedIdentificationResult;
    photo: PhotoFile;
    onReset: () => void;
}> = ({ result, photo, onReset }) => {
    const { error, species, breedName, confidence, reasoning, milkYieldPotential, careNotes, topCandidates } = result;
    const { t, language } = useLanguage();

    const getTranslatedText = (content: TranslatableText | string) => {
        if (typeof content === 'object' && content !== null && language in content) {
          return content[language as keyof TranslatableText];
        }
        return String(content);
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-cream-200">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <div className="mb-4 overflow-hidden rounded-lg aspect-video bg-cream-100 flex items-center justify-center">
                        <img src={photo.previewUrl} alt="Analyzed animal" className="w-full h-full object-cover" />
                    </div>
                     <div className="mt-4">
                        <button
                            onClick={onReset}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-800 text-white font-semibold rounded-lg shadow-md hover:bg-primary-700 transition-transform duration-150 active:scale-95"
                        >
                            <Icon name="refresh" className="w-5 h-5" />
                            {t('quickId.identifyAnother')}
                        </button>
                    </div>
                </div>

                <div>
                    {error ? (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg h-full flex flex-col justify-center">
                            <h3 className="text-lg font-bold text-red-800">{t('results.analysisFailed')}</h3>
                            <p className="text-red-700 mt-1">{error}</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <h3 className="text-2xl font-bold text-primary-800">{t(`breeds.${breedName}`)}</h3>
                                <ConfidenceIndicator score={confidence} />
                            </div>
                            {species && (
                                <p className="font-semibold text-primary-700 -mt-2">
                                    {t('quickId.identifiedSpecies')}: <span className="font-bold text-secondary-700">{t(`species.${species.toLowerCase()}`)}</span>
                                </p>
                            )}
                            <div>
                                <h4 className="font-semibold text-primary-800">{t('results.aiReasoning')}</h4>
                                <p className="text-primary-900">{getTranslatedText(reasoning)}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-primary-800">{t('results.milkYield')}</h4>
                                <p className="text-primary-900">{getTranslatedText(milkYieldPotential)}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-primary-800">{t('results.careNotes')}</h4>
                                <p className="text-primary-900">{getTranslatedText(careNotes)}</p>
                            </div>

                            {confidence < 75 && topCandidates && topCandidates.length > 0 && (
                                <div className="pt-4 mt-4 border-t border-cream-200">
                                    <h4 className="font-bold text-primary-800 mb-2">{t('results.lowConfidence')}</h4>
                                    <ul className="space-y-2">
                                        {topCandidates.map(candidate => (
                                            <li key={candidate.breedName} className="p-3 bg-cream-50 border border-cream-200 rounded-md flex justify-between items-center">
                                                <span className="font-semibold text-primary-800">{t(`breeds.${candidate.breedName}`)}</span>
                                                <span className="text-sm font-medium text-primary-700">{candidate.confidencePercentage}%</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const InputState: React.FC<{
    onIdentify: (photo: PhotoFile) => void;
}> = ({ onIdentify }) => {
    const [photo, setPhoto] = useState<PhotoFile | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { t } = useLanguage();

    const handlePhotoChange = (files: File[]) => {
        if (files.length > 0) {
            const file = files[0];
            toBase64(file).then(base64Data => {
                setPhoto({
                    id: `${file.name}-${Date.now()}`,
                    base64Data,
                    mimeType: file.type,
                    previewUrl: `data:${file.type};base64,${base64Data}`,
                });
            });
        }
    };

    const handleCapture = useCallback((file: File) => {
        handlePhotoChange([file]);
        setIsCameraOpen(false);
    }, []);

    const handleRemovePhoto = () => {
        setPhoto(null);
    };
    
    const handleIdentifyClick = () => {
        if (!photo) {
            setError(t('quickId.errors.noPhoto'));
            return;
        }
        setError(null);
        onIdentify(photo);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handlePhotoChange(Array.from(e.dataTransfer.files));
        }
    };

    return (
        <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-primary-900">{t('quickId.title')}</h2>
                <p className="text-primary-700 mt-2 text-lg">{t('quickId.subtitle')}</p>
            </div>
            
            <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragLeave={handleDragLeave}
                className={`bg-white p-4 rounded-2xl shadow-lg border-2 border-dashed  text-center transition-all duration-300
                    ${isDragging ? 'border-accent-400 bg-accent-50 scale-105' : 'border-cream-200'}
                `}
            >
                {photo ? (
                    <div className="p-4">
                        <div className="relative group">
                            <img src={photo.previewUrl} alt="Animal preview" className="w-full max-h-[40vh] object-contain rounded-lg"/>
                            <button onClick={handleRemovePhoto} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-red-600 focus:opacity-100 transition-all">
                                <Icon name="trash" className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 min-h-[250px]">
                        <Icon name="upload" className="mx-auto w-16 h-16 text-gray-300"/>
                        <p className="mt-4 text-lg font-semibold text-primary-800">{t('quickId.dragDrop')}</p>
                        <p className="text-sm text-gray-500 mt-1">{t('quickId.or')}</p>
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button type="button" onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-white border border-gray-300 rounded-full text-sm font-semibold text-primary-800 hover:bg-gray-50 transition-all duration-200">
                                {t('buttons.upload')}
                            </button>
                            <button type="button" onClick={() => setIsCameraOpen(true)} className="px-5 py-2.5 bg-primary-900 border border-transparent rounded-full text-sm font-semibold text-white hover:bg-primary-800 transition-all duration-200">
                                 {t('buttons.capture')}
                            </button>
                        </div>
                    </div>
                )}
                 {error && (
                    <p className="text-red-600 text-sm mt-2">{error}</p>
                )}
                
                {photo && (
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleIdentifyClick}
                            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-accent-500 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-accent-600 transition-all duration-200 active:scale-95 disabled:bg-accent-300"
                        >
                            <Icon name="ai-sparkles" className="w-6 h-6" />
                            {t('quickId.identifyButton')}
                        </button>
                    </div>
                )}
            </div>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files && handlePhotoChange(Array.from(e.target.files))}
                className="hidden"
            />
            <CameraModal 
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={handleCapture}
            />
        </div>
    );
};

interface QuickIdToolProps {
  onBackToDashboard: () => void;
}

export const QuickIdTool: React.FC<QuickIdToolProps> = ({ onBackToDashboard }) => {
    const [step, setStep] = useState<Step>('input');
    const [photo, setPhoto] = useState<PhotoFile | null>(null);
    const [result, setResult] = useState<BreedIdentificationResult | null>(null);
    const { t } = useLanguage();

    const handleIdentify = (photoToIdentify: PhotoFile) => {
        setStep('loading');
        setPhoto(photoToIdentify);
        
        identifyBreed([{ mimeType: photoToIdentify.mimeType, data: photoToIdentify.base64Data }]).then(res => {
            setResult(res);
            setStep('result');
        });
    };

    const handleReset = () => {
        setStep('input');
        setPhoto(null);
        setResult(null);
    };

    const renderContent = () => {
        switch (step) {
            case 'loading':
                return <LoadingState />;
            case 'result':
                if (!result || !photo) {
                    handleReset();
                    return null;
                }
                return <ResultState result={result} photo={photo} onReset={handleReset} />;
            case 'input':
            default:
                return <InputState onIdentify={handleIdentify} />;
        }
    };

    return (
        <div>
            <div className="flex justify-end mb-6">
                <button onClick={onBackToDashboard} className="px-4 py-2 border border-gray-300 rounded-md text-primary-700 font-semibold hover:bg-gray-50 text-sm transition-transform duration-150 active:scale-95">{t('buttons.backToDash')}</button>
            </div>
            {renderContent()}
        </div>
    );
};