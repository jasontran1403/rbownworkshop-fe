/**
 * Sanitize nhẹ:
 *  - Cắt tối đa 100 ký tự (tài khoản thực tế không bao giờ dài vậy).
 *  - Loại bỏ các ký tự điều khiển (control chars) và ký tự không in được.
 *  - Loại bỏ dấu `<` `>` để chặn luôn mầm mống thẻ HTML ngay từ nguồn
 *    (dù React vẫn escape, có cái này đỡ phải lo).
 *  Backend vẫn parameterized query nên SQL injection không ảnh hưởng,
 *  đây chỉ là lớp lọc "phòng ngự theo chiều sâu" (defence-in-depth).
 */
function sanitize(raw) {
  if (!raw) return '';
  let s = String(raw);
  // Bỏ control chars (0x00-0x1F, 0x7F)
  s = s.replace(/[\x00-\x1F\x7F]/g, '');
  // Bỏ ký tự nguy hiểm cho HTML
  s = s.replace(/[<>]/g, '');
  // Giới hạn độ dài
  if (s.length > 100) s = s.slice(0, 100);
  return s;
}

export default function SearchInput({ value, onChange, loading }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(sanitize(e.target.value))}
        onPaste={(e) => {
          // Chặn paste nội dung quá dài hoặc chứa ký tự lạ
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text') || '';
          onChange(sanitize(text));
        }}
        maxLength={100}
        autoComplete="off"
        spellCheck={false}
        placeholder="Nhập tên tài khoản cần tra cứu..."
        className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 text-base shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        </div>
      )}
    </div>
  );
}