// WMO weather codes (used by Open-Meteo) → icon and short description.
const CODES = [
  [[0], "☀️", "Clear"],
  [[1], "🌤️", "Mostly clear"],
  [[2], "⛅️", "Partly cloudy"],
  [[3], "☁️", "Overcast"],
  [[45, 48], "🌫️", "Fog"],
  [[51, 53, 55, 56, 57], "🌦️", "Drizzle"],
  [[61, 63, 80, 81], "🌧️", "Rain"],
  [[65, 82], "🌧️", "Heavy rain"],
  [[66, 67], "🌨️", "Freezing rain"],
  [[71, 73, 75, 77, 85, 86], "❄️", "Snow"],
  [[95, 96, 99], "⛈️", "Thunderstorms"],
];

export function describeWeatherCode(code) {
  const hit = CODES.find(([codes]) => codes.includes(code));
  return hit ? { icon: hit[1], condition: hit[2] } : { icon: "🌡️", condition: "—" };
}

// Codes that mean rain, snow or storms.
export function isWet(code) {
  return code >= 51;
}
