import { coordsForPlace } from "@/lib/placesServer";
import { describeWeatherCode, isWet } from "@/lib/weatherCodes";

// GET /api/day-weather?placeId=<trip destination place id>&date=YYYY-MM-DD
// Weather for one day of a trip, from Open-Meteo (no key needed):
// - within the forecast range (~16 days): the forecast, plus morning /
//   afternoon / evening from the hourly forecast
// - further ahead: typical weather for that date from the last 3 years
// Temperatures in °C.

const BLOCK_HOURS = { Morning: [5, 12], Afternoon: [12, 17], Evening: [17, 24] };
const FORECAST_DAYS = 15;

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const round = (x) => (x === null ? null : Math.round(x));

function daysFromToday(date, timezone) {
  const today = new Date(new Date().toLocaleString("en-US", { timeZone: timezone || "UTC" }));
  today.setHours(0, 0, 0, 0);
  const target = new Date(`${date}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

async function forecast(lat, lng, date) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lng,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    hourly: "temperature_2m,precipitation_probability,weather_code",
    timezone: "auto",
    start_date: date,
    end_date: date,
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 3 * 3600 },
  });
  const d = await res.json();
  if (d.error || !d.daily?.time?.length) throw new Error(d.reason || "No forecast");

  const code = d.daily.weather_code[0];
  const blocks = {};
  for (const [block, [from, to]] of Object.entries(BLOCK_HOURS)) {
    const idx = d.hourly.time
      .map((t, i) => [Number(t.slice(11, 13)), i])
      .filter(([h]) => h >= from && h < to)
      .map(([, i]) => i);
    const codes = idx.map((i) => d.hourly.weather_code[i]);
    const worst = Math.max(...codes);
    blocks[block] = {
      temp: round(avg(idx.map((i) => d.hourly.temperature_2m[i]))),
      rainChance: Math.max(0, ...idx.map((i) => d.hourly.precipitation_probability[i] ?? 0)),
      ...describeWeatherCode(worst),
      wet: isWet(worst),
    };
  }

  return {
    kind: "forecast",
    date,
    ...describeWeatherCode(code),
    max: round(d.daily.temperature_2m_max[0]),
    min: round(d.daily.temperature_2m_min[0]),
    rainChance: d.daily.precipitation_probability_max[0] ?? null,
    blocks,
  };
}

async function typical(lat, lng, date) {
  const year = Number(date.slice(0, 4));
  const monthDay = date.slice(5);
  const now = new Date();
  const years = [1, 2, 3]
    .map((n) => year - n)
    .filter((y) => new Date(`${y}-${monthDay}T00:00:00`) < now);

  const results = await Promise.all(
    years.map(async (y) => {
      const day = `${y}-${monthDay}`;
      const params = new URLSearchParams({
        latitude: lat,
        longitude: lng,
        start_date: day,
        end_date: day,
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        timezone: "auto",
      });
      try {
        const res = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`, {
          next: { revalidate: 7 * 86400 },
        });
        const d = await res.json();
        if (!d.daily?.time?.length) return null;
        return {
          code: d.daily.weather_code[0],
          max: d.daily.temperature_2m_max[0],
          min: d.daily.temperature_2m_min[0],
          rain: d.daily.precipitation_sum[0] ?? 0,
        };
      } catch {
        return null;
      }
    }),
  );
  const found = results.filter(Boolean);
  if (!found.length) throw new Error("No past weather for this date");

  const rainyYears = found.filter((r) => r.rain >= 1).length;
  // Icon: rainy if it rained in most past years, else the most common sky.
  const codes = found.map((r) => r.code);
  const common = codes
    .sort((a, b) => codes.filter((c) => c === b).length - codes.filter((c) => c === a).length)[0];
  const look = rainyYears * 2 > found.length
    ? describeWeatherCode(61)
    : describeWeatherCode(isWet(common) ? 2 : common);

  return {
    kind: "typical",
    date,
    ...look,
    max: round(avg(found.map((r) => r.max))),
    min: round(avg(found.map((r) => r.min))),
    years: found.length,
    rainyYears,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) {
    return Response.json({ error: "Missing or invalid 'date' (YYYY-MM-DD)" }, { status: 400 });
  }
  const coords = await coordsForPlace(searchParams.get("placeId"));
  if (!coords) {
    return Response.json({ error: "Couldn't locate the destination" }, { status: 404 });
  }
  const [lat, lng] = coords.split(",");

  try {
    const ahead = daysFromToday(date);
    if (ahead >= -1 && ahead <= FORECAST_DAYS) {
      try {
        return Response.json(await forecast(lat, lng, date));
      } catch {
        // fall through to typical weather
      }
    }
    return Response.json(await typical(lat, lng, date));
  } catch (err) {
    console.error("[Day weather]", err.message);
    return Response.json({ error: err.message }, { status: 502 });
  }
}
