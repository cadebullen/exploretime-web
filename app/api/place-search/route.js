import { autocompletePlaces, coordsForPlace } from "@/lib/placesServer";

// GET /api/place-search?input=hotel+name&placeId=<trip destination place id>
// → { predictions: [{ id, name, address }] }
// Any kind of place (hotels, addresses, stations), near the trip's city.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input")?.trim() ?? "";
  if (input.length < 2) return Response.json({ predictions: [] });

  try {
    const coords = await coordsForPlace(searchParams.get("placeId"));
    return Response.json({ predictions: await autocompletePlaces(input, coords) });
  } catch (err) {
    console.error("[Place search]", err.message);
    return Response.json({ error: err.message, predictions: [] }, { status: 502 });
  }
}
