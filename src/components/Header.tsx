import React, { useRef } from 'react';
import { FileUp, ShieldCheck, PlusCircle } from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';

interface HeaderProps {
  language: Language;
  onSetLanguage: (lang: Language) => void;
  onLoadRequirements: (content: string) => void;
  onStartNewProject: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  language,
  onSetLanguage,
  onLoadRequirements,
  onStartNewProject,
}) => {
  const t = i18nDict[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        onLoadRequirements(text);
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="bg-white text-slate-900 border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center shadow-xs shrink-0 text-white">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-sans">
                  {t.appName}
                </h1>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[11px] font-semibold tracking-wide rounded-md bg-sky-50 text-sky-700 border border-sky-200">
                  by Debdatta
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Hidden JSON file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Open requirements.json Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 cursor-pointer"
            >
              <FileUp className="w-4 h-4" />
              <span>{t.loadRequirementsBtn}</span>
            </button>

            {/* Start New Project */}
            <button
              onClick={onStartNewProject}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Start a fresh empty project"
            >
              <PlusCircle className="w-4 h-4 text-slate-500" />
              <span>{language === 'bn' ? 'নতুন প্রজেক্ট' : 'New Project'}</span>
            </button>

            {/* Language Switcher Segmented Control */}
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 ml-1">
              <button
                type="button"
                onClick={() => onSetLanguage('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  language === 'en'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={language === 'en'}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => onSetLanguage('bn')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  language === 'bn'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                aria-pressed={language === 'bn'}
              >
                বাংলা
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
