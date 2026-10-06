import React, { useState, useRef } from 'react';
import { UploadCloud, FileType, AlertTriangle, CheckCircle, Info, Loader2 } from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { validateAndLoadPdf } from '../lib/pdfInfo';
import { UploadedFile } from '../types';

interface UploadZoneProps {
  currentFiles: UploadedFile[];
  language: Language;
  onFilesAccepted: (files: UploadedFile[]) => void;
  onRejectionMessage: (msgEn: string, msgBn: string) => void;
  onRequirementsJsonDropped?: (content: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  currentFiles,
  language,
  onFilesAccepted,
  onRejectionMessage,
  onRequirementsJsonDropped,
}) => {
  const t = i18nDict[language];
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalBytes = currentFiles.reduce((acc, f) => acc + f.size, 0);
  const totalMb = (totalBytes / (1024 * 1024)).toFixed(1);
  const fileCount = currentFiles.length;

  const handleProcessFileList = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setIsProcessing(true);

    const accepted: UploadedFile[] = [];
    let runningCount = currentFiles.length;
    let runningBytes = totalBytes;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check if user dropped a requirements.json file
      if (file.name.toLowerCase().endsWith('.json') && onRequirementsJsonDropped) {
        setProcessStatus(`Reading ${file.name}...`);
        try {
          const text = await file.text();
          onRequirementsJsonDropped(text);
          continue;
        } catch {
          onRejectionMessage(
            `Failed to read ${file.name}`,
            `${file.name} পড়তে ব্যর্থ হয়েছে`
          );
          continue;
        }
      }

      setProcessStatus(
        language === 'bn'
          ? `যাচাই করা হচ্ছে (${i + 1}/${files.length}): ${file.name}...`
          : `Validating (${i + 1}/${files.length}): ${file.name}...`
      );

      await new Promise((resolve) => setTimeout(resolve, 15));

      const validation = await validateAndLoadPdf(file, runningCount, runningBytes);

      if (validation.success && validation.file) {
        accepted.push(validation.file);
        runningCount++;
        runningBytes += validation.file.size;
      } else {
        onRejectionMessage(
          validation.errorMessageEn || `${file.name} was rejected.`,
          validation.errorMessageBn || `${file.name} বাতিল করা হয়েছে।`
        );
      }
    }

    if (accepted.length > 0) {
      onFilesAccepted(accepted);
    }

    setIsProcessing(false);
    setProcessStatus('');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleProcessFileList(e.dataTransfer.files);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleProcessFileList(e.target.files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            {t.step1Title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {t.step1Subtitle}
          </p>
        </div>

        {/* Limit Meter */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600">
          <div>
            <span className="text-slate-400">{t.currentUploadedFiles}:</span>{' '}
            <strong className={fileCount >= 30 ? 'text-amber-600' : 'text-slate-900'}>
              {fileCount}/30
            </strong>
          </div>
          <span className="text-slate-300">|</span>
          <div>
            <span className="text-slate-400">{t.totalSize}:</span>{' '}
            <strong className={totalBytes >= 50 * 1024 * 1024 ? 'text-amber-600' : 'text-slate-900'}>
              {totalMb}/50 MB
            </strong>
          </div>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,application/pdf,.json"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Drop Zone Box */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer select-none ${
          isDragOver
            ? 'border-sky-500 bg-sky-50/50 scale-[1.005]'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50/40 hover:bg-slate-50/80'
        } ${isProcessing ? 'pointer-events-none opacity-80' : ''}`}
      >
        <div className="flex flex-col items-center justify-center">
          <div
            className={`w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-colors ${
              isDragOver
                ? 'bg-sky-100 text-sky-600'
                : 'bg-white shadow-xs text-slate-500 border border-slate-200'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-7 h-7 animate-spin text-sky-600" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>

          {isProcessing ? (
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {processStatus || 'Processing uploaded documents...'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Checking file integrity, headers, and generating thumbnails
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm sm:text-base font-semibold text-slate-800">
                {t.dropFilesHere}
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md">
                {t.limitsNotice}
              </p>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                <FileType className="w-4 h-4" />
                {t.chooseFilesBtn}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
