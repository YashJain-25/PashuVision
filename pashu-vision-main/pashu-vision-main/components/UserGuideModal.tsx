import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './icons';
import { useLanguage } from '../contexts/LanguageContext';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const guideSections: { key: string; icon: 'chart' | 'ai-sparkles' | 'history' | 'light-bulb' | 'syringe' | 'pencil-square' | 'chat-bubble' | 'refresh' }[] = [
    { key: 'dashboard', icon: 'chart' },
    { key: 'newRegistration', icon: 'ai-sparkles' },
    { key: 'history', icon: 'history' },
    { key: 'analytics', icon: 'chart' },
    { key: 'quickId', icon: 'light-bulb' },
    { key: 'healthHub', icon: 'syringe' },
    { key: 'updateRecord', icon: 'pencil-square' },
    { key: 'aiAssistant', icon: 'chat-bubble' },
    { key: 'offlineSync', icon: 'refresh' },
];

const GuideContentRenderer: React.FC<{ content: string }> = ({ content }) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
        if (listItems.length > 0) {
            elements.push(
                <ol key={`ol-${elements.length}`} className="list-decimal list-inside space-y-3 my-3 pl-4">
                    {listItems.map((item, index) => {
                        const parts = item.split(':');
                        const title = parts[0] ? `${parts[0]}:` : '';
                        const text = parts.slice(1).join(':').trim();
                        return (
                            <li key={index} className="text-primary-800">
                                <strong className="font-semibold text-primary-900">{title}</strong>
                                <span className="ml-1">{text}</span>
                            </li>
                        );
                    })}
                </ol>
            );
            listItems = [];
        }
    };

    lines.forEach((line) => {
        const trimmedLine = line.trim();
        const orderedMatch = trimmedLine.match(/^(\d+)\.\s(.*)/);
        if (orderedMatch) {
            listItems.push(orderedMatch[2]);
        } else {
            flushList();
            if (trimmedLine) {
                elements.push(<p key={`p-${elements.length}`} className="mb-2 text-primary-800">{trimmedLine}</p>);
            }
        }
    });

    flushList();
    return <>{elements}</>;
};

export const UserGuideModal: React.FC<UserGuideModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLanguage();
    const modalRef = useRef<HTMLDivElement>(null);
    const [openSection, setOpenSection] = useState<string | null>(null);

    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleEsc);
            // Open the first section by default when the modal opens
            setOpenSection('dashboard');
        } else {
            setOpenSection(null);
        }
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const toggleSection = (sectionKey: string) => {
        setOpenSection(prev => (prev === sectionKey ? null : sectionKey));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="guide-title">
            <div ref={modalRef} className="bg-cream-50 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-cream-200 flex justify-between items-center">
                    <h2 id="guide-title" className="text-xl font-bold text-primary-900 flex items-center gap-2">
                        <Icon name="book-open" className="w-6 h-6 text-secondary-600" /> {t('guide.title')}
                    </h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-cream-200" aria-label="Close user guide">
                        <Icon name="close" className="w-6 h-6 text-gray-500" />
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto p-4 bg-white">
                    <div className="space-y-2">
                        {guideSections.map(({ key, icon }) => (
                            <div key={key} className="border border-cream-200 rounded-lg">
                                <button
                                    onClick={() => toggleSection(key)}
                                    className="w-full flex justify-between items-center p-4 text-left"
                                    aria-expanded={openSection === key}
                                    aria-controls={`guide-section-${key}`}
                                >
                                    <span className="font-bold text-primary-800 flex items-center gap-3">
                                        <Icon name={icon} className="w-5 h-5 text-primary-700" />
                                        {t(`guide.${key}.title`)}
                                    </span>
                                    <Icon name="chevron-right" className={`w-5 h-5 text-primary-600 transition-transform ${openSection === key ? 'rotate-90' : ''}`} />
                                </button>
                                {openSection === key && (
                                    <div id={`guide-section-${key}`} className="px-4 pb-4">
                                        <GuideContentRenderer content={t(`guide.${key}.content`)} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-3 text-right bg-cream-100 rounded-b-2xl border-t border-cream-200">
                    <button onClick={onClose} className="px-5 py-2 bg-primary-800 text-white font-semibold rounded-md hover:bg-primary-700">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};