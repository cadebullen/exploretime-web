export const ACCENT = "#4F6DF5";

export function formatDate(iso) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function getDaysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

export function getDaysArray(startDate, endDate) {
  const days = [];
  let cur = new Date(startDate);
  const end = new Date(endDate);
  let i = 1;
  while (cur <= end) {
    days.push({ label: `Day ${i}`, date: new Date(cur) });
    cur.setDate(cur.getDate() + 1);
    i++;
  }
  return days;
}

export function getCityName(destination) {
  return destination?.split(",")[0] ?? "";
}

// Best-effort city → ISO 4217 currency code
const CITY_CURRENCY = {
  // Asia
  tokyo: "JPY",
  osaka: "JPY",
  kyoto: "JPY",
  beijing: "CNY",
  shanghai: "CNY",
  "hong kong": "HKD",
  seoul: "KRW",
  bangkok: "THB",
  singapore: "SGD",
  mumbai: "INR",
  delhi: "INR",
  bangalore: "INR",
  dubai: "AED",
  istanbul: "TRY",
  taipei: "TWD",
  jakarta: "IDR",
  kuala: "MYR",
  manila: "PHP",
  // Europe
  london: "GBP",
  paris: "EUR",
  berlin: "EUR",
  rome: "EUR",
  madrid: "EUR",
  barcelona: "EUR",
  amsterdam: "EUR",
  vienna: "EUR",
  zurich: "CHF",
  prague: "CZK",
  warsaw: "PLN",
  stockholm: "SEK",
  oslo: "NOK",
  copenhagen: "DKK",
  lisbon: "EUR",
  athens: "EUR",
  budapest: "HUF",
  brussels: "EUR",
  // Americas
  toronto: "CAD",
  vancouver: "CAD",
  montreal: "CAD",
  "mexico city": "MXN",
  cancun: "MXN",
  "sao paulo": "BRL",
  "rio de janeiro": "BRL",
  "buenos aires": "ARS",
  bogota: "COP",
  lima: "PEN",
  // Oceania
  sydney: "AUD",
  melbourne: "AUD",
  auckland: "NZD",
  // Africa / Middle East
  cairo: "EGP",
  nairobi: "KES",
  "cape town": "ZAR",
  johannesburg: "ZAR",
  lagos: "NGN",
  tel: "ILS",
};

export function getCurrencyForCity(destination) {
  const city = destination?.split(",")[0].toLowerCase().trim() ?? "";
  return CITY_CURRENCY[city] ?? "EUR"; // fallback to EUR
}
