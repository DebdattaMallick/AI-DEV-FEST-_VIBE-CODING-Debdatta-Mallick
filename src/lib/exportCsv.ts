import { Language, i18nDict } from './i18n';
import { getStatusDetail } from './status';
import { Requirement, TenderInfo, UploadedFile } from '../types';

export function exportChecklistToCsv(
  tender: TenderInfo | null,
  requirements: Requirement[],
  files: UploadedFile[],
  matches: Record<string, string | null>,
  expiryDates: Record<string, string>,
  language: Language
) {
  const t = i18nDict[language];
  const fileMap = new Map<string, UploadedFile>(files.map((f) => [f.id, f]));
  const deadline = tender?.submission_deadline || '';

  const headers = language === 'bn'
    ? ['ক্রম', 'প্রয়োজনীয় নথি (বাংলা)', 'প্রয়োজনীয় নথি (ইংরেজি)', 'বাধ্যতামূলক?', 'সংযুক্ত ফাইল', 'পৃষ্ঠা সংখ্যা', 'মেয়াদ শেষের তারিখ', 'যাচাইকরণের অবস্থা', 'বিস্তারিত বার্তা']
    : ['Order', 'Document Title (EN)', 'Document Title (BN)', 'Mandatory?', 'Attached File', 'Pages', 'Expiry Date', 'Status', 'Details'];

  const rows: string[][] = [headers];

  for (const req of requirements) {
    const fileId = matches[req.id];
    const file = fileId ? fileMap.get(fileId) : null;
    const expiry = expiryDates[req.id] || '';
    const detail = getStatusDetail(req, file, expiry, deadline);

    const orderStr = String(req.order);
    const titleEn = req.title_en;
    const titleBn = req.title_bn || req.title_en;
    const isMandatory = req.mandatory
      ? (language === 'bn' ? 'বাধ্যতামূলক' : 'Yes (Mandatory)')
      : (language === 'bn' ? 'ঐচ্ছিক' : 'No (Optional)');
    const fileName = file ? file.name : (language === 'bn' ? 'কোনো ফাইল নেই' : 'None');
    const pages = file ? String(file.pageCount) : '-';
    const expiryDateStr = req.has_expiry && expiry ? expiry : (req.has_expiry ? (language === 'bn' ? 'দেওয়া হয়নি' : 'Not set') : 'N/A');
    const statusLabel = language === 'bn' ? detail.labelBn : detail.labelEn;
    const detailsMsg = language === 'bn' ? detail.messageBn : detail.messageEn;

    rows.push([
      orderStr,
      titleEn,
      titleBn,
      isMandatory,
      fileName,
      pages,
      expiryDateStr,
      statusLabel,
      detailsMsg,
    ]);
  }

  // Escape CSV fields
  const csvContent = rows
    .map((row) =>
      row
        .map((field) => {
          const str = String(field).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
    .join('\r\n');

  // UTF-8 with BOM (\uFEFF)
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const tenderIdSafe = (tender?.tender_id || 'Tender').replace(/[/\\?%*:|"<>]/g, '_');
  const filename = `${tenderIdSafe}_Checklist_${language.toUpperCase()}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
