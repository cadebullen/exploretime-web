"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DayPlan from "@/components/DayPlan";
import DayMap, { legLabel } from "@/components/DayMap";
import { orderPlan } from "@/lib/planOrder";

// The day's plan as a list and a map side by side. Both show the same order:
// reordering in either one updates the other.
export default function DayPlanner({ plan, onChange, onRemove }) {
  const ordered = useMemo(() => orderPlan(plan), [plan]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("WALK");
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);

  // Route through the stops that have coordinates, in plan order.
  const stops = useMemo(() => ordered.filter((p) => p.location), [ordered]);
  const stopsKey = stops
    .map((p) => `${p.location.lat},${p.location.lng}`)
    .join("|");

  useEffect(() => {
    if (stops.length < 2) {
      setRoute(null);
      return;
    }
    let cancelled = false;
    setRouteError(null);
    fetch("/api/route", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops: stops.map((p) => p.location), mode }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setRoute(null);
          setRouteError(d.error);
        } else {
          setRoute(d);
        }
      })
      .catch(() => !cancelled && setRouteError("Couldn't reach the server."));
    return () => {
      cancelled = true;
    };
    // stopsKey captures the stops' order and positions
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopsKey, mode]);

  // Travel time from each place to the next one that has coordinates.
  const legsByFromId = useMemo(() => {
    const out = {};
    if (!route?.legs) return out;
    route.legs.forEach((leg, i) => {
      if (stops[i]) out[stops[i].id] = legLabel(leg, mode);
    });
    return out;
  }, [route, stops, mode]);

  const handleSelect = useCallback((id) => setSelectedId(id), []);
  // Keep a stable callback for the map while always calling the latest
  // onChange from the page.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const handleChange = useCallback((next) => onChangeRef.current(next), []);

  if (ordered.length === 0) {
    return (
      <p className="text-sm text-white/45">
        Nothing planned yet. Add places from the suggestions below.
      </p>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/50">Travel by</span>
          {[
            ["WALK", "Walking"],
            ["DRIVE", "Driving"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={`rounded-lg px-3 py-1.5 border transition-colors ${
                mode === value
                  ? "border-[#FF9F43] bg-[#FF9F43]/15 text-white"
                  : "border-white/15 text-white/60 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {routeError && (
          <p className="text-xs text-white/50">
            Travel times unavailable ({routeError}). Check that the Routes API
            is enabled for PLACES_KEY.
          </p>
        )}
        <DayPlan
          plan={ordered}
          onChange={handleChange}
          onRemove={onRemove}
          selectedId={selectedId}
          onSelect={handleSelect}
          legsByFromId={legsByFromId}
        />
      </div>
      <div className="lg:sticky lg:top-24 h-80 lg:h-[32rem]">
        <DayMap
          plan={ordered}
          mode={mode}
          route={route}
          selectedId={selectedId}
          onSelect={handleSelect}
          onChange={handleChange}
        />
      </div>
    </div>
  );
}
