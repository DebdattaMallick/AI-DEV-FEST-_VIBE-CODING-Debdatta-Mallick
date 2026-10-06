import { PDFDocument, PDFName, StandardFonts, degrees, rgb } from 'pdf-lib';
import { PackageBuildOptions, Requirement, SealConfig, TenderInfo, UploadedFile } from '../types';

export interface BuildProgress {
  messageEn: string;
  messageBn: string;
  percent: number;
}

/**
 * Sanitizes strings for pdf-lib standard Helvetica (WinAnsi / ASCII).
 * Replaces non-WinAnsi / non-ASCII characters with '?' to ensure generation never throws.
 */
export function sanitizeWinAnsi(text: string | null | undefined): string {
  if (!text) return '';
  return text.replace(/[^\x20-\x7E\xA0-\xFF]/g, '?');
}

/**
 * Renders Bangla text with native browser canvas font shaping (Noto Sans Bengali)
 * and exports as PNG bytes for embedding with pdf-lib.
 * This guarantees 100% correct conjunct letters and ligatures.
 */
export async function renderBanglaTextToPng(
  text: string,
  fontSize: number = 22,
  textColor: string = '#1e293b'
): Promise<{ bytes: Uint8Array; width: number; height: number } | null> {
  try {
    if (typeof document === 'undefined') return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const fontSpec = `bold ${fontSize}px "Noto Sans Bengali", sans-serif`;
    ctx.font = fontSpec;
    const metrics = ctx.measureText(text);
    const measuredWidth = Math.ceil(metrics.width) + 12;
    const measuredHeight = Math.ceil(fontSize * 1.4);

    const dpr = 2.5; // High DPR for crisp print resolution
    canvas.width = Math.ceil(measuredWidth * dpr);
    canvas.height = Math.ceil(measuredHeight * dpr);

    ctx.scale(dpr, dpr);
    ctx.font = fontSpec;
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 6, measuredHeight / 2);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return null;

    const buffer = await blob.arrayBuffer();
    return {
      bytes: new Uint8Array(buffer),
      width: measuredWidth,
      height: measuredHeight,
    };
  } catch (err) {
    console.warn('Bangla canvas text render failed, falling back gracefully', err);
    return null;
  }
}

/**
 * Formats current date as YYYY-MM-DD.
 */
function getTodayIsoDate(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export interface IncludedDocumentEntry {
  serial: number;
  req: Requirement;
  file: UploadedFile;
  startPage: number;
  pageCount: number;
}

export async function buildTenderPackage(
  tender: TenderInfo,
  requirements: Requirement[],
  matches: Record<string, string | null>,
  uploadedFilesMap: Map<string, UploadedFile>,
  options: PackageBuildOptions = { includeIndexPage: false },
  onProgress?: (progress: BuildProgress) => void
): Promise<{ pdfBytes: Uint8Array; totalPages: number }> {
  onProgress?.({
    messageEn: 'Initializing tender package document...',
    messageBn: 'টেন্ডার প্যাকেজ নথি প্রস্তুত করা হচ্ছে...',
    percent: 5,
  });

  const outDoc = await PDFDocument.create();
  outDoc.setTitle(`${sanitizeWinAnsi(tender.tender_id)} Package`);
  outDoc.setCreator('Tender Package Builder');

  const fontRegular = await outDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await outDoc.embedFont(StandardFonts.HelveticaBold);

  const hasIndexPage = Boolean(options.includeIndexPage);

  // 1. Gather all included documents in strict requirements order
  const includedDocs: IncludedDocumentEntry[] = [];
  // If index page is enabled, first document starts on page 3 (Cover = 1, Index = 2)
  // Otherwise, first document starts on page 2 (Cover = 1)
  let currentPageTracker = hasIndexPage ? 3 : 2;

  for (const req of requirements) {
    const fileId = matches[req.id];
    if (fileId) {
      const file = uploadedFilesMap.get(fileId);
      if (file) {
        includedDocs.push({
          serial: includedDocs.length + 1,
          req,
          file,
          startPage: currentPageTracker,
          pageCount: file.pageCount,
        });
        currentPageTracker += file.pageCount;
      }
    }
  }

  // Total pages = 1 (cover) + (1 if index page) + sum(pages)
  const totalPages =
    1 + (hasIndexPage ? 1 : 0) + includedDocs.reduce((acc, doc) => acc + doc.pageCount, 0);

  onProgress?.({
    messageEn: 'Generating cover page (English)...',
    messageBn: 'কভার পেজ তৈরি করা হচ্ছে (ইংরেজি)...',
    percent: 15,
  });

  // 2. PAGE 1: COVER PAGE (ALWAYS IN ENGLISH, A4 portrait: 595.28 x 841.89 pt)
  const A4_WIDTH = 595.28;
  const A4_HEIGHT = 841.89;
  const BAND = 34; // Reserved bottom footer band
  const coverPage = outDoc.addPage([A4_WIDTH, A4_HEIGHT]);

  const marginX = 40;
  const usableWidth = A4_WIDTH - marginX * 2; // 515.28
  let cursorY = A4_HEIGHT - 45;

  // Header accent line
  coverPage.drawRectangle({
    x: marginX,
    y: cursorY + 10,
    width: usableWidth,
    height: 4,
    color: rgb(0.12, 0.28, 0.49),
  });

  // Title
  coverPage.drawText('GOVERNMENT TENDER SUBMISSION PACKAGE', {
    x: marginX,
    y: cursorY - 14,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.35),
  });

  cursorY -= 36;

  // Metadata Grid
  const metaBoxY = cursorY - 100;
  coverPage.drawRectangle({
    x: marginX,
    y: metaBoxY,
    width: usableWidth,
    height: 100,
    color: rgb(0.97, 0.98, 0.99),
    borderColor: rgb(0.82, 0.86, 0.9),
    borderWidth: 1,
  });

  const col1X = marginX + 16;
  const col2X = marginX + usableWidth / 2 + 10;
  let metaRowY = cursorY - 24;

  const drawMetaField = (
    x: number,
    y: number,
    label: string,
    value: string,
    maxWidth: number
  ) => {
    coverPage.drawText(label, {
      x,
      y,
      size: 9,
      font: fontBold,
      color: rgb(0.3, 0.35, 0.42),
    });

    const safeValue = sanitizeWinAnsi(value);
    coverPage.drawText(safeValue, {
      x,
      y: y - 13,
      size: 10,
      font: fontRegular,
      color: rgb(0.08, 0.12, 0.18),
      maxWidth,
    });
  };

  const halfWidth = usableWidth / 2 - 26;
  drawMetaField(col1X, metaRowY, 'TENDER ID:', tender.tender_id, halfWidth);
  drawMetaField(col2X, metaRowY, 'SUBMISSION DEADLINE:', tender.submission_deadline, halfWidth);

  metaRowY -= 30;
  drawMetaField(col1X, metaRowY, 'TENDER TITLE:', tender.title, halfWidth);
  drawMetaField(col2X, metaRowY, 'PACKAGE GENERATED:', getTodayIsoDate(), halfWidth);

  metaRowY -= 30;
  drawMetaField(col1X, metaRowY, 'PROCURING ENTITY:', tender.procuring_entity, halfWidth);
  drawMetaField(col2X, metaRowY, 'BIDDER NAME:', tender.bidder, halfWidth);

  cursorY = metaBoxY - 28;

  // Table Section Header
  coverPage.drawText('INCLUDED DOCUMENTS SCHEDULE', {
    x: marginX,
    y: cursorY,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.2, 0.35),
  });

  cursorY -= 16;

  // Calculate table row height dynamically to guarantee up to 30 items fit on one page
  const tableTopY = cursorY;
  const minTableBottomY = BAND + 20;
  const availableTableHeight = tableTopY - minTableBottomY;
  const numRows = Math.max(includedDocs.length, 1);
  const headerHeight = 22;
  const usableRowsHeight = availableTableHeight - headerHeight;
  const dynamicRowHeight = Math.min(22, Math.max(13, Math.floor(usableRowsHeight / numRows)));
  const textFontSize = dynamicRowHeight < 16 ? 8 : 9;

  // Table header bar
  coverPage.drawRectangle({
    x: marginX,
    y: tableTopY - headerHeight,
    width: usableWidth,
    height: headerHeight,
    color: rgb(0.18, 0.28, 0.42),
  });

  const colSlW = 34;
  const colPageW = 85;
  const colTitleW = usableWidth - colSlW - colPageW;

  const headerTextY = tableTopY - headerHeight + (headerHeight - 9) / 2 + 1;
  coverPage.drawText('#', {
    x: marginX + 10,
    y: headerTextY,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('Document Description', {
    x: marginX + colSlW + 10,
    y: headerTextY,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  coverPage.drawText('Starting Page', {
    x: marginX + colSlW + colTitleW + 10,
    y: headerTextY,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  let rowCurrentY = tableTopY - headerHeight;

  if (includedDocs.length === 0) {
    rowCurrentY -= 25;
    coverPage.drawText('No documents matched for submission.', {
      x: marginX + 12,
      y: rowCurrentY + 8,
      size: 9,
      font: fontRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  } else {
    for (let i = 0; i < includedDocs.length; i++) {
      const entry = includedDocs[i];
      const isEven = i % 2 === 0;
      const rowY = rowCurrentY - dynamicRowHeight;

      coverPage.drawRectangle({
        x: marginX,
        y: rowY,
        width: usableWidth,
        height: dynamicRowHeight,
        color: isEven ? rgb(1, 1, 1) : rgb(0.96, 0.97, 0.99),
        borderColor: rgb(0.88, 0.9, 0.93),
        borderWidth: 0.5,
      });

      const cellTextY = rowY + (dynamicRowHeight - textFontSize) / 2 + 1;

      coverPage.drawText(String(entry.serial), {
        x: marginX + 10,
        y: cellTextY,
        size: textFontSize,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.3),
      });

      const safeTitle = sanitizeWinAnsi(entry.req.title_en);
      coverPage.drawText(safeTitle, {
        x: marginX + colSlW + 10,
        y: cellTextY,
        size: textFontSize,
        font: fontRegular,
        color: rgb(0.1, 0.15, 0.2),
        maxWidth: colTitleW - 20,
      });

      const pageStr = `Page ${entry.startPage} of ${totalPages}`;
      coverPage.drawText(pageStr, {
        x: marginX + colSlW + colTitleW + 10,
        y: cellTextY,
        size: textFontSize,
        font: fontBold,
        color: rgb(0.12, 0.28, 0.49),
      });

      rowCurrentY = rowY;
    }
  }

  // Cover page footer (Page 1)
  drawPageFooter(coverPage, tender.tender_id, 1, totalPages, A4_WIDTH, fontRegular);

  // 2B. OPTIONAL PAGE 2: BILINGUAL INDEX PAGE WITH BANGLA TITLES (Feature 3 & 6)
  if (hasIndexPage) {
    onProgress?.({
      messageEn: 'Generating bilingual index page with Bangla typography...',
      messageBn: 'বাংলা টাইপোগ্রাফিসহ দ্বিভাষিক সূচিপত্র পৃষ্ঠা তৈরি হচ্ছে...',
      percent: 22,
    });

    const indexPage = outDoc.addPage([A4_WIDTH, A4_HEIGHT]);
    let indexCursorY = A4_HEIGHT - 45;

    // Index header
    indexPage.drawRectangle({
      x: marginX,
      y: indexCursorY + 10,
      width: usableWidth,
      height: 4,
      color: rgb(0.12, 0.28, 0.49),
    });

    indexPage.drawText('TABLE OF CONTENTS', {
      x: marginX,
      y: indexCursorY - 14,
      size: 16,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.35),
    });

    indexPage.drawText('Submission Document Index with Bilingual Names', {
      x: marginX,
      y: indexCursorY - 30,
      size: 10,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.5),
    });

    indexCursorY -= 48;

    // Render bilingual table header
    const idxHeaderH = 22;
    indexPage.drawRectangle({
      x: marginX,
      y: indexCursorY - idxHeaderH,
      width: usableWidth,
      height: idxHeaderH,
      color: rgb(0.18, 0.28, 0.42),
    });

    const idxColSlW = 30;
    const idxColPageW = 75;
    const idxColContentW = (usableWidth - idxColSlW - idxColPageW) / 2;

    const idxHeadTextY = indexCursorY - idxHeaderH + (idxHeaderH - 9) / 2 + 1;
    indexPage.drawText('#', { x: marginX + 8, y: idxHeadTextY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    indexPage.drawText('Document (English)', { x: marginX + idxColSlW + 8, y: idxHeadTextY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    indexPage.drawText('Document (Bangla)', { x: marginX + idxColSlW + idxColContentW + 8, y: idxHeadTextY, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    indexPage.drawText('Start Page', { x: marginX + idxColSlW + idxColContentW * 2 + 8, y: idxHeadTextY, size: 9, font: fontBold, color: rgb(1, 1, 1) });

    let idxRowY = indexCursorY - idxHeaderH;
    const idxRowH = Math.min(24, Math.max(16, Math.floor((indexCursorY - BAND - 40) / Math.max(includedDocs.length, 1))));

    for (let i = 0; i < includedDocs.length; i++) {
      const entry = includedDocs[i];
      const isEven = i % 2 === 0;
      const currentY = idxRowY - idxRowH;

      indexPage.drawRectangle({
        x: marginX,
        y: currentY,
        width: usableWidth,
        height: idxRowH,
        color: isEven ? rgb(1, 1, 1) : rgb(0.96, 0.97, 0.99),
        borderColor: rgb(0.88, 0.9, 0.93),
        borderWidth: 0.5,
      });

      const cellTextY = currentY + (idxRowH - 9) / 2 + 1;

      // Sl
      indexPage.drawText(String(entry.serial), {
        x: marginX + 8,
        y: cellTextY,
        size: 9,
        font: fontBold,
        color: rgb(0.2, 0.25, 0.3),
      });

      // English
      indexPage.drawText(sanitizeWinAnsi(entry.req.title_en), {
        x: marginX + idxColSlW + 8,
        y: cellTextY,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.1, 0.15, 0.2),
        maxWidth: idxColContentW - 12,
      });

      // Bangla rendered via browser canvas text shaping (Feature 6)
      const bnText = entry.req.title_bn || entry.req.title_en;
      try {
        const bnPng = await renderBanglaTextToPng(bnText, 20, '#0f172a');
        if (bnPng) {
          const embeddedPng = await outDoc.embedPng(bnPng.bytes);
          const maxPngW = idxColContentW - 12;
          const scaleRatio = Math.min(1, maxPngW / bnPng.width, (idxRowH - 4) / bnPng.height);
          const drawW = bnPng.width * scaleRatio;
          const drawH = bnPng.height * scaleRatio;
          const drawY = currentY + (idxRowH - drawH) / 2;

          indexPage.drawImage(embeddedPng, {
            x: marginX + idxColSlW + idxColContentW + 8,
            y: drawY,
            width: drawW,
            height: drawH,
          });
        } else {
          // Fallback if canvas rendering fails
          indexPage.drawText(sanitizeWinAnsi(entry.req.title_en), {
            x: marginX + idxColSlW + idxColContentW + 8,
            y: cellTextY,
            size: 8,
            font: fontRegular,
            color: rgb(0.4, 0.45, 0.5),
          });
        }
      } catch {
        indexPage.drawText(sanitizeWinAnsi(entry.req.title_en), {
          x: marginX + idxColSlW + idxColContentW + 8,
          y: cellTextY,
          size: 8,
          font: fontRegular,
          color: rgb(0.4, 0.45, 0.5),
        });
      }

      // Page
      indexPage.drawText(`Page ${entry.startPage}`, {
        x: marginX + idxColSlW + idxColContentW * 2 + 8,
        y: cellTextY,
        size: 9,
        font: fontBold,
        color: rgb(0.12, 0.28, 0.49),
      });

      idxRowY = currentY;
    }

    // Index page footer (Page 2 of totalPages)
    drawPageFooter(indexPage, tender.tender_id, 2, totalPages, A4_WIDTH, fontRegular);
  }

  // 3. PREPARE SEAL / SIGNATURE (Feature 7)
  let embeddedSeal: any = null;
  const sealConfig = options.sealConfig;

  if (sealConfig && sealConfig.enabled && sealConfig.imageDataUrl) {
    try {
      // Decode data URL to bytes
      const response = await fetch(sealConfig.imageDataUrl);
      const sealBlob = await response.blob();
      const sealBuffer = await sealBlob.arrayBuffer();
      embeddedSeal = await outDoc.embedPng(new Uint8Array(sealBuffer));
    } catch (sealErr) {
      console.warn('Failed to embed seal image, proceeding without seal', sealErr);
    }
  }

  // 4. ATTACH MATCHED DOCUMENTS
  let processedFiles = 0;
  let pageCounter = hasIndexPage ? 3 : 2;

  for (const entry of includedDocs) {
    const file = entry.file;
    const progressPercent = Math.min(
      95,
      25 + Math.floor((processedFiles / Math.max(includedDocs.length, 1)) * 70)
    );

    onProgress?.({
      messageEn: `Merging document ${processedFiles + 1} of ${includedDocs.length}: ${file.name}...`,
      messageBn: `নথি সংযুক্ত করা হচ্ছে (${processedFiles + 1}/${includedDocs.length}): ${file.name}...`,
      percent: progressPercent,
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const srcDoc = await PDFDocument.load(file.buffer, { ignoreEncryption: false });
    const srcPages = srcDoc.getPages();

    for (const srcPage of srcPages) {
      if (!srcPage.node.Contents()) {
        srcPage.node.set(PDFName.of('Contents'), srcDoc.context.stream(''));
      }
    }

    const embeddedPages = await outDoc.embedPages(srcPages);

    // Determine if seal applies to this document
    const applySealToDoc =
      embeddedSeal &&
      (sealConfig?.scope === 'all' ||
        (sealConfig?.selectedDocIds && sealConfig.selectedDocIds.includes(entry.req.id)));

    for (let pIdx = 0; pIdx < srcPages.length; pIdx++) {
      const srcPage = srcPages[pIdx];
      const embedded = embeddedPages[pIdx];

      const pageRotation = srcPage.getRotation().angle;
      const normalizedRotation = (((pageRotation % 360) + 360) % 360);

      const box = srcPage.node.CropBox() ? srcPage.getCropBox() : srcPage.getMediaBox();
      const w0 = box.width;
      const h0 = box.height;

      let destPageWidth = w0;
      let destPageHeight = h0 + BAND;
      let drawX = -box.x;
      let drawY = BAND - box.y;
      let rotateArg: any = undefined;

      if (normalizedRotation === 90) {
        destPageWidth = h0;
        destPageHeight = w0 + BAND;
        rotateArg = degrees(-90);
        drawX = -box.y;
        drawY = BAND + w0 + box.x;
      } else if (normalizedRotation === 180) {
        destPageWidth = w0;
        destPageHeight = h0 + BAND;
        rotateArg = degrees(180);
        drawX = w0 + box.x;
        drawY = BAND + h0 + box.y;
      } else if (normalizedRotation === 270) {
        destPageWidth = h0;
        destPageHeight = w0 + BAND;
        rotateArg = degrees(90);
        drawX = h0 + box.y;
        drawY = BAND - box.x;
      }

      const newPage = outDoc.addPage([destPageWidth, destPageHeight]);

      const drawOptions: any = {
        x: drawX,
        y: drawY,
      };
      if (rotateArg !== undefined) {
        drawOptions.rotate = rotateArg;
      }

      newPage.drawPage(embedded, drawOptions);

      // Check if seal applies to this specific page of document
      if (applySealToDoc && sealConfig) {
        let shouldApplyToPage = false;
        const page1Based = pIdx + 1;
        const totalDocPages = srcPages.length;

        if (sealConfig.pageScope === 'all') {
          shouldApplyToPage = true;
        } else if (sealConfig.pageScope === 'first' && page1Based === 1) {
          shouldApplyToPage = true;
        } else if (sealConfig.pageScope === 'last' && page1Based === totalDocPages) {
          shouldApplyToPage = true;
        } else if (sealConfig.pageScope === 'custom' && sealConfig.customPages) {
          // Parse e.g. "1, 3-4"
          const parts = sealConfig.customPages.split(',').map((s) => s.trim());
          for (const part of parts) {
            if (part.includes('-')) {
              const [start, end] = part.split('-').map((n) => parseInt(n, 10));
              if (page1Based >= start && page1Based <= end) shouldApplyToPage = true;
            } else if (parseInt(part, 10) === page1Based) {
              shouldApplyToPage = true;
            }
          }
        }

        if (shouldApplyToPage) {
          // Calculate seal dimensions maintaining aspect ratio
          const sealW = Math.min(sealConfig.width || 100, destPageWidth * 0.4);
          const sealRatio = embeddedSeal.height / embeddedSeal.width;
          const sealH = sealW * sealRatio;

          // Position calculation: MUST STAY IN CONTENT AREA AND NEVER COVER FOOTER BAND (y >= 34 pt)
          let sealX = destPageWidth - sealW - 25; // default bottom-right
          let sealY = BAND + 15; // default bottom-right

          if (sealConfig.position === 'bottom-left') {
            sealX = 25;
            sealY = BAND + 15;
          } else if (sealConfig.position === 'top-right') {
            sealX = destPageWidth - sealW - 25;
            sealY = destPageHeight - sealH - 25;
          } else if (sealConfig.position === 'center') {
            sealX = (destPageWidth - sealW) / 2;
            sealY = BAND + (destPageHeight - BAND - sealH) / 2;
          } else if (sealConfig.position === 'custom') {
            if (sealConfig.customX !== undefined) sealX = Math.max(10, Math.min(destPageWidth - sealW - 10, sealConfig.customX));
            if (sealConfig.customY !== undefined) sealY = Math.max(BAND + 5, Math.min(destPageHeight - sealH - 10, sealConfig.customY));
          }

          // Strict boundary enforcement: NEVER cover footer band (y >= BAND)
          sealY = Math.max(BAND + 2, sealY);

          newPage.drawImage(embeddedSeal, {
            x: sealX,
            y: sealY,
            width: sealW,
            height: sealH,
            opacity: 0.92,
          });
        }
      }

      // Draw footer inside reserved 34pt band
      drawPageFooter(
        newPage,
        tender.tender_id,
        pageCounter,
        totalPages,
        destPageWidth,
        fontRegular
      );

      pageCounter++;
    }

    processedFiles++;
  }

  onProgress?.({
    messageEn: 'Finalizing package bytes and metadata...',
    messageBn: 'প্যাকেজের বাইটস এবং মেটাডাটা চূড়ান্ত করা হচ্ছে...',
    percent: 98,
  });

  const pdfBytes = await outDoc.save();

  onProgress?.({
    messageEn: 'Package created successfully!',
    messageBn: 'প্যাকেজ সফলভাবে তৈরি হয়েছে!',
    percent: 100,
  });

  return {
    pdfBytes,
    totalPages,
  };
}

/**
 * Draws the required footer on any page inside the reserved 34pt bottom band.
 * Exact format: <tender_id> | Page X of Y
 */
function drawPageFooter(
  page: any,
  tenderId: string,
  pageIndex: number,
  totalPages: number,
  pageWidth: number,
  font: any
) {
  const BAND = 34;

  page.drawLine({
    start: { x: 0, y: BAND },
    end: { x: pageWidth, y: BAND },
    thickness: 0.5,
    color: rgb(0.85, 0.88, 0.92),
  });

  const cleanTenderId = sanitizeWinAnsi(tenderId);
  const footerText = `${cleanTenderId} | Page ${pageIndex} of ${totalPages}`;

  const fontSize = pageWidth < 300 ? Math.min(10, Math.max(6, Math.floor((pageWidth / 300) * 10))) : 10;
  const textWidth = font.widthOfTextAtSize(footerText, fontSize);
  const textX = Math.max(10, (pageWidth - textWidth) / 2);
  const textY = 12;

  page.drawText(footerText, {
    x: textX,
    y: textY,
    size: fontSize,
    font,
    color: rgb(0.18, 0.22, 0.28),
  });
}
