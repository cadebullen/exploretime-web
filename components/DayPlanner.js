"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DayPlan from "@/components/DayPlan";
import DayMap, { legLabel } from "@/components/DayMap";
import StartPointPicker from "@/components/StartPointPicker";
import { orderPlan } from "@/lib/planOrder";

// The day's plan as a list and a map side by side. Both show the same order:
// reordering in either one updates the other.
export default function DayPlanner({
  plan,
  onChange,
  onRemove,
  start = null, // { id, name, address, location } or null
  onStartChange = () => {}, // (start | null, applyToOtherDays) => void
  tripPlaceId = null,
}) {
  const ordered = useMemo(() => orderPlan(plan), [plan]);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("WALK");
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [pickingStart, setPickingStart] = useState(false);

  // Route from the starting point (if any) through the stops that have
  // coordinates, in plan order.
  const stops = useMemo(
    () => [
      ...(start?.location ? [{ ...start, id: "start" }] : []),
      ...ordered.filter((p) => p.location),
    ],
    [ordered, start],
  );
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

  const startSection = pickingStart ? (
    <StartPointPicker
      tripPlaceId={tripPlaceId}
      onCancel={() => setPickingStart(false)}
      onPick={(place, applyToAll) => {
        setPickingStart(false);
        onStartChange(place, applyToAll);
      }}
    />
  ) : start ? (
    <div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.06] px-3 py-3">
      <span className="w-6 h-6 shrink-0 rounded-full bg-white text-[#1A1006] flex items-center justify-center text-xs font-bold">
        S
      </span>
      <button
        type="button"
        onClick={() => setSelectedId(selectedId === "start" ? null : "start")}
        className="flex-1 min-w-0 text-left"
        title="Show on map"
      >
        <span className="block text-sm font-medium text-white truncate">
          Start: {start.name}
        </span>
        <span className="block text-xs text-white/40 truncate">
          {legsByFromId.start
            ? `First stop: ${legsByFromId.start}`
            : start.address}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setPickingStart(true)}
        className="text-xs text-white/60 hover:text-white"
      >
        Change
      </button>
      <button
        type="button"
        onClick={() => onStartChange(null, false)}
        className="text-xs text-white/50 hover:text-white"
      >
        Remove
      </button>
    </div>
  ) : (
    <button
      type="button"
      onClick={() => setPickingStart(true)}
      className="w-full rounded-xl border border-dashed border-white/20 px-3 py-3 text-left text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors"
    >
      + Add a starting point (e.g. your hotel)
    </button>
  );

  if (ordered.length === 0 && !start) {
    return (
      <div className="space-y-3">
        {startSection}
        <p className="text-sm text-white/45">
          Nothing planned yet. Add places from the suggestions below.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:gap-8 lg:items-start">
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
        {startSection}
        {ordered.length === 0 && (
          <p className="text-sm text-white/45">
            Nothing planned yet. Add places from the suggestions below.
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
      <div className="h-80 lg:h-[34rem] 2xl:h-[40rem]">
        <DayMap
          plan={ordered}
          start={start}
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
