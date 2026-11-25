// GET /api/place-photo?name=places/…/photos/…&w=400   (Places API New)
// GET /api/place-photo?ref=<photo_reference>&w=400      (older Places API)
// Proxies a Google Places photo so the API key stays on the server.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  const ref = searchParams.get("ref");
  const width = Math.min(parseInt(searchParams.get("w") ?? "400", 10) || 400, 1200);
  const key = process.env.PLACES_KEY;

  let url;
  if (name && /^places\/[^/]+\/photos\/[^/]+$/.test(name)) {
    url = `https://places.googleapis.com/v1/${name}/media?maxWidthPx=${width}&key=${key}`;
  } else if (ref) {
    url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(ref)}&key=${key}`;
  } else {
    return new Response("Missing 'name' or 'ref'", { status: 400 });
  }

  try {
    const res = await fetch(url, { next: { revalidate: 604800 } });
    if (!res.ok) {
      return new Response("Photo not found", { status: res.status });
    }
    return new Response(await res.arrayBuffer(), {
      headers: {
        "Content-Type": res.headers.get("content-type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch (err) {
    console.error("[Place photo]", err);
    return new Response("Photo fetch failed", { status: 502 });
  }
}
