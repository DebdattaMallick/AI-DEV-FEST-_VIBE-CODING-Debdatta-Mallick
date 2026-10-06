import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { validateAndLoadPdf } from './pdfInfo';
import { UploadedFile } from '../types';

interface SampleDocSpec {
  name: string;
  title: string;
  subtitle: string;
  pageCount: number;
  duplicateOfName?: string;
}

export async function generateSamplePdfFiles(): Promise<UploadedFile[]> {
  const specs: SampleDocSpec[] = [
    {
      name: 'trade_license_2025.pdf',
      title: 'TRADE LICENSE (2024-2025)',
      subtitle: 'Issued: 2024-07-01 | Expiry Date: 2025-06-30',
      pageCount: 1,
    },
    {
      name: 'trade_license_2026.pdf',
      title: 'TRADE LICENSE (RENEWED 2026-2027)',
      subtitle: 'Issued: 2026-07-01 | Expiry Date: 2027-06-30',
      pageCount: 1,
    },
    {
      name: 'tin_certificate.pdf',
      title: 'TAX IDENTIFICATION NUMBER (TIN) CERTIFICATE',
      subtitle: 'National Board of Revenue - Taxpayer: Example Company Ltd.',
      pageCount: 1,
    },
    {
      name: 'vat_registration.pdf',
      title: 'VALUE ADDED TAX (VAT) REGISTRATION CERTIFICATE',
      subtitle: 'BIN: 001928374-0102 - Valid & Active',
      pageCount: 1,
    },
    {
      name: 'bank_solvency_letter.pdf',
      title: 'BANK SOLVENCY CERTIFICATE',
      subtitle: 'Prime Commercial Bank Ltd. | Expiry: 2026-12-31',
      pageCount: 1,
    },
    {
      name: 'experience_cert.pdf',
      title: 'COMPLETION & EXPERIENCE CERTIFICATE',
      subtitle: 'Supply of Server & Networking Equipment to Directorate',
      pageCount: 2,
    },
    {
      name: 'experience_cert__1_.pdf',
      title: 'COMPLETION & EXPERIENCE CERTIFICATE', // Same content to test duplicate SHA-256
      subtitle: 'Supply of Server & Networking Equipment to Directorate',
      pageCount: 2,
      duplicateOfName: 'experience_cert.pdf',
    },
    {
      name: 'scan_0042.pdf',
      title: 'SIGNED TENDER DECLARATION & INTEGRITY PACT',
      subtitle: 'Scanned document with official signature and stamp',
      pageCount: 1,
    },
    {
      name: 'technical_proposal.pdf',
      title: 'TECHNICAL PROPOSAL & SPECIFICATIONS COMPLIANCE',
      subtitle: 'Lot 1: High-Performance Workstations & Networking Gear',
      pageCount: 3,
    },
    {
      name: '01_financial_proposal.pdf',
      title: 'FINANCIAL PROPOSAL & BILL OF QUANTITIES (BOQ)',
      subtitle: 'Grand Total Price Quotation and Unit Breakdown',
      pageCount: 2,
    },
  ];

  const generatedFiles: UploadedFile[] = [];
  const bufferCache = new Map<string, ArrayBuffer>();

  for (const spec of specs) {
    let buffer: ArrayBuffer;

    if (spec.duplicateOfName && bufferCache.has(spec.duplicateOfName)) {
      // Re-use exact same byte buffer so SHA-256 is 100% identical
      buffer = bufferCache.get(spec.duplicateOfName)!.slice(0);
    } else {
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      for (let p = 1; p <= spec.pageCount; p++) {
        const page = doc.addPage([595.28, 841.89]);
        const width = 595.28;
        const height = 841.89;

        // Border
        page.drawRectangle({
          x: 40,
          y: 40,
          width: width - 80,
          height: height - 80,
          borderColor: rgb(0.2, 0.35, 0.55),
          borderWidth: 1.5,
          color: rgb(0.99, 0.99, 1),
        });

        // Header band
        page.drawRectangle({
          x: 40,
          y: height - 120,
          width: width - 80,
          height: 80,
          color: rgb(0.12, 0.25, 0.45),
        });

        page.drawText(spec.title, {
          x: 60,
          y: height - 85,
          size: 15,
          font: fontBold,
          color: rgb(1, 1, 1),
        });

        page.drawText(`${spec.subtitle} (Page ${p} of ${spec.pageCount})`, {
          x: 60,
          y: height - 105,
          size: 10,
          font,
          color: rgb(0.85, 0.9, 0.98),
        });

        // Body content simulation
        let bodyY = height - 160;
        page.drawText(`Document File: ${spec.name}`, {
          x: 60,
          y: bodyY,
          size: 11,
          font: fontBold,
          color: rgb(0.1, 0.1, 0.1),
        });

        bodyY -= 24;
        page.drawText('This document is certified for tender submission by Debdatta.', {
          x: 60,
          y: bodyY,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });

        bodyY -= 20;
        page.drawText('Bidder: Example Company Ltd. | Tender ID: T-2026-0417', {
          x: 60,
          y: bodyY,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });

        // Watermark stamp
        page.drawRectangle({
          x: width - 240,
          y: 60,
          width: 180,
          height: 60,
          borderColor: rgb(0.15, 0.45, 0.25),
          borderWidth: 1,
          color: rgb(0.95, 0.98, 0.95),
        });
        page.drawText('OFFICIAL SEAL & SIGNATURE', {
          x: width - 230,
          y: 95,
          size: 8,
          font: fontBold,
          color: rgb(0.15, 0.45, 0.25),
        });
        page.drawText('VERIFIED TENDER ATTACHMENT', {
          x: width - 230,
          y: 80,
          size: 7,
          font,
          color: rgb(0.2, 0.5, 0.3),
        });
      }

      const bytes = await doc.save();
      buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      bufferCache.set(spec.name, buffer);
    }

    const dummyFile = new File([buffer], spec.name, { type: 'application/pdf' });
    const result = await validateAndLoadPdf(dummyFile, generatedFiles.length, 0);
    if (result.success && result.file) {
      generatedFiles.push(result.file);
    }
  }

  return generatedFiles;
}
