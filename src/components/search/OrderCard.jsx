import { formatVnd, formatRefund, formatDate } from '../../utils/format';
import { PackageBadge } from './StatusBadge';

export default function OrderCard({ order, currentProcessingNumber }) {
  const isDone = !!order.completeDate;
  const isProcessing = Number(currentProcessingNumber) && order.id === Number(currentProcessingNumber);

  let cardBg = 'bg-gray-50 border-gray-200';
  if (isDone) cardBg = 'bg-green-50 border-green-200';
  else if (isProcessing) cardBg = 'bg-blue-50 border-blue-300';

  return (
    <div className={`rounded-xl border p-4 shadow-sm ${cardBg}
      ${isProcessing ? 'ring-2 ring-blue-400 animate-pulse-border' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-500">
          STT #{order.sheetSequence ?? '—'} <span className="text-xs">(id {order.id})</span>
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
          isDone ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
        }`}>
          {order.orderNoteStatus || (isDone ? 'Hoàn thành' : 'Chưa hoàn thành')}
        </span>
      </div>

      <div className="mb-2">
        <PackageBadge sheetType={order.sheetType}>
          {order.servicePackage || '—'}
        </PackageBadge>
      </div>

      <div className="space-y-1.5 text-sm">
        <Row label="Giá DV" value={formatVnd(order.servicePrice)} />
        <Row label="Đăng ký ưu tiên" value={order.priorityRegister || 'Không'} />
        <Row label="Phí ưu tiên" value={order.priorityFee ? formatVnd(order.priorityFee) : '—'} />
        <Row label="Ngày đăng ký" value={formatDate(order.registerDate)} />
        <Row label="Ngày hoàn thành" value={formatDate(order.completeDate)} />
        <Row label="Hoàn cọc" value={formatRefund(order.refundInfo)} />
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