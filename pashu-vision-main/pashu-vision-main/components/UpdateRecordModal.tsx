
import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './icons';
import { Registration } from '../types';
import { CameraModal } from './CameraModal';
import { useLanguage } from '../contexts/LanguageContext';


interface UpdateRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditRegistration: (registration: Registration) => void;
  registrations: Registration[];
}

export const UpdateRecordModal: React.FC<UpdateRecordModalProps> = ({ isOpen, onClose, onEditRegistration, registrations }) => {
  const [searchType, setSearchType] = useState<'aadhaar' | 'regId'>('aadhaar');
  const [searchValue, setSearchValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSearchValue('');
      setSearchType('aadhaar');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSearch = (type: 'aadhaar' | 'regId', value: string) => {
    let foundRegistration: Registration | undefined;
    setError(null);
    
    if (type === 'aadhaar') {
        if (value.length !== 12 || !/^\d+$/.test(value)) {
            setError(t('updateModal.errors.aadhaar'));
            return;
        }
        foundRegistration = registrations.find(reg => reg.owner.idType === 'Aadhaar' && reg.owner.idNumber === value);
    } else { // type === 'regId'
        if (value.trim() === '') {
            setError(t('updateModal.errors.regId'));
            return;
        }
        foundRegistration = registrations.find(reg => reg.id === value);
    }

    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      if (foundRegistration) {
        onEditRegistration(foundRegistration);
        onClose();
      } else {
        const searchTypeName = type === 'aadhaar' ? t('updateModal.aadhaar') : t('updateModal.regId');
        setError(t('updateModal.errors.notFound', { type: searchTypeName }));
      }
    }, 500);
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleSearch(searchType, searchValue);
    }
  };
  
  const handleCodeDetected = (code: string) => {
      setIsCameraOpen(false);
      setError(null);
      
      const urlPrefix = 'https://verify.pashuvision.gov.in/CERT/';
      let parsedRegId: string | null = null;
      
      if (code.startsWith(urlPrefix)) {
          // Extracting the ID from the specific URL format
          const certId = code.substring(urlPrefix.length); // e.g., INAPH-CERT-2025-xxxx
          // Assuming the registration ID is embedded in the cert ID.
          // This part might need adjustment if the format is different.
          // Let's assume the registration ID format is 'reg-timestamp'
          const year = certId.split('-')[2];
          const regNumPart = certId.split('-')[3];
          
          const foundReg = registrations.find(r => {
              const r_year = new Date(r.timestamp).getFullYear().toString();
              const r_num = r.id.split('-')[1].slice(-4);
              return r_year === year && r_num === regNumPart;
          });
          if (foundReg) {
            parsedRegId = foundReg.id;
          }

      } else {
          // Fallback for other QR code data formats
          try {
              const qrData = JSON.parse(code);
              if (qrData.regId) {
                  parsedRegId = qrData.regId;
              }
          } catch (e) {
            // Check if code itself might be the regId
            if (registrations.some(r => r.id === code)) {
              parsedRegId = code;
            }
          }
      }

      if (parsedRegId) {
          setSearchType('regId');
          setSearchValue(parsedRegId);
          handleSearch('regId', parsedRegId);
      } else {
          setError(t('updateModal.errors.invalidQr'));
      }
  };


  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          ref={modalRef}
          tabIndex={-1}
          className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-md flex flex-col relative"
          onClick={e => e.stopPropagation()}
        >
          <div className="p-4 border-b border-cream-200 flex justify-between items-center">
            <h2 className="text-xl font-bold text-primary-900 flex items-center gap-2">
              <Icon name="pencil-square" className="w-6 h-6 text-accent-yellow-600" />
              {t('updateModal.title')}
            </h2>
            <button onClick={onClose} className="p-1 rounded-full hover:bg-cream-200">
              <Icon name="close" className="w-6 h-6 text-gray-500" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-primary-700 text-sm">
              {t('updateModal.subtitle')}
            </p>
            <div>
                <fieldset>
                    <legend className="block text-sm font-medium text-primary-800 mb-2">{t('updateModal.searchBy')}</legend>
                    <div className="flex gap-4 mb-3">
                        <label className="flex items-center cursor-pointer">
                        <input type="radio" name="searchType" value="aadhaar" checked={searchType === 'aadhaar'} onChange={() => setSearchType('aadhaar')} className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300"/>
                        <span className="ml-2 text-sm text-primary-800">{t('updateModal.aadhaar')}</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                        <input type="radio" name="searchType" value="regId" checked={searchType === 'regId'} onChange={() => setSearchType('regId')} className="h-4 w-4 text-accent-600 focus:ring-accent-500 border-gray-300"/>
                        <span className="ml-2 text-sm text-primary-800">{t('updateModal.regId')}</span>
                        </label>
                    </div>
                </fieldset>
              <input
                ref={inputRef}
                id="search-value"
                type="text"
                placeholder={t(`updateModal.placeholder.${searchType}`)}
                value={searchValue}
                onChange={e => {
                    const val = e.target.value;
                    setSearchValue(searchType === 'aadhaar' ? val.replace(/\D/g, '') : val);
                }}
                onKeyPress={handleKeyPress}
                maxLength={searchType === 'aadhaar' ? 12 : 50}
                className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-accent-yellow-500 focus:border-accent-yellow-500"
              />
            </div>
            <button
              onClick={() => handleSearch(searchType, searchValue)}
              disabled={isLoading}
              className="w-full px-6 py-2 bg-accent-500 text-white font-semibold rounded-md hover:bg-accent-600 shadow-sm flex items-center justify-center disabled:bg-accent-400 disabled:cursor-not-allowed transition-transform duration-150 active:scale-95"
            >
                {t(`updateModal.searchButton.${searchType}`)}
            </button>
            
            <div className="flex items-center text-center">
                <div className="flex-grow border-t border-cream-200"></div>
                <span className="flex-shrink mx-4 text-gray-500 text-xs font-semibold">{t('updateModal.or')}</span>
                <div className="flex-grow border-t border-cream-200"></div>
            </div>

            <button
              onClick={() => setIsCameraOpen(true)}
              disabled={isLoading}
              className="w-full px-6 py-3 bg-primary-800 text-white font-semibold rounded-md hover:bg-primary-700 shadow-sm flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed transition-transform duration-150 active:scale-95"
            >
                <Icon name="qrcode" className="w-6 h-6" />
                {t('updateModal.scan')}
            </button>


            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-r-lg text-sm mt-4">
                {error}
              </div>
            )}
          </div>
          
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
              <svg className="animate-spin h-8 w-8 text-accent-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="mt-3 font-semibold text-primary-800">{t('updateModal.searching')}</p>
            </div>
          )}

        </div>
      </div>
      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCodeDetected={handleCodeDetected}
      />
    </>
  );
};
