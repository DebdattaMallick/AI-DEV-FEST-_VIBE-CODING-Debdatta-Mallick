import { RequirementsData, Requirement, TenderInfo } from '../types';
import { isValidISODate } from './status';

export interface ParseRequirementsResult {
  success: boolean;
  data?: RequirementsData;
  errorEn?: string;
  errorBn?: string;
}

function parseBooleanLenient(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'number') return val !== 0;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === '1' || s === 'yes';
  }
  return false;
}

export function parseRequirementsJson(jsonString: string): ParseRequirementsResult {
  let raw: unknown;
  try {
    raw = JSON.parse(jsonString);
  } catch (err) {
    return {
      success: false,
      errorEn: `Invalid JSON syntax: ${err instanceof Error ? err.message : 'failed to parse JSON'}.`,
      errorBn: `অকার্যকর JSON সিনট্যাক্স: ${err instanceof Error ? err.message : 'JSON পার্স করতে ব্যর্থ'}।`,
    };
  }

  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      success: false,
      errorEn: 'Root of requirements file must be a JSON object containing "tender" and "requirements".',
      errorBn: 'রিকোয়ারমেন্ট ফাইলের মূল অংশটি "tender" এবং "requirements" সম্বলিত একটি JSON অবজেক্ট হতে হবে।',
    };
  }

  const rawObj = raw as Record<string, unknown>;

  // Validate tender object
  if (!rawObj.tender || typeof rawObj.tender !== 'object' || Array.isArray(rawObj.tender)) {
    return {
      success: false,
      errorEn: 'Missing or invalid "tender" object in requirements.json.',
      errorBn: 'requirements.json-এ অনুপস্থিত বা অকার্যকর "tender" অবজেক্ট।',
    };
  }

  const rawTender = rawObj.tender as Record<string, unknown>;

  const tender_id = typeof rawTender.tender_id === 'string' ? rawTender.tender_id.trim() : '';
  const title = typeof rawTender.title === 'string' ? rawTender.title.trim() : '';
  const procuring_entity = typeof rawTender.procuring_entity === 'string' ? rawTender.procuring_entity.trim() : '';
  const bidder = typeof rawTender.bidder === 'string' ? rawTender.bidder.trim() : '';
  const submission_deadline = typeof rawTender.submission_deadline === 'string' ? rawTender.submission_deadline.trim() : '';

  if (!tender_id) {
    return {
      success: false,
      errorEn: 'Field "tender.tender_id" is required and cannot be empty.',
      errorBn: '"tender.tender_id" ক্ষেত্রটি আবশ্যক এবং ফাঁকা রাখা যাবে না।',
    };
  }
  if (!title) {
    return {
      success: false,
      errorEn: 'Field "tender.title" is required and cannot be empty.',
      errorBn: '"tender.title" ক্ষেত্রটি আবশ্যক এবং ফাঁকা রাখা যাবে না।',
    };
  }
  if (!procuring_entity) {
    return {
      success: false,
      errorEn: 'Field "tender.procuring_entity" is required and cannot be empty.',
      errorBn: '"tender.procuring_entity" ক্ষেত্রটি আবশ্যক এবং ফাঁকা রাখা যাবে না।',
    };
  }
  if (!bidder) {
    return {
      success: false,
      errorEn: 'Field "tender.bidder" is required and cannot be empty.',
      errorBn: '"tender.bidder" ক্ষেত্রটি আবশ্যক এবং ফাঁকা রাখা যাবে না।',
    };
  }
  if (!submission_deadline) {
    return {
      success: false,
      errorEn: 'Field "tender.submission_deadline" is required.',
      errorBn: '"tender.submission_deadline" ক্ষেত্রটি আবশ্যক।',
    };
  }
  if (!isValidISODate(submission_deadline)) {
    return {
      success: false,
      errorEn: `Field "tender.submission_deadline" ("${submission_deadline}") is not a valid calendar date in YYYY-MM-DD format.`,
      errorBn: `"tender.submission_deadline" ("${submission_deadline}") YYYY-MM-DD ফরম্যাটে একটি বৈধ ক্যালেন্ডার তারিখ নয়।`,
    };
  }

  const tender: TenderInfo = {
    tender_id,
    title,
    procuring_entity,
    bidder,
    submission_deadline,
  };

  // Validate requirements array
  if (!Array.isArray(rawObj.requirements)) {
    return {
      success: false,
      errorEn: 'Field "requirements" must be an array of required document objects.',
      errorBn: '"requirements" ক্ষেত্রটি প্রয়োজনীয় নথি অবজেক্টের একটি অ্যারে হতে হবে।',
    };
  }

  if (rawObj.requirements.length === 0) {
    return {
      success: false,
      errorEn: 'Field "requirements" must contain at least one requirement.',
      errorBn: '"requirements" তালিকায় অন্তত একটি প্রয়োজনীয় নথি থাকতে হবে।',
    };
  }

  const seenIds = new Set<string>();
  const parsedRequirements: Requirement[] = [];

  for (let index = 0; index < rawObj.requirements.length; index++) {
    const item = rawObj.requirements[index];
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return {
        success: false,
        errorEn: `Requirement at index ${index} is not an object.`,
        errorBn: `ইনডেক্স ${index}-এ থাকা প্রয়োজনীয় নথিটি একটি অবজেক্ট নয়।`,
      };
    }

    const reqObj = item as Record<string, unknown>;
    const id = reqObj.id !== undefined && reqObj.id !== null ? String(reqObj.id).trim() : '';

    if (!id) {
      return {
        success: false,
        errorEn: `Requirement at index ${index} is missing an "id".`,
        errorBn: `ইনডেক্স ${index}-এ থাকা প্রয়োজনীয় নথির কোনো "id" নেই।`,
      };
    }

    if (seenIds.has(id)) {
      return {
        success: false,
        errorEn: `Duplicate requirement id "${id}" found at index ${index}. IDs must be unique.`,
        errorBn: `ইনডেক্স ${index}-এ ডুপ্লিকেট রিকোয়ারমেন্ট আইডি "${id}" পাওয়া গেছে। আইডি অবশ্যই অনন্য হতে হবে।`,
      };
    }
    seenIds.add(id);

    const title_en = reqObj.title_en !== undefined && reqObj.title_en !== null ? String(reqObj.title_en).trim() : '';
    if (!title_en) {
      return {
        success: false,
        errorEn: `Requirement "${id}" is missing "title_en".`,
        errorBn: `নথি "${id}"-এ "title_en" নেই।`,
      };
    }

    // Lenient title_bn: if missing or empty, fall back to title_en
    const rawTitleBn = reqObj.title_bn !== undefined && reqObj.title_bn !== null ? String(reqObj.title_bn).trim() : '';
    const title_bn = rawTitleBn || title_en;

    // order
    let orderNum = index + 1;
    if (typeof reqObj.order === 'number' && !isNaN(reqObj.order)) {
      orderNum = reqObj.order;
    } else if (typeof reqObj.order === 'string' && !isNaN(Number(reqObj.order))) {
      orderNum = Number(reqObj.order);
    }

    const mandatory = parseBooleanLenient(reqObj.mandatory);
    const has_expiry = parseBooleanLenient(reqObj.has_expiry);

    parsedRequirements.push({
      id,
      order: orderNum,
      title_en,
      title_bn,
      mandatory,
      has_expiry,
    });
  }

  // Stable sort by numeric order ascending; ties preserve original array order
  // Array.prototype.sort in modern JS/ES2019+ is guaranteed stable
  parsedRequirements.sort((a, b) => a.order - b.order);

  return {
    success: true,
    data: {
      tender,
      requirements: parsedRequirements,
    },
  };
}
