import { useEffect } from 'react';

/**
 * Lightbox phóng ảnh.
 *   <ImageLightbox src={url} onClose={() => ...} />
 * - Click nền hoặc nút ✕: đóng
 * - Esc: đóng
 * - Ảnh tối đa 90dvh × 90dvw, giữ aspect ratio
 */
export default function ImageLightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    // Khoá scroll body khi lightbox mở
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 backdrop-blur-sm cursor-zoom-out"
      role="dialog"
      aria-modal="true"
    >
      {/* Nút đóng */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose?.(); }}
        aria-label="Đóng"
        className="absolute top-4 right-4 inline-flex items-center justify-center
                   w-10 h-10 rounded-full bg-white/15 hover:bg-white/25
                   text-white text-xl leading-none transition"
      >
        ✕
      </button>

      {/* Ảnh */}
      <img
        src={src}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="rounded-lg shadow-2xl cursor-default select-none"
        style={{
          maxWidth: '90dvw',
          maxHeight: '90dvh',
          width: 'auto',
          height: 'auto',
          objectFit: 'contain',
        }}
      />

      {/* Hint ESC */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-xs select-none">
        Bấm nền, ✕ hoặc <kbd className="px-1.5 py-0.5 rounded bg-white/15">Esc</kbd> để đóng
      </div>
    </div>
  );
}