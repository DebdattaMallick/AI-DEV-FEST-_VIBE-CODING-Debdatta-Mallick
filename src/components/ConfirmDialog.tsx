import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { ConfirmDialogState } from '../types';

interface ConfirmDialogProps {
  dialog: ConfirmDialogState;
  language: Language;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ dialog, language }) => {
  const t = i18nDict[language];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dialog.onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialog]);

  const title = language === 'bn' ? dialog.titleBn : dialog.titleEn;
  const message = language === 'bn' ? dialog.messageBn : dialog.messageEn;
  const confirmText = language === 'bn' ? dialog.confirmLabelBn : dialog.confirmLabelEn;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              dialog.isDestructive
                ? 'bg-rose-100 text-rose-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900">
              {title}
            </h3>
            <p id="confirm-dialog-desc" className="text-sm text-slate-600 mt-1">
              {message}
            </p>
          </div>
          <button
            type="button"
            onClick={dialog.onCancel}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
            aria-label={t.cancelBtn}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={dialog.onCancel}
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            {t.cancelBtn}
          </button>
          <button
            type="button"
            onClick={dialog.onConfirm}
            className={`px-4 py-2 text-sm font-semibold text-white rounded-lg shadow-xs transition-colors cursor-pointer ${
              dialog.isDestructive
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-sky-600 hover:bg-sky-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
