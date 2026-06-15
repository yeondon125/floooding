import { browser } from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  type PollSettings,
  type PollStatus,
} from '@/utils/settings';

const ALARM_NAME = 'api-poll';

async function getSettings(): Promise<PollSettings> {
  const stored = await browser.storage.local.get(STORAGE_KEYS.settings);
  return {
    ...DEFAULT_SETTINGS,
    ...(stored[STORAGE_KEYS.settings] as Partial<PollSettings> | undefined),
  };
}

async function setStatus(status: PollStatus) {
  await browser.storage.local.set({ [STORAGE_KEYS.status]: status });
}

async function rescheduleAlarm(settings: PollSettings) {
  await browser.alarms.clear(ALARM_NAME);
  if (!settings.enabled || !settings.apiUrl) return;

  // Chrome Alarms API의 최소 주기는 1분이다.
  const periodInMinutes = Math.max(1, settings.intervalMinutes);
  browser.alarms.create(ALARM_NAME, {
    delayInMinutes: periodInMinutes,
    periodInMinutes,
  });
}

async function poll() {
  const settings = await getSettings();
  if (!settings.enabled || !settings.apiUrl) return;

  try {
    const res = await fetch(settings.apiUrl);
    await setStatus({
      lastRunAt: Date.now(),
      lastStatus: res.ok ? 'success' : 'error',
      lastMessage: `HTTP ${res.status}`,
    });
  } catch (err) {
    await setStatus({
      lastRunAt: Date.now(),
      lastStatus: 'error',
      lastMessage: err instanceof Error ? err.message : String(err),
    });
  }
}

export default defineBackground(() => {
  getSettings().then(rescheduleAlarm);

  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) poll();
  });

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEYS.settings]) return;
    const newSettings: PollSettings = {
      ...DEFAULT_SETTINGS,
      ...(changes[STORAGE_KEYS.settings].newValue as Partial<PollSettings> | undefined),
    };
    rescheduleAlarm(newSettings);
  });
});
