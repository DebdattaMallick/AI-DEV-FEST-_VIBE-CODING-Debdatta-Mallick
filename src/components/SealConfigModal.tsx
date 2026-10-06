import React, { useState, useRef } from 'react';
import {
  X,
  Stamp,
  Upload,
  Check,
  Trash2,
  Sliders,
  Shield,
  Layers,
  Eye,
} from 'lucide-react';
import { Language, i18nDict } from '../lib/i18n';
import { Requirement, SealConfig } from '../types';

interface SealConfigModalProps {
  sealConfig: SealConfig | null;
  requirements: Requirement[];
  language: Language;
  onSave: (config: SealConfig | null) => void;
  onClose: () => void;
}

export const SealConfigModal: React.FC<SealConfigModalProps> = ({
  sealConfig,
  requirements,
  language,
  onSave,
  onClose,
}) => {
  const t = i18nDict[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [enabled, setEnabled] = useState<boolean>(sealConfig?.enabled ?? false);
  const [imageDataUrl, setImageDataUrl] = useState<string>(sealConfig?.imageDataUrl || '');
  const [scope, setScope] = useState<'all' | 'selected'>(sealConfig?.scope || 'all');
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>(sealConfig?.selectedDocIds || []);
  const [pageScope, setPageScope] = useState<'all' | 'first' | 'last' | 'custom'>(
    sealConfig?.pageScope || 'all'
  );
  const [customPages, setCustomPages] = useState<string>(sealConfig?.customPages || '1');
  const [width, setWidth] = useState<number>(sealConfig?.width || 100);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'center' | 'custom'>(
    sealConfig?.position || 'bottom-right'
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('png') && !file.name.toLowerCase().endsWith('.png')) {
      alert(language === 'bn' ? 'অনুগ্রহ করে একটি PNG ছবি নির্বাচন করুন।' : 'Please choose a PNG image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setImageDataUrl(result);
        setEnabled(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const toggleDocSelection = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((d) => d !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleApply = () => {
    if (!imageDataUrl) {
      onSave(null);
      onClose();
      return;
    }

    onSave({
      enabled,
      imageDataUrl,
      scope,
      selectedDocIds: scope === 'selected' ? selectedDocIds : requirements.map((r) => r.id),
      pageScope,
      customPages,
      width,
      position,
    });
    onClose();
  };

  const handleClear = () => {
    setImageDataUrl('');
    setEnabled(false);
    onSave(null);
    onClose();
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
              <Stamp className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                {language === 'bn' ? 'সিল ও স্বাক্ষর কনফিগারেশন' : 'Add Seal or Official Signature'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'bn'
                  ? 'কাগজের কন্টেন্ট এরিয়ার উপর স্বচ্ছ PNG সিল বা স্বাক্ষর প্রয়োগ করুন (ফুটার সুরক্ষিত থাকবে)'
                  : 'Stamp transparent PNG seal/signature onto final document pages (footer band remains untouched)'}
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

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto py-4 space-y-5 pr-1">
          {/* 1. Upload Stamp Image */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              1. {language === 'bn' ? 'সিল বা স্বাক্ষরের PNG ফাইল' : 'Upload Seal / Signature Image (PNG)'}
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,.png"
              className="hidden"
              onChange={handleFileChange}
            />

            {imageDataUrl ? (
              <div className="flex items-center gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="w-20 h-20 bg-white border border-slate-200 rounded-lg p-1.5 flex items-center justify-center shadow-2xs">
                  <img
                    src={imageDataUrl}
                    alt="Seal preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-800">
                    {language === 'bn' ? 'সিল ছবি আপলোড সম্পন্ন' : 'PNG Seal Loaded'}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {language === 'bn'
                      ? 'স্বচ্ছ ব্যাকগ্রাউন্ডসহ নির্বাচিত পৃষ্ঠায় প্রয়োগ করা হবে।'
                      : 'Will be embedded with transparency into document content area.'}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
                    >
                      {language === 'bn' ? 'ছবি পরিবর্তন করুন' : 'Change Image'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImageDataUrl('');
                        setEnabled(false);
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:text-rose-700 cursor-pointer"
                    >
                      {language === 'bn' ? 'ছবি মুছুন' : 'Remove Image'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-300 hover:border-sky-500 rounded-xl p-5 text-center flex flex-col items-center justify-center hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Upload className="w-6 h-6 text-slate-400 mb-2" />
                <span className="text-xs sm:text-sm font-semibold text-slate-800">
                  {language === 'bn' ? 'PNG সিল বা লোগো নির্বাচন করুন' : 'Select PNG Seal or Company Logo'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5">
                  Transparent PNG supported (e.g. company_logo.png)
                </span>
              </button>
            )}
          </div>

          {/* 2. Position & Size */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                2. {language === 'bn' ? 'অবস্থান (Position)' : 'Position Preset'}
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value as any)}
                className="w-full text-xs sm:text-sm rounded-lg border border-slate-300 bg-white py-2 px-3 shadow-2xs focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="bottom-right">Bottom-Right (নিচে ডানে - Default)</option>
                <option value="bottom-left">Bottom-Left (নিচে বামে)</option>
                <option value="top-right">Top-Right (উপরে ডানে)</option>
                <option value="center">Center (কেন্দ্রে)</option>
              </select>
              <p className="text-[10px] text-sky-700 font-medium mt-1">
                ✓ Guaranteed safe: Positioned strictly above the 34pt reserved footer band.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  3. {language === 'bn' ? 'সাইজ (Size)' : 'Seal Width'}
                </label>
                <span className="font-mono text-xs font-semibold text-slate-700">{width} pt</span>
              </div>
              <input
                type="range"
                min="50"
                max="160"
                step="5"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>50 pt (Small)</span>
                <span>100 pt (Standard)</span>
                <span>160 pt (Large)</span>
              </div>
            </div>
          </div>

          {/* 3. Page Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              4. {language === 'bn' ? 'কোন পৃষ্ঠায় প্রয়োগ হবে?' : 'Apply to Which Pages?'}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: language === 'bn' ? 'সকল পৃষ্ঠা' : 'All Pages' },
                { id: 'first', label: language === 'bn' ? 'প্রথম পৃষ্ঠা' : 'First Page' },
                { id: 'last', label: language === 'bn' ? 'শেষ পৃষ্ঠা' : 'Last Page' },
                { id: 'custom', label: language === 'bn' ? 'কাস্টম পৃষ্ঠা' : 'Custom' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPageScope(opt.id as any)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                    pageScope === opt.id
                      ? 'bg-sky-50 border-sky-500 text-sky-800 font-bold'
                      : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {pageScope === 'custom' && (
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="e.g. 1, 3-4"
                  value={customPages}
                  onChange={(e) => setCustomPages(e.target.value)}
                  className="w-full text-xs font-mono rounded-lg border border-slate-300 py-1.5 px-3 focus:ring-2 focus:ring-sky-500"
                />
              </div>
            )}
          </div>

          {/* 4. Document Scope */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              5. {language === 'bn' ? 'কোন নথিতে প্রয়োগ হবে?' : 'Apply to Which Documents?'}
            </label>
            <div className="flex items-center gap-4 mb-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'all'}
                  onChange={() => setScope('all')}
                  className="accent-sky-600"
                />
                <span>{language === 'bn' ? 'সকল সংযুক্ত নথিতে' : 'All Included Documents'}</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={scope === 'selected'}
                  onChange={() => setScope('selected')}
                  className="accent-sky-600"
                />
                <span>{language === 'bn' ? 'নির্দিষ্ট নথিতে' : 'Selected Documents Only'}</span>
              </label>
            </div>

            {scope === 'selected' && (
              <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
                {requirements.map((req) => (
                  <label
                    key={req.id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-white text-xs text-slate-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDocIds.includes(req.id)}
                      onChange={() => toggleDocSelection(req.id)}
                      className="accent-sky-600 rounded"
                    />
                    <span className="font-semibold">#{req.order}</span>
                    <span className="truncate">
                      {language === 'bn' ? req.title_bn || req.title_en : req.title_en}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
          {sealConfig && (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
            >
              {language === 'bn' ? 'সিল বাতিল করুন' : 'Disable Seal'}
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {t.cancelBtn}
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs cursor-pointer"
            >
              {language === 'bn' ? 'সংরক্ষণ ও প্রয়োগ করুন' : 'Save & Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
