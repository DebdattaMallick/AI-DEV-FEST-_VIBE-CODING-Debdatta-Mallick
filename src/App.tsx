/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useReducer, useEffect, useCallback, useState, useRef } from 'react';
import { Header } from './components/Header';
import { TenderCard } from './components/TenderCard';
import { UploadZone } from './components/UploadZone';
import { FileList } from './components/FileList';
import { RequirementRow } from './components/RequirementRow';
import { SummaryPanel } from './components/SummaryPanel';
import { FilePreviewModal } from './components/FilePreviewModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { MessageList } from './components/MessageList';
import { SealConfigModal } from './components/SealConfigModal';
import { GeminiExplainerModal } from './components/GeminiExplainerModal';
import { appReducer, initialState } from './state/reducer';
import { parseRequirementsJson } from './lib/requirementsParser';
import { buildTenderPackage } from './lib/buildPackage';
import { SAMPLE_REQUIREMENTS_JSON } from './lib/sampleData';
import { generateSamplePdfFiles } from './lib/samplePdfGenerator';
import { i18nDict, Language } from './lib/i18n';
import { exportChecklistToCsv } from './lib/exportCsv';
import {
  saveProjectToStorage,
  loadProjectFromStorage,
  clearProjectFromStorage,
  SavedProject,
} from './lib/storage';
import {
  generateAutoMatchSuggestions,
  detectExpiryDateFromPdf,
  MatchSuggestion,
} from './lib/autoMatch';
import { UploadedFile, SealConfig } from './types';
import { Sparkles, Check, Play, RefreshCw, FolderOpen, ArrowRight } from 'lucide-react';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isGeneratingSamples, setIsGeneratingSamples] = useState(false);
  const [highlightedReqId, setHighlightedReqId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);

  // Bonus Features UI state
  const [suggestions, setSuggestions] = useState<Map<string, MatchSuggestion>>(new Map());
  const [isMatchingRunning, setIsMatchingRunning] = useState(false);
  const [detectedExpiryDates, setDetectedExpiryDates] = useState<Map<string, string>>(new Map());

  // Modal Dialogs
  const [isSealModalOpen, setIsSealModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(''); // Ephemeral in-memory only

  // Resume prompt state for Feature 5 (IndexedDB)
  const [savedResumeProject, setSavedResumeProject] = useState<SavedProject | null>(null);

  const t = i18nDict[state.language];

  // Sync <html lang="..."> attribute with state.language
  useEffect(() => {
    document.documentElement.lang = state.language;
  }, [state.language]);

  // Global Keyboard shortcuts: Ctrl+Z (Undo) and Ctrl+Y / Ctrl+Shift+Z (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.altKey) {
        if (e.key === 'z' || e.key === 'Z') {
          if (e.shiftKey) {
            e.preventDefault();
            dispatch({ type: 'REDO' });
          } else {
            e.preventDefault();
            dispatch({ type: 'UNDO' });
          }
        } else if (e.key === 'y' || e.key === 'Y') {
          e.preventDefault();
          dispatch({ type: 'REDO' });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Feature 5: Check IndexedDB on mount for saved project
  useEffect(() => {
    let isCancelled = false;
    const checkSaved = async () => {
      const saved = await loadProjectFromStorage();
      if (saved && (saved.tender || saved.uploadedFiles.length > 0)) {
        if (!isCancelled) {
          setSavedResumeProject(saved);
        }
      }
    };
    checkSaved();
    return () => {
      isCancelled = true;
    };
  }, []);

  // Feature 5: Debounced Autosave to IndexedDB after changes
  const saveTimeoutRef = useRef<number | null>(null);
  useEffect(() => {
    if (!state.tender && state.uploadedFiles.length === 0) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      const projectToSave: SavedProject = {
        id: 'active_project',
        updatedAt: new Date().toISOString(),
        tender: state.tender,
        requirements: state.requirements,
        uploadedFiles: state.uploadedFiles,
        matches: state.matches,
        expiryDates: state.expiryDates,
        language: state.language,
        includeIndexPage: state.includeIndexPage,
        sealConfig: state.sealConfig,
      };
      await saveProjectToStorage(projectToSave);
    }, 600);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [
    state.tender,
    state.requirements,
    state.uploadedFiles,
    state.matches,
    state.expiryDates,
    state.language,
    state.includeIndexPage,
    state.sealConfig,
  ]);

  // Feature 2: Detect expiry dates for matched files that have has_expiry = true
  useEffect(() => {
    let isCancelled = false;
    const detectDates = async () => {
      const newMap = new Map<string, string>();
      for (const req of state.requirements) {
        if (req.has_expiry) {
          const fileId = state.matches[req.id];
          if (fileId) {
            const file = state.uploadedFiles.find((f) => f.id === fileId);
            if (file) {
              const detected = await detectExpiryDateFromPdf(file);
              if (detected && !isCancelled) {
                newMap.set(req.id, detected);
              }
            }
          }
        }
      }
      if (!isCancelled) {
        setDetectedExpiryDates(newMap);
      }
    };

    detectDates();
    return () => {
      isCancelled = true;
    };
  }, [state.matches, state.requirements, state.uploadedFiles]);

  // Feature 1: Run Auto-Match Suggestions
  const handleRunAutoMatch = useCallback(async () => {
    if (state.requirements.length === 0 || state.uploadedFiles.length === 0) return;
    setIsMatchingRunning(true);

    try {
      const list = await generateAutoMatchSuggestions(
        state.requirements,
        state.uploadedFiles,
        state.matches
      );
      const map = new Map<string, MatchSuggestion>();
      list.forEach((item) => map.set(item.requirementId, item));
      setSuggestions(map);

      const clearCount = list.filter((s) => s.confidence === 'high').length;
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'info',
          titleEn: 'Match Suggestions Ready',
          titleBn: 'ম্যাচ পরামর্শ প্রস্তুত',
          messageEn: `Found ${clearCount} high-confidence match suggestions. Review each row or accept all.`,
          messageBn: `${clearCount}টি উচ্চ নির্ভরযোগ্য পরামর্শ পাওয়া গেছে। প্রতিটি সারি পর্যালোচনা করুন বা একবারে গ্রহণ করুন।`,
        },
      });
    } catch (err) {
      console.warn('Auto match error', err);
    } finally {
      setIsMatchingRunning(false);
    }
  }, [state.requirements, state.uploadedFiles, state.matches]);

  // Feature 1: Accept all clear suggestions
  const handleAcceptAllClearSuggestions = useCallback(() => {
    const toApply: Array<{ requirementId: string; fileId: string }> = [];
    for (const [reqId, sug] of suggestions.entries()) {
      if (sug.confidence === 'high' && sug.suggestedFileId) {
        toApply.push({ requirementId: reqId, fileId: sug.suggestedFileId });
      }
    }

    if (toApply.length > 0) {
      dispatch({ type: 'APPLY_MULTIPLE_MATCHES', payload: toApply });
      setSuggestions(new Map());
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          titleEn: 'Suggestions Applied',
          titleBn: 'পরামর্শসমূহ প্রয়োগ করা হয়েছে',
          messageEn: `Applied ${toApply.length} suggestions successfully.`,
          messageBn: `${toApply.length}টি পরামর্শ সফলভাবে প্রয়োগ করা হয়েছে।`,
        },
      });
    }
  }, [suggestions]);

  // Jump to Requirement Row and flash highlight
  const handleJumpToRequirement = useCallback((reqId: string) => {
    const el = document.getElementById(`req-row-${reqId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedReqId(reqId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = window.setTimeout(() => {
        setHighlightedReqId(null);
      }, 2500);
    }
  }, []);

  // Handle Loading Requirements JSON
  const applyRequirements = useCallback((content: string) => {
    const parsed = parseRequirementsJson(content);
    if (!parsed.success || !parsed.data) {
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          titleEn: 'Failed to Load Requirements',
          titleBn: 'রিকোয়ারমেন্ট লোড করতে ব্যর্থ',
          messageEn: parsed.errorEn || 'Invalid requirements.json structure',
          messageBn: parsed.errorBn || 'অকার্যকর requirements.json ফাইল',
        },
      });
      return;
    }

    dispatch({
      type: 'SET_TENDER_AND_REQUIREMENTS',
      payload: {
        tender: parsed.data.tender,
        requirements: parsed.data.requirements,
      },
    });

    setSuggestions(new Map());

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        type: 'success',
        titleEn: 'Tender Loaded',
        titleBn: 'টেন্ডার লোড সম্পন্ন',
        messageEn: `${parsed.data.tender.tender_id}: ${parsed.data.tender.title} (${parsed.data.requirements.length} documents)`,
        messageBn: `${parsed.data.tender.tender_id}: ${parsed.data.tender.title} (${parsed.data.requirements.length}টি প্রয়োজনীয় নথি)`,
      },
    });
  }, []);

  const handleLoadRequirements = useCallback(
    (content: string) => {
      const hasExistingMatches = Object.values(state.matches).some((val) => val !== null);
      if (state.tender && hasExistingMatches) {
        dispatch({
          type: 'SET_CONFIRM_DIALOG',
          payload: {
            titleEn: t.confirmNewTenderTitle,
            titleBn: t.confirmNewTenderTitle,
            messageEn: t.confirmNewTenderMsg,
            messageBn: t.confirmNewTenderMsg,
            confirmLabelEn: t.confirmBtn,
            confirmLabelBn: t.confirmBtn,
            isDestructive: false,
            onConfirm: () => {
              dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
              applyRequirements(content);
            },
            onCancel: () => {
              dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
            },
          },
        });
      } else {
        applyRequirements(content);
      }
    },
    [state.matches, state.tender, t, applyRequirements]
  );

  // Quick Load Sample Tender
  const handleLoadSampleTender = useCallback(() => {
    handleLoadRequirements(JSON.stringify(SAMPLE_REQUIREMENTS_JSON));
  }, [handleLoadRequirements]);

  // Quick Load Sample PDFs
  const handleLoadSamplePdfs = useCallback(async () => {
    if (isGeneratingSamples) return;
    setIsGeneratingSamples(true);
    try {
      const sampleFiles = await generateSamplePdfFiles();
      dispatch({ type: 'ADD_FILES', payload: sampleFiles });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          titleEn: 'Sample Files Loaded',
          titleBn: 'নমুনা ফাইল প্রস্তুত',
          messageEn: `Loaded ${sampleFiles.length} test PDF files (including duplicates and test licenses).`,
          messageBn: `${sampleFiles.length}টি নমুনা PDF ফাইল লোড করা হয়েছে (ডুপ্লিকেট ও লাইসেন্সসহ)।`,
        },
      });
    } catch (err) {
      console.error(err);
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          titleEn: 'Failed to generate sample PDFs',
          titleBn: 'নমুনা ফাইল তৈরি করতে ব্যর্থ',
          messageEn: String(err),
          messageBn: String(err),
        },
      });
    } finally {
      setIsGeneratingSamples(false);
    }
  }, [isGeneratingSamples]);

  // Start New Project (Feature 5)
  const handleStartNewProject = useCallback(() => {
    dispatch({
      type: 'SET_CONFIRM_DIALOG',
      payload: {
        titleEn: 'Start New Project?',
        titleBn: 'নতুন প্রজেক্ট শুরু করবেন?',
        messageEn: 'This will clear the current tender, matches, and uploaded files. Are you sure?',
        messageBn: 'এটি বর্তমান টেন্ডার, আপলোডকৃত ফাইল এবং সমস্ত ম্যাচ মুছে ফেলবে। আপনি কি নিশ্চিত?',
        confirmLabelEn: 'Start Fresh',
        confirmLabelBn: 'নতুন শুরু করুন',
        isDestructive: true,
        onConfirm: async () => {
          dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
          await clearProjectFromStorage();
          setSavedResumeProject(null);
          setSuggestions(new Map());
          dispatch({ type: 'RESET_STATE' });
        },
        onCancel: () => {
          dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
        },
      },
    });
  }, []);

  // Request Removing a File
  const handleRequestRemoveFile = useCallback(
    (file: UploadedFile) => {
      dispatch({
        type: 'SET_CONFIRM_DIALOG',
        payload: {
          titleEn: `${t.confirmRemoveFileTitle} (${file.name})`,
          titleBn: `${file.name} ${t.confirmRemoveFileTitle}`,
          messageEn: t.confirmRemoveFileMsg,
          messageBn: t.confirmRemoveFileMsg,
          confirmLabelEn: t.removeBtn,
          confirmLabelBn: t.removeBtn,
          isDestructive: true,
          onConfirm: () => {
            dispatch({ type: 'REMOVE_FILE', payload: file.id });
            dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
          },
          onCancel: () => {
            dispatch({ type: 'SET_CONFIRM_DIALOG', payload: null });
          },
        },
      });
    },
    [t]
  );

  // Generate Package (Features 3, 6, 7 included)
  const handleGeneratePackage = useCallback(async () => {
    if (!state.tender || state.requirements.length === 0 || state.isGenerating) return;

    dispatch({ type: 'START_GENERATION' });

    try {
      const filesMap = new Map<string, UploadedFile>(state.uploadedFiles.map((f) => [f.id, f]));

      const result = await buildTenderPackage(
        state.tender,
        state.requirements,
        state.matches,
        filesMap,
        {
          includeIndexPage: state.includeIndexPage,
          sealConfig: state.sealConfig,
        },
        (progress) => {
          dispatch({
            type: 'SET_GENERATION_PROGRESS',
            payload: progress,
          });
        }
      );

      const blob = new Blob([result.pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      dispatch({
        type: 'FINISH_GENERATION',
        payload: {
          pdfBytes: result.pdfBytes,
          blobUrl,
          totalPages: result.totalPages,
          fileSize: result.pdfBytes.length,
          generatedAt: new Date().toISOString(),
          tenderId: state.tender.tender_id,
        },
      });

      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'success',
          titleEn: 'Package Ready',
          titleBn: 'প্যাকেজ প্রস্তুত',
          messageEn: `Package successfully generated (${result.totalPages} pages, ${(
            result.pdfBytes.length /
            (1024 * 1024)
          ).toFixed(2)} MB).`,
          messageBn: `প্যাকেজ সফলভাবে তৈরি হয়েছে (${result.totalPages} পৃষ্ঠা, ${(
            result.pdfBytes.length /
            (1024 * 1024)
          ).toFixed(2)} MB)।`,
        },
      });
    } catch (err: any) {
      console.error('Failed to generate package', err);
      dispatch({ type: 'FAIL_GENERATION' });
      dispatch({
        type: 'ADD_NOTIFICATION',
        payload: {
          type: 'error',
          titleEn: 'Package Generation Error',
          titleBn: 'প্যাকেজ তৈরিতে ত্রুটি',
          messageEn: err?.message || 'Failed to assemble PDF package.',
          messageBn: err?.message || 'PDF প্যাকেজ তৈরিতে ব্যর্থ হয়েছে।',
        },
      });
    }
  }, [
    state.tender,
    state.requirements,
    state.matches,
    state.uploadedFiles,
    state.includeIndexPage,
    state.sealConfig,
    state.isGenerating,
  ]);

  // Download Generated PDF Package
  const handleDownload = useCallback(() => {
    if (!state.packageResult || !state.tender) return;
    const link = document.createElement('a');
    link.href = state.packageResult.blobUrl;
    const safeTenderId = state.tender.tender_id.replace(/[/\\?%*:|"<>]/g, '_');
    link.download = `${safeTenderId}_Package.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [state.packageResult, state.tender]);

  // Feature 4: Export CSV
  const handleExportCsv = useCallback(() => {
    exportChecklistToCsv(
      state.tender,
      state.requirements,
      state.uploadedFiles,
      state.matches,
      state.expiryDates,
      state.language
    );
  }, [state.tender, state.requirements, state.uploadedFiles, state.matches, state.expiryDates, state.language]);

  const clearSuggestionCount = Array.from(suggestions.values()).filter(
    (s) => s.confidence === 'high'
  ).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 font-sans flex flex-col">
      {/* App Header */}
      <Header
        language={state.language}
        onSetLanguage={(lang) => dispatch({ type: 'SET_LANGUAGE', payload: lang })}
        onLoadRequirements={handleLoadRequirements}
        onStartNewProject={handleStartNewProject}
      />

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Feature 5: Resume Previous Work Banner */}
        {savedResumeProject && (
          <div className="mb-4 p-4 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5">
              <FolderOpen className="w-5 h-5 text-sky-600 shrink-0" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold">
                  {state.language === 'bn' ? 'পূর্ববর্তী প্রজেক্ট সংরক্ষিত রয়েছে' : 'Continue Your Previous Work?'}
                </h4>
                <p className="text-xs text-sky-800">
                  {savedResumeProject.tender
                    ? `${savedResumeProject.tender.tender_id} (${savedResumeProject.uploadedFiles.length} files, ${Object.values(savedResumeProject.matches).filter(Boolean).length} matched)`
                    : `${savedResumeProject.uploadedFiles.length} uploaded files`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  dispatch({
                    type: 'LOAD_SAVED_PROJECT',
                    payload: {
                      tender: savedResumeProject.tender,
                      requirements: savedResumeProject.requirements,
                      uploadedFiles: savedResumeProject.uploadedFiles,
                      matches: savedResumeProject.matches,
                      expiryDates: savedResumeProject.expiryDates,
                      language: savedResumeProject.language || state.language,
                      includeIndexPage: Boolean(savedResumeProject.includeIndexPage),
                      sealConfig: savedResumeProject.sealConfig || null,
                    },
                  });
                  setSavedResumeProject(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs cursor-pointer"
              >
                {state.language === 'bn' ? 'চালিয়ে যান' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await clearProjectFromStorage();
                  setSavedResumeProject(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-sky-300 hover:bg-sky-100/60 text-sky-900 font-medium text-xs cursor-pointer"
              >
                {state.language === 'bn' ? 'বাতিল ও নতুন শুরু' : 'Discard & Start New'}
              </button>
            </div>
          </div>
        )}

        {/* Dismissible Alerts & Notifications */}
        <MessageList
          notifications={state.notifications}
          language={state.language}
          onDismiss={(id) => dispatch({ type: 'DISMISS_NOTIFICATION', payload: id })}
        />

        {/* Tender Information Card */}
        <div className="mb-6">
          <TenderCard
            tender={state.tender}
            requirements={state.requirements}
            language={state.language}
            onOpenRequirementsClick={() => {
              const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
              fileInput?.click();
            }}
            onLoadTemplate={handleLoadSampleTender}
          />
        </div>

        {/* Two-Column Responsive Grid: Left Steps (1 & 2) | Right Sticky Summary (Step 3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          {/* Left Column (8 cols): Step 1 Upload & Step 2 Matching Checklist */}
          <div className="lg:col-span-8 space-y-8">
            {/* STEP 1: Upload PDF files */}
            <section aria-labelledby="step1-heading" className="space-y-4">
              <UploadZone
                currentFiles={state.uploadedFiles}
                language={state.language}
                onFilesAccepted={(newFiles) => {
                  dispatch({ type: 'ADD_FILES', payload: newFiles });
                  dispatch({
                    type: 'ADD_NOTIFICATION',
                    payload: {
                      type: 'success',
                      titleEn: 'Files Added',
                      titleBn: 'ফাইল যোগ হয়েছে',
                      messageEn: `${newFiles.length} ${t.fileAccepted}`,
                      messageBn: `${newFiles.length} ${t.fileAccepted}`,
                    },
                  });
                }}
                onRejectionMessage={(msgEn, msgBn) => {
                  dispatch({
                    type: 'ADD_NOTIFICATION',
                    payload: {
                      type: 'error',
                      titleEn: 'File Rejected',
                      titleBn: 'ফাইল বাতিল হয়েছে',
                      messageEn: msgEn,
                      messageBn: msgBn,
                    },
                  });
                }}
                onRequirementsJsonDropped={handleLoadRequirements}
              />

              {/* Uploaded Files Grid */}
              <FileList
                files={state.uploadedFiles}
                requirements={state.requirements}
                matches={state.matches}
                language={state.language}
                onPreviewFile={(file) => dispatch({ type: 'SET_PREVIEW_FILE', payload: file })}
                onRemoveFileClick={handleRequestRemoveFile}
              />
            </section>

            {/* STEP 2: Required Documents Matching Checklist */}
            <section aria-labelledby="step2-heading" className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 id="step2-heading" className="text-base sm:text-lg font-bold text-slate-900">
                      {t.step2Title}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                      {t.step2Subtitle}
                    </p>
                  </div>

                  {/* Feature 1: Auto-Match Suggestions Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={isMatchingRunning || state.uploadedFiles.length === 0}
                      onClick={handleRunAutoMatch}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                      title="Analyze filenames and first-page text to suggest matches"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      <span>
                        {isMatchingRunning
                          ? (state.language === 'bn' ? 'বিশ্লেষণ চলছে...' : 'Analyzing...')
                          : (state.language === 'bn' ? 'ম্যাচ পরামর্শ' : 'Suggest Matches')}
                      </span>
                    </button>

                    {clearSuggestionCount > 0 && (
                      <button
                        type="button"
                        onClick={handleAcceptAllClearSuggestions}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                        title="Accept all unambiguous high-confidence matches"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {state.language === 'bn'
                            ? `সমস্ত (${clearSuggestionCount}) পরামর্শ গ্রহণ করুন`
                            : `Accept All (${clearSuggestionCount}) Suggestions`}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {state.requirements.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                    {t.emptyRequirementsSubtitle}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {state.requirements.map((req) => (
                      <RequirementRow
                        key={req.id}
                        req={req}
                        files={state.uploadedFiles}
                        matchedFileId={state.matches[req.id] || null}
                        expiryDate={state.expiryDates[req.id] || ''}
                        submissionDeadline={state.tender?.submission_deadline || ''}
                        allMatches={state.matches}
                        allRequirements={state.requirements}
                        language={state.language}
                        isHighlighted={highlightedReqId === req.id}
                        suggestion={suggestions.get(req.id)}
                        detectedExpiryDate={detectedExpiryDates.get(req.id)}
                        onMatchChange={(reqId, fileId) => {
                          dispatch({
                            type: 'MATCH_FILE',
                            payload: { requirementId: reqId, fileId },
                          });
                          // Remove suggestion once matched
                          if (suggestions.has(reqId)) {
                            const newSug = new Map(suggestions);
                            newSug.delete(reqId);
                            setSuggestions(newSug);
                          }
                        }}
                        onExpiryChange={(reqId, expiry) =>
                          dispatch({
                            type: 'SET_EXPIRY_DATE',
                            payload: { requirementId: reqId, expiryDate: expiry },
                          })
                        }
                        onPreviewFile={(file) =>
                          dispatch({ type: 'SET_PREVIEW_FILE', payload: file })
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column (4 cols): Step 3 Sticky Summary & Generate Package */}
          <div className="lg:col-span-4">
            <SummaryPanel
              tender={state.tender}
              requirements={state.requirements}
              files={state.uploadedFiles}
              matches={state.matches}
              expiryDates={state.expiryDates}
              isGenerating={state.isGenerating}
              generationProgress={state.generationProgress}
              packageResult={state.packageResult}
              isPackageStale={state.isPackageStale}
              canUndo={state.history.past.length > 0}
              canRedo={state.history.future.length > 0}
              includeIndexPage={state.includeIndexPage}
              hasSealConfig={Boolean(state.sealConfig?.enabled)}
              language={state.language}
              onUndo={() => dispatch({ type: 'UNDO' })}
              onRedo={() => dispatch({ type: 'REDO' })}
              onToggleIndexPage={(enabled) =>
                dispatch({ type: 'SET_INCLUDE_INDEX_PAGE', payload: enabled })
              }
              onExportCsv={handleExportCsv}
              onOpenSealModal={() => setIsSealModalOpen(true)}
              onGenerate={handleGeneratePackage}
              onDownload={handleDownload}
              onPreviewPackage={() => {
                if (state.packageResult) {
                  dispatch({
                    type: 'SET_PREVIEW_PACKAGE_URL',
                    payload: state.packageResult.blobUrl,
                  });
                }
              }}
              onJumpToRequirement={handleJumpToRequirement}
            />
          </div>
        </div>
      </main>

      {/* PDF Document Preview Modal */}
      {state.previewFile && (
        <FilePreviewModal
          title={state.previewFile.name}
          pdfData={state.previewFile.buffer}
          totalPagesHint={state.previewFile.pageCount}
          language={state.language}
          onClose={() => dispatch({ type: 'SET_PREVIEW_FILE', payload: null })}
        />
      )}

      {/* Package PDF Preview Modal */}
      {state.previewPackageUrl && state.packageResult && (
        <FilePreviewModal
          title={`${state.packageResult.tenderId}_Package.pdf (Generated Submission)`}
          pdfData={state.previewPackageUrl}
          totalPagesHint={state.packageResult.totalPages}
          language={state.language}
          onClose={() => dispatch({ type: 'SET_PREVIEW_PACKAGE_URL', payload: null })}
        />
      )}

      {/* Seal & Signature Config Modal */}
      {isSealModalOpen && (
        <SealConfigModal
          sealConfig={state.sealConfig}
          requirements={state.requirements}
          language={state.language}
          onSave={(cfg) => dispatch({ type: 'SET_SEAL_CONFIG', payload: cfg })}
          onClose={() => setIsSealModalOpen(false)}
        />
      )}

      {/* Confirmation Dialog */}
      {state.confirmDialog && (
        <ConfirmDialog dialog={state.confirmDialog} language={state.language} />
      )}
    </div>
  );
}
