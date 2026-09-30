import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import SearchInput from './SearchInput';
import OrderTable from './OrderTable';
import OrderCard from './OrderCard';
import { useDebounce } from '../../hooks/useDebounce';
import { searchOrders, getProcessingNumber } from '../../api/shopOrderApi';

const FILTER_OPTIONS = [
  { value: 'NORMAL', label: 'Thường' },
  { value: 'VIP', label: 'Ưu tiên' },
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

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const accountParam = searchParams.get('account') || '';
  const sheetTypeParam = searchParams.get('sheetType') || 'NORMAL';

  const [input, setInput] = useState(accountParam);
  const [sheetType, setSheetType] = useState(sheetTypeParam);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentNumber, setCurrentNumber] = useState(null);

  const debouncedInput = useDebounce(input, 600);

  useEffect(() => {
    (async () => {
      try { setCurrentNumber(await getProcessingNumber()); } catch (e) { }
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
          if (res?.currentProcessingNumber != null) setCurrentNumber(res.currentProcessingNumber);
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

  return (
    <div
      className="w-full bg-gradient-to-b from-slate-50 to-slate-100 overflow-hidden flex flex-col"
      style={{ height: '100dvh', width: '100dvw' }}
    >
      {/* TOP ad */}
      <div
        className="w-full px-3 sm:px-4 lg:px-6 pt-3 shrink-0"
        style={{ height: 'clamp(120px, 15dvh, 180px)' }}
      >
        <AdSlot label="TOP BANNER" />
      </div>

      {/* MIDDLE */}
      <div className="flex-1 min-h-0 w-full px-3 sm:px-4 lg:px-6 py-3">
        <div className="h-full grid grid-cols-12 gap-3">
          <aside className="hidden lg:block lg:col-span-2 h-full">
            <AdSlot label="LEFT SIDEBAR" />
          </aside>

          <main className="col-span-12 lg:col-span-8 h-full min-h-0">
            <div className="h-full rounded-2xl bg-white shadow-sm border border-slate-200 flex flex-col overflow-hidden">
              {/* Header + filter cố định */}
              <div className="shrink-0 p-4 sm:p-6 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-800">Tra cứu đơn hàng</h1>
                  {currentNumber != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800 border border-blue-200">
                      <span className="w-4 h-4 rounded-full bg-blue-500 animate-pulse" />
                      Đang xử lý đến Đơn số {currentNumber}
                    </span>
                  )}
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

              {/* Nội dung */}
              <div className="flex-1 min-h-0 flex flex-col p-4 sm:p-6 pt-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
                )}

                {/* Empty state — có nhập, backend trả 0 kết quả */}
                {isEmpty && (
                  <div className="flex-1 min-h-0 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-6">
                    <p className="text-center text-gray-500 text-sm sm:text-base">
                      Không tìm thấy đơn hàng của tài khoản này
                    </p>
                  </div>
                )}

                {/* Có kết quả */}
                {hasResults && (
                  <div className="flex-1 min-h-0 overflow-auto">
                    <p className="text-sm text-gray-600 mb-3">
                      Tìm thấy <b>{data.totalOrders}</b> đơn hàng
                    </p>
                    <OrderTable orders={orders} currentProcessingNumber={currentNumber} />
                    <div className="space-y-3 md:hidden">
                      {orders.map((o, i) => (
                        <OrderCard key={i} order={o} currentProcessingNumber={currentNumber} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Chưa nhập gì */}
                {!data && !error && (
                  <div className="flex-1 min-h-0 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 flex items-center justify-center p-6">
                    <p className="text-center text-gray-400 text-sm sm:text-base">
                      Nhập tài khoản để tra cứu đơn hàng
                    </p>
                  </div>
                )}
              </div>
            </div>
          </main>

          <aside className="hidden lg:block lg:col-span-2 h-full">
            <AdSlot label="RIGHT SIDEBAR" />
          </aside>
        </div>
      </div>

      {/* BOTTOM ad */}
      <div
        className="w-full px-3 sm:px-4 lg:px-6 pb-3 shrink-0"
        style={{ height: 'clamp(120px, 15dvh, 180px)' }}
      >
        <AdSlot label="BOTTOM BANNER" />
      </div>
    </div>
  );
}