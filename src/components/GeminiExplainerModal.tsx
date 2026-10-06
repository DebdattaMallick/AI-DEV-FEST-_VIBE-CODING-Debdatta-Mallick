import React, { useState } from 'react';
import {
  X,
  Sparkles,
  KeyRound,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Send,
  HelpCircle,
} from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { explainChecklistWithGemini } from '../lib/geminiAssistant';
import { Requirement, TenderInfo, UploadedFile } from '../types';

interface GeminiExplainerModalProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  tender: TenderInfo | null;
  requirements: Requirement[];
  uploadedFiles: UploadedFile[];
  matches: Record<string, string | null>;
  expiryDates: Record<string, string>;
  language: Language;
  onClose: () => void;
}

export const GeminiExplainerModal: React.FC<GeminiExplainerModalProps> = ({
  apiKey,
  onApiKeyChange,
  tender,
  requirements,
  uploadedFiles,
  matches,
  expiryDates,
  language,
  onClose,
}) => {
  const t = i18nDict[language];
  const [localKey, setLocalKey] = useState<string>(apiKey);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAsk = async () => {
    if (!localKey.trim()) {
      setErrorMsg(
        language === 'bn'
          ? 'অনুগ্রহ করে আপনার Gemini API Key লিখুন।'
          : 'Please enter your Gemini API Key.'
      );
      return;
    }

    onApiKeyChange(localKey.trim());
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const explanation = await explainChecklistWithGemini({
        apiKey: localKey.trim(),
        tender,
        requirements,
        uploadedFiles,
        matches,
        expiryDates,
        language,
      });
      setResponse(explanation);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to analyze checklist');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {language === 'bn' ? 'AI চেকলিস্ট বিশ্লেষক' : 'AI Tender Checklist Assistant'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'আপনার চেকলিস্টের অবস্থা যাচাই করে পরবর্তী করণীয় সম্পর্কে সহজ পরামর্শ'
                  : 'Plain-language review of checklist compliance and immediate priority fixes'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Ephemeral API Key Input */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                <span>{language === 'bn' ? 'Gemini API Key (শুধুমাত্র মেমরিতে সংরক্ষিত)' : 'Gemini API Key (Kept only in memory)'}</span>
              </label>
              <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                {language === 'bn' ? 'কখনও সেভ বা লগ হয় না' : 'Never logged or persisted'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 text-xs font-mono rounded-lg border border-slate-300 py-2 px-3 focus:ring-2 focus:ring-sky-500 bg-white"
              />
              <button
                type="button"
                disabled={isLoading || !localKey.trim()}
                onClick={handleAsk}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>{language === 'bn' ? 'বিশ্লেষণ করুন' : 'Explain Checklist'}</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-500">
              {language === 'bn'
                ? 'নোট: শুধুমাত্র নথির নাম ও মেয়াদের অবস্থা পাঠানো হয়। কোনো ফাইলের কন্টেন্ট কখনও কোথাও পাঠানো হয় না।'
                : 'Privacy guarantee: Sends ONLY document metadata (titles, deadlines, statuses). PDF content is NEVER uploaded.'}
            </p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* AI Output Response */}
          {response && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {language === 'bn' ? 'বিশ্লেষণ ফলাফল' : 'Checklist Assessment'}
                </span>
                <button
                  type="button"
                  onClick={handleAsk}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>
                </button>
              </div>

              <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line text-slate-200">
                {response}
              </div>
            </div>
          )}

          {!response && !isLoading && !errorMsg && (
            <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              {language === 'bn'
                ? 'আপনার কী লিখে "বিশ্লেষণ করুন" বাটনে চাপুন।'
                : 'Enter your Gemini API key above and click "Explain Checklist" for a personalized submission readiness review.'}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};
