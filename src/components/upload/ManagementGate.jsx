import { useEffect, useRef, useState } from 'react';
import {
  getManagementAccessStatus,
  verifyManagementPasscode,
} from '../../api/shopOrderApi';

/**
 * Cổng passcode cho trang /management.
 *   - Kiểm tra status trước. Nếu đang khóa → hiển thị countdown.
 *   - Nhập passcode → verify. Nếu đúng → gọi onPass().
 *   - Nhập sai: hiển thị số lần còn lại; đủ MAX → bị khóa.
 *   - Khóa tự reset khi hết thời gian (poll status mỗi 1s).
 */
export default function ManagementGate({ onPass }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  // Fetch initial status
  useEffect(() => {
    (async () => {
      try {
        const s = await getManagementAccessStatus();
        setStatus(s);
      } catch (e) {
        setMessage(e.message || 'Lỗi tải trạng thái');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Countdown khi đang bị khóa
  useEffect(() => {
    if (!status?.locked) return;
    const remaining = Number(status.remainingSeconds || 0);
    if (remaining <= 0) {
      // Hết khóa → refetch
      (async () => {
        try {
          const s = await getManagementAccessStatus();
          setStatus(s);
        } catch (e) { /* noop */ }
      })();
      return;
    }
    const t = setInterval(() => {
      setStatus((prev) => {
        if (!prev?.locked) return prev;
        const r = Number(prev.remainingSeconds || 0) - 1;
        if (r <= 0) {
          // Reload status khi hết
          getManagementAccessStatus()
            .then((s) => setStatus(s))
            .catch(() => {});
          return { ...prev, remainingSeconds: 0 };
        }
        return { ...prev, remainingSeconds: r };
      });
    }, 1000);
    return () => clearInterval(t);
  }, [status?.locked]);

  useEffect(() => {
    if (!status?.locked && !loading) {
      // Focus input khi không bị khóa
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [status?.locked, loading]);

  async function handleSubmit(e) {
    e?.preventDefault?.();
    if (!passcode) {
      setMessage('Vui lòng nhập passcode');
      return;
    }
    setSubmitting(true);
    setMessage('');
    try {
      const res = await verifyManagementPasscode(passcode);
      if (res.success) {
        setPasscode('');
        onPass?.();
        return;
      }
      // Fail
      if (res.locked) {
        setStatus(res);
        setMessage('Nhập sai quá nhiều lần. Tài khoản tạm khóa.');
      } else {
        setStatus(res);
        const remain = res.remainingAttempts ?? '?';
        setMessage(`Passcode sai. Còn ${remain} lần thử.`);
      }
      setPasscode('');
    } catch (err) {
      setMessage(err.message || 'Lỗi xác thực');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-slate-600 text-sm">Đang kiểm tra quyền truy cập...</div>
      </div>
    );
  }

  const locked = !!status?.locked;
  const remainingSec = Number(status?.remainingSeconds || 0);
  const mm = Math.floor(remainingSec / 60);
  const ss = remainingSec % 60;
  const remainingDisplay = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
            <LockIcon size={28} />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Quản lý đơn hàng</h1>
          <p className="text-sm text-slate-500 mt-1">
            Vui lòng nhập passcode để truy cập trang này
          </p>
        </div>

        {locked ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center">
            <div className="text-red-700 font-semibold mb-1">⛔ Đang bị khóa</div>
            <div className="text-sm text-red-600 mb-2">
              Đã nhập sai quá nhiều lần. Vui lòng thử lại sau:
            </div>
            <div className="text-3xl font-mono font-bold text-red-700 tabular-nums">
              {remainingDisplay}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Passcode
              </label>
              <input
                ref={inputRef}
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                disabled={submitting}
                autoComplete="off"
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-60"
                placeholder="Nhập passcode..."
              />
            </div>
            {message && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm text-amber-800">
                {message}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting || !passcode}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5"
            >
              {submitting ? 'Đang xác thực...' : 'Truy cập'}
            </button>
            {status?.failedAttempts != null && status.failedAttempts > 0 && (
              <div className="text-xs text-slate-500 text-center">
                Đã nhập sai {status.failedAttempts}/5 lần
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

function LockIcon({ size = 24 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}
