import React, { useState } from 'react';
import { ChevronDown, Languages } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { Language } from '../../types';

const LanguageSwitcher: React.FC = () => {
  const { lang, setLang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ru', label: 'Русский' },
    { code: 'uz', label: "O'zbekcha" },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 rounded-full border border-white/10 bg-white/10 px-2.5 py-2 text-[11px] font-black uppercase text-white transition-all hover:bg-white/15 sm:gap-2 sm:px-3 sm:py-1.5 sm:text-sm sm:font-medium"
      >
        <Languages size={14} className="hidden min-[360px]:block" />
        <span>{lang}</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-40 overflow-hidden rounded-2xl border border-white/10 shadow-2xl glass animate-in slide-in-from-top-2 duration-200">
          {languages.map((language) => (
            <button
              key={language.code}
              type="button"
              onClick={() => {
                setLang(language.code);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold transition-all ${
                lang === language.code
                  ? 'bg-white/20 text-white'
                  : 'text-zinc-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span>{language.label}</span>
              <span className="text-[10px] uppercase text-zinc-500">{language.code}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
