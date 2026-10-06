export interface TenderInfo {
  tender_id: string;
  title: string;
  procuring_entity: string;
  bidder: string;
  submission_deadline: string; // YYYY-MM-DD
}

export interface Requirement {
  id: string;
  order: number;
  title_en: string;
  title_bn: string;
  mandatory: boolean;
  has_expiry: boolean;
}

export interface RequirementsData {
  tender: TenderInfo;
  requirements: Requirement[];
}

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  pageCount: number;
  sha256: string;
  thumbnailDataUrl: string;
  buffer: ArrayBuffer;
}

export type DocumentStatus =
  | 'MISSING'
  | 'EXPIRY_NEEDED'
  | 'EXPIRED'
  | 'NOT_PROVIDED'
  | 'OK';

export interface DocumentStatusDetail {
  status: DocumentStatus;
  labelEn: string;
  labelBn: string;
  messageEn: string;
  messageBn: string;
  blocks: boolean;
}

export interface AppNotification {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  titleEn: string;
  titleBn: string;
  messageEn: string;
  messageBn: string;
}

export interface ConfirmDialogState {
  titleEn: string;
  titleBn: string;
  messageEn: string;
  messageBn: string;
  confirmLabelEn: string;
  confirmLabelBn: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface PackageResult {
  pdfBytes: Uint8Array;
  blobUrl: string;
  totalPages: number;
  fileSize: number;
  generatedAt: string;
  tenderId: string;
}

export interface SealConfig {
  enabled: boolean;
  imageDataUrl: string;
  imageBytes?: Uint8Array;
  scope: 'all' | 'selected';
  selectedDocIds: string[];
  pageScope: 'all' | 'first' | 'last' | 'custom';
  customPages?: string;
  width: number; // width in points, e.g. 90-140
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'center' | 'custom';
  customX?: number; // relative to page width
  customY?: number; // relative to page height, strictly >= 34
}

export interface PackageBuildOptions {
  includeIndexPage: boolean;
  sealConfig?: SealConfig | null;
}
