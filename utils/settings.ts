export interface PollSettings {
  enabled: boolean;
  apiUrl: string;
  intervalMinutes: number;
  refreshToken: string;
}

export interface PollStatus {
  lastRunAt: number | null;
  lastStatus: 'success' | 'error' | null;
  lastMessage: string;
}

export const DEFAULT_SETTINGS: PollSettings = {
  enabled: false,
  apiUrl: '',
  intervalMinutes: 1,
  refreshToken: '',
};

export const DEFAULT_STATUS: PollStatus = {
  lastRunAt: null,
  lastStatus: null,
  lastMessage: '',
};

export const STORAGE_KEYS = {
  settings: 'pollSettings',
  status: 'pollStatus',
} as const;
