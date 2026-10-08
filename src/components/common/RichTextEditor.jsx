import { useEffect, useRef, useState } from 'react';

/**
 * Rich text editor nhẹ, chạy trên contentEditable + document.execCommand.
 * Hỗ trợ: bold, italic, underline, font-size, font-family, color, bullet,
 * canh trái / giữa / phải, clear format.
 *
 * Props:
 *   value: HTML string
 *   onChange(html): string
 *   placeholder?: string
 *   minHeight?: string  (vd "200px")
 */

const FONTS = [
  { label: 'Mặc định', value: '' },
  { label: 'Inter',        value: 'Inter, system-ui, sans-serif' },
  { label: 'Arial',        value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times',        value: '"Times New Roman", Times, serif' },
  { label: 'Georgia',      value: 'Georgia, serif' },
  { label: 'Courier',      value: '"Courier New", Courier, monospace' },
  { label: 'Comic Sans',   value: '"Comic Sans MS", cursive' },
];

/** Font size dạng 1..7 cho execCommand('fontSize'). */
const FONT_SIZES = [
  { label: 'Rất nhỏ',  value: '1' },
  { label: 'Nhỏ',      value: '2' },
  { label: 'Vừa',      value: '3' },
  { label: 'Hơi lớn',  value: '4' },
  { label: 'Lớn',      value: '5' },
  { label: 'Rất lớn',  value: '6' },
  { label: 'Khổng lồ', value: '7' },
];

const PRESET_COLORS = [
  '#111827', '#374151', '#6b7280', '#9ca3af',
  '#ef4444', '#f97316', '#f59e0b', '#eab308',
  '#22c55e', '#10b981', '#14b8a6', '#06b6d4',
  '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899',
];

export default function RichTextEditor({
  value = '',
  onChange,
  placeholder = 'Nhập nội dung thông báo...',
  minHeight = '220px',
}) {
  const editorRef = useRef(null);
  const [showColor, setShowColor] = useState(false);
  const [isEmpty, setIsEmpty] = useState(!value);

  // Sync external value → DOM (chỉ khi khác, để không reset caret trong lúc gõ)
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if ((value || '') !== (el.innerHTML || '')) {
      el.innerHTML = value || '';
    }
    setIsEmpty(!(el.textContent || '').trim() && !el.querySelector('img,ul,ol,li'));
  }, [value]);

  function emit() {
    if (!onChange) return;
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const empty = !(el.textContent || '').trim() && !el.querySelector('img,ul,ol,li');
    setIsEmpty(empty);
    onChange(empty ? '' : html);
  }

  function focusEditor() {
    editorRef.current?.focus();
  }

  function exec(cmd, arg) {
    focusEditor();
    try { document.execCommand(cmd, false, arg); } catch (e) { /* noop */ }
    emit();
  }

  function onFontChange(e) {
    const v = e.target.value;
    if (!v) {
      exec('removeFormat');
      return;
    }
    exec('fontName', v);
  }

  function onSizeChange(e) {
    const v = e.target.value;
    if (!v) return;
    exec('fontSize', v);
  }

  function pickColor(c) {
    setShowColor(false);
    exec('foreColor', c);
  }

  function clearFormat() {
    focusEditor();
    try {
      document.execCommand('removeFormat', false, null);
      document.execCommand('unlink', false, null);
    } catch (e) { /* noop */ }
    emit();
  }

  function Btn({ title, onClick, children, active }) {
    return (
      <button
        type="button"
        title={title}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onClick}
        className={`inline-flex items-center justify-center h-8 min-w-[32px] px-1.5 rounded text-sm
          hover:bg-slate-200 transition
          ${active ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
      >
        {children}
      </button>
    );
  }

  return (
    <div className="w-full rounded-lg border border-slate-300 bg-white overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-1.5">
        <select
          onChange={onFontChange}
          defaultValue=""
          className="h-8 rounded border border-slate-200 bg-white px-1 text-xs"
          title="Font chữ"
        >
          {FONTS.map((f) => (
            <option key={f.label} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          onChange={onSizeChange}
          defaultValue=""
          className="h-8 rounded border border-slate-200 bg-white px-1 text-xs"
          title="Cỡ chữ"
        >
          <option value="">Cỡ chữ</option>
          {FONT_SIZES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <div className="w-px bg-slate-200 mx-0.5" />

        <Btn title="In đậm (Ctrl+B)" onClick={() => exec('bold')}>
          <b>B</b>
        </Btn>
        <Btn title="In nghiêng (Ctrl+I)" onClick={() => exec('italic')}>
          <i>I</i>
        </Btn>
        <Btn title="Gạch chân (Ctrl+U)" onClick={() => exec('underline')}>
          <span className="underline">U</span>
        </Btn>
        <Btn title="Gạch ngang" onClick={() => exec('strikeThrough')}>
          <span className="line-through">S</span>
        </Btn>

        <div className="w-px bg-slate-200 mx-0.5" />

        {/* Color picker */}
        <div className="relative">
          <Btn title="Màu chữ" onClick={() => setShowColor((v) => !v)}>
            <span className="inline-flex items-center gap-1">
              <span>A</span>
              <span className="w-3 h-3 rounded" style={{ background: 'linear-gradient(90deg,#ef4444,#3b82f6)' }} />
            </span>
          </Btn>
          {showColor && (
            <div className="absolute z-20 top-9 left-0 bg-white border border-slate-200 rounded-md shadow-lg p-2 grid grid-cols-8 gap-1">
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
            </div>
          )}
        </div>

        <div className="w-px bg-slate-200 mx-0.5" />

        <Btn title="Danh sách chấm" onClick={() => exec('insertUnorderedList')}>
          •
        </Btn>
        <Btn title="Danh sách số" onClick={() => exec('insertOrderedList')}>
          1.
        </Btn>

        <div className="w-px bg-slate-200 mx-0.5" />

        <Btn title="Canh trái" onClick={() => exec('justifyLeft')}>
          <AlignIcon dir="left" />
        </Btn>
        <Btn title="Canh giữa" onClick={() => exec('justifyCenter')}>
          <AlignIcon dir="center" />
        </Btn>
        <Btn title="Canh phải" onClick={() => exec('justifyRight')}>
          <AlignIcon dir="right" />
        </Btn>

        <div className="w-px bg-slate-200 mx-0.5" />

        <Btn title="Xóa định dạng" onClick={clearFormat}>
          <span className="text-xs">T<sub>x</sub></span>
        </Btn>
      </div>

      {/* Editor */}
      <div className="relative">
        {isEmpty && (
          <div
            className="absolute top-2 left-3 pointer-events-none text-slate-400 text-sm select-none"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emit}
          onBlur={emit}
          onPaste={(e) => {
            // Dán text thuần nếu Shift+Ctrl, không thì giữ format đơn giản
            // Để nguyên hành vi mặc định
            setTimeout(emit, 0);
          }}
          className="prose prose-sm max-w-none p-3 outline-none text-sm leading-relaxed"
          style={{ minHeight }}
          spellCheck={false}
        />
      </div>
    </div>
  );
}

function AlignIcon({ dir }) {
  const base = 'inline-block';
  const lines = {
    left:   ['w-5', 'w-3', 'w-4', 'w-3'],
    center: ['w-5', 'w-3 mx-auto', 'w-4 mx-auto', 'w-3 mx-auto'],
    right:  ['w-5 ml-auto', 'w-3 ml-auto', 'w-4 ml-auto', 'w-3 ml-auto'],
  }[dir];
  return (
    <span className="flex flex-col gap-[2px] w-5">
      {lines.map((cls, i) => (
        <span key={i} className={`${base} h-[2px] bg-current rounded ${cls}`} />
      ))}
    </span>
  );
}
