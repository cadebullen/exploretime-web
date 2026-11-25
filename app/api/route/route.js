// POST /api/route  { stops: [{ lat, lng }, …], mode: "WALK" | "DRIVE" }
// → { legs: [{ durationSec, distanceMeters }], polyline }
// Travel route through the day's stops in order, via the Google Routes API.

const MODES = { WALK: "WALK", DRIVE: "DRIVE" };
const toWaypoint = ({ lat, lng }) => ({
  location: { latLng: { latitude: lat, longitude: lng } },
});

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
  const mode = MODES[body.mode] ?? "WALK";
  if (stops.length < 2) return Response.json({ legs: [], polyline: null });
  if (stops.length > 27) {
    return Response.json({ error: "Too many stops (max 27)" }, { status: 400 });
  }

  const req = {
    origin: toWaypoint(stops[0]),
    destination: toWaypoint(stops[stops.length - 1]),
    intermediates: stops.slice(1, -1).map(toWaypoint),
    travelMode: mode,
  };
  if (mode === "DRIVE") req.routingPreference = "TRAFFIC_UNAWARE";

  try {
    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.PLACES_KEY,
          "X-Goog-FieldMask":
            "routes.legs.duration,routes.legs.distanceMeters,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(req),
      },
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error("[Route]", data.error?.message ?? res.status);
      return Response.json(
        { error: data.error?.message ?? `HTTP ${res.status}` },
        { status: 502 },
      );
    }
    const route = data.routes?.[0];
    if (!route) return Response.json({ legs: [], polyline: null });
    return Response.json({
      legs: (route.legs ?? []).map((leg) => ({
        durationSec: parseInt(String(leg.duration ?? "0").replace("s", ""), 10) || 0,
        distanceMeters: leg.distanceMeters ?? 0,
      })),
      polyline: route.polyline?.encodedPolyline ?? null,
    });
  } catch (err) {
    console.error("[Route]", err);
    return Response.json({ error: "Route fetch failed" }, { status: 500 });
  }
}
