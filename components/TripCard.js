import { formatDate, getDaysUntil } from "@/lib/utils";

export default function TripCard({ trip, dayCount, onEdit }) {
  const daysUntil = getDaysUntil(trip.startDate);

  return (
    <div
      className="rounded-3xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6"
      style={{
        background: "linear-gradient(135deg, #4F6DF5 0%, #7C3AED 100%)",
      }}
    >
      <div>
        <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-2">
          Current Trip
        </p>
        <h1 className="text-4xl font-bold mb-2">{trip.destination}</h1>
        <p className="text-white/80">
          {formatDate(trip.startDate)} → {formatDate(trip.endDate)} · {dayCount}{" "}
          day{dayCount !== 1 ? "s" : ""}
        </p>
        <button
          onClick={onEdit}
          className="mt-4 text-xs font-semibold text-white/60 hover:text-white border border-white/25 hover:border-white/50 rounded-lg px-3 py-1.5 transition-colors"
        >
          ✏️ Edit trip
        </button>
      </div>
      <div className="sm:text-right shrink-0">
        {daysUntil > 0 ? (
          <>
            <p className="text-6xl font-bold leading-none">{daysUntil}</p>
            <p className="text-white/60 text-sm mt-2">days away</p>
          </>
        ) : daysUntil === 0 ? (
          <p className="text-3xl font-bold">Today! 🎉</p>
        ) : (
          <p className="text-white/60 text-sm">Trip in progress</p>
        )}
      </div>
    </div>
  );
}
