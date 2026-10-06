import React from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { AppNotification } from '../types';

interface MessageListProps {
  notifications: AppNotification[];
  language: Language;
  onDismiss: (id: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
  notifications,
  language,
  onDismiss,
}) => {
  const t = i18nDict[language];

  if (notifications.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="space-y-2 mb-4"
    >
      {notifications.map((n) => {
        const title = language === 'bn' ? n.titleBn : n.titleEn;
        const msg = language === 'bn' ? n.messageBn : n.messageEn;

        let bg = 'bg-slate-50 border-slate-200 text-slate-800';
        let Icon = Info;
        let iconColor = 'text-slate-600';

        if (n.type === 'error') {
          bg = 'bg-rose-50 border-rose-200 text-rose-900';
          Icon = AlertCircle;
          iconColor = 'text-rose-600';
        } else if (n.type === 'warning') {
          bg = 'bg-amber-50 border-amber-200 text-amber-900';
          Icon = AlertTriangle;
          iconColor = 'text-amber-600';
        } else if (n.type === 'success') {
          bg = 'bg-sky-50 border-sky-200 text-sky-900';
          Icon = CheckCircle2;
          iconColor = 'text-sky-600';
        }

        return (
          <div
            key={n.id}
            className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border ${bg} shadow-2xs transition-all`}
          >
            <div className="flex items-start gap-2.5 min-w-0">
              <Icon className={`w-5 h-5 ${iconColor} shrink-0 mt-0.5`} />
              <div className="min-w-0">
                {title && (
                  <h4 className="text-xs sm:text-sm font-bold truncate">
                    {title}
                  </h4>
                )}
                <p className="text-xs sm:text-sm mt-0.5 break-words">
                  {msg}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(n.id)}
              className="p-1 rounded-md hover:bg-black/5 text-current opacity-70 hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              title={t.dismissBtn}
              aria-label={t.dismissBtn}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
