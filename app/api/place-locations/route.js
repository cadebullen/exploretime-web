import { locationsForPlaces } from "@/lib/placesServer";

// GET /api/place-locations?ids=id1,id2 → { locations: { id: { lat, lng } } }
// Used for places saved before places carried their coordinates.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ids = (searchParams.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 25);
  if (ids.length === 0) return Response.json({ locations: {} });
  return Response.json({ locations: await locationsForPlaces(ids) });
}
