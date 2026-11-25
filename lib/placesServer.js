// Server-side Google Places helpers. Only import from route handlers: they
// use the PLACES_KEY secret.

// Coordinates ("lat,lng") for a Google place id, or null.
export async function coordsForPlace(placeId) {
  const key = process.env.PLACES_KEY;
  if (!placeId || !key) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=geometry&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const data = await res.json();
    const loc = data.result?.geometry?.location;
    if (!loc) {
      console.error("[Places] details", data.status, data.error_message ?? "");
      return null;
    }
    return `${loc.lat},${loc.lng}`;
  } catch (err) {
    console.error("[Places] details", err);
    return null;
  }
}

// Text search near a location. Returns Google's raw results (or throws with
// Google's status, e.g. REQUEST_DENIED).
export async function textSearch(query, coords) {
  const key = process.env.PLACES_KEY;
  const params = new URLSearchParams({ query, key });
  if (coords) {
    params.set("location", coords);
    params.set("radius", "20000");
  }
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/textsearch/json?${params}`,
    { next: { revalidate: 86400 } },
  );
  const data = await res.json();
  if (data.status === "OK" || data.status === "ZERO_RESULTS") {
    return data.results ?? [];
  }
  const err = new Error(data.error_message || data.status);
  err.status = data.status;
  throw err;
}
