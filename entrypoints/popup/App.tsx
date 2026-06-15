import { useEffect, useState } from 'react';
import { browser } from 'wxt/browser';
import {
  DEFAULT_STATUS,
  STORAGE_KEYS,
  type AppStatus,
  type TokenData,
} from '@/utils/settings';
import './App.css';

function todayString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isInWindow(): boolean {
  const d = new Date();
  const total = d.getHours() * 60 + d.getMinutes();
  return total >= 20 * 60 + 10 && total < 21 * 60;
}

function resultLabel(result: AppStatus['lastResult']): string {
  if (!result) return '-';
  if (result === 'success') return '성공';
  if (result === 'token_expired') return '토큰 만료';
  return '오류';
}

function App() {
  const [refreshToken, setRefreshToken] = useState('');
  const [status, setStatus] = useState<AppStatus>(DEFAULT_STATUS);
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    browser.storage.local
      .get([STORAGE_KEYS.tokens, STORAGE_KEYS.status])
      .then((stored) => {
        const tokens = stored[STORAGE_KEYS.tokens] as TokenData | undefined;
        if (tokens?.refreshToken) setRefreshToken(tokens.refreshToken);

        setStatus({
          ...DEFAULT_STATUS,
          ...(stored[STORAGE_KEYS.status] as Partial<AppStatus> | undefined),
        });
      });

    const onChanged = (changes: Record<string, { newValue?: unknown }>, area: string) => {
      if (area !== 'local' || !changes[STORAGE_KEYS.status]) return;
      setStatus({
        ...DEFAULT_STATUS,
        ...(changes[STORAGE_KEYS.status].newValue as Partial<AppStatus> | undefined),
      });
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => browser.storage.onChanged.removeListener(onChanged);
  }, []);

  const handleSave = async () => {
    const tokens: TokenData = { accessToken: '', refreshToken };
    await browser.storage.local.set({ [STORAGE_KEYS.tokens]: tokens });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handleSendNow = async () => {
    setSending(true);
    try {
      await browser.runtime.sendMessage({ type: 'SEND_NOW' });
    } catch {
      // status updates via storage.onChanged
    }
    setSending(false);
  };

  const sentToday = status.lastSentDate === todayString() && status.lastResult === 'success';
  const inWindow = isInWindow();

  return (
    <main className="app">
      <h1>Floooding</h1>

      <label className="field">
        <span>리프레시 토큰</span>
        <input
          type="password"
          placeholder="리프레시 토큰을 입력하세요"
          value={refreshToken}
          onChange={(e) => setRefreshToken(e.target.value)}
        />
      </label>

      <div className="row">
        <button className="primary" onClick={handleSave} disabled={!refreshToken}>
          {saved ? '저장됨' : '저장'}
        </button>
        <button onClick={handleSendNow} disabled={sending || !refreshToken}>
          {sending ? '전송 중...' : '지금 전송'}
        </button>
      </div>

      <section className="status">
        <h2>상태</h2>
        <div>
          오늘 전송:{' '}
          <span className={`badge ${sentToday ? 'success' : 'pending'}`}>
            {sentToday ? '완료' : '미완료'}
          </span>
        </div>
        {status.lastSentAt && (
          <div>마지막 시도: {new Date(status.lastSentAt).toLocaleString('ko-KR')}</div>
        )}
        {status.lastResult && (
          <div>
            결과:{' '}
            <span className={`badge ${status.lastResult}`}>
              {resultLabel(status.lastResult)}
            </span>
          </div>
        )}
        {status.lastMessage && <div className="msg">{status.lastMessage}</div>}
      </section>

      <div className="window-info">
        자동 전송: 20:10 ~ 21:00{' '}
        <span className={`badge ${inWindow ? 'success' : 'pending'}`}>
          {inWindow ? '활성' : '대기'}
        </span>
      </div>
    </main>
  );
}

export default App;
