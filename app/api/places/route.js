export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const input = searchParams.get("input");

  if (!input || input.trim().length < 2) {
    return Response.json({ predictions: [] });
  }

  const key = process.env.PLACES_KEY;
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${key}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.status && data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.error("[Places API]", data.status, data.error_message ?? "");
  }

  return Response.json({ predictions: data.predictions ?? [] });
}
