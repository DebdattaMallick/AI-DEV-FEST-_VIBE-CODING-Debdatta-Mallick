import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  Download,
  Eye,
  RefreshCw,
  Undo2,
  Redo2,
  Loader2,
  Clock,
  XCircle,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Stamp,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { getStatusDetail } from '../lib/status';
import { PackageResult, Requirement, TenderInfo, UploadedFile } from '../types';

interface SummaryPanelProps {
  tender: TenderInfo | null;
  requirements: Requirement[];
  files: UploadedFile[];
  matches: Record<string, string | null>;
  expiryDates: Record<string, string>;
  isGenerating: boolean;
  generationProgress: { messageEn: string; messageBn: string; percent: number } | null;
  packageResult: PackageResult | null;
  isPackageStale: boolean;
  canUndo: boolean;
  canRedo: boolean;
  includeIndexPage: boolean;
  hasSealConfig: boolean;
  language: Language;
  onUndo: () => void;
  onRedo: () => void;
  onToggleIndexPage: (enabled: boolean) => void;
  onExportCsv: () => void;
  onOpenSealModal: () => void;
  onOpenAiModal?: () => void;
  onGenerate: () => void;
  onDownload: () => void;
  onPreviewPackage: () => void;
  onJumpToRequirement: (reqId: string) => void;
}

export const SummaryPanel: React.FC<SummaryPanelProps> = ({
  tender,
  requirements,
  files,
  matches,
  expiryDates,
  isGenerating,
  generationProgress,
  packageResult,
  isPackageStale,
  canUndo,
  canRedo,
  includeIndexPage,
  hasSealConfig,
  language,
  onUndo,
  onRedo,
  onToggleIndexPage,
  onExportCsv,
  onOpenSealModal,
  onOpenAiModal,
  onGenerate,
  onDownload,
  onPreviewPackage,
  onJumpToRequirement,
}) => {
  const t = i18nDict[language];
  const deadline = tender?.submission_deadline || '';

  // Calculate status counts and blocking issues
  const { statusCounts, blockingIssues, readyMandatoryCount, totalMandatoryCount } = useMemo(() => {
    let missing = 0;
    let expiryNeeded = 0;
    let expired = 0;
    let notProvided = 0;
    let ok = 0;

    let readyMandatory = 0;
    let totalMandatory = 0;

    const issues: Array<{
      req: Requirement;
      status: string;
      reasonEn: string;
      reasonBn: string;
    }> = [];

    const fileMap = new Map<string, UploadedFile>(files.map((f) => [f.id, f]));

    for (const req of requirements) {
      if (req.mandatory) totalMandatory++;

      const fileId = matches[req.id];
      const matchedFile = fileId ? fileMap.get(fileId) : null;
      const expiry = expiryDates[req.id];

      const detail = getStatusDetail(req, matchedFile, expiry, deadline);

      switch (detail.status) {
        case 'MISSING':
          missing++;
          issues.push({
            req,
            status: 'MISSING',
            reasonEn: 'Document file is missing (Mandatory)',
            reasonBn: 'নথির ফাইল অনুপস্থিত (বাধ্যতামূলক)',
          });
          break;
        case 'EXPIRY_NEEDED':
          expiryNeeded++;
          issues.push({
            req,
            status: 'EXPIRY_NEEDED',
            reasonEn: 'Valid expiry date required',
            reasonBn: 'সঠিক মেয়াদের তারিখ প্রয়োজন',
          });
          break;
        case 'EXPIRED':
          expired++;
          issues.push({
            req,
            status: 'EXPIRED',
            reasonEn: `Expired on ${expiry} (Deadline: ${deadline})`,
            reasonBn: `${expiry} তারিখে মেয়াদ শেষ (ডেডলাইন: ${deadline})`,
          });
          break;
        case 'NOT_PROVIDED':
          notProvided++;
          break;
        case 'OK':
          ok++;
          if (req.mandatory) readyMandatory++;
          break;
      }
    }

    return {
      statusCounts: { missing, expiryNeeded, expired, notProvided, ok },
      blockingIssues: issues,
      readyMandatoryCount: readyMandatory,
      totalMandatoryCount: totalMandatory,
    };
  }, [requirements, files, matches, expiryDates, deadline]);

  const hasBlockingIssues = blockingIssues.length > 0;
  const isTenderReady = tender !== null && requirements.length > 0;
  const canGenerate = isTenderReady && !hasBlockingIssues && !isGenerating;

  const progressPercent = totalMandatoryCount > 0
    ? Math.round((readyMandatoryCount / totalMandatoryCount) * 100)
    : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
      {/* Header (Clean Light Design) */}
      <div className="bg-slate-50 border-b border-slate-200 text-slate-900 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm sm:text-base font-bold flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <span>{t.step3Title}</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {t.step3Subtitle}
          </p>
        </div>

        {/* Global Undo / Redo controls */}
        <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-slate-200 shadow-2xs">
          <button
            type="button"
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title={`${t.undoBtn} (Ctrl+Z)`}
            aria-label={t.undoBtn}
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
            title={`${t.redoBtn} (Ctrl+Y)`}
            aria-label={t.redoBtn}
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
            <span>
              {readyMandatoryCount} of {totalMandatoryCount} {t.readyStatusSummary}
            </span>
            <span className="font-mono text-sky-600 font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
            <div
              className={`h-full transition-all duration-300 ${
                hasBlockingIssues ? 'bg-amber-500' : 'bg-sky-600'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Status Breakdown Counts */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-sky-800 font-medium truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span className="truncate">{t.summaryStatusOk}</span>
            </div>
            <strong className="text-sky-900 font-mono ml-1">{statusCounts.ok}</strong>
          </div>

          <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-800 font-medium truncate">
              <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">{t.summaryStatusMissing}</span>
            </div>
            <strong className="text-rose-900 font-mono ml-1">{statusCounts.missing}</strong>
          </div>

          <div className="p-2 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-amber-800 font-medium truncate">
              <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="truncate">{t.summaryStatusExpiryNeeded}</span>
            </div>
            <strong className="text-amber-900 font-mono ml-1">{statusCounts.expiryNeeded}</strong>
          </div>

          <div className="p-2 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-rose-800 font-medium truncate">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">{t.summaryStatusExpired}</span>
            </div>
            <strong className="text-rose-900 font-mono ml-1">{statusCounts.expired}</strong>
          </div>
        </div>

        {/* Bonus Feature Controls Grid */}
        <div className="pt-2 border-t border-slate-200/80 space-y-2">
          {/* Feature 3: Index Page Toggle */}
          <label className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs cursor-pointer hover:bg-slate-100/60 transition-colors">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-slate-500" />
              <div>
                <span className="font-semibold text-slate-800">
                  {language === 'bn' ? 'সূচিপত্র পৃষ্ঠা যোগ করুন' : 'Add index page after cover'}
                </span>
                <p className="text-[10px] text-slate-500">
                  {language === 'bn'
                    ? 'পৃষ্ঠা ২-এ দ্বিভাষিক সূচিপত্র যোগ হয় (Default: OFF)'
                    : 'Inserts bilingual index on Page 2 (Default: OFF)'}
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={includeIndexPage}
              onChange={(e) => onToggleIndexPage(e.target.checked)}
              className="accent-sky-600 w-4 h-4 rounded cursor-pointer"
            />
          </label>

          {/* Quick Utility Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            {/* Feature 4: Export CSV */}
            <button
              type="button"
              onClick={onExportCsv}
              disabled={requirements.length === 0}
              className="p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
              title="Export checklist as UTF-8 CSV with BOM for Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-sky-600" />
              <span>{language === 'bn' ? 'CSV এক্সপোর্ট' : 'Export CSV'}</span>
            </button>

            {/* Feature 7: Seal / Signature */}
            <button
              type="button"
              onClick={onOpenSealModal}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer ${
                hasSealConfig
                  ? 'bg-sky-50 border-sky-400 text-sky-800'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
              title="Stamp transparent PNG seal/signature on documents"
            >
              <Stamp className={`w-4 h-4 ${hasSealConfig ? 'text-sky-600' : 'text-slate-500'}`} />
              <span>
                {hasSealConfig
                  ? (language === 'bn' ? 'সিল সক্রিয়' : 'Seal Active')
                  : (language === 'bn' ? 'সিল/স্বাক্ষর' : 'Add Seal')}
              </span>
            </button>
          </div>
        </div>

        {/* Blocking Problems List */}
        {hasBlockingIssues ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-rose-800">
              <span className="flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                {blockingIssues.length} {t.blockingIssuesCount}
              </span>
            </div>
            <p className="text-[11px] text-rose-700">
              {t.clickToJump}
            </p>
            <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
              {blockingIssues.map((issue) => {
                const reqTitle =
                  language === 'bn'
                    ? issue.req.title_bn || issue.req.title_en
                    : issue.req.title_en;
                const reason = language === 'bn' ? issue.reasonBn : issue.reasonEn;

                return (
                  <button
                    key={issue.req.id}
                    type="button"
                    onClick={() => onJumpToRequirement(issue.req.id)}
                    className="w-full text-left p-2 rounded-md bg-white border border-rose-200 hover:border-rose-400 hover:shadow-xs transition-all flex items-start justify-between gap-2 group cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate group-hover:text-rose-700">
                        #{issue.req.order} {reqTitle}
                      </div>
                      <div className="text-[10px] text-rose-600 truncate mt-0.5">
                        {reason}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 shrink-0 mt-0.5" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-sky-200 bg-sky-50/60 p-3 text-xs text-sky-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
            <span>All requirements fulfilled. Ready to generate submission package!</span>
          </div>
        )}

        {/* Generate Button & Progress */}
        <div className="space-y-2">
          {isGenerating ? (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-sky-600" />
                  <span>
                    {language === 'bn'
                      ? generationProgress?.messageBn || 'প্যাকেজ তৈরি হচ্ছে...'
                      : generationProgress?.messageEn || 'Generating package...'}
                  </span>
                </span>
                <span className="font-mono">{generationProgress?.percent || 0}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-600 transition-all duration-200"
                  style={{ width: `${generationProgress?.percent || 0}%` }}
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={!canGenerate}
              onClick={onGenerate}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-400 bg-sky-600 hover:bg-sky-500 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-2"
            >
              <FileCheck className="w-5 h-5" />
              <span>{t.generatePackageBtn}</span>
            </button>
          )}

          {!isTenderReady && (
            <p className="text-[11px] text-slate-400 text-center">
              Load a tender requirements file first.
            </p>
          )}
        </div>

        {/* Package Result Section */}
        {packageResult && (
          <div
            className={`rounded-xl border p-4 space-y-3 transition-all ${
              isPackageStale
                ? 'border-amber-300 bg-amber-50/30'
                : 'border-sky-300 bg-sky-50/20'
            }`}
          >
            {isPackageStale && (
              <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-100/70 p-2 rounded-lg">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{t.packageStaleWarning}</span>
              </div>
            )}

            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {t.packageReadyTitle}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-700 mt-1 font-medium">
                <span>
                  <strong>{packageResult.totalPages}</strong> {t.pageCount}
                </span>
                <span>·</span>
                <span>
                  {(packageResult.fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span>·</span>
                <span className="font-mono text-slate-500 text-[10px]">
                  {packageResult.tenderId}_Package.pdf
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
              <button
                type="button"
                onClick={onDownload}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.downloadPackageBtn}</span>
              </button>

              <button
                type="button"
                onClick={onPreviewPackage}
                className="w-full sm:flex-1 py-2.5 px-3 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4 text-slate-500" />
                <span>{t.previewPackageBtn}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
