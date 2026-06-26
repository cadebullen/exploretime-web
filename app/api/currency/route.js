export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from")?.toUpperCase() ?? "USD";
  const to = searchParams.get("to")?.toUpperCase();

  if (!to) {
    return Response.json(
      { error: "Missing 'to' currency code" },
      { status: 400 },
    );
  }

  const key = process.env.FXRATES_CURRENCY_CONVERTOR_API_KEY;
  const url = `https://api.fxratesapi.com/latest?base=${from}&currencies=${to}&api_key=${key}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    const data = await res.json();

    if (!data.success) {
      console.error("[Currency API]", data);
      return Response.json({ error: "API error" }, { status: 502 });
    }

    const rate = data.rates?.[to];
    return Response.json({ from, to, rate });
  } catch (err) {
    console.error("[Currency API]", err);
    return Response.json({ error: "Fetch failed" }, { status: 500 });
  }
}
