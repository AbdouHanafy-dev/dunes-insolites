export default function StatCard({
  label,
  value,
  growth,
  accent = "gold",
}: {
  label: string;
  value: string;
  growth?: number | null;
  accent?: "gold" | "emerald" | "navy" | "rose";
}) {
  const barColor = {
    gold: "bg-gold",
    emerald: "bg-emerald",
    navy: "bg-navy-500",
    rose: "bg-rose",
  }[accent];

  return (
    <div className="card overflow-hidden rounded-2xl p-5">
      <div className={`-mx-5 -mt-5 mb-4 h-1 ${barColor}`} />
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-gray-500">{label}</p>
        {growth != null && (
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
              growth >= 0 ? "bg-emerald/10 text-emerald" : "bg-rose/10 text-rose"
            }`}
          >
            {growth >= 0 ? "↗" : "↘"} {Math.abs(growth).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
