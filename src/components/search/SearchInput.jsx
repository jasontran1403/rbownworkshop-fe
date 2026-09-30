export default function SearchInput({ value, onChange, loading }) {
  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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