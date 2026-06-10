
import React, { useState } from 'react';
import { Globe, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { Language } from '../../types';

const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'ru', label: 'Русский', flag: '🇷🇺' },
    { code: 'uz', label: 'Oʻzbekcha', flag: '🇺🇿' }
  ];

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium text-white"
      >
        <span>{languages.find(l => l.code === lang)?.flag}</span>
        <span className="hidden sm:inline uppercase">{lang}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-40 glass border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[100] animate-in slide-in-from-top-2 duration-200">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setIsOpen(false);
              }}
              className={`w-full text-left px-4 py-3 text-sm font-medium transition-all flex items-center gap-3 ${
                lang === l.code ? 'bg-white/20 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{l.flag}</span>
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
