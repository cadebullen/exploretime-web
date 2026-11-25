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
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
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
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
      website: p.websiteUri ?? null,
      phone: p.nationalPhoneNumber ?? null,
      phoneIntl: p.internationalPhoneNumber ?? null,
      mapsUrl:
        p.googleMapsUri ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.displayName?.text ?? "")}&query_place_id=${p.id}`,
    }));
}

// Coordinates for Places API (New) place ids: { id: { lat, lng } }.
export async function locationsForPlaces(ids) {
  const out = {};
  await Promise.all(
    ids.map(async (id) => {
      try {
        const res = await fetch(
          `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
          {
            headers: {
              "X-Goog-Api-Key": process.env.PLACES_KEY,
              "X-Goog-FieldMask": "id,location",
            },
            next: { revalidate: 604800 },
          },
        );
        const data = await res.json();
        if (data.location) {
          out[id] = { lat: data.location.latitude, lng: data.location.longitude };
        }
      } catch (err) {
        console.error("[Places] location", id, err);
      }
    }),
  );
  return out;
}

// Place suggestions as the user types (Places API New Autocomplete),
// biased towards coords ("lat,lng") when given.
export async function autocompletePlaces(input, coords) {
  const body = { input };
  if (coords) {
    const [latitude, longitude] = coords.split(",").map(Number);
    body.locationBias = {
      circle: { center: { latitude, longitude }, radius: 30000 },
    };
  }
  const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.PLACES_KEY,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `HTTP ${res.status}`);
  }
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter(Boolean)
    .map((p) => ({
      id: p.placeId,
      name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      address: p.structuredFormat?.secondaryText?.text ?? "",
    }));
}

const FOOD_TYPES = ["restaurant", "cafe", "bakery", "coffee_shop", "food", "meal_takeaway", "meal_delivery", "bar", "brunch_restaurant", "breakfast_restaurant", "food_court", "ice_cream_shop", "dessert_shop", "wine_bar"];
const NIGHT_TYPES = ["night_club", "bar", "pub", "karaoke", "comedy_club", "live_music_venue", "casino"];
const OUTDOOR_TYPES = ["park", "national_park", "hiking_area", "beach", "garden", "botanical_garden", "zoo", "campground", "marina", "state_park", "dog_park", "playground", "observation_deck"];
const SHOP_TYPES = ["shopping_mall", "store", "clothing_store", "book_store", "market", "department_store", "gift_shop", "jewelry_store"];
const LEISURE_TYPES = ["spa", "gym", "yoga_studio", "wellness_center", "swimming_pool", "massage"];

// Category used by the app for a place, from Google's place types.
export function categoryForTypes(types = [], primaryType = "") {
  const has = (list) => list.includes(primaryType) || types.some((t) => list.includes(t));
  if (NIGHT_TYPES.includes(primaryType)) return "Nightlife";
  if (has(FOOD_TYPES)) return "Food";
  if (has(NIGHT_TYPES)) return "Nightlife";
  if (has(OUTDOOR_TYPES)) return "Outdoors";
  if (has(SHOP_TYPES)) return "Shopping";
  if (has(LEISURE_TYPES)) return "Leisure";
  return "Culture";
}

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "regularOpeningHours",
  "rating",
  "userRatingCount",
  "priceLevel",
  "photos",
  "googleMapsUri",
  "types",
  "primaryType",
  "websiteUri",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "reservable",
].join(",");

// Full details for one place (Places API New), in the app's place shape.
export async function placeDetails(id) {
  const res = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`,
    {
      headers: {
        "X-Goog-Api-Key": process.env.PLACES_KEY,
        "X-Goog-FieldMask": DETAIL_FIELDS,
      },
      next: { revalidate: 86400 },
    },
  );
  const p = await res.json();
  if (!res.ok || p.error) {
    throw new Error(p.error?.message || `HTTP ${res.status}`);
  }
  return {
    id: p.id,
    name: p.displayName?.text ?? "",
    address: p.formattedAddress ?? "",
    rating: p.rating ?? null,
    ratingCount: p.userRatingCount ?? 0,
    priceLevel: PRICE_LEVELS[p.priceLevel] ?? null,
    photoName: p.photos?.[0]?.name ?? null,
    hours: p.regularOpeningHours?.periods ?? null,
    location: p.location
      ? { lat: p.location.latitude, lng: p.location.longitude }
      : null,
    mapsUrl: p.googleMapsUri ?? null,
    category: categoryForTypes(p.types, p.primaryType),
    website: p.websiteUri ?? null,
    phone: p.nationalPhoneNumber ?? null,
    phoneIntl: p.internationalPhoneNumber ?? null,
    reservable: p.reservable ?? null,
  };
}
