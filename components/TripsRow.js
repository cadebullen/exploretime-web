import { formatDate, getDaysUntil, getCityName } from "@/lib/utils";

function statusLabel(trip) {
  const until = getDaysUntil(trip.startDate);
  if (until > 1) return `In ${until} days`;
  if (until === 1) return "Tomorrow";
  if (until === 0) return "Today";
  return getDaysUntil(trip.endDate) >= 0 ? "In progress" : "Past trip";
}

// Horizontal, scrollable list of the user's trips. The active trip is
// highlighted; clicking another trip switches to it.
export default function TripsRow({ trips, activeId, onSelect, onAdd }) {
  return (
    <section>
      <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
        My Trips · {trips.length}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
        {trips.map((trip) => {
          const active = trip.id === activeId;
          return (
            <button
              key={trip.id}
              onClick={() => onSelect(trip.id)}
              aria-pressed={active}
              className={`snap-start shrink-0 w-56 text-left rounded-2xl p-4 border transition-colors ${
                active
                  ? "border-[#4F6DF5] bg-[#4F6DF5]/15"
                  : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
              }`}
            >
              <p className="text-base font-bold text-white truncate">
                {getCityName(trip.destination)}
              </p>
              <p className="text-xs text-white/40 truncate">
                {trip.destination}
              </p>
              <p className="text-xs text-white/70 mt-3">
                {formatDate(trip.startDate)} → {formatDate(trip.endDate)}
              </p>
              <p
                className={`text-[11px] font-semibold uppercase tracking-wider mt-1 ${
                  active ? "text-[#8EA2FF]" : "text-white/35"
                }`}
              >
                {statusLabel(trip)}
              </p>
            </button>
          );
        })}

        <button
          onClick={onAdd}
          className="snap-start shrink-0 w-40 rounded-2xl border border-dashed border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors flex flex-col items-center justify-center gap-1 p-4"
        >
          <span className="text-2xl leading-none">+</span>
          <span className="text-sm font-semibold">Add trip</span>
        </button>
      </div>
    </section>
  );
}
