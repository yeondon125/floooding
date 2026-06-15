import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  DEFAULT_SETTINGS,
  DEFAULT_STATUS,
  STORAGE_KEYS,
  type PollSettings,
  type PollStatus,
} from '@/utils/settings';
import './App.css';

function App() {
  const [settings, setSettings] = useState<PollSettings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<PollStatus>(DEFAULT_STATUS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    browser.storage.local
      .get([STORAGE_KEYS.settings, STORAGE_KEYS.status])
      .then((stored) => {
        setSettings({
          ...DEFAULT_SETTINGS,
          ...(stored[STORAGE_KEYS.settings] as Partial<PollSettings> | undefined),
        });
        setStatus({
          ...DEFAULT_STATUS,
          ...(stored[STORAGE_KEYS.status] as Partial<PollStatus> | undefined),
        });
      });

    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => {
      if (area !== 'local' || !changes[STORAGE_KEYS.status]) return;
      setStatus({
        ...DEFAULT_STATUS,
        ...(changes[STORAGE_KEYS.status].newValue as Partial<PollStatus> | undefined),
      });
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const handleSave = async () => {
    await browser.storage.local.set({ [STORAGE_KEYS.settings]: settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <main className="app">
      <h1>Auto API Poller</h1>

      <label className="field toggle">
        <span>활성화</span>
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
        />
      </label>

      <label className="field">
        <span>API URL</span>
        <input
          type="url"
          placeholder="https://example.com/api"
          value={settings.apiUrl}
          onChange={(e) => setSettings({ ...settings, apiUrl: e.target.value })}
        />
      </label>

      <label className="field">
        <span>호출 간격 (분)</span>
        <input
          type="number"
          min={1}
          value={settings.intervalMinutes}
          onChange={(e) =>
            setSettings({ ...settings, intervalMinutes: Number(e.target.value) || 1 })
          }
        />
      </label>

      <button onClick={handleSave}>{saved ? '저장됨' : '저장'}</button>

      <section className="status">
        <h2>상태</h2>
        <p>
          마지막 호출:{' '}
          {status.lastRunAt ? new Date(status.lastRunAt).toLocaleString() : '없음'}
        </p>
        <p className={status.lastStatus === 'error' ? 'error' : ''}>
          결과: {status.lastStatus ?? '-'}
          {status.lastMessage && ` (${status.lastMessage})`}
        </p>
      </section>
    </main>
  );
}

export default App;
