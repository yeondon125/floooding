import { browser } from 'wxt/browser';
import {
  DEFAULT_MASSAGE_STATUS,
  DEFAULT_STATUS,
  STORAGE_KEYS,
  type AppStatus,
  type MassageStatus,
  type TokenData,
} from '@/utils/settings';

const BASE_URL = 'https://prod.flooding.kr';
const ALARM_NAME = 'study-check';
const WINDOW_START_MIN = 20 * 60 + 10; // 20:10
const WINDOW_END_MIN = 21 * 60;        // 21:00

const MASSAGE_HOUR = 20;
const MASSAGE_MINUTE = 20;
const MASSAGE_SECOND = 2; // 20:20:02

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isInWindow(): boolean {
  const m = nowMinutes();
  return m >= WINDOW_START_MIN && m < WINDOW_END_MIN;
}

async function getTokens(): Promise<TokenData | null> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.tokens);
  return (stored[STORAGE_KEYS.tokens] as TokenData | undefined) ?? null;
}

async function saveTokens(tokens: TokenData) {
  await browser.storage.local.set({ [STORAGE_KEYS.tokens]: tokens });
}

async function getStatus(): Promise<AppStatus> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.status);
  return {
    ...DEFAULT_STATUS,
    ...(stored[STORAGE_KEYS.status] as Partial<AppStatus> | undefined),
  };
}

async function setStatus(status: AppStatus) {
  await browser.storage.local.set({ [STORAGE_KEYS.status]: status });
}

async function getMassageStatus(): Promise<MassageStatus> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.massageStatus);
  return {
    ...DEFAULT_MASSAGE_STATUS,
    ...(stored[STORAGE_KEYS.massageStatus] as Partial<MassageStatus> | undefined),
  };
}

async function setMassageStatus(status: Partial<MassageStatus>) {
  const current = await getMassageStatus();
  await browser.storage.local.set({
    [STORAGE_KEYS.massageStatus]: { ...current, ...status },
  });
}

let reissuePromise: Promise<TokenData | null> | null = null;

async function reissueToken(refreshToken: string): Promise<TokenData | null> {
  if (reissuePromise) return reissuePromise;

  reissuePromise = (async () => {
    const res = await fetch(`${BASE_URL}/auth/reissue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const tokens: TokenData = {
      accessToken: json?.data?.accessToken ?? json?.accessToken ?? '',
      refreshToken: json?.data?.refreshToken ?? json?.refreshToken ?? '',
    };

    if (!tokens.accessToken) return null;

    await saveTokens(tokens);
    return tokens;
  })();

  try {
    return await reissuePromise;
  } finally {
    reissuePromise = null;
  }
}

async function requestStudy(accessToken: string): Promise<Response> {
  return fetch(`${BASE_URL}/dormitory/studies`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function requestMassage(accessToken: string): Promise<Response> {
  return fetch(`${BASE_URL}/dormitory/massages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

async function sendStudyRequest(manual = false): Promise<void> {
  const existing = await getTokens();
  if (!existing?.refreshToken) {
    await setStatus({
      lastSentAt: Date.now(),
      lastSentDate: null,
      lastResult: 'error',
      lastMessage: '리프레시 토큰이 없습니다. 팝업에서 입력해주세요.',
    });
    return;
  }

  try {
    let accessToken = existing.accessToken;
    let res = accessToken ? await requestStudy(accessToken) : null;

    if (!res || res.status === 401) {
      const reissued = await reissueToken(existing.refreshToken);
      if (!reissued) {
        await setStatus({
          lastSentAt: Date.now(),
          lastSentDate: manual ? null : null,
          lastResult: 'token_expired',
          lastMessage: '토큰 재발급 실패 (401). 리프레시 토큰을 재입력해주세요.',
        });
        return;
      }
      accessToken = reissued.accessToken;
      res = await requestStudy(accessToken);
    }

    if (res.status === 409) {
      await setStatus({
        lastSentAt: Date.now(),
        lastSentDate: todayString(),
        lastResult: 'already_done',
        lastMessage: `HTTP 409 (이미 신청됨)`,
      });
      return;
    }

    const ok = res.ok || res.status === 201;
    await setStatus({
      lastSentAt: Date.now(),
      lastSentDate: ok ? todayString() : null,
      lastResult: ok ? 'success' : 'error',
      lastMessage: `HTTP ${res.status}`,
    });
  } catch (err) {
    await setStatus({
      lastSentAt: Date.now(),
      lastSentDate: null,
      lastResult: 'error',
      lastMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

async function checkAndSend(): Promise<void> {
  if (!isInWindow()) return;

  const status = await getStatus();
  if (
    status.lastSentDate === todayString() &&
    (status.lastResult === 'success' || status.lastResult === 'already_done')
  ) {
    return;
  }

  await sendStudyRequest();
}

async function sendMassageRequest(): Promise<void> {
  // Mark today as attempted immediately so this never retries, even on failure.
  await setMassageStatus({ lastAttemptDate: todayString() });

  const existing = await getTokens();
  if (!existing?.refreshToken) {
    await setMassageStatus({
      lastSentAt: Date.now(),
      lastResult: 'error',
      lastMessage: '리프레시 토큰이 없습니다. 팝업에서 입력해주세요.',
    });
    return;
  }

  try {
    let accessToken = existing.accessToken;
    let res = accessToken ? await requestMassage(accessToken) : null;

    if (!res || res.status === 401) {
      const reissued = await reissueToken(existing.refreshToken);
      if (!reissued) {
        await setMassageStatus({
          lastSentAt: Date.now(),
          lastResult: 'token_expired',
          lastMessage: '토큰 재발급 실패 (401). 리프레시 토큰을 재입력해주세요.',
        });
        return;
      }
      accessToken = reissued.accessToken;
      res = await requestMassage(accessToken);
    }

    if (res.status === 409) {
      await setMassageStatus({
        lastSentAt: Date.now(),
        lastResult: 'already_done',
        lastMessage: `HTTP 409 (이미 신청됨)`,
      });
      return;
    }

    const ok = res.ok || res.status === 201;
    await setMassageStatus({
      lastSentAt: Date.now(),
      lastResult: ok ? 'success' : 'error',
      lastMessage: `HTTP ${res.status}`,
    });
  } catch (err) {
    await setMassageStatus({
      lastSentAt: Date.now(),
      lastResult: 'error',
      lastMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

async function checkAndSendMassage(): Promise<void> {
  const status = await getMassageStatus();
  if (!status.enabled) return;
  if (status.lastAttemptDate === todayString()) return;

  const now = new Date();
  if (now.getHours() !== MASSAGE_HOUR || now.getMinutes() !== MASSAGE_MINUTE) return;

  const msUntilTarget =
    (MASSAGE_SECOND - now.getSeconds()) * 1000 - now.getMilliseconds();

  if (msUntilTarget <= 0) {
    await sendMassageRequest();
    return;
  }
  setTimeout(() => sendMassageRequest(), msUntilTarget);
}

function scheduleAlarm() {
  browser.alarms.create(ALARM_NAME, {
    delayInMinutes: 1,
    periodInMinutes: 1,
  });
}

export default defineBackground(() => {
  checkAndSend();
  checkAndSendMassage();
  scheduleAlarm();

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) {
      checkAndSend();
      checkAndSendMassage();
    }
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === 'SEND_NOW') {
      sendStudyRequest(true).then(() => sendResponse({ ok: true }));
      return true;
    }
  });
});
