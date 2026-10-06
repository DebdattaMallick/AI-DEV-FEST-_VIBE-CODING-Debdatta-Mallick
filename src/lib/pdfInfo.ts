import { PDFDocument } from 'pdf-lib';
import { pdfjsLib } from './pdfWorker';
import { computeSha256 } from './hash';
import { UploadedFile } from '../types';

export interface FileValidationResult {
  success: boolean;
  file?: UploadedFile;
  errorType?: 'NOT_PDF' | 'NOT_PDF_HEADER' | 'ENCRYPTED' | 'DAMAGED' | 'LIMIT_EXCEEDED';
  errorMessageEn?: string;
  errorMessageBn?: string;
}

/**
 * Checks if the buffer starts with or contains "%PDF-" in the first 1024 bytes.
 */
function hasPdfHeader(buffer: ArrayBuffer): boolean {
  const bytes = new Uint8Array(buffer.slice(0, Math.min(1024, buffer.byteLength)));
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  for (let i = 0; i <= bytes.length - magic.length; i++) {
    let match = true;
    for (let j = 0; j < magic.length; j++) {
      if (bytes[i + j] !== magic[j]) {
        match = false;
        break;
      }
    }
    if (match) return true;
  }
  return false;
}

/**
 * Generates a thumbnail data URL from page 1 using pdfjs-dist.
 */
async function generateThumbnail(buffer: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer.slice(0)),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const baseViewport = page.getViewport({ scale: 1.0 });
    const targetWidth = 240;
    const scale = targetWidth / Math.max(baseViewport.width, 1);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return '';
    }

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas,
    }).promise;

    return canvas.toDataURL('image/jpeg', 0.85);
  } catch (err) {
    console.warn('Failed to generate thumbnail', err);
    return '';
  }
}

/**
 * Validates and parses an uploaded file.
 */
export async function validateAndLoadPdf(
  file: File,
  currentCount: number,
  currentTotalBytes: number
): Promise<FileValidationResult> {
  const fileName = file.name;

  // 1. Check filename extension
  if (!fileName.toLowerCase().endsWith('.pdf')) {
    return {
      success: false,
      errorType: 'NOT_PDF',
      errorMessageEn: `${fileName} was not added: it is not a PDF.`,
      errorMessageBn: `${fileName} যোগ করা হয়নি: এটি একটি PDF নয়।`,
    };
  }

  // 2. Check limits (Max 30 files, 50MB in total)
  const MAX_FILES = 30;
  const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB

  if (currentCount >= MAX_FILES || currentTotalBytes + file.size > MAX_TOTAL_BYTES) {
    return {
      success: false,
      errorType: 'LIMIT_EXCEEDED',
      errorMessageEn: `Maximum 30 files / 50 MB in total. ${fileName} was not added.`,
      errorMessageBn: `সর্বোচ্চ ৩০টি ফাইল / ৫০ মেগাবাইট সীমা। ${fileName} যোগ করা হয়নি।`,
    };
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch {
    return {
      success: false,
      errorType: 'DAMAGED',
      errorMessageEn: `${fileName} could not be read (damaged file).`,
      errorMessageBn: `${fileName} পড়া যায়নি (ত্রুটিপূর্ণ ফাইল)।`,
    };
  }

  // 3. Check first 1024 bytes for %PDF-
  if (!hasPdfHeader(buffer)) {
    return {
      success: false,
      errorType: 'NOT_PDF_HEADER',
      errorMessageEn: `${fileName} was not added: missing valid PDF header.`,
      errorMessageBn: `${fileName} যোগ করা হয়নি: বৈধ PDF হেডার পাওয়া যায়নি।`,
    };
  }

  // 4. Validate with pdf-lib and pdf.js, detecting encryption and damage
  let pageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: false });
    pageCount = pdfDoc.getPageCount();
  } catch (err: unknown) {
    const errorMsg = String(err).toLowerCase();
    const isEncrypted =
      errorMsg.includes('encrypted') ||
      errorMsg.includes('password') ||
      (typeof err === 'object' && err !== null && 'name' in err && (err as { name: string }).name === 'EncryptedPDFError');

    if (isEncrypted) {
      return {
        success: false,
        errorType: 'ENCRYPTED',
        errorMessageEn: `${fileName} is password protected. Remove the password and upload again.`,
        errorMessageBn: `${fileName} পাসওয়ার্ড দ্বারা সুরক্ষিত। পাসওয়ার্ড সরিয়ে আবার আপলোড করুন।`,
      };
    }

    return {
      success: false,
      errorType: 'DAMAGED',
      errorMessageEn: `${fileName} could not be read (damaged file).`,
      errorMessageBn: `${fileName} পড়া যায়নি (ত্রুটিপূর্ণ ফাইল)।`,
    };
  }

  // Verify pdfjs can also open it
  try {
    const testDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
    if (pageCount === 0) {
      pageCount = testDoc.numPages;
    }
  } catch (err: unknown) {
    const errName = typeof err === 'object' && err !== null && 'name' in err ? String((err as { name: string }).name) : '';
    if (errName === 'PasswordException' || String(err).includes('Password')) {
      return {
        success: false,
        errorType: 'ENCRYPTED',
        errorMessageEn: `${fileName} is password protected. Remove the password and upload again.`,
        errorMessageBn: `${fileName} পাসওয়ার্ড দ্বারা সুরক্ষিত। পাসওয়ার্ড সরিয়ে আবার আপলোড করুন।`,
      };
    }
    return {
      success: false,
      errorType: 'DAMAGED',
      errorMessageEn: `${fileName} could not be read (damaged file).`,
      errorMessageBn: `${fileName} পড়া যায়নি (ত্রুটিপূর্ণ ফাইল)।`,
    };
  }

  // 5. Compute SHA-256 and Thumbnail
  const sha256 = await computeSha256(buffer);
  const thumbnailDataUrl = await generateThumbnail(buffer);

  const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    success: true,
    file: {
      id: uniqueId,
      name: fileName,
      size: file.size,
      pageCount,
      sha256,
      thumbnailDataUrl,
      buffer,
    },
  };
}
