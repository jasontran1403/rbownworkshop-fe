import { formatVnd, formatDate } from '../../utils/format';
import { PackageBadge } from './StatusBadge';

const TYPE_LABEL = {
  SUPER_VIP: 'Ưu tiên VIP',
  VIP:       'Ưu tiên',
  NORMAL:    'Khách Order',
};

export default function OrderCard({ order, currentProcessingNumber }) {
  const noteLower = (order.orderNoteStatus || '').toLowerCase();
  const isDone = noteLower.includes('hoàn thành') || noteLower.includes('hoan thanh');
  const seq = order.sheetSequence;
  const isProcessing =
    Number(currentProcessingNumber) &&
    seq != null &&
    seq === Number(currentProcessingNumber);

  let cardBg = 'bg-gray-50 border-gray-200';
  if (isDone) cardBg = 'bg-green-50 border-green-200';
  else if (isProcessing) cardBg = 'bg-blue-50 border-blue-300';

  const typeLabel = TYPE_LABEL[order.sheetType] || order.sheetType || '';

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${cardBg}
        ${isProcessing ? 'ring-2 ring-blue-400 animate-pulse-border' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">
          STT <b className="text-gray-800">#{seq ?? '—'}</b>
          {typeLabel && (
            <span className="ml-1.5 text-[11px] text-gray-500">
              ({typeLabel})
            </span>
          )}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}
        >
          {order.orderNoteStatus || '—'}
        </span>
      </div>

      <div className="mb-2">
        <PackageBadge sheetType={order.sheetType}>
          {order.servicePackage || '—'}
        </PackageBadge>
      </div>

      <div className="space-y-1.5 text-sm">
        <Row label="Giá" value={formatVnd(order.servicePrice)} />
        <Row label="Đăng ký ưu tiên" value={order.priorityRegister || 'Không'} />
        <Row label="Phí ưu tiên" value={order.priorityFee ? formatVnd(order.priorityFee) : '—'} />
        <Row label="Đăng ký chọn vùng" value={order.regionRegister || 'Không'} />
        <Row label="Vùng chọn" value={order.regionSelected || '—'} />
        <Row label="Đăng ký chọn game" value={order.gameRegister || 'Không'} />
        <Row label="Game chọn" value={order.gameSelected || '—'} />
        <Row label="Ngày đặt" value={formatDate(order.registerDate)} />
        <Row label="Số ngày treo" value={order.holdDays ?? '—'} />
        <Row label="TT hoàn tiền" value={order.refundNoteStatus || '—'} />
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-medium text-gray-800">{value}</span>
    </div>
  );
}