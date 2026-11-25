"use client";

import { useEffect, useRef, useState } from "react";

// Search box for any kind of place near the trip's city. Calls
// onPick({ id, name, address }) when a result is chosen. `children` is shown
// under the results (options, a Cancel button…).
export default function PlaceSearch({
  tripPlaceId,
  placeholder,
  onPick,
  onCancel,
  busy = false,
  error: outsideError = null,
  children,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
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

  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.03] p-3 space-y-3">
      <div className="relative">
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && onCancel?.()}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder-white/35 outline-none focus:border-[#FF9F43]"
        />
        {(searching || busy) && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
        )}
      </div>

      {results.length > 0 && (
        <ul className="max-h-56 overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onPick(r)}
                disabled={busy}
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

      {(outsideError || error) && (
        <p className="text-xs text-white/60">{outsideError || error}</p>
      )}

      {children}
    </div>
  );
}
