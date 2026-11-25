// GET /api/place-photo?ref=<photo_reference>&w=400
// Proxies a Google Places photo so the API key stays on the server.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get("ref");
  const width = Math.min(parseInt(searchParams.get("w") ?? "400", 10) || 400, 1200);

  if (!ref) {
    return new Response("Missing 'ref'", { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(ref)}&key=${process.env.PLACES_KEY}`;

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
