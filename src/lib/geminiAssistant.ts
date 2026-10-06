import { Language } from './i18n';
import { Requirement, TenderInfo, UploadedFile } from '../types';
import { getStatusDetail } from './status';

export interface ChecklistExplanationRequest {
  apiKey: string;
  tender: TenderInfo | null;
  requirements: Requirement[];
  uploadedFiles: UploadedFile[];
  matches: Record<string, string | null>;
  expiryDates: Record<string, string>;
  language: Language;
}

export async function explainChecklistWithGemini({
  apiKey,
  tender,
  requirements,
  uploadedFiles,
  matches,
  expiryDates,
  language,
}: ChecklistExplanationRequest): Promise<string> {
  if (!apiKey || !apiKey.trim()) {
    throw new Error(
      language === 'bn'
        ? 'অনুগ্রহ করে একটি বৈধ Gemini API Key প্রদান করুন।'
        : 'Please enter a valid Gemini API Key.'
    );
  }

  const fileMap = new Map<string, UploadedFile>(uploadedFiles.map((f) => [f.id, f]));
  const deadline = tender?.submission_deadline || '';

  // Prepare metadata-only summary of the checklist (NEVER document content)
  const checklistData = requirements.map((req) => {
    const fileId = matches[req.id];
    const file = fileId ? fileMap.get(fileId) : null;
    const expiry = expiryDates[req.id] || '';
    const detail = getStatusDetail(req, file, expiry, deadline);

    return {
      order: req.order,
      titleEn: req.title_en,
      titleBn: req.title_bn,
      mandatory: req.mandatory,
      hasExpiry: req.has_expiry,
      matchedFileName: file ? file.name : null,
      expiryDate: expiry || null,
      status: detail.status,
      statusMessage: language === 'bn' ? detail.messageBn : detail.messageEn,
    };
  });

  const promptText = `
You are an expert government tender submission assistant reviewing a bidder's document checklist.
Analyze the following tender metadata and checklist.
Provide friendly, actionable, non-technical guidance explaining:
1. Overall readiness summary (what percentage is ready and whether the package currently meets submission rules).
2. Immediate priority fixes needed (highlight missing mandatory files and expired documents in order of urgency).
3. Practical advice for non-technical office staff on what to do next to prepare a valid package before the deadline.

Important rules:
- Format your response cleanly with clear bullet points.
- Respond STRICTLY in ${language === 'bn' ? 'Bengali (বাংলা)' : 'English'}.
- Tone must be calm, supportive, professional, and clear.

Tender Information:
- Tender ID: ${tender?.tender_id || 'Unknown'}
- Title: ${tender?.title || 'Unknown'}
- Submission Deadline: ${tender?.submission_deadline || 'Unknown'}
- Bidder: ${tender?.bidder || 'Unknown'}

Document Checklist Status:
${JSON.stringify(checklistData, null, 2)}
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
      apiKey.trim()
    )}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `API error (${response.status})`;
      throw new Error(
        language === 'bn'
          ? `Gemini API ত্রুটি: ${errMsg}। আপনার কী সঠিক কিনা যাচাই করুন।`
          : `Gemini API error: ${errMsg}. Please verify your API key.`
      );
    }

    const data = await response.json();
    const candidateText =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      (language === 'bn' ? 'কোনো প্রতিক্রিয়া পাওয়া যায়নি।' : 'No response generated.');

    return candidateText;
  } catch (err: any) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error(
        language === 'bn'
          ? 'নেটওয়ার্ক সংযোগ সমস্যা। ইন্টারনেট সংযোগ যাচাই করুন।'
          : 'Network error. Please check your internet connection.'
      );
    }
    throw err;
  }
}
