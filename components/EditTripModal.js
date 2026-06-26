"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { saveTrip } from "@/lib/storage";

const ACCENT = "#4F6DF5";

function fmt(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EditTripModal({ trip, onClose, onSave }) {
  const [query, setQuery] = useState(trip.destination ?? "");
  const [destination, setDestination] = useState({
    name: trip.destination,
    placeId: trip.placeId,
  });
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const toDate = (iso) => (iso ? new Date(iso) : undefined);
  const [range, setRange] = useState({
    from: toDate(trip.startDate),
    to: toDate(trip.endDate),
  });

  const handleRangeSelect = (selected, day) => {
    if (!day) {
      setRange(selected);
      return;
    }

    // If a full range is already selected, a new click starts a fresh range.
    if (range.from && range.to) {
      setRange({ from: day, to: undefined });
      return;
    }

    setRange(selected ?? { from: day, to: undefined });
  };

  const debounce = useRef(null);

  const fetchSuggestions = useCallback((text) => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounce.current);
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/places?input=${encodeURIComponent(text)}`,
        );
        const data = await res.json();
        setSuggestions(data.predictions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setDestination(null);
    fetchSuggestions(e.target.value);
  };

  const selectSuggestion = (s) => {
    setDestination({ name: s.description, placeId: s.place_id });
    setQuery(s.description);
    setSuggestions([]);
  };

  const canSave = destination?.name && range.from && range.to;

  const handleSave = () => {
    if (!canSave) return;
    const updated = {
      destination: destination.name,
      placeId: destination.placeId,
      startDate: range.from.toISOString(),
      endDate: range.to.toISOString(),
    };
    saveTrip(updated);
    onSave(updated);
  };

  // Close on backdrop click
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={handleBackdrop}
    >
      <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-3xl p-7 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Edit Trip</h2>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Destination
          </label>
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search city…"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 outline-none focus:border-[#4F6DF5] transition-colors"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
            )}
            {suggestions.length > 0 && (
              <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/10 rounded-xl overflow-hidden shadow-xl">
                {suggestions.map((s) => (
                  <li
                    key={s.place_id}
                    onMouseDown={() => selectSuggestion(s)}
                    className="px-4 py-3 text-sm text-white/80 hover:bg-white/10 cursor-pointer border-b border-white/5 last:border-0"
                  >
                    {s.description}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Date picker */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Dates
          </label>
          {range.from && range.to ? (
            <div className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
              <span className="text-sm text-white/80">
                {fmt(range.from)} → {fmt(range.to)}
              </span>
              <button
                onClick={() => setRange({ from: undefined, to: undefined })}
                className="text-white/30 hover:text-white/60 text-xs transition-colors"
              >
                Clear
              </button>
            </div>
          ) : (
            <p className="text-xs text-white/30 px-1">
              Select a date range below
            </p>
          )}
          <DayPicker
            mode="range"
            selected={range}
            onSelect={handleRangeSelect}
            disabled={{ before: new Date() }}
            className="trip-edit-calendar font-sans"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white/40 border border-white/10 hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity"
            style={{ backgroundColor: ACCENT, opacity: canSave ? 1 : 0.35 }}
          >
            Save Trip
          </button>
        </div>
      </div>
    </div>
  );
}
