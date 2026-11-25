// Spending estimate and calendar export for a day's plan.

// Rough spend per person for Google's price levels 0–4 (free … very
// expensive). Price levels are relative to local prices, so this is only a
// ballpark.
const PRICE_RANGES = [
  [0, 0],
  [5, 20],
  [20, 40],
  [40, 80],
  [80, 160],
];

export function estimateSpend(plan) {
  let low = 0;
  let high = 0;
  let priced = 0;
  for (const p of plan) {
    const r = PRICE_RANGES[p.priceLevel];
    if (!r) continue;
    low += r[0];
    high += r[1];
    priced += 1;
  }
  return { low, high, priced, unpriced: plan.length - priced };
}

const pad = (n) => String(n).padStart(2, "0");

// Local "floating" time (no time zone), so the event shows at that clock
// time in the calendar.
function icsTime(date, minutes) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setMinutes(minutes);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

const escape = (text) =>
  String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/([,;])/g, "\\$1");

// Folds lines longer than 75 characters, as the iCalendar format requires.
const fold = (line) => {
  const out = [];
  let rest = line;
  while (rest.length > 75) {
    out.push(rest.slice(0, 75));
    rest = ` ${rest.slice(75)}`;
  }
  out.push(rest);
  return out.join("\r\n");
};

// An .ics calendar file with one event per stop.
export function buildIcs({ plan, times, date, tripName }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ExploreTime//Day plan//EN",
    "CALSCALE:GREGORIAN",
  ];
  for (const p of plan) {
    const t = times[p.id];
    if (!t) continue;
    const description = [p.note, p.website, p.mapsUrl].filter(Boolean).join("\n");
    lines.push(
      "BEGIN:VEVENT",
      `UID:${p.id}-${icsTime(date, t.arrive)}@exploretime`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(date, t.arrive)}`,
      `DTEND:${icsTime(date, t.leave)}`,
      fold(`SUMMARY:${escape(p.name)}${tripName ? escape(` (${tripName})`) : ""}`),
      fold(`LOCATION:${escape(p.address)}`),
      fold(`DESCRIPTION:${escape(description)}`),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// Google Maps directions links for the day, in plan order.
// stops: [{ id, name, location: { lat, lng } }] including the starting point.
// Google Maps takes up to 9 stops between the origin and destination, so
// longer days are split into parts that continue from each other.
// Public transit can't have stops in between, so multi-stop parts that would
// use transit use driving instead.
const MAX_WAYPOINTS = 9;
const MAPS_MODES = { WALK: "walking", DRIVE: "driving", TRANSIT: "transit" };

export function googleMapsLinks(stops, legModes = []) {
  const located = stops.filter((s) => s.location);
  if (located.length < 2) return [];

  const parts = [];
  for (let i = 0; i < located.length - 1; i += MAX_WAYPOINTS + 1) {
    parts.push({ from: i, to: Math.min(i + MAX_WAYPOINTS + 1, located.length - 1) });
  }

  return parts.map(({ from, to }, n) => {
    const chunk = located.slice(from, to + 1);
    const modes = legModes.slice(from, to).filter(Boolean);
    let mode = "driving";
    if (modes.length && modes.every((m) => m === "WALK")) mode = "walking";
    else if (chunk.length === 2 && modes[0]) mode = MAPS_MODES[modes[0]] ?? "driving";

    const coord = (s) => `${s.location.lat},${s.location.lng}`;
    const origin = chunk[0];
    const destination = chunk[chunk.length - 1];
    const middle = chunk.slice(1, -1);
    const params = new URLSearchParams({
      api: "1",
      origin: coord(origin),
      destination: coord(destination),
      travelmode: mode,
    });
    if (origin.id) params.set("origin_place_id", origin.id);
    params.set("destination_place_id", destination.id);
    if (middle.length) {
      params.set("waypoints", middle.map(coord).join("|"));
      params.set("waypoint_place_ids", middle.map((s) => s.id).join("|"));
    }
    return {
      label:
        parts.length === 1
          ? "Open in Google Maps"
          : `Part ${n + 1}: ${origin.name} → ${destination.name}`,
      url: `https://www.google.com/maps/dir/?${params}`,
      mode,
    };
  });
}
