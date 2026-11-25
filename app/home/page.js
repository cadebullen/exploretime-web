"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ACCENT,
  getDaysArray,
  getCityName,
  getCurrencyForCity,
} from "@/lib/utils";
import {
  getActiveTrip,
  getTrips,
  setActiveTrip,
  deleteTrip,
} from "@/lib/storage";
import Navbar from "@/components/Navbar";
import TripCard from "@/components/TripCard";
import DayCard from "@/components/DayCard";
import InfoCard from "@/components/InfoCard";
import EditTripModal from "@/components/EditTripModal";
import TripsRow from "@/components/TripsRow";

export default function HomePage() {
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [currency, setCurrency] = useState(null); // { from, to, rate }
  const [fromCur, setFromCur] = useState("USD");
  const [toCur, setToCur] = useState(null); // set after trip loads
  const [amount, setAmount] = useState("1");
  const [curLoading, setCurLoading] = useState(false);
  const [fromSearch, setFromSearch] = useState("USD");
  const [toSearch, setToSearch] = useState("");
  const [showFromDrop, setShowFromDrop] = useState(false);
  const [showToDrop, setShowToDrop] = useState(false);
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  // Incremented on every trip switch so late responses for an old trip are ignored.
  const loadId = useRef(0);

  // Loads the itinerary, currency and weather for the given trip.
  const showTrip = (t, from = fromCur) => {
    const id = ++loadId.current;
    const current = () => id === loadId.current;
    setTrip(t);
    setDays(getDaysArray(t.startDate, t.endDate));

    const dest = getCurrencyForCity(t.destination);
    setToCur(dest);
    setToSearch(dest);
    setCurrency(null);
    if (from !== dest) {
      setCurLoading(true);
      fetch(`/api/currency?from=${from}&to=${dest}`)
        .then((r) => r.json())
        .then((d) => {
          if (current() && d.rate) setCurrency(d);
        })
        .catch(() => {})
        .finally(() => current() && setCurLoading(false));
    }

    const weatherParams = new URLSearchParams({
      city: getCityName(t.destination),
      forecast: "true",
      days: "3",
    });
    if (t.placeId) weatherParams.set("placeId", t.placeId);
    setWeather(null);
    setForecast([]);
    setWeatherLoading(true);
    fetch(`/api/weather?${weatherParams}`)
      .then((r) => r.json())
      .then((d) => {
        if (!current() || !d.current) return;
        setWeather(d.current);
        setForecast(d.forecast ?? []);
      })
      .catch(() => {})
      .finally(() => current() && setWeatherLoading(false));
  };

  useEffect(() => {
    const t = getActiveTrip();
    if (!t) {
      router.replace("/onboarding");
      return;
    }
    setTrips(getTrips());
    showTrip(t, "USD");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const handleSelectTrip = (id) => {
    if (id === trip?.id) return;
    setActiveTrip(id);
    const next = getTrips().find((t) => t.id === id);
    if (next) showTrip(next);
  };

  const handleDeleteTrip = () => {
    deleteTrip(trip.id);
    const next = getActiveTrip();
    if (!next) {
      router.replace("/onboarding");
      return;
    }
    setTrips(getTrips());
    showTrip(next);
  };

  if (!trip) return null;

  const cityName = getCityName(trip.destination);

  const CURRENCIES = {
    USD: "US Dollar",
    EUR: "Euro",
    GBP: "British Pound",
    JPY: "Japanese Yen",
    CAD: "Canadian Dollar",
    AUD: "Australian Dollar",
    CHF: "Swiss Franc",
    CNY: "Chinese Yuan",
    HKD: "Hong Kong Dollar",
    SGD: "Singapore Dollar",
    INR: "Indian Rupee",
    MXN: "Mexican Peso",
    BRL: "Brazilian Real",
    KRW: "South Korean Won",
    NOK: "Norwegian Krone",
    SEK: "Swedish Krona",
    DKK: "Danish Krone",
    NZD: "New Zealand Dollar",
    ZAR: "South African Rand",
    AED: "UAE Dirham",
    THB: "Thai Baht",
    TRY: "Turkish Lira",
    PLN: "Polish Zloty",
    CZK: "Czech Koruna",
    HUF: "Hungarian Forint",
    ILS: "Israeli Shekel",
    IDR: "Indonesian Rupiah",
    MYR: "Malaysian Ringgit",
    PHP: "Philippine Peso",
    TWD: "Taiwan Dollar",
  };

  const filterCurrencies = (q) => {
    const lower = q.toLowerCase();
    return Object.entries(CURRENCIES).filter(
      ([code, name]) =>
        code.toLowerCase().includes(lower) ||
        name.toLowerCase().includes(lower),
    );
  };

  const fetchRate = (f, t) => {
    if (!f || !t || f === t) return;
    setCurLoading(true);
    fetch(`/api/currency?from=${f}&to=${t}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.rate) setCurrency(d);
      })
      .catch(() => {})
      .finally(() => setCurLoading(false));
  };

  const converted =
    currency && amount ? (parseFloat(amount) * currency.rate).toFixed(2) : null;

  return (
    <>
      <div className="min-h-screen bg-black text-white">
        <Navbar />

        <main className="max-w-7xl mx-auto px-8 py-10">
          <div className="flex gap-8 items-start">
            {/* ── Main content ── */}
            <div className="flex-1 min-w-0 space-y-8">
              <TripsRow
                trips={trips}
                activeId={trip.id}
                onSelect={handleSelectTrip}
                onAdd={() => router.push("/onboarding")}
              />

              {/* Hero */}
              <TripCard
                key={trip.id}
                trip={trip}
                dayCount={days.length}
                onEdit={() => setShowEdit(true)}
                onDelete={handleDeleteTrip}
              />

              {/* Itinerary grid */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                    Itinerary — {days.length} day{days.length !== 1 ? "s" : ""}
                  </h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {days.map((day, i) => (
                    <DayCard
                      key={i}
                      day={day}
                      onClick={() => router.push(`/home/day/${i + 1}`)}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* ── Right sidebar ── */}
            <aside className="w-72 shrink-0 sticky top-24 space-y-3">
              <InfoCard title="💱 Currency">
                {/* From / To currency search */}
                <div className="flex items-center gap-2 mb-3">
                  {/* From */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={fromSearch}
                      placeholder={fromCur}
                      onChange={(e) => {
                        setFromSearch(e.target.value);
                        setShowFromDrop(true);
                      }}
                      onFocus={() => {
                        setFromSearch("");
                        setShowFromDrop(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          setShowFromDrop(false);
                          setFromSearch(fromCur);
                        }, 150)
                      }
                      className="w-full bg-white/10 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-[#4F6DF5] transition-colors"
                    />
                    {showFromDrop && (
                      <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/15 rounded-lg max-h-44 overflow-y-auto shadow-xl">
                        {filterCurrencies(fromSearch).map(([code, name]) => (
                          <li
                            key={code}
                            onMouseDown={() => {
                              setFromCur(code);
                              setFromSearch(code);
                              setShowFromDrop(false);
                              fetchRate(code, toCur);
                            }}
                            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/10 cursor-pointer"
                          >
                            <span className="text-xs font-bold font-mono text-white">
                              {code}
                            </span>
                            <span className="text-[11px] text-white/35 truncate">
                              {name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <span className="text-white/30 text-xs shrink-0">→</span>

                  {/* To */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={toSearch}
                      placeholder={toCur ?? ""}
                      onChange={(e) => {
                        setToSearch(e.target.value);
                        setShowToDrop(true);
                      }}
                      onFocus={() => {
                        setToSearch("");
                        setShowToDrop(true);
                      }}
                      onBlur={() =>
                        setTimeout(() => {
                          setShowToDrop(false);
                          setToSearch(toCur ?? "");
                        }, 150)
                      }
                      className="w-full bg-white/10 border border-white/15 rounded-lg px-2 py-1.5 text-xs text-white placeholder-white/40 outline-none focus:border-[#4F6DF5] transition-colors"
                    />
                    {showToDrop && (
                      <ul className="absolute z-50 top-full mt-1 left-0 right-0 bg-zinc-900 border border-white/15 rounded-lg max-h-44 overflow-y-auto shadow-xl">
                        {filterCurrencies(toSearch).map(([code, name]) => (
                          <li
                            key={code}
                            onMouseDown={() => {
                              setToCur(code);
                              setToSearch(code);
                              setShowToDrop(false);
                              fetchRate(fromCur, code);
                            }}
                            className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-white/10 cursor-pointer"
                          >
                            <span className="text-xs font-bold font-mono text-white">
                              {code}
                            </span>
                            <span className="text-[11px] text-white/35 truncate">
                              {name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Amount input */}
                <input
                  type="number"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#4F6DF5] transition-colors mb-3"
                  placeholder="Amount"
                />

                {/* Result */}
                {curLoading ? (
                  <div className="flex items-center gap-2 text-white/30 text-sm">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Fetching rate…
                  </div>
                ) : converted !== null ? (
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="text-white/50 text-sm">
                      {amount} {fromCur} =
                    </span>
                    <span
                      className="text-2xl font-bold"
                      style={{ color: ACCENT }}
                    >
                      {converted}
                    </span>
                    <span className="text-sm font-semibold text-white/60">
                      {toCur}
                    </span>
                  </div>
                ) : null}
              </InfoCard>

              <InfoCard title={`🌤 Weather · ${cityName}`}>
                {weatherLoading ? (
                  <div className="flex items-center gap-2 text-white/30 text-sm">
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                    Loading weather…
                  </div>
                ) : weather ? (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{weather.icon}</span>
                      <div>
                        <span className="text-2xl font-bold">
                          {weather.temp}°C
                        </span>
                        <p className="text-xs text-white/40 mt-0.5 capitalize">
                          {weather.condition}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-xs text-white/40">
                      <span>Feels {weather.feels_like}°C</span>
                      <span>💧 {weather.humidity}%</span>
                      <span>💨 {weather.wind} km/h</span>
                    </div>
                    {forecast.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-white/10">
                        {forecast.map((f, i) => (
                          <div
                            key={f.date}
                            className="text-center"
                            title={f.condition}
                          >
                            <p className="text-[11px] font-semibold text-white/50">
                              {i === 0
                                ? "Today"
                                : new Date(`${f.date}T12:00:00`).toLocaleDateString(
                                    "en-US",
                                    { weekday: "short" },
                                  )}
                            </p>
                            <p className="text-xl my-1">{f.icon}</p>
                            <p className="text-xs">
                              <span className="font-semibold">{f.maxTemp}°</span>{" "}
                              <span className="text-white/40">{f.minTemp}°</span>
                            </p>
                            <p className="text-[10px] text-white/35 mt-0.5">
                              🌧 {f.rain}%
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-white/30">Weather unavailable</p>
                )}
              </InfoCard>

              <InfoCard title={`General Knowledge · ${cityName}`}>
                <div className="space-y-3"></div>
              </InfoCard>

              <InfoCard title={`📰 News · ${cityName}`}>
                <div className="space-y-3"></div>
              </InfoCard>
            </aside>
          </div>
        </main>
      </div>

      {showEdit && (
        <EditTripModal
          trip={trip}
          onClose={() => setShowEdit(false)}
          onSave={(updated) => {
            setShowEdit(false);
            setTrips(getTrips());
            showTrip(updated);
          }}
        />
      )}
    </>
  );
}
