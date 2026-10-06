import React from 'react';
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Calendar,
  X,
  FileCheck,
  FileText,
  Sparkles,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { getStatusDetail, isValidISODate } from '../lib/status';
import { MatchSuggestion } from '../lib/autoMatch';
import { DocumentStatus, Requirement, UploadedFile } from '../types';

interface RequirementRowProps {
  req: Requirement;
  files: UploadedFile[];
  matchedFileId: string | null;
  expiryDate: string;
  submissionDeadline: string;
  allMatches: Record<string, string | null>;
  allRequirements: Requirement[];
  language: Language;
  isHighlighted?: boolean;
  suggestion?: MatchSuggestion | null;
  detectedExpiryDate?: string | null;
  onMatchChange: (requirementId: string, fileId: string | null) => void;
  onExpiryChange: (requirementId: string, expiry: string) => void;
  onPreviewFile: (file: UploadedFile) => void;
}

export const RequirementRow: React.FC<RequirementRowProps> = ({
  req,
  files,
  matchedFileId,
  expiryDate,
  submissionDeadline,
  allMatches,
  allRequirements,
  language,
  isHighlighted,
  suggestion,
  detectedExpiryDate,
  onMatchChange,
  onExpiryChange,
  onPreviewFile,
}) => {
  const t = i18nDict[language];

  const matchedFile = files.find((f) => f.id === matchedFileId) || null;
  const statusDetail = getStatusDetail(req, matchedFile, expiryDate, submissionDeadline);

  // Requirement Title
  const title = language === 'bn' ? req.title_bn || req.title_en : req.title_en;

  // Build disabled status map for each file in the dropdown
  const fileOptionStatus = new Map<
    string,
    { disabled: boolean; reason: string }
  >();

  for (const file of files) {
    if (file.id === matchedFileId) {
      fileOptionStatus.set(file.id, { disabled: false, reason: '' });
      continue;
    }

    let isUsedElsewhere = false;
    let reason = '';

    for (const [otherReqId, otherFileId] of Object.entries(allMatches)) {
      if (otherReqId !== req.id && otherFileId) {
        if (otherFileId === file.id) {
          const otherReq = allRequirements.find((r) => r.id === otherReqId);
          const otherTitle = otherReq
            ? (language === 'bn' ? otherReq.title_bn || otherReq.title_en : otherReq.title_en)
            : 'another document';
          isUsedElsewhere = true;
          reason = `${t.alreadyUsedFor} "${otherTitle}"`;
          break;
        }

        // Duplicate check
        const otherFile = files.find((f) => f.id === otherFileId);
        if (otherFile && otherFile.sha256 === file.sha256) {
          isUsedElsewhere = true;
          reason = `${t.sameContentUsedFor} ${otherFile.name}, ${t.alreadyUsedFor.toLowerCase()}`;
          break;
        }
      }
    }

    fileOptionStatus.set(file.id, { disabled: isUsedElsewhere, reason });
  }

  // Render Status Badge
  const renderStatusBadge = () => {
    switch (statusDetail.status) {
      case 'MISSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{language === 'bn' ? statusDetail.labelBn : statusDetail.labelEn}</span>
          </span>
        );
      case 'EXPIRY_NEEDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{language === 'bn' ? statusDetail.labelBn : statusDetail.labelEn}</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>{language === 'bn' ? statusDetail.labelBn : statusDetail.labelEn}</span>
          </span>
        );
      case 'NOT_PROVIDED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{language === 'bn' ? statusDetail.labelBn : statusDetail.labelEn}</span>
          </span>
        );
      case 'OK':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>{language === 'bn' ? statusDetail.labelBn : statusDetail.labelEn}</span>
          </span>
        );
    }
  };

  const humanExplanation = language === 'bn' ? statusDetail.messageBn : statusDetail.messageEn;

  // Find suggested file object
  const suggestedFile = suggestion?.suggestedFileId
    ? files.find((f) => f.id === suggestion.suggestedFileId)
    : null;

  return (
    <div
      id={`req-row-${req.id}`}
      className={`rounded-xl border p-4 sm:p-5 transition-all bg-white ${
        isHighlighted
          ? 'ring-3 ring-sky-500 border-sky-400 bg-sky-50/20 shadow-md'
          : statusDetail.blocks
          ? 'border-slate-200 hover:border-slate-300'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        {/* Left: Order, Title, Flags & Suggestions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
              {req.order}
            </span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              {title}
            </h3>

            {/* English subtitle if viewed in Bangla */}
            {language === 'bn' && req.title_en !== req.title_bn && (
              <span className="text-xs text-slate-500 font-normal">
                ({req.title_en})
              </span>
            )}

            {/* Badges */}
            <div className="flex items-center gap-1.5 ml-1">
              {req.mandatory ? (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-white">
                  {t.mandatoryBadge}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {t.optionalBadge}
                </span>
              )}

              {req.has_expiry && (
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-amber-600" />
                  {t.expiryDateLabel}
                </span>
              )}
            </div>
          </div>

          {/* Explanation message */}
          <div className="mt-2 text-xs flex items-center gap-1.5">
            <span className={statusDetail.blocks ? 'text-rose-600 font-medium' : 'text-slate-600'}>
              {humanExplanation}
            </span>
          </div>

          {/* Feature 1: Auto-Match Suggestion Chips (only when currently unmatched) */}
          {!matchedFileId && suggestion && (
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              {suggestion.confidence === 'high' && suggestedFile && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-xs text-sky-900 shadow-2xs">
                  <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                  <span>
                    {language === 'bn' ? 'পরামর্শ:' : 'Suggested:'}{' '}
                    <strong>{suggestedFile.name}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onMatchChange(req.id, suggestedFile.id)}
                    className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-600 hover:bg-sky-700 text-white font-semibold text-[11px] cursor-pointer shadow-2xs transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    <span>{language === 'bn' ? 'গ্রহণ করুন' : 'Accept'}</span>
                  </button>
                </div>
              )}

              {suggestion.confidence === 'ambiguous' && suggestion.candidateFileIds.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 shadow-2xs">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>
                    {language === 'bn'
                      ? `${suggestion.candidateFileIds.length}টি সম্ভাব্য ফাইল:`
                      : `Ambiguous match (${suggestion.candidateFileIds.length} candidates):`}
                  </span>
                  <div className="flex items-center gap-1">
                    {suggestion.candidateFileIds.map((cId) => {
                      const cFile = files.find((f) => f.id === cId);
                      if (!cFile) return null;
                      return (
                        <button
                          key={cId}
                          type="button"
                          onClick={() => onMatchChange(req.id, cId)}
                          className="px-2 py-0.5 rounded bg-white hover:bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-medium truncate max-w-[140px] cursor-pointer transition-colors"
                          title={cFile.name}
                        >
                          {cFile.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {suggestion.isScannedOnly && (
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  <FileText className="w-3 h-3 text-slate-400" />
                  <span>{language === 'bn' ? suggestion.reasonBn : suggestion.reasonEn}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Middle/Right: Controls (Dropdown + Expiry date) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:shrink-0">
          {/* File Select Dropdown */}
          <div className="flex items-center gap-1.5 min-w-[220px] max-w-xs sm:max-w-sm">
            <div className="relative flex-1">
              <select
                value={matchedFileId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onMatchChange(req.id, val ? val : null);
                }}
                className="w-full text-xs sm:text-sm font-medium rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 shadow-2xs hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 truncate cursor-pointer"
                aria-label={`${title} file selection`}
              >
                <option value="">{t.noFileSelected}</option>
                {files.map((f) => {
                  const opt = fileOptionStatus.get(f.id);
                  const isCurrent = f.id === matchedFileId;
                  const label = opt?.disabled
                    ? `${f.name} (${opt.reason})`
                    : `${f.name} (${f.pageCount} ${t.pageCount})`;

                  return (
                    <option
                      key={f.id}
                      value={f.id}
                      disabled={opt?.disabled && !isCurrent}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Clear Match Button */}
            {matchedFileId && (
              <button
                type="button"
                onClick={() => onMatchChange(req.id, null)}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                title={t.clearMatchBtn}
                aria-label={t.clearMatchBtn}
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Preview matched file button */}
            {matchedFile && (
              <button
                type="button"
                onClick={() => onPreviewFile(matchedFile)}
                className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title={t.previewBtn}
              >
                <FileText className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Expiry Date Input + Feature 2: Found in file suggestion */}
          {req.has_expiry && matchedFile && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5">
                <label htmlFor={`expiry-input-${req.id}`} className="sr-only">
                  {t.expiryDateLabel}
                </label>
                <div className="relative">
                  <input
                    id={`expiry-input-${req.id}`}
                    type="date"
                    value={expiryDate}
                    onChange={(e) => onExpiryChange(req.id, e.target.value)}
                    placeholder={t.datePlaceholder}
                    className={`text-xs sm:text-sm font-mono rounded-lg border py-1.5 px-2.5 shadow-2xs focus:outline-none focus:ring-2 cursor-pointer ${
                      !expiryDate
                        ? 'border-amber-300 bg-amber-50/40 text-amber-900 focus:ring-amber-500'
                        : !isValidISODate(expiryDate) || expiryDate < submissionDeadline
                        ? 'border-rose-300 bg-rose-50/40 text-rose-900 focus:ring-rose-500'
                        : 'border-sky-300 bg-sky-50/40 text-sky-900 focus:ring-sky-500'
                    }`}
                    title={t.dateInvalidTooltip}
                  />
                </div>
              </div>

              {/* Feature 2: Expiry Date Detected in File Chip */}
              {detectedExpiryDate && detectedExpiryDate !== expiryDate && (
                <div className="inline-flex items-center gap-1 text-[11px] text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded shadow-2xs">
                  <span>
                    {language === 'bn' ? 'ফাইলে পাওয়া গেছে:' : 'Found in file:'}{' '}
                    <strong>{detectedExpiryDate}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onExpiryChange(req.id, detectedExpiryDate)}
                    className="ml-1 text-[10px] font-bold text-sky-700 hover:text-sky-900 underline cursor-pointer"
                  >
                    [{language === 'bn' ? 'এই তারিখটি নিন' : 'Use this date'}]
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Status Badge */}
          <div className="shrink-0">
            {renderStatusBadge()}
          </div>
        </div>
      </div>
    </div>
  );
};
