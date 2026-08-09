
import React, { useState, useEffect } from 'react';
import { Icon } from './icons';
import { ANALYSIS_MESSAGES } from '../constants';

export const AnalysisScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prevIndex => (prevIndex + 1) % ANALYSIS_MESSAGES.length);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center bg-white p-12 rounded-lg shadow-lg min-h-[400px]">
      <div className="relative flex items-center justify-center mb-6">
          <div className="absolute w-24 h-24 bg-brand-100 rounded-full animate-ping"></div>
          <div className="relative bg-brand-600 text-white p-5 rounded-full">
            <Icon name="ai-sparkles" className="w-12 h-12" />
          </div>
      </div>
      <h2 className="text-3xl font-bold text-brand-800 mb-4">AI Analysis in Progress...</h2>
      <p className="text-gray-600 mb-8">Please wait while our AI veterinarian examines the photos.</p>
      
      <div className="w-full max-w-md bg-gray-100 p-4 rounded-md text-center transition-all duration-500">
        <p className="text-gray-700 font-medium">{ANALYSIS_MESSAGES[messageIndex]}</p>
      </div>
    </div>
  );
};
