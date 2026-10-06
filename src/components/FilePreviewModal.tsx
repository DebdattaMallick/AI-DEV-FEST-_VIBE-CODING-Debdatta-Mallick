import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Loader2,
  FileText,
} from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { pdfjsLib } from '../lib/pdfWorker';

interface FilePreviewModalProps {
  title: string;
  pdfData: ArrayBuffer | Uint8Array | string; // Buffer or blob URL
  totalPagesHint?: number;
  language: Language;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  title,
  pdfData,
  totalPagesHint,
  language,
  onClose,
}) => {
  const t = i18nDict[language];
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(totalPagesHint || 1);
  const [scale, setScale] = useState<number>(1.2);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<any>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && currentPage < totalPages) setCurrentPage((p) => p + 1);
      if (e.key === 'ArrowLeft' && currentPage > 1) setCurrentPage((p) => p - 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, currentPage, totalPages]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);
    setErrorMsg(null);

    const loadDoc = async () => {
      try {
        let loadingTask: any;
        if (typeof pdfData === 'string') {
          loadingTask = pdfjsLib.getDocument({ url: pdfData, useSystemFonts: true });
        } else {
          const uint8 = pdfData instanceof Uint8Array ? pdfData : new Uint8Array(pdfData);
          loadingTask = pdfjsLib.getDocument({ data: uint8, useSystemFonts: true });
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;
        pdfDocRef.current = doc;
        setTotalPages(doc.numPages);
        setCurrentPage(1);
        setIsLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Failed to load PDF for preview', err);
        setErrorMsg(err?.message || 'Failed to load PDF preview');
        setIsLoading(false);
      }
    };

    loadDoc();

    return () => {
      isCancelled = true;
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy?.();
      }
    };
  }, [pdfData]);

  // Render Current Page onto Canvas
  useEffect(() => {
    let isCancelled = false;
    if (!pdfDocRef.current || !canvasRef.current) return;

    const renderPage = async () => {
      try {
        const page = await pdfDocRef.current.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({
          canvasContext: ctx,
          viewport,
          canvas: canvas,
        }).promise;
      } catch (err) {
        if (!isCancelled) {
          console.error('Error rendering PDF page', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [currentPage, scale]);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => p + 1);
  };

  const handleZoomIn = () => setScale((s) => Math.min(3.0, +(s + 0.2).toFixed(1)));
  const handleZoomOut = () => setScale((s) => Math.max(0.6, +(s - 0.2).toFixed(1)));
  const handleFitWidth = () => setScale(1.0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-title"
      className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center p-2 sm:p-4 overflow-hidden"
    >
      {/* Modal Container */}
      <div className="bg-slate-900 text-white w-full max-w-5xl h-[92vh] rounded-xl flex flex-col shadow-2xl border border-slate-700 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-5 h-5 text-sky-400 shrink-0" />
            <h2 id="preview-title" className="text-sm sm:text-base font-bold truncate">
              {title}
            </h2>
          </div>

          {/* Navigation & Zoom controls */}
          <div className="flex items-center gap-1.5 sm:gap-3 text-xs">
            {/* Page navigation */}
            <div className="flex items-center gap-1 bg-slate-900 rounded-lg px-2 py-1 border border-slate-700">
              <button
                type="button"
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Previous page (Left arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono text-xs px-1">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30 cursor-pointer"
                title="Next page (Right arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom controls */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-900 rounded-lg px-1.5 py-1 border border-slate-700">
              <button
                type="button"
                onClick={handleZoomOut}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
                title={t.zoomOut}
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-xs px-1">{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
                title={t.zoomIn}
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleFitWidth}
                className="p-1 text-slate-300 hover:text-white cursor-pointer"
                title={t.fitWidth}
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
              title={t.closeBtn}
              aria-label={t.closeBtn}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewer Viewport Area */}
        <div className="flex-1 bg-slate-950 overflow-auto p-4 flex items-center justify-center relative">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
              <span className="text-sm">Loading document preview...</span>
            </div>
          ) : errorMsg ? (
            <div className="text-center p-6 text-rose-400 text-sm max-w-md">
              <p className="font-semibold mb-1">Preview Unavailable</p>
              <p className="text-xs text-slate-400">{errorMsg}</p>
            </div>
          ) : (
            <div className="shadow-2xl rounded-sm overflow-hidden border border-slate-800 bg-white">
              <canvas ref={canvasRef} className="block max-w-none" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
