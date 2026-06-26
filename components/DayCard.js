export default function DayCard({ day, onClick }) {
  const dateLabel = day.date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const weekday = day.date.toLocaleDateString("en-US", { weekday: "short" });

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-white/10 bg-white/3 hover:bg-white/7 hover:border-white/20 transition-all cursor-pointer group p-4 flex flex-col gap-3"
      aria-label={`Open ${day.label} details`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
          {weekday}
        </span>
        <span className="text-[10px] text-white/20">{dateLabel}</span>
      </div>
      <p className="text-sm font-bold text-white">{day.label}</p>
      <div className="mt-auto pt-2 border-t border-white/6">
        <p className="text-[11px] text-white/20 group-hover:text-white/40 transition-colors">
          View suggested activities
        </p>
      </div>
    </button>
  );
}
