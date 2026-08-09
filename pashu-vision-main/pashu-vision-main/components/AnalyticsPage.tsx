import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Registration } from '../types';
import { Icon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

const StatCard: React.FC<{title: string, value: string | number, icon: React.ReactElement}> = ({title, value, icon}) => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-cream-200 flex items-center">
        <div className="p-3 rounded-full bg-secondary-100 text-secondary-700 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm font-medium text-primary-700">{title}</p>
            <p className="text-2xl font-bold text-primary-900">{value}</p>
        </div>
    </div>
);


const FilterButton: React.FC<{text: string, isActive: boolean, onClick: () => void}> = ({text, isActive, onClick}) => (
    <button 
        onClick={onClick}
        className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
            isActive ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-700 hover:bg-white/60'
        }`}
    >
        {text}
    </button>
);

export const AnalyticsPage: React.FC<{ registrations: Registration[], onBack: () => void }> = ({ registrations, onBack }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [speciesFilter, setSpeciesFilter] = useState<'All' | 'Cattle' | 'Buffalo'>('All');
  const { t } = useLanguage();
  
  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const filteredRegistrations = useMemo(() => {
    if (speciesFilter === 'All') {
      return registrations;
    }
    const newRegistrations: Registration[] = [];
    registrations.forEach(reg => {
      const matchingAnimals = reg.animals.filter(animal => animal.species === speciesFilter);
      if (matchingAnimals.length > 0) {
        newRegistrations.push({
          ...reg,
          animals: matchingAnimals,
        });
      }
    });
    return newRegistrations;
  }, [registrations, speciesFilter]);

  const breedData = useMemo(() => {
    const breedCounts: { [key:string]: number } = {};
    filteredRegistrations.forEach(reg => {
      reg.animals.forEach(animal => {
        if (!animal.aiResult.error && animal.aiResult.breedName) {
          const breedName = animal.aiResult.breedName;
          breedCounts[breedName] = (breedCounts[breedName] || 0) + 1;
        }
      });
    });

    return Object.entries(breedCounts)
      .map(([name, count]) => ({ name: t(`breeds.${name}`), count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredRegistrations, t]);

  const stateData = useMemo(() => {
    const stateCounts: { [key: string]: number } = {};
    filteredRegistrations.forEach(reg => {
      const state = reg.owner.state;
      stateCounts[state] = (stateCounts[state] || 0) + reg.animals.length;
    });

    return Object.entries(stateCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredRegistrations]);

  const registrationTrendData = useMemo(() => {
    const countsByDate: { [key: string]: number } = {};
    filteredRegistrations.forEach(reg => {
        const date = new Date(reg.timestamp).toLocaleDateString('en-CA'); // YYYY-MM-DD
        countsByDate[date] = (countsByDate[date] || 0) + 1;
    });

    return Object.entries(countsByDate)
        .map(([date, count]) => ({ date, registrations: count }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredRegistrations]);

  const speciesData = useMemo(() => {
    const counts: { [key: string]: number } = { Cattle: 0, Buffalo: 0 };
    filteredRegistrations.forEach(reg => {
        reg.animals.forEach(animal => {
            if (animal.species) {
                counts[animal.species]++;
            }
        });
    });
    return [{ name: t('species.cattle'), value: counts.Cattle }, { name: t('species.buffalo'), value: counts.Buffalo }].filter(d => d.value > 0);
  }, [filteredRegistrations, t]);

  const sexData = useMemo(() => {
    const counts: { [key: string]: number } = { Male: 0, Female: 0 };
    filteredRegistrations.forEach(reg => {
        reg.animals.forEach(animal => {
            if (animal.sex) {
                counts[animal.sex]++;
            }
        });
    });
    return [{ name: t('sex.male'), value: counts.Male }, { name: t('sex.female'), value: counts.Female }].filter(d => d.value > 0);
  }, [filteredRegistrations, t]);

  const totalAnimals = useMemo(() => filteredRegistrations.reduce((sum, reg) => sum + reg.animals.length, 0), [filteredRegistrations]);
  const mostCommonBreed = useMemo(() => breedData[0]?.name || 'N/A', [breedData]);
  const totalRegisteredUsers = useMemo(() => {
    const ownerIds = new Set<string>();
    filteredRegistrations.forEach(reg => {
      if (reg.owner.idNumber) {
          ownerIds.add(reg.owner.idNumber);
      }
    });
    return ownerIds.size;
  }, [filteredRegistrations]);
  
  const COLORS = ['#0f766e', '#115e59', '#134e4a', '#0d9488', '#14b8a6', '#2dd4bf'];
  
  if (registrations.length === 0) {
    return (
       <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-cream-200">
          <Icon name="chart" className="w-16 h-16 mx-auto text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-700">{t('analytics.noDataTitle')}</h2>
          <p className="mt-2 text-gray-500">{t('analytics.noDataSubtitle')}</p>
          <button onClick={onBack} className="mt-6 px-4 py-2 bg-accent-500 text-white rounded-md hover:bg-accent-600 text-sm font-semibold transition-transform duration-150 active:scale-95">{t('buttons.backToDash')}</button>
       </div>
    );
  }
  
  return (
    <div className="space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <h1 className="text-3xl font-bold text-primary-900">{t('analytics.title')}</h1>
             <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex items-center p-1 bg-cream-200 rounded-full">
                    <FilterButton text={t('analytics.all')} isActive={speciesFilter === 'All'} onClick={() => setSpeciesFilter('All')} />
                    <FilterButton text={t('species.cattle')} isActive={speciesFilter === 'Cattle'} onClick={() => setSpeciesFilter('Cattle')} />
                    <FilterButton text={t('species.buffalo')} isActive={speciesFilter === 'Buffalo'} onClick={() => setSpeciesFilter('Buffalo')} />
                </div>
                <button onClick={onBack} className="px-4 py-2 border border-gray-300 rounded-md text-primary-700 font-semibold hover:bg-gray-50 text-sm transition-transform duration-150 active:scale-95">{t('buttons.backToDash')}</button>
            </div>
        </div>
        
        {filteredRegistrations.length === 0 ? (
           <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-cream-200">
              <Icon name="filter" className="w-16 h-16 mx-auto text-gray-400" />
              <h2 className="mt-4 text-xl font-semibold text-gray-700">{t('analytics.noFilterResultsTitle')}</h2>
              <p className="mt-2 text-gray-500">{t('analytics.noFilterResultsSubtitle', { species: speciesFilter })}</p>
           </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className={`transition-all duration-300 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '100ms'}}><StatCard title={t('dashboard.totalAnimals')} value={totalAnimals} icon={<Icon name="cow" className="w-6 h-6" />} /></div>
                <div className={`transition-all duration-300 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '200ms'}}><StatCard title={t('dashboard.totalRegs')} value={totalRegisteredUsers} icon={<Icon name="user-circle" className="w-6 h-6" />} /></div>
                <div className={`transition-all duration-300 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '300ms'}}><StatCard title={t('dashboard.commonBreed')} value={mostCommonBreed === 'N/A' ? t('generic.na') : mostCommonBreed} icon={<Icon name="ai-sparkles" className="w-6 h-6" />} /></div>
            </div>

            <div className={`bg-white p-6 rounded-xl shadow-sm border border-cream-200 flex flex-col transition-all duration-500 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '400ms'}}>
              <h2 className="text-xl font-bold text-primary-900 mb-4">{t('analytics.breedDist')}</h2>
              <div className="flex-grow h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={breedData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} tick={{fontSize: 11}} />
                    <YAxis allowDecimals={false} />
                    <Tooltip cursor={{fill: 'rgba(13, 148, 136, 0.05)'}}/>
                    <Legend />
                    <Bar dataKey="count" fill="#0d9488" name={t('analytics.numAnimals')} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`bg-white p-6 rounded-xl shadow-sm border border-cream-200 flex flex-col transition-all duration-500 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '500ms'}}>
              <h2 className="text-xl font-bold text-primary-900 mb-4">{t('analytics.geoSpread')}</h2>
              <div className="flex-grow h-[300px] sm:h-[500px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                    <Pie
                        data={stateData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}
                        outerRadius="80%"
                        fill="#8884d8"
                        dataKey="value"
                    >
                        {stateData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} ${t('generic.animals').toLowerCase()}`} />
                    <Legend />
                    </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className={`bg-white p-6 rounded-xl shadow-sm border border-cream-200 flex flex-col transition-all duration-500 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '600ms'}}>
              <h2 className="text-xl font-bold text-primary-900 mb-4">{t('analytics.regTrends')}</h2>
              <div className="flex-grow h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={registrationTrendData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                          <XAxis dataKey="date" tick={{fontSize: 12}} />
                          <YAxis allowDecimals={false} />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="registrations" stroke="#0d9488" strokeWidth={2} name={t('analytics.regsPerDay')} dot={{ r: 4 }} activeDot={{ r: 8 }}/>
                      </LineChart>
                  </ResponsiveContainer>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`bg-white p-6 rounded-xl shadow-sm border border-cream-200 flex flex-col transition-all duration-500 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '700ms'}}>
                  <h2 className="text-xl font-bold text-primary-900 mb-4">{t('analytics.speciesBreakdown')}</h2>
                  <div className="flex-grow h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={speciesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" fill="#8884d8" label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}>
                                  {speciesData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#14b8a6', '#0f766e'][index % 2]} />)}
                              </Pie>
                              <Tooltip formatter={(value) => `${value} ${t('generic.animals').toLowerCase()}`} />
                              <Legend />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
              <div className={`bg-white p-6 rounded-xl shadow-sm border border-cream-200 flex flex-col transition-all duration-500 ease-out transform ${isMounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`} style={{transitionDelay: '800ms'}}>
                  <h2 className="text-xl font-bold text-primary-900 mb-4">{t('analytics.sexBreakdown')}</h2>
                  <div className="flex-grow h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie data={sexData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" fill="#8884d8" label={({ name, percent }) => `${name} ${((Number(percent) || 0) * 100).toFixed(0)}%`}>
                                  {sexData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#0ea5e9', '#f59e0b'][index % 2]} />)}
                              </Pie>
                              <Tooltip formatter={(value) => `${value} ${t('generic.animals').toLowerCase()}`} />
                              <Legend />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
            </div>
          </>
        )}
    </div>
  );
};