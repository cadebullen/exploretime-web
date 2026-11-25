import { coordsForPlace, textSearch } from "@/lib/placesServer";
import {
  BASE_QUERIES,
  INTEREST_QUERIES,
  MAX_INTEREST_QUERIES,
} from "@/lib/placeCategories";

const RESULTS_PER_QUERY = 20; // the most one Places text search returns

function toPlace(result, q) {
  return {
    id: result.place_id,
    name: result.name,
    address: result.formatted_address ?? "",
    rating: result.rating ?? null,
    ratingCount: result.user_ratings_total ?? 0,
    priceLevel: result.price_level ?? null,
    photoRef: result.photos?.[0]?.photo_reference ?? null,
    category: q.category,
    timeBlock: q.timeBlock,
    interest: q.id,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.name)}&query_place_id=${result.place_id}`,
  };
}

// GET /api/recommendations?city=Lisbon&placeId=...&interests=museums,cafes
// Real places near the destination for each chosen interest, plus a few
// general searches (top sights, local food, breakfast).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const placeId = searchParams.get("placeId");
  const interests = (searchParams.get("interests") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((id) => INTEREST_QUERIES[id]);

  if (!city) {
    return Response.json({ error: "Missing 'city' parameter" }, { status: 400 });
  }
  if (!process.env.PLACES_KEY) {
    return Response.json({ error: "PLACES_KEY is not set" }, { status: 500 });
  }

  const coords = await coordsForPlace(placeId);
  const queries = [
    ...BASE_QUERIES,
    ...[...new Set(interests)]
      .slice(0, MAX_INTEREST_QUERIES)
      .map((id) => ({ id, ...INTEREST_QUERIES[id] })),
  ];

  const settled = await Promise.allSettled(
    queries.map((q) => textSearch(`${q.query} in ${city}`, coords)),
  );

  const byId = new Map();
  let firstError = null;
  settled.forEach((outcome, i) => {
    if (outcome.status === "rejected") {
      firstError ??= outcome.reason;
      console.error("[Recommendations]", queries[i].id, outcome.reason?.message);
      return;
    }
    outcome.value
      .filter((r) => r.business_status !== "CLOSED_PERMANENTLY")
      .slice(0, RESULTS_PER_QUERY)
      .forEach((r) => {
        // A place found by an interest search beats the same place from a
        // general search, since it matches what the user asked for.
        const existing = byId.get(r.place_id);
        const isInterest = (id) => id in INTEREST_QUERIES;
        if (
          !existing ||
          (isInterest(queries[i].id) && !isInterest(existing.interest))
        ) {
          byId.set(r.place_id, toPlace(r, queries[i]));
        }
      });
  });

  if (byId.size === 0 && firstError) {
    return Response.json(
      { error: `Google Places: ${firstError.message}` },
      { status: 502 },
    );
  }

  return Response.json({ places: [...byId.values()] });
}
