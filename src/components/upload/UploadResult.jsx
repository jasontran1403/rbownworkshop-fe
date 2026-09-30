export default function UploadResult({ result }) {
  if (!result) return null;
  return (
    <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4">
      <h3 className="font-semibold text-green-800 mb-2">Kết quả upload</h3>
      <ul className="text-sm text-green-900 space-y-1">
        <li>Tổng số dòng: <b>{result.totalRows}</b></li>
        <li>Đã lưu: <b>{result.savedRows}</b></li>
        <li>Bỏ qua (trùng): <b>{result.skippedRows}</b></li>
        <li>Số đang xử lý: <b>{result.currentProcessingNumber ?? '-'}</b></li>
      </ul>
      {result.errors?.length > 0 && (
        <details className="mt-2 text-xs text-red-700">
          <summary className="cursor-pointer">Chi tiết lỗi ({result.errors.length})</summary>
          <ul className="mt-1 list-disc list-inside max-h-40 overflow-auto">
            {result.errors.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}