export interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export interface AppStatus {
  lastSentAt: number | null;
  lastSentDate: string | null; // "YYYY-MM-DD"
  lastResult: 'success' | 'error' | 'token_expired' | 'already_done' | null;
  lastMessage: string;
}

export const DEFAULT_STATUS: AppStatus = {
  lastSentAt: null,
  lastSentDate: null,
  lastResult: null,
  lastMessage: '',
};

export interface MassageStatus {
  enabled: boolean;
  lastAttemptDate: string | null; // "YYYY-MM-DD" - set as soon as an attempt is made, success or not
  lastSentAt: number | null;
  lastResult: 'success' | 'error' | 'token_expired' | 'already_done' | null;
  lastMessage: string;
}

export const DEFAULT_MASSAGE_STATUS: MassageStatus = {
  enabled: false,
  lastAttemptDate: null,
  lastSentAt: null,
  lastResult: null,
  lastMessage: '',
};

export const STORAGE_KEYS = {
  tokens: 'tokens',
  status: 'appStatus',
  massageStatus: 'massageStatus',
} as const;
