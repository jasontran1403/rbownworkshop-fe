import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchInput from './SearchInput';
import OrderTable from './OrderTable';
import OrderCard from './OrderCard';
import { useDebounce } from '../../hooks/useDebounce';
import ImageLightbox from '../common/ImageLightbox';
import {
  searchOrders,
  getProcessingNumbers,
  getAnnouncement,
} from '../../api/shopOrderApi';

const FILTER_OPTIONS = [
  { value: 'NORMAL',    label: 'Thường' },
  { value: 'VIP',       label: 'Ưu tiên' },
  { value: 'SUPER_VIP', label: 'Ưu tiên VIP' },
];

function AdSlot({ label }) {
  const base =
    'flex items-center justify-center border-2 border-dashed rounded-xl ' +
    'bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200 ' +
    'text-slate-400 text-xs font-medium tracking-wide select-none h-full w-full ' +
    'cursor-pointer transition-all hover:border-slate-300 hover:from-slate-100 hover:to-slate-200 hover:text-slate-500';

  return (
    <div className={base}>
      <div className="text-center">
        <div className="text-2xl mb-1">📢</div>
        <div>{label}</div>
        <div className="mt-1 text-[10px] text-slate-300">Ad Placeholder</div>
      </div>
    </div>
  );
}

/** Panel thông báo (HTML), scroll trong nội bộ. */
function AnnouncementPanel({ html }) {
  const containerRef = useRef(null);
  const [zoomSrc, setZoomSrc] = useState(null);

  // Delegate click: nếu click vào <img> → mở lightbox
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onClick(e) {
      const t = e.target;
      if (t && t.tagName === 'IMG' && t.src) {
        e.preventDefault();
        setZoomSrc(t.src);
      }
    }
    el.addEventListener('click', onClick);
    return () => el.removeEventListener('click', onClick);
  }, [html]);

  return (
    <>
      <div className="h-full rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="shrink-0 px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h2 className="text-sm sm:text-base font-semibold text-indigo-700 flex items-center gap-2">
            <span>📣</span> Thông báo
          </h2>
        </div>
        <div
          ref={containerRef}
          className="announcement-content flex-1 min-h-0 overflow-auto p-4 text-sm text-slate-800"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>

      <ImageLightbox src={zoomSrc} onClose={() => setZoomSrc(null)} />
    </>
  );
}

function ProcessingNumbersPanel({ numbers }) {
  if (!numbers) return null;
  const rows = [
    { label: 'Ưu tiên VIP', value: numbers.superVip, color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { label: 'Ưu tiên',     value: numbers.vip,      color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { label: 'Thường',      value: numbers.normal,   color: 'bg-blue-100  text-blue-800  border-blue-200'   },
  ];
  return (
    <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 items-stretch">
      {rows.map((r) => (
        <span
          key={r.label}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-medium border ${r.color}`}
        >
          <span className="w-2 h-2 rounded-full bg-current opacity-70" />
          {r.label}: <b className="tabular-nums">{r.value ?? '—'}</b>
        </span>
      ))}
    </div>
  );
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const accountParam = searchParams.get('account') || '';
  const sheetTypeParam = searchParams.get('sheetType') || 'NORMAL';

  const [input, setInput] = useState(accountParam);
  const [sheetType, setSheetType] = useState(sheetTypeParam);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [numbers, setNumbers] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  const debouncedInput = useDebounce(input, 600);

  useEffect(() => {
    (async () => {
      try { setNumbers(await getProcessingNumbers()); } catch (e) { }
    })();
    (async () => {
      try { setAnnouncement(await getAnnouncement()); } catch (e) { }
    })();
  }, []);

  useEffect(() => {
    const params = {};
    if (debouncedInput) params.account = debouncedInput;
    params.sheetType = sheetType;
    setSearchParams(params, { replace: true });
  }, [debouncedInput, sheetType]); // eslint-disable-line

  useEffect(() => {
    if (!debouncedInput || debouncedInput.trim().length < 1) {
      setData(null); setError(''); return;
    }
    let cancel = false;
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await searchOrders(debouncedInput.trim(), sheetType);
        if (!cancel) {
          setData(res);
          if (res?.processingNumbers) {
            setNumbers({
              superVip: res.processingNumbers.superVip ?? null,
              vip:      res.processingNumbers.vip      ?? null,
              normal:   res.processingNumbers.normal   ?? null,
            });
          }
        }
      } catch (e) {
        if (!cancel) { setError(e.message); setData(null); }
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [debouncedInput, sheetType]);

  useEffect(() => { setInput(accountParam); }, [accountParam]);
  useEffect(() => { setSheetType(sheetTypeParam); }, [sheetTypeParam]);

  const orders = data?.results || [];
  const isEmpty = data && !error && orders.length === 0;
  const hasResults = data && !error && orders.length > 0;
  const hasAnnouncement = !!(announcement && announcement.trim());

  // Số "đang xử lý" áp vào kết quả — dùng số theo loại đang filter
  const currentNumberForSelectedType = numbers
    ? (sheetType === 'SUPER_VIP' ? numbers.superVip
       : sheetType === 'VIP' ? numbers.vip
       : numbers.normal)
    : null;

  return (
    <div
      className="w-full bg-gradient-to-b from-slate-50 to-slate-100 flex flex-col md:overflow-hidden md:[height:100dvh]"
      style={{ minHeight: '100dvh', width: '100dvw' }}
    >
      <div
        className="w-full px-3 sm:px-4 lg:px-6 pt-3 shrink-0"
        style={{ height: 'clamp(120px, 15dvh, 180px)' }}
      >
        <AdSlot label="TOP BANNER" />
      </div>

      <div className="w-full px-3 sm:px-4 lg:px-6 py-3 md:flex-1 md:min-h-0">
        <div className="grid grid-cols-12 gap-3 md:h-full">
          <aside className="hidden lg:block lg:col-span-2 h-full">
            <AdSlot label="LEFT SIDEBAR" />
          </aside>

          <main className="col-span-12 lg:col-span-8 md:h-full md:min-h-0">
            {/* Nếu CÓ thông báo → chia 30/70 trên md+, 1 cột trên mobile.
                Nếu KHÔNG có thông báo → full width như cũ. */}
            {hasAnnouncement ? (
              <div className="flex flex-col md:flex-row gap-3 md:h-full md:min-h-0">
                {/* Cột trái: thông báo — 30% trên desktop, trên cùng trên mobile */}
                <div className="w-full md:w-[30%] md:shrink-0 h-56 md:h-full min-h-0">
                  <AnnouncementPanel html={announcement} />
                </div>
                {/* Cột phải: tra cứu — 70% trên desktop */}
                <div className="flex-1 min-w-0 md:min-h-0 md:h-full">
                  <LookupPanel
                    input={input}
                    setInput={setInput}
                    sheetType={sheetType}
                    setSheetType={setSheetType}
                    loading={loading}
                    error={error}
                    isEmpty={isEmpty}
                    hasResults={hasResults}
                    data={data}
                    orders={orders}
                    numbers={numbers}
                    currentNumberForSelectedType={currentNumberForSelectedType}
                    forceCardView={true}
                  />
                </div>
              </div>
            ) : (
              <LookupPanel
                input={input}
                setInput={setInput}
                sheetType={sheetType}
                setSheetType={setSheetType}
                loading={loading}
                error={error}
                isEmpty={isEmpty}
                hasResults={hasResults}
                data={data}
                orders={orders}
                numbers={numbers}
                currentNumberForSelectedType={currentNumberForSelectedType}
                forceCardView={false}
              />
            )}
          </main>

          <aside className="hidden lg:block lg:col-span-2 h-full">
            <AdSlot label="RIGHT SIDEBAR" />
          </aside>
        </div>
      </div>

      <div
        className="w-full px-3 sm:px-4 lg:px-6 pb-3 shrink-0"
        style={{ height: 'clamp(120px, 15dvh, 180px)' }}
      >
        <AdSlot label="BOTTOM BANNER" />
      </div>
    </div>
  );
}

/**
 * Panel tra cứu (card trắng với input + bảng/thẻ kết quả).
 * forceCardView: khi true, không dùng bảng ở desktop mà dùng card xếp dọc
 *   (áp dụng khi có cột thông báo bên trái, lookup chỉ chiếm 70% nên bảng chật).
 */
function LookupPanel({
  input, setInput, sheetType, setSheetType, loading, error,
  isEmpty, hasResults, data, orders, numbers, currentNumberForSelectedType,
  forceCardView,
}) {
  return (
    <div className="rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col md:h-full md:overflow-hidden">
      <div className="p-4 sm:p-6 pb-3 border-b border-slate-100 md:shrink-0">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Tra cứu đơn hàng</h1>
          <ProcessingNumbersPanel numbers={numbers} />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SearchInput value={input} onChange={setInput} loading={loading} />
          </div>
          <select
            value={sheetType}
            onChange={(e) => setSheetType(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 bg-white focus:border-blue-500 focus:outline-none"
          >
            {FILTER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col p-4 sm:p-6 pt-4 md:flex-1 md:min-h-0">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {isEmpty && (
          <div className="min-h-[160px] md:flex-1 md:min-h-0 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-6">
            <p className="text-center text-gray-500 text-sm sm:text-base">
              Không tìm thấy đơn hàng của tài khoản này
            </p>
          </div>
        )}

        {hasResults && (
          <div className="md:flex-1 md:min-h-0 md:overflow-auto">
            <p className="text-sm text-gray-600 mb-3">
              Tìm thấy <b>{data.totalOrders}</b> đơn hàng
            </p>

            {forceCardView ? (
              /* CARD VIEW cho cả mobile và desktop khi có cột thông báo.
                 Padding 2 bên để pulse-ring không bị overflow-auto crop. */
              <div className="space-y-3 p-2">
                {orders.map((o, i) => (
                  <OrderCard key={i} order={o} currentProcessingNumber={currentNumberForSelectedType} />
                ))}
              </div>
            ) : (
              <>
                {/* Table ở md+ như cũ, card ở mobile */}
                <OrderTable orders={orders} currentProcessingNumber={currentNumberForSelectedType} />
                <div className="space-y-3 md:hidden p-2">
                  {orders.map((o, i) => (
                    <OrderCard key={i} order={o} currentProcessingNumber={currentNumberForSelectedType} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {!data && !error && (
          <div className="min-h-[160px] md:flex-1 md:min-h-0 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-6">
            <p className="text-center text-gray-400 text-sm sm:text-base">
              Nhập tài khoản để tra cứu đơn hàng
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
