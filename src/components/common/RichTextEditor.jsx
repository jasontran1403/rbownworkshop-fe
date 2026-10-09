import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { uploadImage } from '../../api/shopOrderApi';

const FONTS = [
  { label: 'Mặc định', value: '' },
  { label: 'Inter', value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times', value: '"Times New Roman", Times, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier', value: '"Courier New", Courier, monospace' },
  { label: 'Comic Sans', value: '"Comic Sans MS", cursive' },
];

const FONT_SIZES = [
  { label: 'Rất nhỏ', value: '1' },
  { label: 'Nhỏ', value: '2' },
  { label: 'Vừa', value: '3' },
  { label: 'Hơi lớn', value: '4' },
  { label: 'Lớn', value: '5' },
  { label: 'Rất lớn', value: '6' },
  { label: 'Khổng lồ', value: '7' },
];

const PRESET_COLORS = [
  '#111827', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

const MAX_IMG_MB = 5;

const RichTextEditor = forwardRef(function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Nhập nội dung thông báo...',
  minHeight = '220px',
  fillHeight = false,
  toolbarPortal = null,
}, ref) {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const colorBtnRef = useRef(null);
  const colorPopupRef = useRef(null);

  const [showColor, setShowColor] = useState(false);
  const [colorPos, setColorPos] = useState({ top: 0, left: 0 });
  const [isEmpty, setIsEmpty] = useState(!value);
  const [uploading, setUploading] = useState(false);

  // Confirm xoá ảnh
  const [confirmImg, setConfirmImg] = useState(null);
  const [confirmPreview, setConfirmPreview] = useState('');

  const pendingFilesRef = useRef(new Map());
  const createdBlobsRef = useRef(new Set());

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if ((value || '') !== (el.innerHTML || '')) {
      el.innerHTML = value || '';
    }
    el.querySelectorAll('img').forEach((img) => {
      if (!img.getAttribute('title')) img.setAttribute('title', 'Click để xóa ảnh');
      if (!img.style.cursor) img.style.cursor = 'pointer';
      if (!img.style.maxWidth) img.style.maxWidth = '100%';
      if (!img.style.height) img.style.height = 'auto';
      if (!img.className) img.className = 'announcement-img';
    });
    setIsEmpty(!(el.textContent || '').trim() && !el.querySelector('img,ul,ol,li'));
  }, [value]);

  useEffect(() => () => {
    createdBlobsRef.current.forEach((url) => { try { URL.revokeObjectURL(url); } catch (e) { } });
    createdBlobsRef.current.clear();
    pendingFilesRef.current.clear();
  }, []);

  // Esc tắt confirm xoá ảnh
  useEffect(() => {
    if (!confirmImg) return;
    function onKey(e) { if (e.key === 'Escape') cancelDeleteImg(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [confirmImg]);

  // Đóng color picker khi scroll/resize/click ngoài
  useEffect(() => {
    if (!showColor) return;
    function close() { setShowColor(false); }
    function onDocDown(e) {
      if (colorBtnRef.current?.contains(e.target)) return;
      if (colorPopupRef.current?.contains(e.target)) return;
      close();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('mousedown', onDocDown);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', onDocDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showColor]);

  function emit() {
    if (!onChange) return;
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const empty = !(el.textContent || '').trim() && !el.querySelector('img,ul,ol,li');
    setIsEmpty(empty);
    onChange(empty ? '' : html);
  }

  function focusEditor() { editorRef.current?.focus(); }

  function exec(cmd, arg) {
    focusEditor();
    try { document.execCommand(cmd, false, arg); } catch (e) { }
    emit();
  }

  function onFontChange(e) {
    const v = e.target.value;
    if (!v) { exec('removeFormat'); return; }
    exec('fontName', v);
  }
  function onSizeChange(e) {
    const v = e.target.value;
    if (!v) return;
    exec('fontSize', v);
  }

  function toggleColor() {
    setShowColor((v) => {
      const next = !v;
      if (next && colorBtnRef.current) {
        const r = colorBtnRef.current.getBoundingClientRect();
        const popupW = 230;
        let left = r.left;
        if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
        if (left < 8) left = 8;
        setColorPos({ top: r.bottom + 4, left });
      }
      return next;
    });
  }

  function pickColor(c) { setShowColor(false); exec('foreColor', c); }

  function clearFormat() {
    focusEditor();
    try {
      document.execCommand('removeFormat', false, null);
      document.execCommand('unlink', false, null);
    } catch (e) { }
    emit();
  }

  // ============ Image ============
  function onImageBtnClick() {
    if (uploading) return;
    fileInputRef.current?.click();
  }

  function onEditorClick(e) {
    const t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    e.preventDefault();
    setConfirmImg(t);
    setConfirmPreview(t.src || '');
  }

  function confirmDeleteImg() {
    const img = confirmImg;
    if (!img) return;
    const src = img.src || '';
    if (src.startsWith('blob:')) {
      try { URL.revokeObjectURL(src); } catch (err) { }
      createdBlobsRef.current.delete(src);
      pendingFilesRef.current.delete(src);
    }
    img.remove();
    setConfirmImg(null);
    setConfirmPreview('');
    emit();
  }

  function cancelDeleteImg() {
    setConfirmImg(null);
    setConfirmPreview('');
  }

  function onImageFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Vui lòng chọn file ảnh.'); return; }
    if (file.size > MAX_IMG_MB * 1024 * 1024) { alert(`Ảnh quá lớn (>${MAX_IMG_MB}MB).`); return; }
    try {
      const blobUrl = URL.createObjectURL(file);
      createdBlobsRef.current.add(blobUrl);
      pendingFilesRef.current.set(blobUrl, file);

      focusEditor();
      document.execCommand('insertImage', false, blobUrl);

      const imgs = editorRef.current?.querySelectorAll('img') || [];
      const last = imgs[imgs.length - 1];
      if (last) {
        last.setAttribute('data-pending', 'true');
        last.setAttribute('title', 'Click để xóa ảnh');
        last.className = 'announcement-img';
        last.style.maxWidth = '100%';
        last.style.height = 'auto';
        last.style.borderRadius = '6px';
        last.style.cursor = 'pointer';
      }
      emit();
    } catch (err) {
      alert('Chèn ảnh thất bại: ' + (err?.message || err));
    }
  }

  async function flushUploads() {
    const el = editorRef.current;
    if (!el) return value || '';

    const pendingImgs = Array.from(el.querySelectorAll('img[data-pending="true"]'))
      .filter((img) => img.src && img.src.startsWith('blob:'));

    if (pendingImgs.length === 0) {
      el.querySelectorAll('img[data-pending]').forEach(img => img.removeAttribute('data-pending'));
      return el.innerHTML;
    }

    setUploading(true);
    try {
      for (const img of pendingImgs) {
        const blobUrl = img.src;
        const file = pendingFilesRef.current.get(blobUrl);
        if (!file) { img.remove(); continue; }
        const serverUrl = await uploadImage(file);
        if (!serverUrl) throw new Error('Server không trả URL ảnh.');
        img.src = serverUrl;
        img.removeAttribute('data-pending');
        try { URL.revokeObjectURL(blobUrl); } catch (e) { }
        createdBlobsRef.current.delete(blobUrl);
        pendingFilesRef.current.delete(blobUrl);
      }
      return el.innerHTML;
    } finally {
      setUploading(false);
    }
  }

  useImperativeHandle(ref, () => ({
    flushUploads,
    hasPending: () => (editorRef.current?.querySelectorAll('img[data-pending="true"]').length || 0) > 0,
  }), []);

  function Btn({ title, onClick, children, active, disabled, btnRef }) {
    return (
      <button
        type="button"
        ref={btnRef}
        title={title}
        disabled={disabled}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`inline-flex items-center justify-center h-8 min-w-[32px] px-1.5 rounded text-sm
          hover:bg-slate-200 transition
          ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >{children}</button>
    );
  }

  const toolbar = (
    <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5 shrink-0">
      <select onChange={onFontChange} defaultValue=""
        className="h-8 rounded border border-slate-200 bg-white px-1 text-xs" title="Font chữ">
        {FONTS.map((f) => (<option key={f.label} value={f.value}>{f.label}</option>))}
      </select>

      <select onChange={onSizeChange} defaultValue=""
        className="h-8 rounded border border-slate-200 bg-white px-1 text-xs" title="Cỡ chữ">
        <option value="">Cỡ chữ</option>
        {FONT_SIZES.map((s) => (<option key={s.value} value={s.value}>{s.label}</option>))}
      </select>

      <div className="w-px bg-slate-200 mx-0.5" />

      <Btn title="In đậm (Ctrl+B)" onClick={() => exec('bold')}><b>B</b></Btn>
      <Btn title="In nghiêng (Ctrl+I)" onClick={() => exec('italic')}><i>I</i></Btn>
      <Btn title="Gạch chân (Ctrl+U)" onClick={() => exec('underline')}><span className="underline">U</span></Btn>
      <Btn title="Gạch ngang" onClick={() => exec('strikeThrough')}><span className="line-through">S</span></Btn>

      <div className="w-px bg-slate-200 mx-0.5" />

      <Btn btnRef={colorBtnRef} title="Màu chữ" onClick={toggleColor}>
        <span className="inline-flex items-center gap-1">
          <span>A</span>
          <span className="w-3 h-3 rounded" style={{ background: 'linear-gradient(90deg,#ef4444,#3b82f6)' }} />
        </span>
      </Btn>

      <div className="w-px bg-slate-200 mx-0.5" />

      <Btn title="Danh sách chấm" onClick={() => exec('insertUnorderedList')}>•</Btn>
      <Btn title="Danh sách số" onClick={() => exec('insertOrderedList')}>1.</Btn>

      <div className="w-px bg-slate-200 mx-0.5" />

      <Btn title="Canh trái" onClick={() => exec('justifyLeft')}><AlignIcon dir="left" /></Btn>
      <Btn title="Canh giữa" onClick={() => exec('justifyCenter')}><AlignIcon dir="center" /></Btn>
      <Btn title="Canh phải" onClick={() => exec('justifyRight')}><AlignIcon dir="right" /></Btn>

      <div className="w-px bg-slate-200 mx-0.5" />

      <Btn
        title={uploading ? 'Đang upload ảnh...' : 'Chèn ảnh (upload khi lưu)'}
        onClick={onImageBtnClick}
        disabled={uploading}
      >
        <span className="text-xs">{uploading ? '⏳' : '🖼'}</span>
      </Btn>
      <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={onImageFileChange} />

      <div className="w-px bg-slate-200 mx-0.5" />

      <Btn title="Xóa định dạng" onClick={clearFormat}>
        <span className="text-xs">T<sub>x</sub></span>
      </Btn>
    </div>
  );

  // Color picker — PORTAL ra body để không bị overflow clip
  const colorPicker = showColor ? createPortal(
    <div
      ref={colorPopupRef}
      className="fixed z-[9999] bg-white border border-slate-200 rounded-md shadow-lg p-2 grid grid-cols-8 gap-1"
      style={{ top: colorPos.top, left: colorPos.left, width: 230 }}
      onMouseDown={(e) => e.preventDefault()}
    >
      {PRESET_COLORS.map((c) => (
        <button
          type="button"
          key={c}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => pickColor(c)}
          title={c}
          className="w-5 h-5 rounded border border-slate-300 hover:scale-110 transition"
          style={{ background: c }}
        />
      ))}
      <label className="col-span-8 mt-1 text-[10px] text-slate-500 flex items-center gap-1">
        Khác:
        <input
          type="color"
          onChange={(e) => pickColor(e.target.value)}
          className="h-5 w-6 cursor-pointer border rounded"
        />
      </label>
    </div>,
    document.body
  ) : null;

  // Confirm xoá ảnh — PORTAL ra body
  const confirmModal = confirmImg ? createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      role="dialog" aria-modal="true"
      onClick={cancelDeleteImg}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-[90vw] max-w-md rounded-xl bg-white shadow-2xl overflow-hidden"
      >
        <div className="px-5 pt-4 pb-2 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Xóa ảnh?</h3>
          <p className="text-xs text-slate-500 mt-1">
            Ảnh này sẽ bị xóa khỏi thông báo. Thao tác sẽ được áp dụng khi bạn bấm
            <b> Lưu thông báo</b>.
          </p>
        </div>

        {confirmPreview && (
          <div className="px-5 pt-3 flex justify-center bg-slate-50">
            <img
              src={confirmPreview}
              alt=""
              className="max-h-48 rounded-md border border-slate-200 object-contain"
            />
          </div>
        )}

        <div className="px-5 py-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={cancelDeleteImg}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
          >Hủy</button>
          <button
            type="button"
            onClick={confirmDeleteImg}
            autoFocus
            className="rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-sm text-white"
          >Xóa ảnh</button>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div
      className={`w-full rounded-lg border border-slate-300 bg-white overflow-hidden
                  ${fillHeight ? 'h-full flex flex-col min-h-0' : ''}`}
    >
      {toolbarPortal ? createPortal(toolbar, toolbarPortal) : toolbar}

      <div className={`relative ${fillHeight ? 'flex-1 min-h-0 overflow-hidden' : ''}`}>
        {isEmpty && (
          <div className="absolute top-2 left-3 pointer-events-none text-slate-400 text-sm select-none z-10">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onClick={onEditorClick}
          onPaste={() => setTimeout(emit, 0)}
          className={`announcement-content prose prose-sm max-w-none p-3 outline-none text-sm leading-relaxed
                      ${fillHeight ? 'h-full overflow-auto' : ''}`}
          style={fillHeight ? undefined : { minHeight }}
          spellCheck={false}
        />
      </div>

      {colorPicker}
      {confirmModal}
    </div>
  );
});

export default RichTextEditor;

function AlignIcon({ dir }) {
  const base = 'inline-block';
  const lines = {
    left: ['w-5', 'w-3', 'w-4', 'w-3'],
    center: ['w-5', 'w-3 mx-auto', 'w-4 mx-auto', 'w-3 mx-auto'],
    right: ['w-5 ml-auto', 'w-3 ml-auto', 'w-4 ml-auto', 'w-3 ml-auto'],
  }[dir];
  return (
    <span className="flex flex-col gap-[2px] w-5">
      {lines.map((cls, i) => (
        <span key={i} className={`${base} h-[2px] bg-current rounded ${cls}`} />
      ))}
    </span>
  );
}