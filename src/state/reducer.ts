import {
  AppNotification,
  ConfirmDialogState,
  PackageResult,
  Requirement,
  SealConfig,
  TenderInfo,
  UploadedFile,
} from '../types';

export interface HistoryEntry {
  matches: Record<string, string | null>;
  expiryDates: Record<string, string>;
}

export interface AppStateWithHistory {
  tender: TenderInfo | null;
  requirements: Requirement[];
  uploadedFiles: UploadedFile[];
  matches: Record<string, string | null>; // requirementId -> fileId
  expiryDates: Record<string, string>; // requirementId -> YYYY-MM-DD
  history: {
    past: HistoryEntry[];
    future: HistoryEntry[];
  };
  includeIndexPage: boolean;
  sealConfig: SealConfig | null;
  isGenerating: boolean;
  generationProgress: { messageEn: string; messageBn: string; percent: number } | null;
  packageResult: PackageResult | null;
  isPackageStale: boolean;
  notifications: AppNotification[];
  previewFile: UploadedFile | null;
  previewPackageUrl: string | null;
  confirmDialog: ConfirmDialogState | null;
  language: 'en' | 'bn';
}

export type Action =
  | { type: 'SET_LANGUAGE'; payload: 'en' | 'bn' }
  | { type: 'SET_TENDER_AND_REQUIREMENTS'; payload: { tender: TenderInfo; requirements: Requirement[] } }
  | { type: 'ADD_FILES'; payload: UploadedFile[] }
  | { type: 'REMOVE_FILE'; payload: string } // fileId
  | { type: 'MATCH_FILE'; payload: { requirementId: string; fileId: string | null } }
  | { type: 'APPLY_MULTIPLE_MATCHES'; payload: Array<{ requirementId: string; fileId: string }> }
  | { type: 'SET_EXPIRY_DATE'; payload: { requirementId: string; expiryDate: string } }
  | { type: 'SET_INCLUDE_INDEX_PAGE'; payload: boolean }
  | { type: 'SET_SEAL_CONFIG'; payload: SealConfig | null }
  | { type: 'LOAD_SAVED_PROJECT'; payload: Partial<AppStateWithHistory> }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<AppNotification, 'id'> }
  | { type: 'DISMISS_NOTIFICATION'; payload: string }
  | { type: 'SET_PREVIEW_FILE'; payload: UploadedFile | null }
  | { type: 'SET_PREVIEW_PACKAGE_URL'; payload: string | null }
  | { type: 'SET_CONFIRM_DIALOG'; payload: ConfirmDialogState | null }
  | { type: 'START_GENERATION' }
  | { type: 'SET_GENERATION_PROGRESS'; payload: { messageEn: string; messageBn: string; percent: number } }
  | { type: 'FINISH_GENERATION'; payload: PackageResult }
  | { type: 'FAIL_GENERATION' }
  | { type: 'RESET_STATE' };

export const initialState: AppStateWithHistory = {
  tender: null,
  requirements: [],
  uploadedFiles: [],
  matches: {},
  expiryDates: {},
  history: {
    past: [],
    future: [],
  },
  includeIndexPage: false,
  sealConfig: null,
  isGenerating: false,
  generationProgress: null,
  packageResult: null,
  isPackageStale: false,
  notifications: [],
  previewFile: null,
  previewPackageUrl: null,
  confirmDialog: null,
  language: (typeof localStorage !== 'undefined' && (localStorage.getItem('tender_app_lang') as 'en' | 'bn')) || 'en',
};

/**
 * Pushes the current matches & expiry state to the history stack.
 */
function recordHistory(state: AppStateWithHistory): { past: HistoryEntry[]; future: HistoryEntry[] } {
  const currentSnapshot: HistoryEntry = {
    matches: { ...state.matches },
    expiryDates: { ...state.expiryDates },
  };
  return {
    past: [...state.history.past.slice(-30), currentSnapshot],
    future: [],
  };
}

export function appReducer(state: AppStateWithHistory, action: Action): AppStateWithHistory {
  switch (action.type) {
    case 'SET_LANGUAGE': {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('tender_app_lang', action.payload);
      }
      return { ...state, language: action.payload };
    }

    case 'SET_TENDER_AND_REQUIREMENTS': {
      const newMatches: Record<string, string | null> = {};
      const newExpiry: Record<string, string> = {};
      for (const req of action.payload.requirements) {
        newMatches[req.id] = null;
        newExpiry[req.id] = '';
      }

      if (state.packageResult?.blobUrl) {
        try {
          URL.revokeObjectURL(state.packageResult.blobUrl);
        } catch {}
      }

      return {
        ...state,
        tender: action.payload.tender,
        requirements: action.payload.requirements,
        matches: newMatches,
        expiryDates: newExpiry,
        history: { past: [], future: [] },
        packageResult: null,
        isPackageStale: false,
      };
    }

    case 'LOAD_SAVED_PROJECT': {
      if (state.packageResult?.blobUrl) {
        try {
          URL.revokeObjectURL(state.packageResult.blobUrl);
        } catch {}
      }
      return {
        ...state,
        ...action.payload,
        packageResult: null,
        isPackageStale: false,
        history: { past: [], future: [] },
      };
    }

    case 'SET_INCLUDE_INDEX_PAGE': {
      return {
        ...state,
        includeIndexPage: action.payload,
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'SET_SEAL_CONFIG': {
      return {
        ...state,
        sealConfig: action.payload,
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'ADD_FILES': {
      const existingIds = new Set(state.uploadedFiles.map((f) => f.id));
      const newFiles = action.payload.filter((f) => !existingIds.has(f.id));
      return {
        ...state,
        uploadedFiles: [...state.uploadedFiles, ...newFiles],
      };
    }

    case 'REMOVE_FILE': {
      const fileIdToRemove = action.payload;
      const fileToRemove = state.uploadedFiles.find((f) => f.id === fileIdToRemove);
      if (!fileToRemove) return state;

      let wasMatched = false;
      const nextMatches = { ...state.matches };
      const nextExpiry = { ...state.expiryDates };

      for (const [reqId, matchedId] of Object.entries(nextMatches)) {
        if (matchedId === fileIdToRemove) {
          wasMatched = true;
          nextMatches[reqId] = null;
          nextExpiry[reqId] = ''; // Invariant: clear expiry on unmatch
        }
      }

      const nextHistory = wasMatched ? recordHistory(state) : state.history;

      return {
        ...state,
        uploadedFiles: state.uploadedFiles.filter((f) => f.id !== fileIdToRemove),
        matches: nextMatches,
        expiryDates: nextExpiry,
        history: nextHistory,
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'MATCH_FILE': {
      const { requirementId, fileId } = action.payload;
      const currentMatchedFileId = state.matches[requirementId] || null;

      if (currentMatchedFileId === fileId) {
        return state;
      }

      if (fileId !== null) {
        const fileToMatch = state.uploadedFiles.find((f) => f.id === fileId);
        if (!fileToMatch) return state;

        // Invariant 1: One file goes to at most ONE document
        // Invariant 2: Duplicate contents cannot be matched across documents
        for (const [otherReqId, otherFileId] of Object.entries(state.matches)) {
          if (otherReqId !== requirementId && otherFileId) {
            if (otherFileId === fileId) {
              return state;
            }
            const otherFile = state.uploadedFiles.find((f) => f.id === otherFileId);
            if (otherFile && otherFile.sha256 === fileToMatch.sha256) {
              return state;
            }
          }
        }
      }

      const nextHistory = recordHistory(state);
      const nextMatches = { ...state.matches, [requirementId]: fileId };
      const nextExpiry = { ...state.expiryDates };

      // Invariant: When matched file changes or is cleared, RESET expiry date
      nextExpiry[requirementId] = '';

      return {
        ...state,
        matches: nextMatches,
        expiryDates: nextExpiry,
        history: nextHistory,
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'APPLY_MULTIPLE_MATCHES': {
      if (action.payload.length === 0) return state;

      const nextHistory = recordHistory(state);
      const nextMatches = { ...state.matches };
      const nextExpiry = { ...state.expiryDates };

      for (const item of action.payload) {
        // Enforce invariants
        const fileToMatch = state.uploadedFiles.find((f) => f.id === item.fileId);
        if (!fileToMatch) continue;

        let isBlocked = false;
        for (const [otherReqId, otherFileId] of Object.entries(nextMatches)) {
          if (otherReqId !== item.requirementId && otherFileId) {
            if (otherFileId === item.fileId) {
              isBlocked = true;
              break;
            }
            const otherFile = state.uploadedFiles.find((f) => f.id === otherFileId);
            if (otherFile && otherFile.sha256 === fileToMatch.sha256) {
              isBlocked = true;
              break;
            }
          }
        }

        if (!isBlocked) {
          nextMatches[item.requirementId] = item.fileId;
          nextExpiry[item.requirementId] = ''; // Reset expiry date
        }
      }

      return {
        ...state,
        matches: nextMatches,
        expiryDates: nextExpiry,
        history: nextHistory,
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'SET_EXPIRY_DATE': {
      const { requirementId, expiryDate } = action.payload;
      const currentVal = state.expiryDates[requirementId] || '';

      if (currentVal === expiryDate) return state;

      const nextHistory = recordHistory(state);
      const nextExpiry = { ...state.expiryDates, [requirementId]: expiryDate };

      return {
        ...state,
        expiryDates: nextExpiry,
        history: nextHistory,
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'UNDO': {
      if (state.history.past.length === 0) return state;

      const previous = state.history.past[state.history.past.length - 1];
      const newPast = state.history.past.slice(0, -1);
      const currentSnapshot: HistoryEntry = {
        matches: { ...state.matches },
        expiryDates: { ...state.expiryDates },
      };

      return {
        ...state,
        matches: previous.matches,
        expiryDates: previous.expiryDates,
        history: {
          past: newPast,
          future: [currentSnapshot, ...state.history.future],
        },
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'REDO': {
      if (state.history.future.length === 0) return state;

      const next = state.history.future[0];
      const newFuture = state.history.future.slice(1);
      const currentSnapshot: HistoryEntry = {
        matches: { ...state.matches },
        expiryDates: { ...state.expiryDates },
      };

      return {
        ...state,
        matches: next.matches,
        expiryDates: next.expiryDates,
        history: {
          past: [...state.history.past, currentSnapshot],
          future: newFuture,
        },
        isPackageStale: state.packageResult ? true : false,
      };
    }

    case 'ADD_NOTIFICATION': {
      const notif: AppNotification = {
        id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        ...action.payload,
      };
      return {
        ...state,
        notifications: [notif, ...state.notifications],
      };
    }

    case 'DISMISS_NOTIFICATION': {
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    }

    case 'SET_PREVIEW_FILE': {
      return { ...state, previewFile: action.payload };
    }

    case 'SET_PREVIEW_PACKAGE_URL': {
      return { ...state, previewPackageUrl: action.payload };
    }

    case 'SET_CONFIRM_DIALOG': {
      return { ...state, confirmDialog: action.payload };
    }

    case 'START_GENERATION': {
      return {
        ...state,
        isGenerating: true,
        generationProgress: {
          messageEn: 'Starting package generation...',
          messageBn: 'প্যাকেজ তৈরি শুরু হচ্ছে...',
          percent: 0,
        },
      };
    }

    case 'SET_GENERATION_PROGRESS': {
      return {
        ...state,
        generationProgress: action.payload,
      };
    }

    case 'FINISH_GENERATION': {
      if (state.packageResult?.blobUrl) {
        try {
          URL.revokeObjectURL(state.packageResult.blobUrl);
        } catch {}
      }
      return {
        ...state,
        isGenerating: false,
        generationProgress: null,
        packageResult: action.payload,
        isPackageStale: false,
      };
    }

    case 'FAIL_GENERATION': {
      return {
        ...state,
        isGenerating: false,
        generationProgress: null,
      };
    }

    case 'RESET_STATE': {
      if (state.packageResult?.blobUrl) {
        try {
          URL.revokeObjectURL(state.packageResult.blobUrl);
        } catch {}
      }
      return {
        ...initialState,
        language: state.language,
      };
    }

    default:
      return state;
  }
}
