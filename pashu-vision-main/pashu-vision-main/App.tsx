import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { RegistrationWizard } from './components/RegistrationWizard';
import { HistoryPage } from './components/HistoryPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { QuickIdTool } from './components/QuickIdTool';
import { Registration } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import * as dbService from './services/databaseService';
import { Icon } from './components/icons';
import { UserGuideModal } from './components/UserGuideModal';

type View = 'DASHBOARD' | 'REGISTRATION' | 'HISTORY' | 'ANALYTICS' | 'QUICK_ID';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [registrationToEdit, setRegistrationToEdit] = useState<Registration | null>(null);
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [isDbLoading, setIsDbLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [globalAutoFill] = useState(true);
  
  const { t } = useLanguage();
  
  useEffect(() => {
    dbService.getAllRegistrations().then(data => {
        setRegistrations(data);
        setIsDbLoading(false);
    }).catch(err => {
        console.error("Failed to load data from server:", err);
        setIsDbLoading(false);
        alert("Could not load data from server. Please check your connection.");
    });
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleScroll = () => {
        setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('scroll', handleScroll);

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const syncUnsyncedRegistrations = useCallback(async () => {
    if (!isOnline || isSyncing) return;

    const unsynced = registrations.filter(r => !r.synced && r.status === 'Completed');
    if (unsynced.length === 0) return;

    setIsSyncing(true);
    
    const syncPromises = unsynced.map(async (reg) => {
        try {
            await new Promise(res => setTimeout(res, 750)); // Simulate API call
            const updatedReg = { ...reg, synced: true };
            await dbService.upsertRegistration(updatedReg);
            return updatedReg.id; // Return ID on success
        } catch (error) {
            console.error('Failed to sync registration:', reg.id, error);
            return null; // Return null on failure
        }
    });

    const results = await Promise.all(syncPromises);
    const successfulSyncs = results.filter((id): id is string => id !== null);

    if (successfulSyncs.length > 0) {
        setRegistrations(prev =>
            prev.map(r => successfulSyncs.includes(r.id) ? { ...r, synced: true } : r)
        );
    }

    setIsSyncing(false);
  }, [isOnline, isSyncing, registrations]);

  useEffect(() => {
    if (isOnline) {
      syncUnsyncedRegistrations();
    }
  }, [isOnline, syncUnsyncedRegistrations]);

  const handleRegistrationComplete = async (completedReg: Registration) => {
    const isUpdating = registrationToEdit != null;
    const regToSave = { 
        ...completedReg, 
        synced: isUpdating ? registrationToEdit.synced : false 
    };
    
    await dbService.upsertRegistration(regToSave);

    setRegistrations(prevRegs => {
        const existingIndex = prevRegs.findIndex(reg => reg.id === regToSave.id);
        if (existingIndex > -1) {
            const newRegs = [...prevRegs];
            newRegs[existingIndex] = regToSave;
            return newRegs;
        }
        return [...prevRegs, regToSave];
    });
  };

  const handleUpdateRegistration = async (updatedReg: Registration) => {
    await dbService.upsertRegistration(updatedReg);
    setRegistrations(prevRegs => 
        prevRegs.map(reg => reg.id === updatedReg.id ? updatedReg : reg)
    );
  };

  const navigateTo = (view: View) => {
    setSelectedRegistration(null);
    setRegistrationToEdit(null);
    setGlobalSearchTerm('');
    setCurrentView(view);
  };
  
  const handleViewRegistration = (registration: Registration) => {
      setSelectedRegistration(registration);
      setCurrentView('HISTORY');
  };
  
  const handleEditRegistration = (registration: Registration) => {
      setRegistrationToEdit(registration);
      setCurrentView('REGISTRATION');
  };

  const handleGlobalSearch = (term: string) => {
    setGlobalSearchTerm(term);
    setCurrentView('HISTORY');
  }

  const renderView = () => {
    switch (currentView) {
      case 'REGISTRATION':
        return <RegistrationWizard 
                    onBackToDashboard={() => navigateTo('DASHBOARD')}
                    registrationToUpdate={registrationToEdit}
                    onViewReport={handleViewRegistration}
                    onComplete={handleRegistrationComplete}
                    initialAutoFill={globalAutoFill}
                />;
      case 'HISTORY':
        return <HistoryPage 
                    registrations={registrations}
                    selectedRegistration={selectedRegistration} 
                    onBack={() => navigateTo('DASHBOARD')} 
                    onEdit={handleEditRegistration}
                    initialSearchTerm={globalSearchTerm}
                    onUpdateRegistration={handleUpdateRegistration}
                />;
      case 'ANALYTICS':
        return <AnalyticsPage registrations={registrations} onBack={() => navigateTo('DASHBOARD')} />;
      case 'QUICK_ID':
        return <QuickIdTool onBackToDashboard={() => navigateTo('DASHBOARD')} />;
      case 'DASHBOARD':
      default:
        return <Dashboard 
                    registrations={registrations}
                    onNavigate={navigateTo} 
                    onViewRegistration={handleViewRegistration}
                    onEditRegistration={handleEditRegistration}
                    isOnline={isOnline}
                    isSyncing={isSyncing}
                    onSync={syncUnsyncedRegistrations}
                />;
    }
  };

  if (isDbLoading) {
    return (
        <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center text-center p-4">
            <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 bg-primary-200 rounded-full animate-ping opacity-50"></div>
                <Icon name="cow" className="w-16 h-16 text-primary-700" />
            </div>
            <h1 className="text-xl font-bold text-primary-800 mt-6">{t('app.connectingDb')}</h1>
            <p className="text-primary-700">{t('app.loadingRecords')}</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-primary-900 font-sans">
      <Header 
        onSearch={handleGlobalSearch} 
        showSearch={currentView === 'DASHBOARD'} 
        isOnline={isOnline} 
        isScrolled={isScrolled} 
        onOpenGuide={() => setIsGuideOpen(true)}
      />
      <main className="container mx-auto p-4">
        {renderView()}
      </main>
      <UserGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
};

const App: React.FC = () => {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
}

export default App;
