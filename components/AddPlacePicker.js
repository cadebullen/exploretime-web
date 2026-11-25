"use client";

import { useState } from "react";
import PlaceSearch from "@/components/PlaceSearch";
import { BLOCKS } from "@/lib/planOrder";
import { TIME_RANGE_LABELS } from "@/lib/openingHours";

// Add any place to the day's plan: search, choose a time of day, and the
// place is added with its full details (hours, location, website…).
export default function AddPlacePicker({ tripPlaceId, onAdd, onCancel }) {
  const [timeBlock, setTimeBlock] = useState("Morning");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pick = async (prediction) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/place-details?id=${encodeURIComponent(prediction.id)}`);
      const data = await res.json();
      if (data.error || !data.place) {
        setError(`Couldn't add that place (${data.error ?? "no details"}).`);
        return;
      }
      onAdd({ ...data.place, timeBlock, detailsFetched: true });
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlaceSearch
      tripPlaceId={tripPlaceId}
      placeholder="Search a restaurant, attraction, address…"
      onPick={pick}
      onCancel={onCancel}
      busy={busy}
      error={error}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-white/60">
          Add to
          <select
            value={timeBlock}
            onChange={(e) => setTimeBlock(e.target.value)}
            className="rounded-md border border-white/15 bg-zinc-900 px-2 py-1 text-xs text-white outline-none focus:border-[#FF9F43]"
          >
            {BLOCKS.map((b) => (
              <option key={b} value={b}>
                {b} ({TIME_RANGE_LABELS[b]})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-white/50 hover:text-white"
        >
          Cancel
        </button>
      </div>
    </PlaceSearch>
  );
}
