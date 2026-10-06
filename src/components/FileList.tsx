import React, { useMemo } from 'react';
import { Eye, Trash2, Copy, FileText, Check, AlertCircle, FileSearch } from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { Requirement, UploadedFile } from '../types';

interface FileListProps {
  files: UploadedFile[];
  requirements: Requirement[];
  matches: Record<string, string | null>;
  language: Language;
  onPreviewFile: (file: UploadedFile) => void;
  onRemoveFileClick: (file: UploadedFile) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  requirements,
  matches,
  language,
  onPreviewFile,
  onRemoveFileClick,
}) => {
  const t = i18nDict[language];

  // Compute duplicate clusters by SHA-256
  const duplicateInfo = useMemo(() => {
    const hashToFiles = new Map<string, UploadedFile[]>();
    for (const file of files) {
      const existing = hashToFiles.get(file.sha256) || [];
      existing.push(file);
      hashToFiles.set(file.sha256, existing);
    }

    const duplicatesMap = new Map<string, { isDuplicate: boolean; otherFileName: string }>();

    for (const file of files) {
      const group = hashToFiles.get(file.sha256) || [];
      if (group.length > 1) {
        // Find other file name in cluster
        const other = group.find((f) => f.id !== file.id);
        duplicatesMap.set(file.id, {
          isDuplicate: true,
          otherFileName: other ? other.name : 'another file',
        });
      } else {
        duplicatesMap.set(file.id, { isDuplicate: false, otherFileName: '' });
      }
    }

    return duplicatesMap;
  }, [files]);

  // Compute which requirement each file is matched to
  const fileMatchedRequirementMap = useMemo(() => {
    const map = new Map<string, Requirement>();
    for (const [reqId, fileId] of Object.entries(matches)) {
      if (fileId) {
        const req = requirements.find((r) => r.id === reqId);
        if (req) {
          map.set(fileId, req);
        }
      }
    }
    return map;
  }, [matches, requirements]);

  if (files.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
        <FileSearch className="w-8 h-8 mx-auto text-slate-400 mb-2" />
        {t.noFilesUploaded}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
        <span>
          {t.currentUploadedFiles} ({files.length})
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {files.map((file) => {
          const dup = duplicateInfo.get(file.id);
          const matchedReq = fileMatchedRequirementMap.get(file.id);
          const matchedTitle = matchedReq
            ? language === 'bn'
              ? matchedReq.title_bn || matchedReq.title_en
              : matchedReq.title_en
            : null;

          const sizeKb = (file.size / 1024).toFixed(0);

          return (
            <div
              key={file.id}
              className={`bg-white rounded-xl border p-3 flex gap-3 transition-all ${
                dup?.isDuplicate
                  ? 'border-amber-300 bg-amber-50/20 shadow-xs'
                  : matchedReq
                  ? 'border-sky-200 bg-sky-50/20'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Page 1 Thumbnail */}
              <div
                onClick={() => onPreviewFile(file)}
                className="w-16 h-20 bg-slate-100 rounded-md border border-slate-200 flex-shrink-0 overflow-hidden cursor-pointer relative group flex items-center justify-center shadow-2xs"
                title="Click to preview this document"
              >
                {file.thumbnailDataUrl ? (
                  <img
                    src={file.thumbnailDataUrl}
                    alt={file.name}
                    className="w-full h-full object-cover object-top transition-transform group-hover:scale-105"
                  />
                ) : (
                  <FileText className="w-6 h-6 text-slate-400" />
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Eye className="w-5 h-5 text-white" />
                </div>
              </div>

              {/* Details & Metadata */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-1">
                    <h3
                      className="text-xs sm:text-sm font-semibold text-slate-900 truncate"
                      title={file.name}
                    >
                      {file.name}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                    <span className="font-medium text-slate-700">
                      {file.pageCount} {t.pageCount}
                    </span>
                    <span>·</span>
                    <span>{sizeKb} KB</span>
                    <span>·</span>
                    <span
                      className="font-mono text-[10px] text-slate-400 truncate max-w-[80px]"
                      title={`SHA-256: ${file.sha256}`}
                    >
                      {file.sha256.substring(0, 8)}...
                    </span>
                  </div>

                  {/* Status Badges */}
                  <div className="mt-1.5 space-y-1">
                    {dup?.isDuplicate && (
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                        <Copy className="w-3 h-3 text-amber-600 shrink-0" />
                        <span className="truncate max-w-[140px]" title={dup.otherFileName}>
                          {t.duplicateOf} {dup.otherFileName}
                        </span>
                      </div>
                    )}

                    <div>
                      {matchedTitle ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-800 border border-sky-200">
                          <Check className="w-3 h-3 text-sky-600 shrink-0" />
                          <span className="truncate max-w-[160px]" title={matchedTitle}>
                            {t.fileUsedFor}: {matchedTitle}
                          </span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                          {t.fileNotUsed}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => onPreviewFile(file)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t.previewBtn}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveFileClick(file)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                    title={dup?.isDuplicate ? t.removeThisCopyBtn : t.removeBtn}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                    <span>{dup?.isDuplicate ? t.removeThisCopyBtn : t.removeBtn}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
