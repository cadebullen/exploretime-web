"use client";

import { useEffect, useRef, useState } from "react";

// Search for a starting point (hotel, address, station) near the trip's city.
// Calls onPick(place, applyToOtherDays) with { id, name, address, location }.
export default function StartPointPicker({ tripPlaceId, onPick, onCancel }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [applyToAll, setApplyToAll] = useState(true);
  const [picking, setPicking] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setSearching(true);
      setError(null);
      try {
        const params = new URLSearchParams({ input: query });
        if (tripPlaceId) params.set("placeId", tripPlaceId);
        const res = await fetch(`/api/place-search?${params}`);
        const data = await res.json();
        if (data.error) setError(data.error);
        setResults(data.predictions ?? []);
      } catch {
        setError("Couldn't reach the server.");
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query, tripPlaceId]);

  const pick = async (place) => {
    setPicking(true);
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
      setPicking(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 space-y-3">
      <div className="relative">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onCancel()}
          placeholder="Search your hotel or an address…"
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#FF9F43]"
        />
        {(searching || picking) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r)}
                disabled={picking}
                className="w-full text-left px-3 py-2 hover:bg-white/10"
              >
                <span className="block text-sm text-white">{r.name}</span>
                <span className="block text-xs text-white/40 truncate">
                  {r.address}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-white/60">{error}</p>}

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
    </div>
  );
}
