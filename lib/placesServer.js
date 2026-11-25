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

const SEARCH_FIELDS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.photos",
  "places.regularOpeningHours",
  "places.businessStatus",
  "places.googleMapsUri",
].join(",");

const PRICE_LEVELS = {
  PRICE_LEVEL_FREE: 0,
  PRICE_LEVEL_INEXPENSIVE: 1,
  PRICE_LEVEL_MODERATE: 2,
  PRICE_LEVEL_EXPENSIVE: 3,
  PRICE_LEVEL_VERY_EXPENSIVE: 4,
};

// Text search near a location with Places API (New). Returns places in a
// simple shape; throws with Google's error message on failure.
export async function textSearch(query, coords) {
  const body = { textQuery: query, pageSize: 20 };
  if (coords) {
    const [latitude, longitude] = coords.split(",").map(Number);
    body.locationBias = {
      circle: { center: { latitude, longitude }, radius: 20000 },
    };
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.PLACES_KEY,
      "X-Goog-FieldMask": SEARCH_FIELDS,
    },
    body: JSON.stringify(body),
    next: { revalidate: 86400 },
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const err = new Error(data.error?.message || `HTTP ${res.status}`);
    err.status = data.error?.status;
    throw err;
  }

  return (data.places ?? [])
    .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY")
    .map((p) => ({
      id: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? 0,
      priceLevel: PRICE_LEVELS[p.priceLevel] ?? null,
      photoName: p.photos?.[0]?.name ?? null,
      hours: p.regularOpeningHours?.periods ?? null,
      mapsUrl:
        p.googleMapsUri ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text ?? "")}&query_place_id=${p.id}`,
    }));
}
