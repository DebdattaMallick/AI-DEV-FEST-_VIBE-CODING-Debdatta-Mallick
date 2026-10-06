import React from 'react';
import { Building2, Calendar, FileText, UserCheck, Hash, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { Requirement, TenderInfo } from '../types';

interface TenderCardProps {
  tender: TenderInfo | null;
  requirements: Requirement[];
  language: Language;
  onOpenRequirementsClick: () => void;
  onLoadTemplate?: () => void;
}

export const TenderCard: React.FC<TenderCardProps> = ({
  tender,
  requirements,
  language,
  onOpenRequirementsClick,
  onLoadTemplate,
}) => {
  const t = i18nDict[language];

  if (!tender) {
    return (
      <div className="bg-white rounded-xl border-2 border-dashed border-slate-300 p-6 sm:p-8 text-center shadow-xs">
        <div className="w-12 h-12 mx-auto rounded-full bg-sky-50 flex items-center justify-center text-sky-600 mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-800">{t.noTenderLoadedTitle}</h2>
        <p className="text-sm text-slate-600 max-w-lg mx-auto mt-1 mb-4">
          {t.noTenderLoadedSubtitle}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onOpenRequirementsClick}
            type="button"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            {t.loadRequirementsBtn}
          </button>
          {onLoadTemplate && (
            <button
              onClick={onLoadTemplate}
              type="button"
              className="text-xs text-slate-500 hover:text-slate-800 underline transition-colors cursor-pointer py-1"
            >
              {language === 'bn' ? 'স্ট্যান্ডার্ড টেন্ডার টেমপ্লেট লোড করুন' : 'Load standard tender template'}
            </button>
          )}
        </div>
      </div>
    );
  }

  const mandatoryCount = requirements.filter((r) => r.mandatory).length;
  const optionalCount = requirements.length - mandatoryCount;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Top Banner (Clean light header) */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Hash className="w-4 h-4 text-sky-600" />
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {t.tenderId}:
          </span>
          <span className="text-sm sm:text-base font-bold text-sky-700 font-mono">
            {tender.tender_id}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white text-slate-700 border border-slate-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
            <strong className="text-slate-900">{requirements.length}</strong> {t.totalRequirements}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            <strong>{mandatoryCount}</strong> {t.mandatoryRequirements}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <strong>{optionalCount}</strong> {t.optionalRequirements}
          </span>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 bg-white">
        {/* Title */}
        <div className="md:col-span-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            {t.tenderTitle}
          </div>
          <div className="mt-1 text-base sm:text-lg font-bold text-slate-900">
            {tender.title}
          </div>
        </div>

        {/* Procuring Entity */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-slate-400" />
            {t.procuringEntity}
          </div>
          <div className="mt-1 text-sm sm:text-base font-medium text-slate-800">
            {tender.procuring_entity}
          </div>
        </div>

        {/* Bidder */}
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            {t.bidder}
          </div>
          <div className="mt-1 text-sm sm:text-base font-medium text-slate-800">
            {tender.bidder}
          </div>
        </div>

        {/* Submission Deadline */}
        <div className="md:col-span-2 lg:col-span-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t.submissionDeadline}:
              </span>
              <span className="ml-2 text-sm sm:text-base font-bold text-slate-900 font-mono">
                {tender.submission_deadline}
              </span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {language === 'bn'
              ? 'সকল মেয়াদের তারিখ এই ডেডলাইনের সাথে যাচাই করা হবে।'
              : 'All document expiry dates are verified against this submission deadline.'}
          </div>
        </div>
      </div>
    </div>
  );
};
