import { useEffect, useRef, useState } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from 'react-router-dom';
import UploadPage from './components/upload/UploadPage';
import ManagementGate from './components/upload/ManagementGate';
import SearchPage from './components/search/SearchPage';

const SESSION_KEY = 'management_session_expires_at';
const SESSION_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày
const EXPIRE_TOAST_MS = 5000; // Toast chờ 5s rồi mới đá về gate

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

/**
 * Toast hết session — chờ 5s rồi tự gọi onFinish.
 * Click vào toast cũng gọi onFinish ngay.
 */
function ExpiredToast({ onFinish }) {
  useEffect(() => {
    const t = setTimeout(onFinish, EXPIRE_TOAST_MS);
    return () => clearTimeout(t);
  }, [onFinish]);

  return (
    <button
      type="button"
      onClick={onFinish}
      className="fixed top-6 right-6 z-[70] rounded-lg px-4 py-3 text-sm text-white shadow-lg bg-amber-600
                 hover:bg-amber-700 transition cursor-pointer text-left max-w-sm"
      title="Click để về trang nhập passcode ngay"
    >
      <div className="font-semibold">⏰ Hết phiên truy cập</div>
      <div className="text-xs opacity-90 mt-0.5">
        Phiên 7 ngày đã kết thúc. Sẽ về trang nhập passcode sau 5s... (hoặc click để về ngay)
      </div>
    </button>
  );
}

/**
 * Wrapper cho route /management:
 *   - Mount: nếu localStorage có session chưa hết hạn → vào thẳng UploadPage.
 *   - Passcode đúng → ghi expiresAt = now + 7 ngày vào localStorage.
 *   - Khi hết hạn: hiện toast, UploadPage vẫn render 5s để user đọc toast,
 *     rồi mới chuyển về gate. Click toast → chuyển về gate ngay.
 */
function ManagementRoute() {
  const [passed, setPassed] = useState(() => readSessionExpiry() > Date.now());
  const [showExpiredToast, setShowExpiredToast] = useState(false);
  const timerRef = useRef(null);

  // Khi đã pass → set timer bật toast lúc hết hạn
  useEffect(() => {
    if (!passed) {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
      return;
    }
    const expiresAt = readSessionExpiry();
    const remainMs = expiresAt - Date.now();
    if (remainMs <= 0) {
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
      if (passed && readSessionExpiry() <= Date.now() && !showExpiredToast) {
        handleExpire();
      }
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passed, showExpiredToast]);

  // Gọi khi session hết hạn: xoá session, hiện toast — NHƯNG chưa chuyển gate.
  // Toast tự chờ 5s hoặc click vào → gọi finishExpire() → chuyển về gate.
  function handleExpire() {
    writeSessionExpiry(0);
    setShowExpiredToast(true);
  }

  function finishExpire() {
    setShowExpiredToast(false);
    setPassed(false);
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
        {showExpiredToast && <ExpiredToast onFinish={finishExpire} />}
      </>
    );
  }

  return (
    <>
      <UploadPage />
      {showExpiredToast && <ExpiredToast onFinish={finishExpire} />}
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