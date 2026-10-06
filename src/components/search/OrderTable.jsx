import { formatVnd, formatDate } from '../../utils/format';
import { PackageBadge } from './StatusBadge';

/**
 * Các cột hiển thị khi tra cứu, theo yêu cầu:
 *   STT
 *   Tên gói / Giá
 *   Đăng ký ưu tiên / Phí ưu tiên
 *   Đăng ký chọn vùng / Vùng Chọn
 *   Đăng Ký Chọn Game / Game Chọn
 *   Ngày Đăng Ký
 *   Số Ngày Treo
 *   TT Hoàn Tiền
 *   TT Đơn
 */
export default function OrderTable({ orders, currentProcessingNumber }) {
  const current = Number(currentProcessingNumber);

  return (
    <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium">STT</th>
            <th className="px-4 py-3 text-left font-medium">
              <div className="leading-tight">
                <div>Tên gói</div>
                <div className="text-xs font-normal text-gray-500">Giá</div>
              </div>
            </th>
            <th className="px-4 py-3 text-left font-medium">
              <div className="leading-tight">
                <div>Đăng ký ưu tiên</div>
                <div className="text-xs font-normal text-gray-500">Phí ưu tiên</div>
              </div>
            </th>
            <th className="px-4 py-3 text-left font-medium">
              <div className="leading-tight">
                <div>Đăng ký chọn vùng</div>
                <div className="text-xs font-normal text-gray-500">Vùng chọn</div>
              </div>
            </th>
            <th className="px-4 py-3 text-left font-medium">
              <div className="leading-tight">
                <div>Đăng ký chọn game</div>
                <div className="text-xs font-normal text-gray-500">Game chọn</div>
              </div>
            </th>
            <th className="px-4 py-3 text-left font-medium">Ngày đặt</th>
            <th className="px-4 py-3 text-left font-medium">Số ngày treo</th>
            <th className="px-4 py-3 text-left font-medium">TT hoàn tiền</th>
            <th className="px-4 py-3 text-left font-medium">TT đơn</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {orders.map((o, i) => {
            // "Hoàn thành" dựa vào orderNoteStatus
            const noteLower = (o.orderNoteStatus || '').toLowerCase();
            const isDone = noteLower.includes('hoàn thành') || noteLower.includes('hoan thanh');
            const seq = o.sheetSequence;
            const isProcessing = current && seq != null && seq === current;

            let rowBg = 'bg-gray-50';
            if (isDone) rowBg = 'bg-green-50';
            else if (isProcessing) rowBg = 'bg-blue-50';

            return (
              <tr
                key={i}
                className={`${rowBg} hover:brightness-95 transition-all
                  ${isProcessing ? 'ring-2 ring-blue-400 ring-inset animate-pulse-border' : ''}
                `}
              >
                {/* STT = sheetSequence (dùng chung giữa 3 loại) */}
                <td className="px-4 py-3 font-medium align-top">
                  <span className="font-semibold text-gray-800">{seq ?? '—'}</span>
                </td>

                {/* Gói DV + Giá */}
                <td className="px-4 py-3 align-top">
                  <div className="leading-tight">
                    <div>
                      <PackageBadge sheetType={o.sheetType}>
                        {o.servicePackage || '—'}
                      </PackageBadge>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{formatVnd(o.servicePrice)}</div>
                  </div>
                </td>

                {/* Đăng ký ưu tiên + Phí ưu tiên */}
                <td className="px-4 py-3 align-top">
                  <div className="leading-tight">
                    <div>
                      {o.priorityRegister
                        ? <span className="text-green-700 font-medium">{o.priorityRegister}</span>
                        : <span className="text-gray-500">Không</span>}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {o.priorityFee ? formatVnd(o.priorityFee) : '—'}
                    </div>
                  </div>
                </td>

                {/* Đăng ký chọn vùng + Vùng chọn */}
                <td className="px-4 py-3 align-top">
                  <div className="leading-tight">
                    <div>
                      {o.regionRegister
                        ? <span className="text-green-700 font-medium">{o.regionRegister}</span>
                        : <span className="text-gray-500">Không</span>}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {o.regionSelected || '—'}
                    </div>
                  </div>
                </td>

                {/* Đăng ký chọn game + Game chọn */}
                <td className="px-4 py-3 align-top">
                  <div className="leading-tight">
                    <div>
                      {o.gameRegister
                        ? <span className="text-green-700 font-medium">{o.gameRegister}</span>
                        : <span className="text-gray-500">Không</span>}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {o.gameSelected || '—'}
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3 align-top">{formatDate(o.registerDate)}</td>
                <td className="px-4 py-3 align-top text-center">{o.holdDays ?? '—'}</td>
                <td className="px-4 py-3 align-top">{o.refundNoteStatus || '—'}</td>
                <td className="px-4 py-3 align-top">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {o.orderNoteStatus || '—'}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}