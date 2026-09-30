// Badge cho gói dịch vụ: VIP / SUPERVIP / NORMAL
export function PackageBadge({ sheetType, children }) {
  if (!sheetType || sheetType === 'NORMAL') {
    return <span className="font-medium">{children || '—'}</span>;
  }

  const isSuperVip = sheetType === 'SUPER_VIP';
  const color = isSuperVip
    ? 'bg-orange-100 text-orange-700 border-orange-300'
    : 'bg-yellow-100 text-yellow-800 border-yellow-300';

  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-medium">{children || '—'}</span>
      <span className={`inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase ${color}`}>
        {isSuperVip ? (
          <>
            <CrownIcon className="h-3 w-3" />
            SUPERVIP
          </>
        ) : (
          <>
            <StarIcon className="h-3 w-3" />
            VIP
          </>
        )}
      </span>
    </span>
  );
}

// Icon vương miện cho SUPERVIP
function CrownIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5zm14 3H5v-2h14v2z" />
    </svg>
  );
}

// Icon ngôi sao cho VIP
function StarIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}