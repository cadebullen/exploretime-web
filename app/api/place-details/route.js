import { placeDetails } from "@/lib/placesServer";

// GET /api/place-details?id=<place id> → { place }
// Full details for one place: hours, location, website, phone, whether it
// takes reservations.
export async function GET(request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing 'id'" }, { status: 400 });
  try {
    return Response.json({ place: await placeDetails(id) });
  } catch (err) {
    console.error("[Place details]", err.message);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
