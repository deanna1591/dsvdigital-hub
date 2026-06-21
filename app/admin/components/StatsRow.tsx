export default function StatsRow({
  pendingCount,
  outstandingPoints,
  outstandingPhp,
  processedYtdPhp,
}: {
  pendingCount: number;
  outstandingPoints: number;
  outstandingPhp: number;
  processedYtdPhp: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      <Card label="Pending Approvals" value={`${pendingCount}`} />
      <Card label="Outstanding Points" value={`${outstandingPoints}`} suffix=" pts" />
      <Card label="Outstanding Value" value={`₱${outstandingPhp.toLocaleString()}`} />
      <Card label="Delivered YTD" value={`₱${processedYtdPhp.toLocaleString()}`} />
    </div>
  );
}

function Card({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="bg-paper border border-line rounded-xl p-5">
      <div className="text-[10px] tracking-[0.18em] uppercase text-ink-soft font-bold mb-2">{label}</div>
      <div className="font-serif text-3xl font-bold leading-none">
        {value}
        {suffix && <small className="text-[13px] text-ink-soft font-normal ml-1 font-sans">{suffix}</small>}
      </div>
    </div>
  );
}
