"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import DayPlan from "@/components/DayPlan";
import DayMap, { legLabel } from "@/components/DayMap";
import StartPointPicker from "@/components/StartPointPicker";
import AddPlacePicker from "@/components/AddPlacePicker";
import { availabilityAt, formatClock, TIME_RANGE_LABELS } from "@/lib/openingHours";
import { buildTimeline } from "@/lib/timeline";
import { buildIcs, estimateSpend, googleMapsLinks } from "@/lib/dayExport";
import { orderPlan, shortestOrder, isShortestOrder } from "@/lib/planOrder";

// True on screens at least `lg` (1024px) wide.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

// The day's plan as a list and a map side by side (on phones the map opens
// full screen from a "View map" button). Both show the same order:
// reordering in either one updates the other.
export default function DayPlanner({
  plan,
  onChange,
  onRemove,
  start = null, // { id, name, address, location } or null
  onStartChange = () => {}, // (start | null, applyToOtherDays) => void
  tripPlaceId = null,
  date = null, // the day's date
  dayStartMin = 9 * 60, // when the day starts, minutes after midnight
  onDayStartChange = () => {},
  blockWeather = null, // { Morning: { icon, temp, rainChance }, … } when forecast
  travelMode = "BEST", // default for every leg
  legModes = {}, // { [from stop id]: mode } per-leg choices
  onTravelChange = () => {}, // ({ travelMode, legModes }) => void
  tripDays = [], // [{ n, label }] for "move / copy to day"
  dayNumber = 1,
  onMoveToDay = () => {}, // (place, dayNumber, copy) => void
  tripName = "",
}) {
  const ordered = useMemo(() => orderPlan(plan), [plan]);
  const [selectedId, setSelectedId] = useState(null);
  const mode = travelMode;
  const setMode = (m) => onTravelChange({ travelMode: m, legModes: {} });
  const setLegMode = (fromId, m) => {
    const next = { ...legModes };
    if (!m || m === travelMode) delete next[fromId];
    else next[fromId] = m;
    onTravelChange({ travelMode, legModes: next });
  };
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [pickingStart, setPickingStart] = useState(false);
  const isDesktop = useIsDesktop();
  const [mapOpen, setMapOpen] = useState(false);
  // Desktop map below the plan can be hidden; the choice is remembered.
  const [mapVisible, setMapVisible] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem("dayMapVisible") === "false") setMapVisible(false);
    } catch {}
  }, []);
  const toggleMap = () =>
    setMapVisible((v) => {
      try {
        localStorage.setItem("dayMapVisible", String(!v));
      } catch {}
      return !v;
    });

  // Full-screen map on phones: close with Escape, and stop the page behind
  // it from scrolling.
  useEffect(() => {
    if (!mapOpen) return;
    const onKey = (e) => e.key === "Escape" && setMapOpen(false);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mapOpen]);
  useEffect(() => {
    if (isDesktop) setMapOpen(false);
  }, [isDesktop]);

  // Route from the starting point (if any) through the stops that have
  // coordinates, in plan order.
  const stops = useMemo(
    () => [
      ...(start?.location ? [{ ...start, id: "start" }] : []),
      ...ordered.filter((p) => p.location),
    ],
    [ordered, start],
  );
  const legModesKey = JSON.stringify(legModes);
  const dateKey = date ? date.toDateString() : "";
  // Rough departure time for a leg, for transit timetables: an hour into the
  // time of day of the place you're leaving (the start leaves at the day's
  // start time).
  const departureFor = (p) => {
    if (!date) return undefined;
    const d = new Date(date);
    const min =
      p.id === "start"
        ? dayStartMin
        : { Morning: 9 * 60, Afternoon: 13 * 60, Evening: 18 * 60 }[p.timeBlock] ?? 12 * 60;
    d.setHours(Math.floor(min / 60), min % 60, 0, 0);
    return d.toISOString();
  };
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
      body: JSON.stringify({
        stops: stops.map((p) => p.location),
        mode,
        legModes: Object.fromEntries(
          stops
            .slice(0, -1)
            .map((p, i) => [i, legModes[p.id]])
            .filter(([, m]) => m),
        ),
        departures: Object.fromEntries(
          stops.slice(0, -1).map((p, i) => [i, departureFor(p)]),
        ),
      }),
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
  }, [stopsKey, mode, legModesKey, dateKey]);

  // Travel time from each place to the next one that has coordinates, and
  // whether that's a long way (over 45 minutes).
  const legsByFromId = useMemo(() => {
    const out = {};
    if (!route?.legs) return out;
    route.legs.forEach((leg, i) => {
      if (stops[i]) {
        out[stops[i].id] = {
          label: legLabel(leg),
          mode: leg.mode,
          chosen: legModes[stops[i].id] ?? null,
          far: leg.durationSec > 45 * 60,
        };
      }
    });
    return out;
  }, [route, stops, legModes]);
  const anyFar = Object.values(legsByFromId).some((l) => l.far);

  // Rough timeline: arrival and leaving time at each stop.
  const travelToId = useMemo(() => {
    const out = {};
    route?.legs?.forEach((leg, i) => {
      if (stops[i + 1]) out[stops[i + 1].id] = leg.durationSec;
    });
    return out;
  }, [route, stops]);
  const times = useMemo(() => {
    // When a place is still closed on arrival, when does it open?
    const opensAt = (place, minute) => {
      if (!date) return null;
      const a = availabilityAt(place.hours, date, minute);
      return a && !a.ok && a.reason === "not-open-yet" ? a.opensAt : null;
    };
    return buildTimeline(ordered, (id) => travelToId[id] ?? 0, dayStartMin, opensAt);
  }, [ordered, travelToId, dayStartMin, date]);

  // Warnings: closed that day / at the arrival time, or running late.
  const issues = useMemo(() => {
    const out = {};
    const weekday = date?.toLocaleDateString("en-US", { weekday: "long" });
    for (const p of ordered) {
      const t = times[p.id];
      if (!t) continue;
      const a = date ? availabilityAt(p.hours, date, t.arrive) : null;
      if (t.late) {
        out[p.id] = `You'd get here around ${formatClock(t.arrive)}, ${t.late} min after ${formatClock(p.fixedTime)}`;
      } else if (a && !a.ok) {
        out[p.id] =
          a.reason === "closed-day"
            ? `Closed on ${weekday}s`
            : a.reason === "not-open-yet"
              ? `Opens at ${formatClock(a.opensAt)}, you'd arrive around ${formatClock(t.arrive)}`
              : `Closes at ${formatClock(a.closesAt)}, you'd arrive around ${formatClock(t.arrive)}`;
      } else if (t.overruns) {
        out[p.id] = `Runs past the ${p.timeBlock.toLowerCase()} (${TIME_RANGE_LABELS[p.timeBlock]})`;
      }
    }
    return out;
  }, [ordered, times, date]);
  const issueCount = Object.keys(issues).length;

  const [addingPlace, setAddingPlace] = useState(false);
  const addPlace = (place) => {
    setAddingPlace(false);
    if (ordered.some((p) => p.id === place.id)) return;
    onChangeRef.current([...ordered, place]);
  };
  const spend = useMemo(() => estimateSpend(ordered), [ordered]);

  // Directions in Google Maps, in plan order (from the starting point).
  const mapsLinks = useMemo(
    () =>
      googleMapsLinks(
        stops.map((p) => (p.id === "start" ? { ...p, id: start?.id } : p)),
        (route?.legs ?? []).map((l) => l.mode),
      ),
    [stops, start, route],
  );
  const [mapsMenuOpen, setMapsMenuOpen] = useState(false);

  const downloadCalendar = () => {
    if (!date) return;
    const ics = buildIcs({ plan: ordered, times, date, tripName });
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(tripName || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-day-${dayNumber}.ics`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const updatePlace = (id, patch) =>
    onChangeRef.current(
      ordered.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  const changeDuration = (id, durationMin) => updatePlace(id, { durationMin });

  // Shortest order, with one step of undo.
  const [beforeShortest, setBeforeShortest] = useState(null);
  const locatedCount = ordered.filter((p) => p.location).length;
  const alreadyShortest = useMemo(
    () => isShortestOrder(ordered, start),
    [ordered, start],
  );
  const applyShortest = () => {
    setBeforeShortest(ordered);
    onChangeRef.current(shortestOrder(ordered, start));
  };
  const undoShortest = () => {
    if (beforeShortest) onChangeRef.current(beforeShortest);
    setBeforeShortest(null);
  };
  // Any other change to the plan ends the chance to undo.
  const lastAppliedRef = useRef(null);
  useEffect(() => {
    const key = ordered.map((p) => p.id).join(",");
    if (beforeShortest && lastAppliedRef.current && key !== lastAppliedRef.current) {
      setBeforeShortest(null);
    }
    lastAppliedRef.current = beforeShortest ? key : null;
  }, [ordered, beforeShortest]);

  const handleSelect = useCallback((id) => setSelectedId(id), []);
  // Keep a stable callback for the map while always calling the latest
  // onChange from the page.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);
  const handleChange = useCallback((next) => onChangeRef.current(next), []);

  const map = (
    <DayMap
      plan={ordered}
      start={start}
      route={route}
      selectedId={selectedId}
      onSelect={handleSelect}
      onChange={handleChange}
    />
  );

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
        <span
          className={`block text-xs truncate ${
            legsByFromId.start?.far ? "text-[#FFC48A]" : "text-white/40"
          }`}
        >
          {legsByFromId.start
            ? `First stop: ${legsByFromId.start.label}${legsByFromId.start.far ? " (far)" : ""}`
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

  const addSection = (
    addingPlace ? (
          <AddPlacePicker
            tripPlaceId={tripPlaceId}
            onAdd={addPlace}
            onCancel={() => setAddingPlace(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setAddingPlace(true)}
            className="w-full rounded-xl border border-dashed border-white/20 px-3 py-3 text-left text-sm text-white/60 hover:text-white hover:border-white/40 transition-colors"
          >
            + Add a specific place
          </button>
        )
  );

  if (ordered.length === 0 && !start) {
    return (
      <div className="space-y-3">
        {startSection}
        <p className="text-sm text-white/45">
          Nothing planned yet. Add places from the suggestions below, or add a
          specific place.
        </p>
        {addSection}
      </div>
    );
  }

  const btn = (active) =>
    `rounded-lg px-3 py-1.5 border text-sm transition-colors ${
      active
        ? "border-[#FF9F43] bg-[#FF9F43]/15 text-white"
        : "border-white/15 text-white/60 hover:text-white"
    }`;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-white/50">Travel by</span>
          {[
            ["BEST", "Best"],
            ["WALK", "Walk"],
            ["TRANSIT", "Transit"],
            ["DRIVE", "Drive"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              aria-pressed={mode === value}
              className={btn(mode === value)}
            >
              {label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-white/60">
          Day starts at
          <select
            value={dayStartMin}
            onChange={(e) => onDayStartChange(Number(e.target.value))}
            className="rounded-lg border border-white/15 bg-zinc-900 px-2 py-1.5 text-sm text-white outline-none focus:border-[#FF9F43]"
          >
            {Array.from({ length: 15 }, (_, i) => 5 * 60 + i * 30).map((m) => (
              <option key={m} value={m}>
                {formatClock(m)}
              </option>
            ))}
          </select>
        </label>

        {locatedCount >= 2 &&
          (beforeShortest ? (
            <span className="flex items-center gap-2">
              <span className="text-white/70">Reordered for the shortest route.</span>
              <button
                type="button"
                onClick={undoShortest}
                className="text-white underline underline-offset-2 hover:no-underline"
              >
                Undo
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={applyShortest}
              disabled={alreadyShortest}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:text-white hover:border-white/30 disabled:opacity-40 disabled:hover:text-white/80 disabled:hover:border-white/15"
            >
              {alreadyShortest ? "Already the shortest route" : "Reorder for shortest route"}
            </button>
          ))}

        {!isDesktop && (
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="ml-auto rounded-lg px-3 py-1.5 bg-[#FF9F43] text-[#1A1006] font-semibold"
          >
            View map
          </button>
        )}
      </div>

      {/* Notices */}
      {(anyFar || routeError || issueCount > 0) && (
        <div className="space-y-1">
          {issueCount > 0 && (
            <p className="text-xs text-[#FFC48A]">
              {issueCount === 1
                ? "1 stop has a timing problem (closed, or not open when you'd arrive). See the orange note under it."
                : `${issueCount} stops have timing problems (closed, or not open when you'd arrive). See the orange notes under them.`}
            </p>
          )}
          {anyFar && (
            <p className="text-xs text-[#FFC48A]">
              {mode === "WALK"
                ? "Some stops are over 45 minutes apart on foot. Try Best or Drive, reorder for the shortest route, or move far places to another day."
                : "Some stops are over 45 minutes apart. Reorder for the shortest route, or move far places to another day."}
            </p>
          )}
          {routeError && (
            <p className="text-xs text-white/50">
              Travel times unavailable ({routeError}). Check that the Routes
              API is enabled for PLACES_KEY.
            </p>
          )}
        </div>
      )}

      {ordered.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-white/70">
            {spend.priced > 0 ? (
              <>
                Estimated spend:{" "}
                <span className="font-semibold text-white">
                  {spend.high === 0 ? "free" : `~$${spend.low}–$${spend.high}`}
                </span>{" "}
                per person
                <span className="text-white/40">
                  {" "}
                  (rough, from Google price levels
                  {spend.unpriced > 0
                    ? `; ${spend.unpriced} place${spend.unpriced === 1 ? " has" : "s have"} no price info`
                    : ""}
                  )
                </span>
              </>
            ) : (
              <span className="text-white/40">No price info for these places yet.</span>
            )}
          </span>
          <span className="ml-auto flex gap-2 print:hidden">
            {mapsLinks.length === 1 && (
              <a
                href={mapsLinks[0].url}
                target="_blank"
                rel="noopener noreferrer"
                title={`Directions through every stop in order (${mapsLinks[0].mode})`}
                className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:text-white hover:border-white/30"
              >
                Open in Google Maps
              </a>
            )}
            {mapsLinks.length > 1 && (
              <span className="relative">
                <button
                  type="button"
                  onClick={() => setMapsMenuOpen((o) => !o)}
                  aria-expanded={mapsMenuOpen}
                  className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:text-white hover:border-white/30"
                >
                  Open in Google Maps ▾
                </button>
                {mapsMenuOpen && (
                  <span className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-white/15 bg-zinc-900 p-1 shadow-xl">
                    <span className="block px-2 py-1 text-xs text-white/45">
                      Google Maps takes up to 11 stops per route, so this day
                      is split into parts.
                    </span>
                    {mapsLinks.map((l) => (
                      <a
                        key={l.url}
                        href={l.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setMapsMenuOpen(false)}
                        className="block truncate rounded px-2 py-1.5 text-sm text-white/80 hover:bg-white/10 hover:text-white"
                      >
                        {l.label}
                      </a>
                    ))}
                  </span>
                )}
              </span>
            )}
            <button
              type="button"
              onClick={downloadCalendar}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:text-white hover:border-white/30"
            >
              Add to calendar
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/80 hover:text-white hover:border-white/30"
            >
              Print
            </button>
          </span>
        </div>
      )}

      <div className="max-w-xl print:hidden">{startSection}</div>

      {/* Morning | Afternoon | Evening */}
      <DayPlan
        plan={ordered}
        onChange={handleChange}
        onRemove={onRemove}
        selectedId={selectedId}
        onSelect={handleSelect}
        legsByFromId={legsByFromId}
        times={times}
        issues={issues}
        onDurationChange={changeDuration}
        blockWeather={blockWeather}
        onLegModeChange={setLegMode}
        defaultMode={mode}
        onUpdate={updatePlace}
        tripDays={tripDays}
        dayNumber={dayNumber}
        onMoveToDay={onMoveToDay}
      />

      <div className="max-w-xl print:hidden">{addSection}</div>

      {isDesktop && (
        <div className="space-y-2 print:hidden">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={toggleMap}
              aria-expanded={mapVisible}
              className={btn(mapVisible)}
            >
              {mapVisible ? "Hide map" : "Show map"}
            </button>
          </div>
          {mapVisible && <div className="h-[30rem] 2xl:h-[36rem]">{map}</div>}
        </div>
      )}
      {!isDesktop && mapOpen && (
            <div
              className="fixed inset-0 z-[60] flex flex-col bg-black"
              role="dialog"
              aria-modal="true"
              aria-label="Map of this day's plan"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                <p className="text-sm font-semibold text-white">
                  {ordered.length} stop{ordered.length === 1 ? "" : "s"}
                  {start ? ` from ${start.name}` : ""}
                </p>
                <button
                  type="button"
                  onClick={() => setMapOpen(false)}
                  className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white"
                >
                  Close
                </button>
              </div>
              <div className="relative flex-1 [&>div]:absolute [&>div]:inset-0 [&>div]:rounded-none [&>div]:border-0">
                {map}
              </div>
            </div>
          )}
    </div>
  );
}
