import { useRef, useState } from 'react';

export default function DragDropZone({ onFileSelected, file }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFileSelected(f);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition
        ${dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white hover:border-blue-400'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFileSelected(f);
        }}
      />
      <div className="text-4xl mb-2">📄</div>
      {file ? (
        <p className="font-medium text-blue-600">{file.name}</p>
      ) : (
        <>
          <p className="font-medium text-gray-700">
            Kéo thả file Excel vào đây
          </p>
          <p className="text-sm text-gray-500 mt-1">hoặc click để chọn file (.xlsx, .xls)</p>
        </>
      )}
    </div>
  );
}