export interface TokenData {
  accessToken: string;
  refreshToken: string;
}

export interface AppStatus {
  lastSentAt: number | null;
  lastSentDate: string | null; // "YYYY-MM-DD"
  lastResult: 'success' | 'error' | 'token_expired' | null;
  lastMessage: string;
}

export const DEFAULT_STATUS: AppStatus = {
  lastSentAt: null,
  lastSentDate: null,
  lastResult: null,
  lastMessage: '',
};

export const STORAGE_KEYS = {
  tokens: 'tokens',
  status: 'appStatus',
} as const;
