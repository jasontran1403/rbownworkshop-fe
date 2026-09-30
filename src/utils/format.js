export function formatVnd(value) {
  if (value == null || value === '') return '-';
  const num = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[^\d-]/g, ''));
  if (Number.isNaN(num)) return '-';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format tiền hoàn: "Đã hoàn 50.000 đ"
 * Nếu null/0 -> "-" (em dash)
 */
export function formatRefund(value) {
  if (value == null || value === '') return '—';
  const num = typeof value === 'number'
    ? value
    : Number(String(value).replace(/[^\d-]/g, ''));
  if (Number.isNaN(num) || num === 0) return '—';
  const formatted = new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(num);
  return `Đã hoàn ${formatted} đ`;
}

/**
 * Format ngày -> dd/MM/yyyy (VN locale).
 * Nhận Date | ISO string ("2026-01-15") | "2026/01/15"...
 */
export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export function orDash(value) {
  if (value == null || value === '' || value === 0) return '—';
  return value;
}
