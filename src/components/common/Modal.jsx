import { useEffect } from 'react';

export default function Modal({ open, onClose, title, children, maxWidth = 'max-w-2xl' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full ${maxWidth} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between border-b px-5 py-3">
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}