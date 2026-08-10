import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { RegistrationWizard } from './components/RegistrationWizard';
import { HistoryPage } from './components/HistoryPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { QuickIdTool } from './components/QuickIdTool';
import { UserGuideModal } from './components/UserGuideModal';
import { Icon } from './components/icons';

import { Registration } from './types';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import * as dbService from './services/databaseService';

type View =
  | 'DASHBOARD'
  | 'REGISTRATION'
  | 'HISTORY'
  | 'ANALYTICS'
  | 'QUICK_ID';

const SYNC_RETRY_LIMIT = 3;
const SYNC_RETRY_BASE_DELAY = 750;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const getRetryDelay = (attempt: number) =>
  SYNC_RETRY_BASE_DELAY * Math.pow(2, attempt);

const AppContent: React.FC = () => {
  const { t } = useLanguage();

  const [currentView, setCurrentView] =
    useState<View>('DASHBOARD');

  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);

  const [registrationToEdit, setRegistrationToEdit] =
    useState<Registration | null>(null);

  const [globalSearchTerm, setGlobalSearchTerm] =
    useState('');

  const [registrations, setRegistrations] =
    useState<Registration[]>([]);

  const [isDbLoading, setIsDbLoading] =
    useState(true);

  const [dbError, setDbError] =
    useState<string | null>(null);

  const [isOnline, setIsOnline] =
    useState(() =>
      typeof navigator !== 'undefined'
        ? navigator.onLine
        : true
    );

  const [isSyncing, setIsSyncing] =
    useState(false);

  const [syncError, setSyncError] =
    useState<string | null>(null);

  const [isScrolled, setIsScrolled] =
    useState(false);

  const [isGuideOpen, setIsGuideOpen] =
    useState(false);

  const globalAutoFill = true;

  const syncLockRef = useRef(false);
  const mountedRef = useRef(true);

  /**
   * Keep track of component lifecycle so asynchronous
   * operations don't update state after unmount.
   */
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  /**
   * Load registrations.
   */
  const loadRegistrations = useCallback(async () => {
    if (!mountedRef.current) return;

    setIsDbLoading(true);
    setDbError(null);

    try {
      const data = await dbService.getAllRegistrations();

      if (!mountedRef.current) return;

      setRegistrations(data);
    } catch (error) {
      console.error(
        'Failed to load registrations:',
        error
      );

      if (!mountedRef.current) return;

      setDbError(
        'Could not load your records. Please check your connection and try again.'
      );
    } finally {
      if (mountedRef.current) {
        setIsDbLoading(false);
      }
    }
  }, []);

  /**
   * Initial database load.
   */
  useEffect(() => {
    loadRegistrations();
  }, [loadRegistrations]);

  /**
   * Network + scroll listeners.
   */
  useEffect(() => {
    const handleOnline = () => {
      if (mountedRef.current) {
        setIsOnline(true);
        setSyncError(null);
      }
    };

    const handleOffline = () => {
      if (mountedRef.current) {
        setIsOnline(false);
      }
    };

    const handleScroll = () => {
      if (mountedRef.current) {
        setIsScrolled(window.scrollY > 10);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  /**
   * Prevent accidental page closing during synchronization.
   */
  useEffect(() => {
    if (!isSyncing) return;

    const handleBeforeUnload = (
      event: BeforeUnloadEvent
    ) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    );

    return () => {
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      );
    };
  }, [isSyncing]);

  /**
   * Number of completed records waiting for synchronization.
   */
  const unsyncedCount = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          !registration.synced &&
          registration.status === 'Completed'
      ).length,
    [registrations]
  );

  /**
   * Sync a single registration with retry support.
   */
  const syncRegistration = useCallback(
    async (registration: Registration) => {
      let lastError: unknown = null;

      for (
        let attempt = 0;
        attempt < SYNC_RETRY_LIMIT;
        attempt++
      ) {
        try {
          /*
           * Replace this simulated delay with your
           * actual API request.
           */
          await sleep(
            getRetryDelay(attempt)
          );

          const updatedRegistration: Registration = {
            ...registration,
            synced: true,
          };

          await dbService.upsertRegistration(
            updatedRegistration
          );

          return updatedRegistration;
        } catch (error) {
          lastError = error;

          console.error(
            `Sync attempt ${attempt + 1} failed for ${registration.id}`,
            error
          );

          if (attempt < SYNC_RETRY_LIMIT - 1) {
            await sleep(
              getRetryDelay(attempt)
            );
          }
        }
      }

      throw lastError;
    },
    []
  );

  /**
   * Synchronize all completed unsynced records.
   */
  const syncUnsyncedRegistrations =
    useCallback(async () => {
      if (
        !isOnline ||
        syncLockRef.current ||
        !mountedRef.current
      ) {
        return;
      }

      const unsynced = registrations.filter(
        (registration) =>
          !registration.synced &&
          registration.status === 'Completed'
      );

      if (unsynced.length === 0) {
        setSyncError(null);
        return;
      }

      syncLockRef.current = true;
      setIsSyncing(true);
      setSyncError(null);

      try {
        /*
         * Run synchronizations concurrently.
         * Promise.allSettled ensures one failed record
         * doesn't prevent the others from syncing.
         */
        const results = await Promise.allSettled(
          unsynced.map(syncRegistration)
        );

        if (!mountedRef.current) return;

        const successful = results
          .filter(
            (
              result
            ): result is PromiseFulfilledResult<Registration> =>
              result.status === 'fulfilled'
          )
          .map((result) => result.value);

        const failedCount = results.filter(
          (result) => result.status === 'rejected'
        ).length;

        if (successful.length > 0) {
          setRegistrations((previous) =>
            previous.map((registration) => {
              const syncedRegistration =
                successful.find(
                  (item) =>
                    item.id === registration.id
                );

              return (
                syncedRegistration ??
                registration
              );
            })
          );
        }

        if (failedCount > 0) {
          setSyncError(
            `${failedCount} record${
              failedCount === 1 ? '' : 's'
            } could not be synchronized.`
          );
        }
      } catch (error) {
        console.error(
          'Unexpected synchronization error:',
          error
        );

        if (mountedRef.current) {
          setSyncError(
            'Synchronization failed. Please try again.'
          );
        }
      } finally {
        syncLockRef.current = false;

        if (mountedRef.current) {
          setIsSyncing(false);
        }
      }
    }, [
      isOnline,
      registrations,
      syncRegistration,
    ]);

  /**
   * Automatically sync whenever connectivity returns.
   */
  useEffect(() => {
    if (!isOnline || unsyncedCount === 0) {
      return;
    }

    syncUnsyncedRegistrations();
  }, [
    isOnline,
    unsyncedCount,
    syncUnsyncedRegistrations,
  ]);

  /**
   * Save or update a registration.
   */
  const handleRegistrationComplete =
    useCallback(
      async (completedReg: Registration) => {
        const isUpdating =
          registrationToEdit !== null;

        const registrationToSave: Registration = {
          ...completedReg,

          /*
           * Existing registrations retain their sync state.
           * New registrations start unsynced.
           */
          synced: isUpdating
            ? registrationToEdit.synced
            : false,
        };

        try {
          await dbService.upsertRegistration(
            registrationToSave
          );

          if (!mountedRef.current) return;

          setRegistrations((previous) => {
            const index = previous.findIndex(
              (registration) =>
                registration.id ===
                registrationToSave.id
            );

            if (index === -1) {
              return [
                ...previous,
                registrationToSave,
              ];
            }

            const next = [...previous];
            next[index] = registrationToSave;

            return next;
          });

          /*
           * Once the save completes, clear editing state.
           */
          setRegistrationToEdit(null);
        } catch (error) {
          console.error(
            'Failed to save registration:',
            error
          );

          throw error;
        }
      },
      [registrationToEdit]
    );

  /**
   * Update an existing registration.
   */
  const handleUpdateRegistration =
    useCallback(
      async (updatedReg: Registration) => {
        await dbService.upsertRegistration(
          updatedReg
        );

        if (!mountedRef.current) return;

        setRegistrations((previous) =>
          previous.map((registration) =>
            registration.id === updatedReg.id
              ? updatedReg
              : registration
          )
        );
      },
      []
    );

  /**
   * Centralized navigation.
   */
  const navigateTo = useCallback(
    (view: View) => {
      setSelectedRegistration(null);
      setRegistrationToEdit(null);
      setGlobalSearchTerm('');
      setCurrentView(view);
    },
    []
  );

  const handleViewRegistration =
    useCallback(
      (registration: Registration) => {
        setSelectedRegistration(registration);
        setRegistrationToEdit(null);
        setCurrentView('HISTORY');
      },
      []
    );

  const handleEditRegistration =
    useCallback(
      (registration: Registration) => {
        setRegistrationToEdit(registration);
        setSelectedRegistration(null);
        setCurrentView('REGISTRATION');
      },
      []
    );

  const handleGlobalSearch =
    useCallback((term: string) => {
      setGlobalSearchTerm(term);
      setSelectedRegistration(null);
      setCurrentView('HISTORY');
    }, []);

  /**
   * Render the active page.
   */
  const renderView = () => {
    switch (currentView) {
      case 'REGISTRATION':
        return (
          <RegistrationWizard
            onBackToDashboard={() =>
              navigateTo('DASHBOARD')
            }
            registrationToUpdate={
              registrationToEdit
            }
            onViewReport={
              handleViewRegistration
            }
            onComplete={
              handleRegistrationComplete
            }
            initialAutoFill={globalAutoFill}
          />
        );

      case 'HISTORY':
        return (
          <HistoryPage
            registrations={registrations}
            selectedRegistration={
              selectedRegistration
            }
            onBack={() =>
              navigateTo('DASHBOARD')
            }
            onEdit={
              handleEditRegistration
            }
            initialSearchTerm={
              globalSearchTerm
            }
            onUpdateRegistration={
              handleUpdateRegistration
            }
          />
        );

      case 'ANALYTICS':
        return (
          <AnalyticsPage
            registrations={registrations}
            onBack={() =>
              navigateTo('DASHBOARD')
            }
          />
        );

      case 'QUICK_ID':
        return (
          <QuickIdTool
            onBackToDashboard={() =>
              navigateTo('DASHBOARD')
            }
          />
        );

      case 'DASHBOARD':
      default:
        return (
          <Dashboard
            registrations={registrations}
            onNavigate={navigateTo}
            onViewRegistration={
              handleViewRegistration
            }
            onEditRegistration={
              handleEditRegistration
            }
            isOnline={isOnline}
            isSyncing={isSyncing}
            onSync={
              syncUnsyncedRegistrations
            }
          />
        );
    }
  };

  /**
   * Initial loading state.
   */
  if (isDbLoading) {
    return (
      <div
        className="min-h-screen bg-cream-50 flex flex-col items-center justify-center text-center p-4"
        role="status"
        aria-live="polite"
      >
        <div className="relative flex items-center justify-center">
          <div
            className="absolute w-20 h-20 bg-primary-200 rounded-full animate-ping opacity-50"
            aria-hidden="true"
          />

          <Icon
            name="cow"
            className="w-16 h-16 text-primary-700"
          />
        </div>

        <h1 className="text-xl font-bold text-primary-800 mt-6">
          {t('app.connectingDb')}
        </h1>

        <p className="text-primary-700">
          {t('app.loadingRecords')}
        </p>
      </div>
    );
  }

  /**
   * Database error state.
   */
  if (dbError) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center p-4">
        <div
          className="max-w-md w-full bg-white rounded-2xl shadow-lg p-6 text-center"
          role="alert"
        >
          <Icon
            name="cow"
            className="w-14 h-14 mx-auto text-primary-700"
          />

          <h1 className="text-xl font-bold text-primary-900 mt-4">
            Unable to load records
          </h1>

          <p className="text-primary-700 mt-2">
            {dbError}
          </p>

          <button
            type="button"
            onClick={loadRegistrations}
            className="mt-6 px-5 py-2.5 rounded-xl bg-primary-700 text-white font-semibold hover:bg-primary-800 transition"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-primary-900 font-sans">
      <Header
        onSearch={handleGlobalSearch}
        showSearch={
          currentView === 'DASHBOARD'
        }
        isOnline={isOnline}
        isScrolled={isScrolled}
        onOpenGuide={() =>
          setIsGuideOpen(true)
        }
      />

      {!isOnline && (
        <div
          className="bg-amber-100 border-b border-amber-200 text-amber-900 px-4 py-2 text-sm text-center"
          role="status"
        >
          You are offline. Changes will be
          synchronized when the connection returns.
        </div>
      )}

      {syncError && (
        <div
          className="bg-red-50 border-b border-red-200 text-red-800 px-4 py-2 text-sm text-center"
          role="alert"
        >
          {syncError}
        </div>
      )}

      {isSyncing && (
        <div
          className="bg-primary-50 border-b border-primary-100 text-primary-800 px-4 py-2 text-sm text-center"
          role="status"
          aria-live="polite"
        >
          Synchronizing {unsyncedCount} record
          {unsyncedCount === 1 ? '' : 's'}…
        </div>
      )}

      <main
        className="container mx-auto p-4"
        id="main-content"
      >
        {renderView()}
      </main>

      <UserGuideModal
        isOpen={isGuideOpen}
        onClose={() =>
          setIsGuideOpen(false)
        }
      />
    </div>
  );
};
const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
};

export default App;
