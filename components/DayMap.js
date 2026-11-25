"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { canMove, movePlace } from "@/lib/planOrder";

const MAPS_KEY = process.env.NEXT_PUBLIC_MAPS_KEY;
// Advanced markers need a map ID. DEMO_MAP_ID works for development; for
// production create a map ID in Google Cloud and set NEXT_PUBLIC_MAPS_MAP_ID.
const MAP_ID = process.env.NEXT_PUBLIC_MAPS_MAP_ID || "DEMO_MAP_ID";
const ACCENT = "#FF9F43";

// Loads the Google Maps JavaScript API once per page.
let mapsPromise = null;
function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    window.__exploreTimeMapsReady = () => resolve(window.google.maps);
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(MAPS_KEY)}&v=weekly&libraries=geometry,marker&loading=async&callback=__exploreTimeMapsReady`;
    script.async = true;
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error("Couldn't load Google Maps"));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
}

// Round numbered pin for an advanced marker.
function pinElement(text, { fill, ring = "#1A1006" }) {
  const el = document.createElement("div");
  el.textContent = text;
  el.style.cssText = [
    "width:28px",
    "height:28px",
    "border-radius:50%",
    `background:${fill}`,
    `border:2px solid ${ring}`,
    "color:#1A1006",
    "font:700 12px system-ui, sans-serif",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "box-shadow:0 1px 4px rgba(0,0,0,.5)",
    "cursor:pointer",
  ].join(";");
  return el;
}

function formatDuration(sec) {
  const min = Math.round(sec / 60);
  if (min < 60) return `${Math.max(min, 1)} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function formatDistance(m) {
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;
}

export function legLabel(leg, mode) {
  if (!leg) return null;
  const verb = mode === "DRIVE" ? "drive" : "walk";
  return `${formatDuration(leg.durationSec)} ${verb} · ${formatDistance(leg.distanceMeters)}`;
}

// Map of the day's plan: numbered pins in plan order and the route between
// them. Pins can move a place earlier or later, which reorders the plan.
export default function DayMap({
  plan, // ordered places, each with location { lat, lng }
  start = null, // starting point { name, location } or null
  mode,
  route, // { legs, polyline } or null
  selectedId,
  onSelect,
  onChange,
}) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const startMarkerRef = useRef(null);
  const lineRef = useRef(null);
  const infoRef = useRef(null);
  const fittedKeyRef = useRef("");
  const [error, setError] = useState(MAPS_KEY ? null : "missing-key");
  const [ready, setReady] = useState(false);

  // Numbered by position in the plan, so the pins match the list.
  const stops = useMemo(
    () => plan.map((p, i) => ({ ...p, n: i + 1 })).filter((p) => p.location),
    [plan],
  );

  // Create the map once.
  useEffect(() => {
    if (!MAPS_KEY) return;
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || mapRef.current || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 2,
          mapId: MAP_ID,
          colorScheme: maps.ColorScheme?.DARK ?? "DARK",
          disableDefaultUI: true,
          zoomControl: true,
          fullscreenControl: true,
          clickableIcons: false,
        });
        infoRef.current = new maps.InfoWindow();
        setReady(true);
      })
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  // Pins, numbered in plan order. Rebuilt whenever the order changes.
  useEffect(() => {
    if (!ready) return;
    const maps = window.google.maps;
    const map = mapRef.current;

    const { AdvancedMarkerElement } = maps.marker;

    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = stops.map((place, i) => {
      const marker = new AdvancedMarkerElement({
        map,
        position: place.location,
        title: `${place.n}. ${place.name}`,
        content: pinElement(String(place.n), {
          fill: place.id === selectedId ? "#FFFFFF" : ACCENT,
        }),
        zIndex: place.id === selectedId ? 1000 : i,
        gmpClickable: true,
      });
      marker.addListener("click", () => onSelect(place.id));
      return marker;
    });

    // Starting point: a white "S" pin.
    if (startMarkerRef.current) startMarkerRef.current.map = null;
    startMarkerRef.current = null;
    if (start?.location) {
      startMarkerRef.current = new AdvancedMarkerElement({
        map,
        position: start.location,
        title: `Start: ${start.name}`,
        content: pinElement("S", {
          fill: selectedId === "start" ? ACCENT : "#FFFFFF",
        }),
        zIndex: 999,
        gmpClickable: true,
      });
      startMarkerRef.current.addListener("click", () => onSelect("start"));
    }

    // Fit the view when the set of places changes (not on every reorder).
    const points = [
      ...(start?.location ? [start.location] : []),
      ...stops.map((p) => p.location),
    ];
    const key = [start?.id ?? "", ...stops.map((p) => p.id).sort()].join(",");
    if (key !== fittedKeyRef.current && points.length) {
      fittedKeyRef.current = key;
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(15);
      } else {
        const bounds = new maps.LatLngBounds();
        points.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, 48);
      }
    }
  }, [ready, stops, start, selectedId, onSelect]);

  // Info window for the selected place, with earlier/later buttons.
  useEffect(() => {
    if (!ready) return;
    const info = infoRef.current;
    if (selectedId === "start" && start?.location) {
      const box = document.createElement("div");
      box.style.cssText = "font: 13px system-ui, sans-serif; color: #111; min-width: 160px;";
      const title = document.createElement("div");
      title.style.cssText = "font-weight: 600;";
      title.textContent = `Start: ${start.name}`;
      const sub = document.createElement("div");
      sub.style.cssText = "color: #666; font-size: 12px;";
      sub.textContent = start.address ?? "";
      box.append(title, sub);
      info.setContent(box);
      info.open({ map: mapRef.current, anchor: startMarkerRef.current });
      const l = info.addListener("closeclick", () => onSelect(null));
      return () => l.remove();
    }
    const index = stops.findIndex((p) => p.id === selectedId);
    if (index === -1) {
      info.close();
      return;
    }
    const place = stops[index];

    const box = document.createElement("div");
    box.style.cssText = "font: 13px system-ui, sans-serif; color: #111; min-width: 180px;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight: 600; margin-bottom: 2px;";
    title.textContent = `${place.n}. ${place.name}`;
    const sub = document.createElement("div");
    sub.style.cssText = "color: #666; font-size: 12px; margin-bottom: 8px;";
    sub.textContent = `${place.timeBlock} · ${place.category}`;
    const row = document.createElement("div");
    row.style.cssText = "display: flex; gap: 6px;";
    const makeButton = (label, dir) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      const enabled = canMove(plan, place.id, dir);
      b.disabled = !enabled;
      b.style.cssText = `flex: 1; padding: 5px 8px; border-radius: 6px; border: 1px solid #ddd; background: ${enabled ? "#fff" : "#f3f3f3"}; color: ${enabled ? "#111" : "#aaa"}; cursor: ${enabled ? "pointer" : "default"}; font: inherit;`;
      b.addEventListener("click", () => onChange(movePlace(plan, place.id, dir)));
      return b;
    };
    row.append(makeButton("↑ Earlier", -1), makeButton("Later ↓", 1));
    box.append(title, sub, row);

    info.setContent(box);
    info.open({ map: mapRef.current, anchor: markersRef.current[index] });
    const listener = info.addListener("closeclick", () => onSelect(null));
    return () => listener.remove();
  }, [ready, stops, start, selectedId, plan, onChange, onSelect]);

  // Route line.
  useEffect(() => {
    if (!ready) return;
    const maps = window.google.maps;
    lineRef.current?.setMap(null);
    lineRef.current = null;
    if (!route?.polyline) return;
    lineRef.current = new maps.Polyline({
      map: mapRef.current,
      path: maps.geometry.encoding.decodePath(route.polyline),
      strokeColor: ACCENT,
      strokeOpacity: 0.85,
      strokeWeight: 4,
      ...(mode === "WALK" && {
        strokeOpacity: 0,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: ACCENT, scale: 3 },
            offset: "0",
            repeat: "12px",
          },
        ],
      }),
    });
  }, [ready, route, mode]);

  if (error === "missing-key") {
    return (
      <div className="h-full min-h-72 rounded-2xl border border-dashed border-white/15 flex items-center justify-center p-6 text-center text-sm text-white/50">
        Add NEXT_PUBLIC_MAPS_KEY to .env.local and restart the dev server to
        see this day on a map.
      </div>
    );
  }
  if (error) {
    return (
      <div className="h-full min-h-72 rounded-2xl border border-dashed border-white/15 flex items-center justify-center p-6 text-center text-sm text-white/50">
        {error}. Check that the Maps JavaScript API is enabled for
        NEXT_PUBLIC_MAPS_KEY.
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-72 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
      <div ref={containerRef} className="absolute inset-0" />
      {stops.length < plan.length && (
        <p className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-1 text-xs text-white/70">
          Locating {plan.length - stops.length} place
          {plan.length - stops.length === 1 ? "" : "s"}…
        </p>
      )}
    </div>
  );
}
