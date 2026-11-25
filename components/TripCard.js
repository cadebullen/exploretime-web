"use client";

import { useState } from "react";
import { formatDate, getDaysUntil } from "@/lib/utils";

export default function TripCard({ trip, dayCount, onEdit, onDelete }) {
  const daysUntil = getDaysUntil(trip.startDate);
  const [confirmDelete, setConfirmDelete] = useState(false);

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
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={onEdit}
            className="text-xs font-semibold text-white/60 hover:text-white border border-white/25 hover:border-white/50 rounded-lg px-3 py-1.5 transition-colors"
          >
            ✏️ Edit trip
          </button>
          {onDelete &&
            (confirmDelete ? (
              <>
                <span className="text-xs text-white/80">
                  Delete this trip and its plans?
                </span>
                <button
                  onClick={() => {
                    setConfirmDelete(false);
                    onDelete();
                  }}
                  className="text-xs font-semibold text-white bg-red-500/80 hover:bg-red-500 rounded-lg px-3 py-1.5 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs font-semibold text-white/60 hover:text-white px-2 py-1.5"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs font-semibold text-white/60 hover:text-white border border-white/25 hover:border-white/50 rounded-lg px-3 py-1.5 transition-colors"
              >
                🗑 Delete trip
              </button>
            ))}
        </div>
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
