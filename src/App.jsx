import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import UploadPage from './components/upload/UploadPage';
import ManagementGate from './components/upload/ManagementGate';
import SearchPage from './components/search/SearchPage';

const SESSION_KEY = 'management_session_expires_at';
const SESSION_MS = 60 * 60 * 1000; // 1 giờ

function readSessionExpiry() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

function writeSessionExpiry(expiresAt) {
  try {
    if (expiresAt > 0) localStorage.setItem(SESSION_KEY, String(expiresAt));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* noop */ }
}

/** Toast nhỏ hiện ở góc phải khi hết session. */
function ExpiredToast({ onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div className="fixed top-6 right-6 z-[70] rounded-lg px-4 py-3 text-sm text-white shadow-lg bg-amber-600">
      ⏰ Hết phiên truy cập (1 giờ). Vui lòng nhập lại passcode.
    </div>
  );
}

/**
 * Wrapper cho route /management:
 *   - Mount: nếu localStorage có session chưa hết hạn → vào thẳng UploadPage.
 *   - Passcode đúng → ghi expiresAt = now + 1h vào localStorage.
 *   - Timer tự đá ra lại gate khi hết 1h + hiện toast.
 */
function ManagementRoute() {
  const [passed, setPassed] = useState(() => readSessionExpiry() > Date.now());
  const [showExpiredToast, setShowExpiredToast] = useState(false);
  const timerRef = useRef(null);

  // Khi đã pass → set timer đá ra lúc hết hạn
  useEffect(() => {
    if (!passed) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    const expiresAt = readSessionExpiry();
    const remainMs = expiresAt - Date.now();
    if (remainMs <= 0) {
      // Session đã hết → đá ra ngay
      handleExpire();
      return;
    }
    timerRef.current = setTimeout(handleExpire, remainMs);
    return () => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed]);

  // Khi tab được focus lại / visibility change → check lại session
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      if (passed && readSessionExpiry() <= Date.now()) handleExpire();
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [passed]);

  function handleExpire() {
    writeSessionExpiry(0);
    setPassed(false);
    setShowExpiredToast(true);
  }

  function handlePass() {
    writeSessionExpiry(Date.now() + SESSION_MS);
    setPassed(true);
    setShowExpiredToast(false);
  }

  if (!passed) {
    return (
      <>
        <ManagementGate onPass={handlePass} />
        {showExpiredToast && <ExpiredToast onClose={() => setShowExpiredToast(false)} />}
      </>
    );
  }

  return (
    <>
      <UploadPage />
      {showExpiredToast && <ExpiredToast onClose={() => setShowExpiredToast(false)} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/management" element={<ManagementRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}