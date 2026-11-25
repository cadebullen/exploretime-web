"use client";

import { useState } from "react";
import PlaceSearch from "@/components/PlaceSearch";

// Search for a starting point (hotel, address, station) near the trip's city.
// Calls onPick(place, applyToOtherDays) with { id, name, address, location }.
export default function StartPointPicker({ tripPlaceId, onPick, onCancel }) {
  const [applyToAll, setApplyToAll] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const pick = async (place) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/place-locations?ids=${encodeURIComponent(place.id)}`);
      const { locations = {} } = await res.json();
      if (!locations[place.id]) {
        setError("Couldn't find that place on the map. Try another result.");
        return;
      }
      onPick({ ...place, location: locations[place.id] }, applyToAll);
    } catch {
      setError("Couldn't reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <PlaceSearch
      tripPlaceId={tripPlaceId}
      placeholder="Search your hotel or an address…"
      onPick={pick}
      onCancel={onCancel}
      busy={busy}
      error={error}
    >
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-white/60">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
            className="accent-[#FF9F43]"
          />
          Also use for days that don&apos;t have a starting point
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
