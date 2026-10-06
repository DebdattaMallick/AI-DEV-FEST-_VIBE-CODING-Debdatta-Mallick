/**
 * Pure status engine for Tender Document Package Builder.
 * Recomputed purely from state without side-effects.
 */

import { DocumentStatus, DocumentStatusDetail, Requirement, UploadedFile } from '../types';

/**
 * Validates whether a string is a real calendar date in YYYY-MM-DD format.
 * Rejects nonexistent dates like 2026-02-30 or 2025-04-31.
 */
export function isValidISODate(dateStr: string | null | undefined): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (year < 1900 || year > 2199) return false;
  if (month < 1 || month > 12) return false;

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return day >= 1 && day <= daysInMonth[month - 1];
}

/**
 * Pure function: Computes the document status.
 *
 * Rules:
 * - MISSING: mandatory=true and no file matched. BLOCKS.
 * - EXPIRY_NEEDED: has_expiry=true, file matched, no valid expiry date entered. BLOCKS.
 * - EXPIRED: expiry date is BEFORE submission deadline. BLOCKS.
 * - NOT_PROVIDED: optional and no file matched. Does not block.
 * - OK: file matched and (if has_expiry) expiry date is ON OR AFTER submission deadline. Does not block.
 */
export function getStatus(
  req: Requirement,
  file: UploadedFile | null | undefined,
  expiry: string | undefined,
  deadline: string
): DocumentStatus {
  if (!file) {
    return req.mandatory ? 'MISSING' : 'NOT_PROVIDED';
  }
  if (!req.has_expiry) {
    return 'OK';
  }
  const cleanExpiry = expiry?.trim() || '';
  if (!isValidISODate(cleanExpiry)) {
    return 'EXPIRY_NEEDED';
  }
  // YYYY-MM-DD ISO strings compare lexicographically without timezone parsing issues
  return cleanExpiry < deadline ? 'EXPIRED' : 'OK';
}

/**
 * Returns detailed status information including labels, localized explanations, and blocking flag.
 */
export function getStatusDetail(
  req: Requirement,
  file: UploadedFile | null | undefined,
  expiry: string | undefined,
  deadline: string
): DocumentStatusDetail {
  const status = getStatus(req, file, expiry, deadline);
  const cleanExpiry = expiry?.trim() || '';

  switch (status) {
    case 'MISSING':
      return {
        status,
        labelEn: 'Missing',
        labelBn: 'অনুপস্থিত',
        messageEn: 'No file chosen yet. This document is required.',
        messageBn: 'এখনও কোনো ফাইল নির্বাচন করা হয়নি। এই নথিটি বাধ্যতামূলক।',
        blocks: true,
      };

    case 'EXPIRY_NEEDED':
      return {
        status,
        labelEn: 'Expiry date needed',
        labelBn: 'মেয়াদের তারিখ প্রয়োজন',
        messageEn: 'File attached. Please enter a valid expiry date (YYYY-MM-DD).',
        messageBn: 'ফাইল সংযুক্ত হয়েছে। অনুগ্রহ করে সঠিক মেয়াদের তারিখ (YYYY-MM-DD) লিখুন।',
        blocks: true,
      };

    case 'EXPIRED':
      return {
        status,
        labelEn: 'Expired',
        labelBn: 'মেয়াদোত্তীর্ণ',
        messageEn: `Expired on ${cleanExpiry}. The submission deadline is ${deadline}. Choose a newer document.`,
        messageBn: `${cleanExpiry} তারিখে মেয়াদ উত্তীর্ণ হয়েছে। জমার শেষ তারিখ ${deadline}। একটি নতুন নথি নির্বাচন করুন।`,
        blocks: true,
      };

    case 'NOT_PROVIDED':
      return {
        status,
        labelEn: 'Not provided',
        labelBn: 'প্রদান করা হয়নি',
        messageEn: 'Optional document not provided. Can be skipped.',
        messageBn: 'ঐচ্ছিক নথি প্রদান করা হয়নি। এটি বাদ দেওয়া যেতে পারে।',
        blocks: false,
      };

    case 'OK':
      if (req.has_expiry && cleanExpiry) {
        return {
          status,
          labelEn: 'OK',
          labelBn: 'ঠিক আছে',
          messageEn: `Valid until ${cleanExpiry}. Meets or exceeds submission deadline (${deadline}).`,
          messageBn: `${cleanExpiry} পর্যন্ত বৈধ। জমার শেষ তারিখ (${deadline}) পূরণ করেছে।`,
          blocks: false,
        };
      }
      return {
        status,
        labelEn: 'OK',
        labelBn: 'ঠিক আছে',
        messageEn: 'Document attached and ready for package.',
        messageBn: 'নথিটি সংযুক্ত করা হয়েছে এবং প্যাকেজের জন্য প্রস্তুত।',
        blocks: false,
      };
  }
}
