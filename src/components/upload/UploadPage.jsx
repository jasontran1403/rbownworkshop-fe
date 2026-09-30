import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Modal from '../common/Modal';
import DragDropZone from './DragDropZone';
import UploadResult from './UploadResult';
import { useDebounce } from '../../hooks/useDebounce';
import { formatDate } from '../../utils/format';
import {
  uploadExcel,
  getProcessingNumber,
  updateProcessingNumber,
  managementSearchPaged,
  deleteOrder,
  updateOrder,
} from '../../api/shopOrderApi';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:9879';
const PAGE_SIZE = 100;

const SHEET_TYPES = [
  { value: 'NORMAL', label: 'Thường' },
  { value: 'VIP', label: 'Ưu tiên' },
  { value: 'SUPER_VIP', label: 'Ưu tiên VIP' },
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

function EyeIcon({ size = 14 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function TrashIcon({ size = 22 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

export default function UploadPage() {
  const [showNumberModal, setShowNumberModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showProtectionModal, setShowProtectionModal] = useState(null); // { code, account }

  // Confirm delete modal:
  //   { type: 'single', id, account } | { type: 'bulk', ids: number[] } | null
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Config number
  const [currentNumber, setCurrentNumber] = useState('');
  const [savedNumber, setSavedNumber] = useState(null);
  const [savingNumber, setSavingNumber] = useState(false);

  // Upload
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [uploadError, setUploadError] = useState('');

  // Table + pagination
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 600);
  const [sheetFilter, setSheetFilter] = useState('NORMAL');
  const [editRow, setEditRow] = useState(null);

  // Multi-select
  const [selectedIds, setSelectedIds] = useState(() => new Set());

  // Toast
  const [toast, setToast] = useState(null);

  // Scroll container
  const scrollRef = useRef(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => { loadNumber(); }, []);

  useEffect(() => {
    resetAndLoad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedKeyword, sheetFilter]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  async function loadNumber() {
    try {
      const val = await getProcessingNumber();
      if (val != null) {
        setCurrentNumber(String(val));
        setSavedNumber(val);
      }
    } catch (e) { /* noop */ }
  }

  async function resetAndLoad() {
    setLoadingRows(true);
    setHasMore(true);
    setSelectedIds(new Set());
    try {
      const data = await managementSearchPaged(debouncedKeyword, sheetFilter, 0, PAGE_SIZE);
      const items = data?.items || [];
      setRows(items);
      setPage(0);
      setHasMore(!!data?.hasMore);
    } catch (e) {
      console.error(e);
      setRows([]);
      showToast('error', e.message || 'Lỗi tải dữ liệu');
    } finally {
      setLoadingRows(false);
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const data = await managementSearchPaged(debouncedKeyword, sheetFilter, next, PAGE_SIZE);
      const items = data?.items || [];
      setRows(prev => [...prev, ...items]);
      setPage(next);
      setHasMore(!!data?.hasMore);
    } catch (e) {
      console.error(e);
      showToast('error', e.message || 'Lỗi tải thêm dữ liệu');
      // Dừng auto-load thêm để tránh spam khi bị rate limit
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [debouncedKeyword, sheetFilter, page, hasMore, loadingMore]);

  function handleTableScroll(e) {
    const el = e.currentTarget;
    setShowBackToTop(el.scrollTop > 300);
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 250) {
      loadMore();
    }
  }

  function scrollToTop() {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showToast(type, msg) { setToast({ type, msg }); }

  async function copyToClipboard(text, label) {
    if (text == null || text === '') {
      showToast('error', 'Không có dữ liệu để copy');
      return;
    }
    const value = String(text);
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      showToast('success', `Đã copy ${label}`);
    } catch (e) {
      showToast('error', 'Copy thất bại');
    }
  }

  function handleNumberChange(e) {
    setCurrentNumber(e.target.value.replace(/[^0-9]/g, ''));
  }

  async function handleSaveNumber() {
    setSavingNumber(true);
    try {
      const v = currentNumber === '' ? null : Number(currentNumber);
      const updated = await updateProcessingNumber(v);
      setSavedNumber(updated);
      showToast('success', 'Đã lưu số đang xử lý');
    } catch (e) {
      showToast('error', 'Lỗi: ' + e.message);
    } finally {
      setSavingNumber(false);
    }
  }

  async function handleQuickIncrement() {
    setSavingNumber(true);
    try {
      const base = Number(currentNumber || savedNumber || 0);
      const next = (Number.isFinite(base) ? base : 0) + 1;
      const updated = await updateProcessingNumber(next);
      setSavedNumber(updated);
      setCurrentNumber(String(updated ?? next));
      showToast('success', `Đã cập nhật lên ${updated ?? next}`);
    } catch (e) {
      showToast('error', 'Lỗi: ' + e.message);
    } finally {
      setSavingNumber(false);
    }
  }

  async function handleUpload() {
    if (!file) { setUploadError('Vui lòng chọn file'); return; }
    setUploadError('');
    setUploading(true);
    setResult(null);
    try {
      const r = await uploadExcel(file);
      setResult(r);
      setFile(null);
      resetAndLoad();
    } catch (e) {
      setUploadError(e.message);
    } finally {
      setUploading(false);
    }
  }

  // ===================== SELECT =====================
  const allSelectedOnPage = rows.length > 0 && rows.every(r => selectedIds.has(r.id));
  const someSelectedOnPage = rows.some(r => selectedIds.has(r.id));

  function toggleOne(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelectedOnPage) {
        rows.forEach(r => next.delete(r.id));
      } else {
        rows.forEach(r => next.add(r.id));
      }
      return next;
    });
  }

  // ===================== DELETE (with confirm modal) =====================
  function askDeleteOne(row) {
    setConfirmDelete({ type: 'single', id: row.id, account: row.account });
  }

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
        // Bulk: gọi song song. Nếu backend có endpoint bulk, thay chỗ này.
        const results = await Promise.allSettled(
          confirmDelete.ids.map(id => deleteOrder(id))
        );
        const ok = results.filter(r => r.status === 'fulfilled').length;
        const fail = results.length - ok;
        if (fail === 0) {
          showToast('success', `Đã xóa ${ok} đơn`);
        } else {
          showToast('error', `Xóa ${ok}/${results.length} đơn. Lỗi: ${fail} đơn`);
        }
      }
      setConfirmDelete(null);
      setSelectedIds(new Set());
      resetAndLoad();
    } catch (e) {
      showToast('error', e.message || 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  }

  async function handleSaveEdit() {
    if (!editRow) return;
    try {
      await updateOrder(editRow.id, editRow);
      setEditRow(null);
      resetAndLoad();
    } catch (e) {
      showToast('error', e.message);
    }
  }

  function formatNumber(value) {
    if (value == null || value === '') return '—';
    const number = Number(value);
    if (!Number.isFinite(number)) return value;
    return `${Math.round(number).toLocaleString('vi-VN')} đ`;
  }

  const selectedCount = selectedIds.size;

  return (
    <div className="h-screen w-full bg-gray-50 flex flex-col overflow-hidden">
      <div className="w-full px-4 sm:px-6 lg:px-8 pt-6 pb-3 shrink-0">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Quản lý đơn hàng</h1>
        <p className="text-sm text-gray-500 mb-4">
          Tìm kiếm, cập nhật, xóa dữ liệu đã upload
        </p>

        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tìm theo tài khoản
              </label>
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Nhập tài khoản... (để trống để xem tất cả)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại</label>
              <select
                value={sheetFilter}
                onChange={(e) => setSheetFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                {SHEET_TYPES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Table area — chỉ vùng này scroll */}
      <div className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 pb-6">
        <div className="h-full rounded-xl border bg-white shadow-sm overflow-hidden flex flex-col">
          <div
            ref={scrollRef}
            onScroll={handleTableScroll}
            className="flex-1 overflow-auto"
          >
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-center whitespace-nowrap w-10">
                    <input
                      type="checkbox"
                      checked={allSelectedOnPage}
                      ref={el => { if (el) el.indeterminate = !allSelectedOnPage && someSelectedOnPage; }}
                      onChange={toggleAllOnPage}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      aria-label="Chọn tất cả"
                    />
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Số thứ tự</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Tài khoản</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Mật khẩu</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Mã bảo vệ</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Số ngày treo</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Gói DV</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Giá</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Ngày đặt</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Ngày giao</th>
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
                    <tr
                      key={r.id}
                      className={`transition ${checked ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleOne(r.id)}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          aria-label={`Chọn đơn ${r.id}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                          #{r.id}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {r.account ? (
                          <button
                            onClick={() => copyToClipboard(r.account, 'tài khoản')}
                            title="Click để copy"
                            className="text-left rounded px-1 -mx-1 py-0.5 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer"
                          >
                            {r.account}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-700">
                        {r.password ? (
                          <button
                            onClick={() => copyToClipboard(r.password, 'mật khẩu')}
                            title="Click để copy"
                            className="text-left rounded px-1 -mx-1 py-0.5 hover:bg-blue-50 hover:text-blue-700 transition cursor-pointer font-mono"
                          >
                            {r.password}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        {r.protectionCode ? (
                          <button
                            onClick={() => setShowProtectionModal({ code: r.protectionCode, account: r.account })}
                            className="inline-flex items-center gap-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 text-xs font-medium transition"
                          >
                            <EyeIcon size={12} /> Xem
                          </button>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-3 py-2 text-center">{r.holdDays ?? '—'}</td>
                      <td className="px-3 py-2">{r.servicePackage}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatNumber(r.servicePrice)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.orderDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(r.deliveryDate)}</td>
                      <td className="px-3 py-2">{r.refundNoteStatus || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2">{r.orderNoteStatus || <span className="text-gray-400">—</span>}</td>
                      <td className="px-3 py-2 text-right pr-28 whitespace-nowrap">
                        <button
                          onClick={() => setEditRow({ ...r })}
                          className="rounded bg-amber-500 px-2 py-1 text-xs text-white hover:bg-amber-600 mr-1"
                        >Sửa</button>
                        <button
                          onClick={() => askDeleteOne(r)}
                          className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                        >Xóa</button>
                      </td>
                    </tr>
                  );
                })}
                {loadingMore && (
                  <tr><td colSpan="13" className="px-3 py-4 text-center text-gray-500 text-xs">Đang tải thêm...</td></tr>
                )}
                {!hasMore && rows.length > 0 && !loadingRows && (
                  <tr><td colSpan="13" className="px-3 py-4 text-center text-gray-400 text-xs">— Đã hết dữ liệu —</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Floating buttons */}

      {/* Bulk delete — chỉ hiện khi có chọn */}
      {selectedCount > 0 && (
        <div
          className={`fixed right-6 z-40 transition-all duration-300
            ${showBackToTop ? 'bottom-[15rem]' : 'bottom-[10.5rem]'}`}
        >
          <button
            onClick={askDeleteBulk}
            title={`Xóa ${selectedCount} đơn đã chọn`}
            className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                       bg-gradient-to-br from-red-500 to-rose-600
                       hover:scale-110 hover:shadow-xl
                       transition-all duration-200"
          >
            <TrashIcon size={22} />
            <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 rounded-full bg-white text-red-600 text-[11px] font-bold flex items-center justify-center border-2 border-red-500 leading-none">
              {selectedCount}
            </span>
          </button>
        </div>
      )}

      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowNumberModal(true)}
          title="Số đang xử lý"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg font-bold text-lg
                     bg-gradient-to-br from-indigo-500 to-purple-600
                     opacity-60 hover:opacity-100 hover:scale-110 hover:shadow-xl
                     transition-all duration-200"
        >
          {savedNumber ?? '—'}
        </button>
      </div>

      <div className="fixed bottom-24 right-6 z-40">
        <button
          onClick={() => setShowUploadModal(true)}
          title="Upload Excel"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                     bg-gradient-to-br from-emerald-500 to-teal-600
                     opacity-60 hover:opacity-100 hover:scale-110 hover:shadow-xl
                     transition-all duration-200"
        >
          <UploadIcon size={22} />
        </button>
      </div>

      <div
        className={`fixed bottom-[10.5rem] right-6 z-40 transition-all duration-300
          ${showBackToTop ? 'opacity-60 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'}`}
      >
        <button
          onClick={scrollToTop}
          title="Lên đầu"
          className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg
                     bg-gradient-to-br from-slate-600 to-slate-800
                     hover:opacity-100 hover:scale-110 hover:shadow-xl
                     transition-all duration-200"
        >
          <ArrowUpIcon size={22} />
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg transition ${
            toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Modal xác nhận xóa */}
      <Modal
        open={!!confirmDelete}
        onClose={() => !deleting && setConfirmDelete(null)}
        title="Xác nhận xóa"
        maxWidth="max-w-md"
      >
        {confirmDelete && (
          <div>
            <div className="flex gap-3 items-start">
              <div className="shrink-0 w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <TrashIcon size={20} />
              </div>
              <div className="flex-1">
                {confirmDelete.type === 'single' ? (
                  <p className="text-sm text-gray-700">
                    Bạn có chắc muốn xóa đơn <b>#{confirmDelete.id}</b>
                    {confirmDelete.account ? <> của tài khoản <b>{confirmDelete.account}</b></> : null}?
                  </p>
                ) : (
                  <p className="text-sm text-gray-700">
                    Bạn có chắc muốn xóa <b>{confirmDelete.ids.length}</b> đơn đã chọn?
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Thao tác này không thể hoàn tác.</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deleting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={doDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                {deleting ? 'Đang xóa...' : 'Xóa'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal số đang xử lý */}
      <Modal open={showNumberModal} onClose={() => setShowNumberModal(false)} title="Số đang xử lý hiện tại" maxWidth="max-w-md">
        <label className="block text-sm font-medium text-gray-700 mb-1">Số hiện tại</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={currentNumber}
          onChange={handleNumberChange}
          onWheel={(e) => e.currentTarget.blur()}
          onKeyDown={(e) => {
            if (['ArrowUp', 'ArrowDown', 'e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault();
          }}
          placeholder="VD: 125"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none
                     [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleSaveNumber}
            disabled={savingNumber}
            className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {savingNumber ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button
            onClick={handleQuickIncrement}
            disabled={savingNumber}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            + Cập nhật nhanh
          </button>
        </div>
      </Modal>

      {/* Modal upload */}
      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)} title="Upload file Excel">
        <div className="mb-3">
          <a
            href={`${BASE_URL}/api/shop-orders/template`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            download
          >
            📥 Tải file mẫu (xlsx)
          </a>
        </div>
        <DragDropZone file={file} onFileSelected={setFile} />
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="mt-4 w-full rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white hover:bg-green-700 disabled:opacity-60"
        >
          {uploading ? 'Đang xử lý...' : 'Upload'}
        </button>
        {uploadError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}
        <UploadResult result={result} />
      </Modal>

      {/* Modal mã bảo vệ */}
      <Modal
        open={!!showProtectionModal}
        onClose={() => setShowProtectionModal(null)}
        title={`Mã bảo vệ${showProtectionModal?.account ? ' — ' + showProtectionModal.account : ''}`}
        maxWidth="max-w-md"
      >
        {showProtectionModal && (
          <div>
            <pre className="whitespace-pre-wrap break-all font-mono text-sm bg-slate-50 border border-slate-200 rounded-lg p-4 text-slate-800 leading-relaxed">
{showProtectionModal.code}
            </pre>
            <button
              onClick={() => copyToClipboard(showProtectionModal.code, 'mã bảo vệ')}
              className="mt-3 rounded-lg bg-slate-700 hover:bg-slate-800 px-4 py-2 text-white text-sm"
            >
              Copy
            </button>
          </div>
        )}
      </Modal>

      {/* Modal edit */}
      <Modal open={!!editRow} onClose={() => setEditRow(null)} title={`Sửa đơn #${editRow?.id}`}>
        {editRow && (
          <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
            {[
              ['customerName', 'Tên khách'],
              ['orderPlace', 'Chỗ order'],
              ['servicePackage', 'Gói DV'],
              ['account', 'Tài khoản'],
              ['password', 'Mật khẩu'],
              ['priorityRegister', 'Đăng ký ưu tiên (Có/Không)'],
              ['priorityFee', 'Phí ưu tiên'],
              ['regionIp', 'IP vùng'],
              ['game20k', 'Game 20k'],
              ['servicePrice', 'Giá DV'],
              ['actualAmount', 'Thực nhận'],
              ['orderDate', 'Ngày đặt (yyyy-MM-dd)'],
              ['deliveryDate', 'Ngày giao (yyyy-MM-dd)'],
              ['holdDays', 'Số ngày treo'],
              ['regionTransferStatus', 'TT chuyển vùng'],
              ['depositRefund', 'Hoàn cọc'],
              ['refundNoteStatus', 'TT hoàn tiền (note)'],
              ['orderNoteStatus', 'TT đơn (note)'],
              ['noteRBown', 'Ghi chú R Bown'],
              ['noteLogAcc', 'Ghi chú log acc'],
              ['noteAddMoneyLogAcc', 'Ghi chú cộng tiền log acc'],
              ['noteAccError', 'Ghi chú acc lỗi'],
              ['noteAddMoneyFixAcc', 'Ghi chú cộng tiền fix lỗi acc'],
            ].map(([field, label]) => (
              <div key={field}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                <input
                  type="text"
                  value={editRow[field] ?? ''}
                  onChange={(e) => setEditRow({ ...editRow, [field]: e.target.value })}
                  className="w-full rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditRow(null)}
                className="rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
              >Hủy</button>
              <button
                onClick={handleSaveEdit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
              >Lưu</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}