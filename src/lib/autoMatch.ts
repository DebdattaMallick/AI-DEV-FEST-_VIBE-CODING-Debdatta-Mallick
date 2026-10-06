import { pdfjsLib } from './pdfWorker';
import { Requirement, UploadedFile } from '../types';
import { isValidISODate } from './status';

export interface ExtractedPdfContent {
  hasTextLayer: boolean;
  firstPageText: string;
}

export interface MatchSuggestion {
  requirementId: string;
  suggestedFileId: string | null;
  candidateFileIds: string[]; // If ambiguous
  confidence: 'high' | 'ambiguous' | 'none';
  reasonEn: string;
  reasonBn: string;
  isScannedOnly?: boolean;
}

// Cache of extracted text per fileId
const textCache = new Map<string, ExtractedPdfContent>();

/**
 * Extracts text content from page 1 of a PDF using pdf.js.
 */
export async function extractPdfText(file: UploadedFile): Promise<ExtractedPdfContent> {
  if (textCache.has(file.id)) {
    return textCache.get(file.id)!;
  }

  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(file.buffer.slice(0)),
      useSystemFonts: true,
    });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();

    const strings = content.items
      .map((item: any) => ('str' in item ? item.str : ''))
      .filter(Boolean);

    const fullText = strings.join(' ').trim();
    const hasTextLayer = fullText.length > 10;

    const result: ExtractedPdfContent = {
      hasTextLayer,
      firstPageText: fullText,
    };

    textCache.set(file.id, result);
    return result;
  } catch (err) {
    console.warn('Text extraction failed for', file.name, err);
    const fallback = { hasTextLayer: false, firstPageText: '' };
    textCache.set(file.id, fallback);
    return fallback;
  }
}

/**
 * Common keyword associations for tender documents.
 */
const KEYWORD_GROUPS: Record<string, string[]> = {
  trade_license: ['trade', 'license', 'licence', 'ব্যবসায়', 'ট্রেড', 'লাইসেন্স', 'tl'],
  tin: ['tin', 'tax', 'taxpayer', 'টিআইএন', 'কর', 'nbr', 'revenue'],
  vat: ['vat', 'bin', 'value added', 'ভ্যাট', 'মূসক', 'mushak'],
  solvency: ['solvency', 'bank', 'financial capability', 'সচ্ছলতা', 'ব্যাংক', 'solvency letter'],
  experience: ['experience', 'completion', 'credential', 'past work', 'অভিজ্ঞতা', 'কাজের অভিজ্ঞতা'],
  technical: ['technical', 'specification', 'spec', 'datasheet', 'কারিগরি', 'প্রস্তাবনা'],
  financial: ['financial', 'finance', 'price', 'boq', 'bill of quantities', 'quotation', 'commercial', 'দরপ্রস্তাব', 'আর্থিক'],
  maf: ['maf', 'manufacturer', 'authorization', 'উৎপাদক', 'অনুমোদন', 'oem', 'authorization letter'],
  declaration: ['declaration', 'integrity', 'pact', 'undertaking', 'affidavit', 'সততা', 'অঙ্গীকারনামা'],
};

/**
 * Splits filename into lowercase tokens.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Scores how well an uploaded file matches a required document.
 */
function calculateMatchScore(
  req: Requirement,
  file: UploadedFile,
  extracted: ExtractedPdfContent
): { score: number; matchReasons: string[] } {
  let score = 0;
  const matchReasons: string[] = [];

  const fileTokens = tokenize(file.name);
  const reqTitleTokens = tokenize(req.title_en);
  const reqBnTokens = tokenize(req.title_bn || '');
  const allReqTokens = new Set([...reqTitleTokens, ...reqBnTokens]);

  // Determine applicable keyword group
  const lowerReq = (req.title_en + ' ' + (req.title_bn || '')).toLowerCase();
  let relatedKeywords: string[] = [];

  for (const [key, words] of Object.entries(KEYWORD_GROUPS)) {
    if (words.some((w) => lowerReq.includes(w))) {
      relatedKeywords = [...relatedKeywords, ...words];
    }
  }

  // 1. Filename Token Matching
  for (const token of fileTokens) {
    if (allReqTokens.has(token)) {
      score += 35;
      matchReasons.push(`Filename matches "${token}"`);
    } else if (relatedKeywords.includes(token)) {
      score += 25;
      matchReasons.push(`Filename keyword "${token}"`);
    }
  }

  // 2. Extracted Page-1 Text Matching
  if (extracted.hasTextLayer && extracted.firstPageText) {
    const textLower = extracted.firstPageText.toLowerCase();

    // Check exact title phrases
    if (textLower.includes(req.title_en.toLowerCase())) {
      score += 60;
      matchReasons.push(`Document heading matches "${req.title_en}"`);
    } else {
      for (const token of reqTitleTokens) {
        if (token.length >= 3 && textLower.includes(token)) {
          score += 15;
        }
      }
      for (const kw of relatedKeywords) {
        if (kw.length >= 3 && textLower.includes(kw)) {
          score += 15;
        }
      }
    }
  }

  return { score, matchReasons };
}

/**
 * Generates match suggestions for all currently unmatched requirements.
 * Enforces rules:
 * - NEVER overwrite a manual match.
 * - Never apply ambiguous suggestions (show both candidates).
 * - Never suggest duplicate copies of the same file.
 */
export async function generateAutoMatchSuggestions(
  requirements: Requirement[],
  uploadedFiles: UploadedFile[],
  currentMatches: Record<string, string | null>
): Promise<MatchSuggestion[]> {
  // Extract text for all files concurrently
  const fileContents = await Promise.all(
    uploadedFiles.map(async (f) => ({
      file: f,
      content: await extractPdfText(f),
    }))
  );

  const contentMap = new Map<string, ExtractedPdfContent>();
  fileContents.forEach(({ file, content }) => {
    contentMap.set(file.id, content);
  });

  // Identify currently matched file IDs and duplicate content hashes
  const matchedFileIds = new Set<string>();
  const usedSha256s = new Set<string>();

  for (const fileId of Object.values(currentMatches)) {
    if (fileId) {
      matchedFileIds.add(fileId);
      const matchedF = uploadedFiles.find((f) => f.id === fileId);
      if (matchedF) usedSha256s.add(matchedF.sha256);
    }
  }

  // Filter available unused files (excluding duplicate content of already used files)
  const availableFiles = uploadedFiles.filter(
    (f) => !matchedFileIds.has(f.id) && !usedSha256s.has(f.sha256)
  );

  const suggestions: MatchSuggestion[] = [];

  for (const req of requirements) {
    // NEVER overwrite an existing match
    if (currentMatches[req.id]) {
      continue;
    }

    // Score all available files
    const scoredFiles: Array<{
      file: UploadedFile;
      score: number;
      reasons: string[];
    }> = [];

    for (const file of availableFiles) {
      const content = contentMap.get(file.id) || { hasTextLayer: false, firstPageText: '' };
      const { score, matchReasons } = calculateMatchScore(req, file, content);
      if (score >= 20) {
        scoredFiles.push({ file, score, reasons: matchReasons });
      }
    }

    scoredFiles.sort((a, b) => b.score - a.score);

    if (scoredFiles.length === 0) {
      // Check if there are scanned files that might need manual preview
      const scannedAvailable = availableFiles.filter(
        (f) => !contentMap.get(f.id)?.hasTextLayer
      );
      if (scannedAvailable.length > 0) {
        suggestions.push({
          requirementId: req.id,
          suggestedFileId: null,
          candidateFileIds: [],
          confidence: 'none',
          isScannedOnly: true,
          reasonEn: 'Needs manual match: use Preview',
          reasonBn: 'ম্যানুয়াল ম্যাচ প্রয়োজন: প্রিভিউ ব্যবহার করুন',
        });
      }
      continue;
    }

    const top = scoredFiles[0];

    // Check for ambiguity (e.g. 2 files with very close top scores, like trade_license_2025 and 2026)
    if (scoredFiles.length > 1 && scoredFiles[1].score >= top.score * 0.8) {
      // Ambiguous: show candidates, do not auto-match
      const candidateIds = scoredFiles.slice(0, 3).map((s) => s.file.id);
      suggestions.push({
        requirementId: req.id,
        suggestedFileId: null,
        candidateFileIds: candidateIds,
        confidence: 'ambiguous',
        reasonEn: `Ambiguous match (${scoredFiles.length} candidates found)`,
        reasonBn: `একাধিক সম্ভাব্য ফাইল পাওয়া গেছে (${scoredFiles.length}টি)`,
      });
    } else if (top.score >= 30) {
      // Clear unambiguous suggestion
      suggestions.push({
        requirementId: req.id,
        suggestedFileId: top.file.id,
        candidateFileIds: [top.file.id],
        confidence: 'high',
        reasonEn: top.reasons[0] || 'High relevance match',
        reasonBn: 'উচ্চ মিল পাওয়া গেছে',
      });
    }
  }

  return suggestions;
}

/**
 * Searches PDF page-1 text for dates and converts to standard YYYY-MM-DD.
 */
export async function detectExpiryDateFromPdf(
  file: UploadedFile
): Promise<string | null> {
  const content = await extractPdfText(file);
  if (!content.hasTextLayer || !content.firstPageText) {
    return null;
  }

  const text = content.firstPageText;

  // Pattern 1: ISO date following expiry keywords (e.g. "expiry date: 2027-06-30", "valid until: 2027-06-30")
  const keywordIsoMatch = text.match(
    /(?:valid\s+until|expiry\s+date|expires\s+on|expiry|validity|মেয়াদ)\s*[:\s(]*(\d{4}-\d{2}-\d{2})/i
  );
  if (keywordIsoMatch && isValidISODate(keywordIsoMatch[1])) {
    return keywordIsoMatch[1];
  }

  // Pattern 2: Natural date like "30 June 2027" or "June 30, 2027"
  const monthMap: Record<string, string> = {
    january: '01', feb: '02', february: '02', mar: '03', march: '03',
    apr: '04', april: '04', may: '05', jun: '06', june: '06',
    jul: '07', july: '07', aug: '08', august: '08', sep: '09',
    september: '09', oct: '10', october: '10', nov: '11', november: '11',
    dec: '12', december: '12',
  };

  const naturalDateMatch = text.match(
    /(?:valid\s+until|expiry\s+date|expires\s+on|expiry)?\s*[:\s(]*(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i
  );
  if (naturalDateMatch) {
    const day = naturalDateMatch[1].padStart(2, '0');
    const monthWord = naturalDateMatch[2].toLowerCase();
    const year = naturalDateMatch[3];
    const month = monthMap[monthWord];
    if (month) {
      const iso = `${year}-${month}-${day}`;
      if (isValidISODate(iso)) return iso;
    }
  }

  // Pattern 3: Explicit bracketed ISO date in "30 June 2027 (2027-06-30)"
  const bracketIso = text.match(/\((\d{4}-\d{2}-\d{2})\)/);
  if (bracketIso && isValidISODate(bracketIso[1])) {
    return bracketIso[1];
  }

  // Pattern 4: DD/MM/YYYY or DD-MM-YYYY following expiry keyword
  const dmyMatch = text.match(
    /(?:valid\s+until|expiry\s+date|expires\s+on|expiry)\s*[:\s(]*(\d{1,2})[/-](\d{1,2})[/-](\d{4})/i
  );
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    const iso = `${year}-${month}-${day}`;
    if (isValidISODate(iso)) return iso;
  }

  return null;
}
