// POST /api/route
// {
//   stops: [{ lat, lng }, …],             in visiting order
//   mode: "BEST" | "WALK" | "TRANSIT" | "DRIVE",   default for every leg
//   legModes: { [legIndex]: mode },        per-leg choices, optional
//   departures: { [legIndex]: ISO time },  when each leg starts, optional
// }
// → { legs: [{ mode, durationSec, distanceMeters, polyline, transitLines }] }
//
// BEST walks legs of up to 20 minutes, and takes public transit (or drives,
// where there's no transit) for longer ones. Uses the Google Routes API.

const MODES = ["BEST", "WALK", "TRANSIT", "DRIVE"];
const BEST_WALK_LIMIT_SEC = 20 * 60;

const point = ({ lat, lng }) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});
const seconds = (d) => parseInt(String(d ?? "0").replace("s", ""), 10) || 0;

async function computeRoutes(body, fieldMask) {
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.PLACES_KEY,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message ?? `HTTP ${res.status}`);
    err.httpStatus = res.status;
    throw err;
  }
  return data.routes?.[0] ?? null;
}

// Walking legs for the whole day in one request.
async function walkAll(stops) {
  const route = await computeRoutes(
    {
      origin: point(stops[0]),
      destination: point(stops[stops.length - 1]),
      intermediates: stops.slice(1, -1).map(point),
      travelMode: "WALK",
    },
    "routes.legs.duration,routes.legs.distanceMeters,routes.legs.polyline.encodedPolyline",
  );
  return (route?.legs ?? []).map((leg) => ({
    mode: "WALK",
    durationSec: seconds(leg.duration),
    distanceMeters: leg.distanceMeters ?? 0,
    polyline: leg.polyline?.encodedPolyline ?? null,
  }));
}

// One leg by transit or car. Returns null when there's no such route.
async function singleLeg(from, to, mode, departure) {
  const body = { origin: point(from), destination: point(to), travelMode: mode };
  if (mode === "DRIVE") body.routingPreference = "TRAFFIC_UNAWARE";
  if (mode === "TRANSIT" && departure && new Date(departure) > new Date()) {
    body.departureTime = departure;
  }
  const mask =
    "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline" +
    (mode === "TRANSIT"
      ? ",routes.legs.steps.travelMode,routes.legs.steps.transitDetails.transitLine.nameShort,routes.legs.steps.transitDetails.transitLine.name,routes.legs.steps.transitDetails.transitLine.vehicle.type"
      : "");
  try {
    const route = await computeRoutes(body, mask);
    if (!route) return null;
    const lines =
      mode === "TRANSIT"
        ? (route.legs?.[0]?.steps ?? [])
            .filter((s) => s.travelMode === "TRANSIT" && s.transitDetails?.transitLine)
            .map((s) => {
              const l = s.transitDetails.transitLine;
              return l.nameShort || l.name || l.vehicle?.type || "Transit";
            })
        : [];
    return {
      mode,
      durationSec: seconds(route.duration),
      distanceMeters: route.distanceMeters ?? 0,
      polyline: route.polyline?.encodedPolyline ?? null,
      transitLines: [...new Set(lines)],
    };
  } catch (err) {
    if (err.httpStatus >= 500) throw err;
    return null; // e.g. no transit between these points
  }
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const stops = (body.stops ?? []).filter(
    (s) => Number.isFinite(s?.lat) && Number.isFinite(s?.lng),
  );
  const defaultMode = MODES.includes(body.mode) ? body.mode : "BEST";
  const legModes = body.legModes ?? {};
  const departures = body.departures ?? {};
  if (stops.length < 2) return Response.json({ legs: [] });
  if (stops.length > 27) {
    return Response.json({ error: "Too many stops (max 27)" }, { status: 400 });
  }

  try {
    const wanted = stops.slice(1).map((_, i) =>
      MODES.includes(legModes[i]) ? legModes[i] : defaultMode,
    );
    const needWalk = wanted.some((m) => m === "WALK" || m === "BEST");
    const walking = needWalk ? await walkAll(stops) : [];

    const legs = await Promise.all(
      wanted.map(async (m, i) => {
        const from = stops[i];
        const to = stops[i + 1];
        const walk = walking[i];
        if (m === "WALK") return walk ?? (await singleLeg(from, to, "WALK"));
        if (m === "BEST") {
          if (walk && walk.durationSec <= BEST_WALK_LIMIT_SEC) return { ...walk, auto: true };
          const transit = await singleLeg(from, to, "TRANSIT", departures[i]);
          if (transit && (!walk || transit.durationSec < walk.durationSec)) {
            return { ...transit, auto: true };
          }
          const drive = await singleLeg(from, to, "DRIVE");
          return { ...(drive ?? walk), auto: true };
        }
        return (
          (await singleLeg(from, to, m, departures[i])) ?? {
            ...(walk ?? { durationSec: 0, distanceMeters: 0, polyline: null }),
            mode: m,
            unavailable: true, // no such route; walking time shown instead
          }
        );
      }),
    );
    return Response.json({ legs });
  } catch (err) {
    console.error("[Route]", err.message);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
