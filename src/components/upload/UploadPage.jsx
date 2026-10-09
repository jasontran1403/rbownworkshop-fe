import { useCallback, useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import DragDropZone from './DragDropZone';
import RichTextEditor from '../common/RichTextEditor';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/format';
import {
  startUpload,
  getUploadStatus,
  getProcessingNumbers,
  updateProcessingNumber,
  managementSearchPaged,
  deleteOrder,
  updateOrder,
  getAnnouncement,
  updateAnnouncement,
} from '../../api/shopOrderApi';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9879';
const PAGE_SIZE = 100;
const POLL_INTERVAL_MS = 800;
const TICK_INTERVAL_MS = 100;
const ANIM_MS = 350;

const SHEET_TYPES = [
  { value: 'NORMAL', label: 'Thường' },
  { value: 'VIP', label: 'Ưu tiên' },
  { value: 'SUPER_VIP', label: 'Ưu tiên VIP' },
];

/** 3 loại processing number — thứ tự hiển thị trong UI. */
const PROCESSING_TYPES = [
  { key: 'superVip', apiKey: 'SUPER_VIP', label: 'Ưu tiên VIP', color: 'bg-orange-500 hover:bg-orange-600' },
  { key: 'vip', apiKey: 'VIP', label: 'Ưu tiên', color: 'bg-yellow-500 hover:bg-yellow-600' },
  { key: 'normal', apiKey: 'NORMAL', label: 'Thường', color: 'bg-blue-500  hover:bg-blue-600' },
];

// ===================== ICONS =====================
function UploadIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
function ArrowUpIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  );
}
function TrashIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function WarningIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function MinimizeIcon({ size = 18 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function CheckIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function MegaphoneIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h3l5 4V6L7 10H4a1 1 0 0 0-1 1z" />
      <path d="M17 8a5 5 0 0 1 0 8" />
      <path d="M20 5a9 9 0 0 1 0 14" />
    </svg>
  );
}
function XIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function formatDuration(ms) {
  if (ms == null || ms < 0) ms = 0;
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
}

export default function UploadPage() {
  const [showNumbersModal, setShowNumbersModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadConfirm, setShowUploadConfirm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 3 numbers — editing drafts + saved values
  const [numbers, setNumbers] = useState({ superVip: null, vip: null, normal: null });
  const [draftNumbers, setDraftNumbers] = useState({ superVip: '', vip: '', normal: '' });
  const [savingType, setSavingType] = useState(null);

  const [file, setFile] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const [startingUpload, setStartingUpload] = useState(false);

  const [task, setTask] = useState(null);
  const [now, setNow] = useState(Date.now());
  const pollRef = useRef(null);
  const tickRef = useRef(null);

  const [modalRendered, setModalRendered] = useState(false);
  const [modalShown, setModalShown] = useState(false);
  const [pillRendered, setPillRendered] = useState(false);
  const [pillShown, setPillShown] = useState(false);

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 600);
  const [sheetFilter, setSheetFilter] = useState('NORMAL');
  const [editRow, setEditRow] = useState(null);

  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const scrollRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Announcement
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [announcementDraft, setAnnouncementDraft] = useState('');
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [clearingAnnouncement, setClearingAnnouncement] = useState(false);

  function sortBySheetSequence(items) {
    if (!Array.isArray(items)) return [];
    return [...items].sort((a, b) => {
      const sa = a?.sheetSequence;
      const sb = b?.sheetSequence;
      const hasA = sa != null && sa !== '';
      const hasB = sb != null && sb !== '';
      if (hasA && hasB) return Number(sa) - Number(sb);
      if (hasA) return -1;
      if (hasB) return 1;
      return 0;
    });
  }

  useEffect(() => { loadNumbers(); loadAnnouncement(); }, []);
  useEffect(() => {
    resetAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, sheetFilter]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => () => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (tickRef.current) clearInterval(tickRef.current);
  }, []);

  async function loadAnnouncement() {
    try {
      const html = await getAnnouncement();
      setAnnouncement(html || '');
      setAnnouncementDraft(html || '');
    } catch (e) { /* noop */ }
  }

  function openAnnouncementModal() {
    setAnnouncementDraft(announcement || '');
    setShowAnnouncementModal(true);
  }

  async function handleSaveAnnouncement() {
    setSavingAnnouncement(true);
    try {
      const saved = await updateAnnouncement(announcementDraft || '');
      setAnnouncement(saved || '');
      setAnnouncementDraft(saved || '');
      showToast('success', saved ? 'Đã lưu thông báo' : 'Đã xóa thông báo');
      setShowAnnouncementModal(false);
    } catch (e) {
      showToast('error', 'Lỗi: ' + (e.message || 'không rõ'));
    } finally {
      setSavingAnnouncement(false);
    }
  }

  async function handleClearAnnouncement() {
    if (!announcement) { setShowAnnouncementModal(false); return; }
    setClearingAnnouncement(true);
    try {
      await updateAnnouncement('');
      setAnnouncement('');
      setAnnouncementDraft('');
      showToast('success', 'Đã xóa thông báo (table trở lại full width)');
      setShowAnnouncementModal(false);
    } catch (e) {
      showToast('error', 'Lỗi: ' + (e.message || 'không rõ'));
    } finally {
      setClearingAnnouncement(false);
    }
  }

  async function loadNumbers() {
    try {
      const n = await getProcessingNumbers();
      setNumbers(n);
      setDraftNumbers({
        superVip: n.superVip == null ? '' : String(n.superVip),
        vip: n.vip == null ? '' : String(n.vip),
        normal: n.normal == null ? '' : String(n.normal),
      });
    } catch (e) { /* noop */ }
  }

  async function resetAndLoad() {
    setLoadingRows(true); setHasMore(true); setSelectedIds(new Set());
    try {
      const data = await managementSearchPaged(debouncedKeyword, sheetFilter, 0, PAGE_SIZE);
      const items = sortBySheetSequence(data?.items || []);
      setRows(items); setPage(0); setHasMore(!!data?.hasMore);
    } catch (e) {
      setRows([]); showToast('error', e.message || 'Lỗi tải dữ liệu');
    } finally { setLoadingRows(false); }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await managementSearchPaged(debouncedKeyword, sheetFilter, next, PAGE_SIZE);
      const items = data?.items || [];
      setRows(prev => sortBySheetSequence([...prev, ...items])); // sort lại toàn bộ
      setPage(next); setHasMore(!!data?.hasMore);
    } catch (e) {
      showToast('error', e.message || 'Lỗi tải thêm dữ liệu');
      setHasMore(false);
    } finally { setLoadingMore(false); }
  }, [debouncedKeyword, sheetFilter, page, hasMore, loadingMore]);

  function handleTableScroll(e) {
    const el = e.currentTarget;
    setShowBackToTop(el.scrollTop > 300);
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 250) loadMore();
  }
  function scrollToTop() { scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }
  function showToast(type, msg) { setToast({ type, msg }); }

  async function copyToClipboard(text, label) {
    if (text == null || text === '') { showToast('error', 'Không có dữ liệu để copy'); return; }
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(String(text));
      } else {
        const ta = document.createElement('textarea');
        ta.value = String(text); ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      }
      showToast('success', `Đã copy ${label}`);
    } catch (e) { showToast('error', 'Copy thất bại'); }
  }

  function handleDraftChange(key, val) {
    const clean = val.replace(/[^0-9]/g, '');
    setDraftNumbers((prev) => ({ ...prev, [key]: clean }));
  }

  async function handleSaveNumber(typeDef) {
    setSavingType(typeDef.key);
    try {
      const raw = draftNumbers[typeDef.key];
      const v = raw === '' ? null : Number(raw);
      const updated = await updateProcessingNumber(typeDef.apiKey, v);
      setNumbers(updated);
      setDraftNumbers({
        superVip: updated.superVip == null ? '' : String(updated.superVip),
        vip: updated.vip == null ? '' : String(updated.vip),
        normal: updated.normal == null ? '' : String(updated.normal),
      });
      showToast('success', `Đã lưu số ${typeDef.label}`);
    } catch (e) { showToast('error', 'Lỗi: ' + e.message); }
    finally { setSavingType(null); }
  }

  async function handleQuickIncrement(typeDef) {
    setSavingType(typeDef.key);
    try {
      const current = numbers[typeDef.key];
      const base = Number.isFinite(Number(current)) ? Number(current) : 0;
      const next = base + 1;
      const updated = await updateProcessingNumber(typeDef.apiKey, next);
      setNumbers(updated);
      setDraftNumbers({
        superVip: updated.superVip == null ? '' : String(updated.superVip),
        vip: updated.vip == null ? '' : String(updated.vip),
        normal: updated.normal == null ? '' : String(updated.normal),
      });
      showToast('success', `Đã cập nhật ${typeDef.label} lên ${updated[typeDef.key] ?? next}`);
    } catch (e) { showToast('error', 'Lỗi: ' + e.message); }
    finally { setSavingType(null); }
  }

  // ============ UPLOAD FLOW ============
  function askUpload() {
    if (!file) { setUploadError('Vui lòng chọn file'); return; }
    setUploadError('');
    setShowUploadConfirm(true);
  }
  function cancelUploadConfirm() { setShowUploadConfirm(false); }

  async function doUpload() {
    setUploadError('');
    setShowUploadConfirm(false);
    setStartingUpload(true);
    try {
      const res = await startUpload(file);
      setShowUploadModal(false);
      const startedAt = Date.now();
      setTask({
        taskId: res.taskId,
        estimatedMillis: res.estimatedMillis,
        startedAt,
        totalRows: res.totalRows,
        savedRows: 0,
        status: 'RUNNING',
        errorMessage: null,
      });
      setFile(null);
      openProgressModal();
      startPolling(res.taskId);
      startTicker();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setStartingUpload(false);
    }
  }

  function openProgressModal() {
    if (pillRendered) {
      setPillShown(false);
      setTimeout(() => setPillRendered(false), ANIM_MS);
    }
    setModalRendered(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setModalShown(true))
    );
  }

  function minimizeToPill() {
    setModalShown(false);
    setPillRendered(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => setPillShown(true))
    );
    setTimeout(() => setModalRendered(false), ANIM_MS);
  }

  function maximizeFromPill() { openProgressModal(); }

  function dismissTask() {
    setModalShown(false);
    setPillShown(false);
    setTimeout(() => {
      setModalRendered(false);
      setPillRendered(false);
      setTask(null);
    }, ANIM_MS);
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
  }

  function startTicker() {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
  }

  function startPolling(taskId) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const s = await getUploadStatus(taskId);
        setTask(prev => prev ? {
          ...prev,
          savedRows: s.savedRows ?? prev.savedRows,
          status: s.status,
          errorMessage: s.errorMessage,
        } : prev);

        if (s.status === 'DONE' || s.status === 'ERROR') {
          clearInterval(pollRef.current); pollRef.current = null;
          clearInterval(tickRef.current); tickRef.current = null;
          if (s.status === 'DONE') {
            showToast('success', `Upload xong: ${s.totalRows} đơn`);
            loadNumbers();
            resetAndLoad();
          } else {
            showToast('error', 'Upload lỗi: ' + (s.errorMessage || 'không xác định'));
          }
        }
      } catch (e) {
        if (String(e.message).includes('không tồn tại')) {
          clearInterval(pollRef.current); pollRef.current = null;
          clearInterval(tickRef.current); tickRef.current = null;
        }
      }
    }, POLL_INTERVAL_MS);
  }

  function computeProgress() {
    if (!task) return 0;
    if (task.status === 'DONE') return 100;
    if (task.status === 'ERROR') return 0;
    const elapsed = now - task.startedAt;
    const timeRatio = task.estimatedMillis > 0 ? elapsed / task.estimatedMillis : 0;
    const rowRatio = task.totalRows > 0 ? task.savedRows / task.totalRows : 0;
    const ratio = Math.max(timeRatio, rowRatio);
    return Math.min(95, Math.round(ratio * 100));
  }

  function computeRemainingMs() {
    if (!task) return 0;
    if (task.status !== 'RUNNING') return 0;
    const elapsed = now - task.startedAt;
    if (task.savedRows > 0 && elapsed > 0) {
      const actualPerRow = elapsed / task.savedRows;
      const remainingRows = Math.max(0, task.totalRows - task.savedRows);
      return Math.round(actualPerRow * remainingRows);
    }
    return Math.max(0, task.estimatedMillis - elapsed);
  }

  // ============ SELECT + DELETE ============
  const allSelectedOnPage = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
  const someSelectedOnPage = rows.some(r => selectedIds.has(r.id));
  function toggleOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id); return next;
    });
  }
  function toggleAllOnPage() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelectedOnPage) rows.forEach(r => next.delete(r.id));
      else rows.forEach(r => next.add(r.id)); return next;
    });
  }
  function askDeleteOne(row) { setConfirmDelete({ type: 'single', id: row.id, account: row.account }); }
  function askDeleteBulk() {
    if (selectedIds.size === 0) return;
    setConfirmDelete({ type: 'bulk', ids: Array.from(selectedIds) });
  }
  async function doDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      if (confirmDelete.type === 'single') {
        await deleteOrder(confirmDelete.id);
        showToast('success', `Đã xóa đơn #${confirmDelete.id}`);
      } else {
        const results = await Promise.allSettled(confirmDelete.ids.map(id => deleteOrder(id)));
        const ok = results.filter(r => r.status === 'fulfilled').length;
        const fail = results.length - ok;
        if (fail === 0) showToast('success', `Đã xóa ${ok} đơn`);
        else showToast('error', `Xóa ${ok}/${results.length} đơn. Lỗi: ${fail} đơn`);
      }
      setConfirmDelete(null); setSelectedIds(new Set()); resetAndLoad();
    } catch (e) { showToast('error', e.message || 'Xóa thất bại'); }
    finally { setDeleting(false); }
  }

  async function handleSaveEdit() {
    if (!editRow) return;
    try { await updateOrder(editRow.id, editRow); setEditRow(null); resetAndLoad(); }
    catch (e) { showToast('error', e.message); }
  }

  function formatNumber(value) {
    if (value == null || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    return `${Math.round(number).toLocaleString('vi-VN')} đ`;
  }

  const selectedCount = selectedIds.size;
  const progress = computeProgress();
  const remainingMs = computeRemainingMs();
  const elapsedMs = task ? now - task.startedAt : 0;
  const isRunning = task?.status === 'RUNNING';
  const isDone = task?.status === 'DONE';
  const isError = task?.status === 'ERROR';

  // Hiển thị trên nút tròn "số đang xử lý" — ghép ngắn
  const floatingNumbersLabel = (
    <div className="flex flex-col leading-tight text-[10px] font-bold">
      <span>V:{numbers.superVip ?? '—'}</span>
      <span>U:{numbers.vip ?? '—'}</span>
      <span>T:{numbers.normal ?? '—'}</span>
    </div>
  );

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-3 shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Quản lý đơn hàng</h1>
        <p className="text-sm text-gray-500 mb-4">Tìm kiếm, cập nhật, xóa dữ liệu đã upload</p>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tìm theo tài khoản</label>
              <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                placeholder="Nhập tài khoản... (để trống để xem tất cả)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
              <select value={sheetFilter} onChange={(e) => setSheetFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none">
                {SHEET_TYPES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 pb-6">
        <div className="h-full rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
          <div ref={scrollRef} onScroll={handleTableScroll} className="flex-1 overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-center whitespace-nowrap w-10">
                    <input type="checkbox" checked={allSelectedOnPage}
                      ref={el => { if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage; }}
                      onChange={toggleAllOnPage}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">STT</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Tài khoản</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Gói DV</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Giá</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Ưu tiên / Phí</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Vùng</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Game</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Ngày đặt</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Số ngày treo</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">TT Hoàn tiền</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">TT Đơn</th>
                  <th className="px-3 py-2 text-right pr-28 whitespace-nowrap">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingRows ? (
                  <tr><td colSpan="13" className="px-3 py-6 text-center text-gray-500">Đang tải...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan="13" className="px-3 py-6 text-center text-gray-500">Không có dữ liệu</td></tr>
                ) : rows.map((r) => {
                  const checked = selectedIds.has(r.id);
                  return (
                    <tr key={r.id} className={`transition ${checked ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={checked} onChange={() => toggleOne(r.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">#{r.sheetSequence ?? '—'}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r.account ? (
                          <button onClick={() => copyToClipboard(r.account, 'tài khoản')} title="Click để copy"
                            className="text-left rounded px-1 -mx-1 py-0.5 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer">
                            {r.account}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">{r.servicePackage}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatNumber(r.servicePrice)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.priorityRegister || '—'}
                        {r.priorityFee ? <span className="text-xs text-gray-500 ml-1">({formatNumber(r.priorityFee)})</span> : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.regionRegister || '—'}
                        {r.regionSelected ? <span className="text-xs text-gray-500 ml-1">({r.regionSelected})</span> : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.gameRegister || '—'}
                        {r.gameSelected ? <span className="text-xs text-gray-500 ml-1">({r.gameSelected})</span> : null}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.orderDate)}</td>
                      <td className="px-3 py-2 text-center">{r.holdDays ?? '—'}</td>
                      <td className="px-3 py-2">{r.refundNoteStatus || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2">{r.orderNoteStatus || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2 text-right pr-28 whitespace-nowrap">
                        <button onClick={() => setEditRow({ ...r })}
                          className="rounded bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600 mr-1">Sửa</button>
                        <button onClick={() => askDeleteOne(r)}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600">Xóa</button>
                      </td>
                    </tr>
                  );
                })}
                {loadingMore && (<tr><td colSpan="13" className="px-3 py-4 text-center text-gray-500 text-xs">Đang tải thêm...</td></tr>)}
                {!hasMore && rows.length > 0 && !loadingRows && (<tr><td colSpan="13" className="px-3 py-4 text-center text-gray-400 text-xs">— Đã hết dữ liệu —</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating: bulk delete */}
      {selectedCount > 0 && (
        <div className={`fixed right-6 z-40 transition-all duration-300 ${showBackToTop ? 'bottom-[15rem]' : 'bottom-[10.5rem]'}`}>
          <button onClick={askDeleteBulk} title={`Xóa ${selectedCount} đơn đã chọn`}
            className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                       bg-gradient-to-br from-red-500 to-rose-600 hover:scale-110 hover:shadow-xl transition-all duration-200">
            <TrashIcon size={22} />
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-red-600 text-[11px] font-bold flex items-center justify-center border-2 border-red-500 leading-none">{selectedCount}</span>
          </button>
        </div>
      )}

      {/* Floating: numbers */}
      <div className="fixed bottom-6 right-6 z-40">
        <button onClick={() => setShowNumbersModal(true)} title="Các số đang xử lý"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                     bg-gradient-to-br from-indigo-500 to-purple-600 opacity-60 hover:opacity-100 hover:scale-110 hover:shadow-xl transition-all duration-200">
          {floatingNumbersLabel}
        </button>
      </div>

      {/* Floating: upload */}
      <div className="fixed bottom-24 right-6 z-40">
        <button onClick={() => setShowUploadModal(true)} title="Upload Excel"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                     bg-gradient-to-br from-emerald-500 to-teal-600 opacity-60 hover:opacity-100 hover:scale-110 hover:shadow-xl transition-all duration-200">
          <UploadIcon size={22} />
        </button>
      </div>

      {/* Floating: announcement edit (bên trái, không đụng cụm nút bên phải) */}
      <div className="fixed bottom-6 left-6 z-40">
        <button
          onClick={openAnnouncementModal}
          title="Chỉnh sửa thông báo"
          className={`relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                     bg-gradient-to-br from-pink-500 to-rose-600 opacity-70 hover:opacity-100 hover:scale-110 hover:shadow-xl transition-all duration-200`}
        >
          <MegaphoneIcon size={22} />
          {announcement && announcement.trim() ? (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-rose-600 text-[10px] font-bold flex items-center justify-center border-2 border-rose-500 leading-none">●</span>
          ) : null}
        </button>
      </div>

      {/* Floating: back to top */}
      <div className={`fixed bottom-[10.5rem] right-6 z-40 transition-all duration-300
        ${showBackToTop ? 'opacity-60 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <button onClick={scrollToTop} title="Lên đầu"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                     bg-gradient-to-br from-slate-600 to-slate-800 hover:opacity-100 hover:scale-110 hover:shadow-xl transition-all duration-200">
          <ArrowUpIcon size={22} />
        </button>
      </div>

      {/* ============= PROGRESS: PILL ============= */}
      {pillRendered && task && (
        <button
          onClick={maximizeFromPill}
          title="Mở lại tiến trình upload"
          style={{ transitionDuration: `${ANIM_MS}ms`, transformOrigin: 'top right' }}
          className={`fixed top-6 right-6 z-40 flex items-center gap-3 rounded-full px-4 py-2.5 text-white shadow-lg
                      transition-all ease-out
                      ${isDone ? 'bg-gradient-to-br from-green-500 to-emerald-600'
              : isError ? 'bg-gradient-to-br from-red-500 to-rose-600'
                : 'bg-gradient-to-br from-blue-500 to-indigo-600'}
                      ${pillShown ? 'opacity-100 scale-100 translate-x-0 translate-y-0' : 'opacity-0 scale-0'}
                    `}
        >
          {isDone ? <CheckIcon size={18} /> : isError ? <XIcon size={18} /> : (
            <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.3" strokeWidth="3" />
              <path d="M12 2 A10 10 0 0 1 22 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          )}
          <span className="text-sm font-semibold">
            {isDone ? 'Upload xong' : isError ? 'Upload lỗi' : `Upload ${progress}%`}
          </span>
          {(isDone || isError) && (
            <span
              onClick={(e) => { e.stopPropagation(); dismissTask(); }}
              className="ml-1 rounded-full p-1 hover:bg-white/20 transition"
              role="button" aria-label="Đóng"
            >
              <XIcon size={14} />
            </span>
          )}
        </button>
      )}

      {/* ============= PROGRESS: MODAL ============= */}
      {modalRendered && task && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            style={{ transitionDuration: `${ANIM_MS}ms` }}
            onClick={() => (isRunning ? minimizeToPill() : dismissTask())}
            className={`absolute inset-0 bg-black transition-opacity
              ${modalShown ? 'bg-opacity-50 pointer-events-auto' : 'bg-opacity-0 pointer-events-none'}`}
          />
          <div
            style={{
              transitionDuration: `${ANIM_MS}ms`,
              transformOrigin: 'top right',
            }}
            className={`absolute top-1/2 left-1/2 pointer-events-auto
              bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-md p-6
              transition-all ease-out
              ${modalShown
                ? 'opacity-100 scale-100 -translate-x-1/2 -translate-y-1/2'
                : 'opacity-0 scale-0 translate-x-[calc(50vw-3.5rem-100%)] translate-y-[calc(-50vh+2rem)]'
              }`}
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">
                {isDone ? '✅ Upload hoàn tất' : isError ? '❌ Upload lỗi' : '⏳ Đang xử lý upload'}
              </h3>
              <button
                onClick={() => (isRunning ? minimizeToPill() : dismissTask())}
                className="rounded p-1 hover:bg-gray-100 text-gray-500"
                title={isRunning ? 'Thu nhỏ' : 'Đóng'}
              >
                {isRunning ? <MinimizeIcon size={18} /> : <XIcon size={18} />}
              </button>
            </div>

            <div className="mb-4">
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-sm text-gray-600">Tiến độ</span>
                <span className={`text-2xl font-bold ${isError ? 'text-red-600' : isDone ? 'text-green-600' : 'text-blue-600'}`}>
                  {progress}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ease-out
                    ${isError ? 'bg-red-500' : isDone ? 'bg-green-500' : 'bg-gradient-to-r from-blue-500 to-indigo-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-gray-500">Đã xử lý</div>
                <div className="font-semibold text-gray-800">{task.savedRows} / {task.totalRows} đơn</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-gray-500">Đã trôi qua</div>
                <div className="font-semibold text-gray-800">{formatDuration(elapsedMs)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-gray-500">Dự kiến</div>
                <div className="font-semibold text-gray-800">{formatDuration(task.estimatedMillis)}</div>
              </div>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                <div className="text-xs text-gray-500">Còn lại</div>
                <div className="font-semibold text-gray-800">{isRunning ? formatDuration(remainingMs) : '—'}</div>
              </div>
            </div>

            {isError && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {task.errorMessage || 'Có lỗi xảy ra trong quá trình upload'}
              </div>
            )}
            {isDone && (
              <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Đã import {task.totalRows} đơn thành công. Data cũ đã được xóa.
              </div>
            )}

            <div className="mt-5 flex justify-end gap-2">
              {isRunning ? (
                <button onClick={minimizeToPill}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">
                  <MinimizeIcon size={16} /> Thu nhỏ
                </button>
              ) : (
                <button onClick={dismissTask}
                  className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white">
                  Đóng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed top-6 right-6 z-[60] rounded-lg px-4 py-3 text-sm text-white shadow-lg transition
          ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Modal xóa */}
      <Modal open={!!confirmDelete} onClose={() => !deleting && setConfirmDelete(null)} title="Xác nhận xóa" maxWidth="max-w-md">
        {confirmDelete && (
          <div>
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <TrashIcon size={20} />
              </div>
              <div className="flex-1">
                {confirmDelete.type === 'single' ? (
                  <p className="text-sm text-gray-700">Bạn có chắc muốn xóa đơn <b>#{confirmDelete.id}</b>{confirmDelete.account ? <> của tài khoản <b>{confirmDelete.account}</b></> : null}?</p>
                ) : (
                  <p className="text-sm text-gray-700">Bạn có chắc muốn xóa <b>{confirmDelete.ids.length}</b> đơn đã chọn?</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60">Hủy</button>
              <button onClick={doDelete} disabled={deleting} className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-60">
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal confirm upload */}
      <Modal open={showUploadConfirm} onClose={cancelUploadConfirm} title="Xác nhận upload" maxWidth="max-w-md">
        <div>
          <div className="flex gap-3 items-start">
            <div className="shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
              <WarningIcon size={22} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">Bạn có chắc muốn upload file <b>{file?.name}</b>?</p>
              <p className="text-sm text-red-600 mt-2 font-medium">Toàn bộ dữ liệu cũ sẽ bị xóa sạch trước khi import file mới.</p>
              <p className="text-xs text-gray-500 mt-1">Thao tác này không thể hoàn tác.</p>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button onClick={cancelUploadConfirm} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50">Hủy</button>
            <button onClick={doUpload} className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white">Xác nhận upload</button>
          </div>
        </div>
      </Modal>

      {/* Modal number — 3 loại */}
      <Modal open={showNumbersModal} onClose={() => setShowNumbersModal(false)} title="Các số đang xử lý" maxWidth="max-w-lg">
        <div className="space-y-4">
          {PROCESSING_TYPES.map((t) => (
            <div key={t.key} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-sm font-medium text-gray-800">{t.label}</div>
                  <div className="text-xs text-gray-500">
                    Hiện tại: <b className="tabular-nums">{numbers[t.key] ?? '—'}</b>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={draftNumbers[t.key]}
                  onChange={(e) => handleDraftChange(t.key, e.target.value)}
                  placeholder="VD: 125"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
                <button
                  onClick={() => handleSaveNumber(t)}
                  disabled={savingType === t.key}
                  className={`rounded-lg px-3 py-2 text-sm text-white disabled:opacity-60 ${t.color}`}
                >
                  {savingType === t.key ? '...' : 'Lưu'}
                </button>
                <button
                  onClick={() => handleQuickIncrement(t)}
                  disabled={savingType === t.key}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-60"
                  title="Cộng 1 cho loại này"
                >
                  +1
                </button>
              </div>
            </div>
          ))}
        </div>
      </Modal>

      {/* Modal upload */}
      <Modal
        open={showUploadModal && !showUploadConfirm}
        onClose={() => !startingUpload && setShowUploadModal(false)}
        title="Upload file Excel"
      >
        <div className="mb-3">
          <a href={`${BASE_URL}/api/shop-orders/template`} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline" download>
            📥 Tải file mẫu (xlsx)
          </a>
        </div>
        <DragDropZone file={file} onFileSelected={setFile} />
        <button onClick={askUpload}
          disabled={isRunning || startingUpload}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-60">
          {startingUpload ? 'Đang gửi file...' : isRunning ? 'Đang có upload chạy...' : 'Upload'}
        </button>
        {uploadError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{uploadError}</div>
        )}
      </Modal>

      {/* Modal thông báo — editor trái / preview phải trên md+, xếp dọc trên mobile */}
      <Modal
        open={showAnnouncementModal}
        onClose={() => !(savingAnnouncement || clearingAnnouncement) && setShowAnnouncementModal(false)}
        title="Thông báo (hiển thị bên trang tra cứu)"
        maxWidth="max-w-6xl"
      >
        <div className="flex flex-col h-full min-h-0 gap-3">
          <p className="text-xs text-slate-500 shrink-0">
            Thông báo này sẽ hiển thị thành cột trái bên trang tra cứu đơn hàng (30% desktop, phía trên trên điện thoại).
            Nội dung <b>rỗng</b> → không hiển thị thông báo, bảng tra cứu trở lại full width.
          </p>

          <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">
            {/* Cột trái: editor */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="text-xs font-medium text-slate-500 mb-1 shrink-0">Soạn thảo</div>
              <div className="flex-1 min-h-0 overflow-auto">
                <RichTextEditor
                  value={announcementDraft}
                  onChange={setAnnouncementDraft}
                  placeholder="Nhập nội dung thông báo (có thể in đậm, in nghiêng, màu, bullet, canh lề...)"
                  minHeight="320px"
                />
              </div>
            </div>

            {/* Cột phải: preview — mô phỏng khung thông báo bên trang tra cứu */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div className="text-xs font-medium text-slate-500 mb-1 shrink-0">Xem trước</div>
              <div className="flex-1 min-h-0 rounded-lg border border-slate-200 bg-white overflow-hidden flex flex-col">
                <div className="shrink-0 px-3 py-2 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                  <div className="text-sm font-semibold text-indigo-700 flex items-center gap-2">
                    <span>📣</span> Thông báo
                  </div>
                </div>
                <div
                  className="announcement-content flex-1 min-h-0 overflow-auto p-3 text-sm text-slate-800"
                  dangerouslySetInnerHTML={{ __html: announcementDraft || '<span class="text-slate-400">(trống)</span>' }}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-2 pt-1 shrink-0 border-t border-slate-100 -mx-5 px-5 pt-3">
            <button
              type="button"
              onClick={handleClearAnnouncement}
              disabled={savingAnnouncement || clearingAnnouncement || !announcement}
              className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              title="Xóa hẳn thông báo (table sẽ trở lại full width)"
            >
              {clearingAnnouncement ? 'Đang xóa...' : 'Xóa thông báo'}
            </button>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                disabled={savingAnnouncement || clearingAnnouncement}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveAnnouncement}
                disabled={savingAnnouncement || clearingAnnouncement}
                className="rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {savingAnnouncement ? 'Đang lưu...' : 'Lưu thông báo'}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Modal edit — chỉ các field còn trong entity mới */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Sửa đơn #${editRow?.id}`}>
        {editRow && (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {[
              ['customerName', 'Tên khách'],
              ['orderPlace', 'Chỗ order'],
              ['servicePackage', 'Gói DV'],
              ['account', 'Tài khoản'],
              ['priorityRegister', 'Đăng ký ưu tiên (Có/Không)'],
              ['priorityFee', 'Phí ưu tiên'],
              ['regionRegister', 'Đăng ký chọn vùng (Có/Không)'],
              ['regionSelected', 'Vùng chọn'],
              ['gameRegister', 'Đăng ký chọn game (Có/Không)'],
              ['gameSelected', 'Game chọn'],
              ['servicePrice', 'Giá chốt'],
              ['actualAmount', 'Thực nhận'],
              ['orderDate', 'Ngày đặt (yyyy-MM-dd)'],
              ['holdDays', 'Số ngày treo'],
              ['refundNoteStatus', 'TT hoàn tiền'],
              ['orderNoteStatus', 'TT đơn'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input type="text" value={editRow[field] ?? ''}
                  onChange={(e) => setEditRow({ ...editRow, [field]: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditRow(null)} className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={handleSaveEdit} className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">Lưu</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
