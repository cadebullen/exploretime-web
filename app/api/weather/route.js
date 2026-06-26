// weatherapi.com condition codes -> emoji
function conditionEmoji(code, isDay) {
  if (code === 1000) return isDay ? "☀️" : "🌙";
  if ([1003].includes(code)) return "⛅️";
  if ([1006, 1009].includes(code)) return "☁️";
  if ([1030, 1135, 1147].includes(code)) return "🌫️";
  if ([1087, 1273, 1276, 1279, 1282].includes(code)) return "⛈️";
  if ([1066, 1114, 1117, 1210, 1213, 1216, 1219, 1222, 1225, 1255, 1258].includes(code)) return "❄️";
  if ([1069, 1072, 1168, 1171, 1198, 1201, 1204, 1207, 1249, 1252].includes(code)) return "🌨️";
  if ([1150, 1153, 1180, 1183, 1240].includes(code)) return "🌦️";
  if ([1186, 1189, 1192, 1195, 1243, 1246].includes(code)) return "🌧️";
  return "🌡️";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const wantForecast = searchParams.get("forecast") === "true";
  const days = Math.min(parseInt(searchParams.get("days") ?? "10", 10), 10);

  if (!city) {
    return Response.json({ error: "Missing 'city' parameter" }, { status: 400 });
  }

  const key = process.env.WEATHER_API_KEY;
  const url = `https://api.weatherapi.com/v1/forecast.json?key=${key}&q=${encodeURIComponent(city)}&days=${days}&aqi=no`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } });
    const data = await res.json();

    if (data.error) {
      console.error("[Weather API]", data.error.message);
      return Response.json({ error: data.error.message ?? "Not found" }, { status: 404 });
    }

    const { current, forecast } = data;

    const currentOut = {
      temp: Math.round(current.temp_c),
      feels_like: Math.round(current.feelslike_c),
      condition: current.condition.text,
      icon: conditionEmoji(current.condition.code, current.is_day === 1),
      humidity: current.humidity,
      wind: Math.round(current.wind_kph),
    };

    if (!wantForecast) {
      return Response.json(currentOut);
    }

    const forecastOut = forecast.forecastday.map((fd) => ({
      date: fd.date,
      icon: conditionEmoji(fd.day.condition.code, true),
      maxTemp: Math.round(fd.day.maxtemp_c),
      minTemp: Math.round(fd.day.mintemp_c),
      condition: fd.day.condition.text,
      rain: fd.day.daily_chance_of_rain,
    }));

    return Response.json({ current: currentOut, forecast: forecastOut });
  } catch (err) {
    console.error("[Weather API]", err);
    return Response.json({ error: "Fetch failed" }, { status: 500 });
  }
}
