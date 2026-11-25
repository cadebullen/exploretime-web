"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { useRouter } from "next/navigation";
import { addTrip, getTrips } from "@/lib/storage";

const ACCENT = "#FF9F43";

const BACKGROUND_IMAGE = "/onboarding_bg.jpg";

function formatDate(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0 = destination, 1 = dates

  // Destination
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [destination, setDestination] = useState(null); // { name, placeId }
  const debounceTimer = useRef(null);

  // Dates
  const [range, setRange] = useState({ from: undefined, to: undefined });

  // Whether the user already has trips (so they can go back to them)
  const [hasTrips, setHasTrips] = useState(false);
  useEffect(() => {
    setHasTrips(getTrips().length > 0);
  }, []);

  const fetchSuggestions = useCallback((text) => {
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/places?input=${encodeURIComponent(text)}`,
        );
        const data = await res.json();
        setSuggestions(data.predictions ?? []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setDestination(null);
    fetchSuggestions(e.target.value);
  };

  const handleSelectPlace = (prediction) => {
    setDestination({
      name: prediction.description,
      placeId: prediction.place_id,
    });
    setQuery(prediction.description);
    setSuggestions([]);
  };

  const handleConfirm = () => {
    addTrip({
      destination: destination.name,
      placeId: destination.placeId,
      startDate: range.from.toISOString(),
      endDate: range.to.toISOString(),
    });
    router.push("/home");
  };

  const handleAuth = (type) => {};

  const today = new Date();
  const datesReady = range.from && range.to;

  return (
    <div className="min-h-screen bg-black relative">
      {/*Auth buttons */}
      <div className="absolute top-6 right-8 lg:right-20 z-20 flex items-center gap-4 text-sm font-medium">
        {hasTrips && (
          <button
            onClick={() => router.push("/home")}
            className="text-white/70 hover:text-white px-4 py-2.5 text-sm font-semibold tracking-wide transition-colors"
          >
            ← My trips
          </button>
        )}
        <button
          onClick={() => handleAuth("login")}
          className="bg-white/10 hover:bg-white/20 active:scale-95 text-white border border-white/10 px-6 py-2.5 rounded-full text-sm font-semibold tracking-wide transition-all backdrop-blur-sm"
        >
          Login
        </button>
      </div>

      <div className="min-h-screen bg-black flex">
        {/* ── Left branding panel (desktop only) ── */}
        <div className="hidden lg:flex w-105 shrink-0 bg-zinc-950 border-r border-white/10 flex-col justify-between p-12">
          <div>
            <div className="flex items-center gap-2.5 mb-16">
              <span className="text-2xl">🌍</span>
              <span className="text-xl font-bold text-white">ExploreTime</span>
            </div>
            <h2 className="text-4xl font-bold text-white leading-tight mb-4">
              Plan your trip,
              <br />
              day by day.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Smart itineraries, live flight tracking, currency conversions, and
              local news — all in one place.
            </p>
          </div>

          {/* Step indicators */}
          <div className="space-y-3 my-12">
            {["Choose a destination", "Pick your dates"].map((label, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 transition-opacity ${step === i ? "opacity-100" : "opacity-25"}`}
              >
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                  style={{
                    backgroundColor: step === i ? "#4F6DF5" : "transparent",
                    border:
                      step === i ? "none" : "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                  }}
                >
                  {step > i ? "✓" : i + 1}
                </div>
                <span className="text-sm font-medium text-white">{label}</span>
              </div>
            ))}
          </div>

          <p className="text-white/20 text-xs leading-relaxed">
            "The world is a book and those who do not travel read only one
            page."
            <br />
            <span className="text-white/30">— Saint Augustine</span>
          </p>
        </div>

        {/* ── Right form panel ── */}
        <div
          className="flex-1 flex flex-col justify-center px-8 lg:px-20 py-16 bg-cover bg-center bg-no-repeat relative z-10"
          style={{ backgroundImage: `url(${BACKGROUND_IMAGE})` }}
        >
          {/* Subtle base vignette layer over the photo to pull emphasis to center glass sheets */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-0" />

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden z-10">
            <span className="text-xl">🌍</span>
            <span className="text-base font-bold text-white">ExploreTime</span>
          </div>

          {/* Mobile progress dots */}
          <div className="flex gap-2 mb-10 lg:hidden z-10">
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: step === i ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor:
                    step === i ? ACCENT : "rgba(255,255,255,0.2)",
                  transition: "width 0.2s",
                }}
              />
            ))}
          </div>

          <div className="max-w-md w-full z-10">
            {/* ── Step 0: Destination ── */}
            {step === 0 && (
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] max-w-md w-full">
                <p className="text-blue-200/70 text-xs font-semibold uppercase tracking-widest mb-2 drop-shadow-sm">
                  Step 1 of 2
                </p>
                <h1 className="text-3xl font-bold text-white mb-6 tracking-tight drop-shadow">
                  Where are you going?
                </h1>

                <div className="relative">
                  <div className="flex items-center border border-white/10 rounded-xl px-4 py-3 bg-white/5 focus-within:border-[#FF9F43] focus-within:bg-white/10 transition-all shadow-inner">
                    {/* SVG Icon */}
                    <svg
                      className="w-4 h-4 text-white/50 mr-3 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      autoFocus
                      autoComplete="off"
                      placeholder="Search a city or place…"
                      value={query}
                      onChange={handleQueryChange}
                      className="flex-1 bg-transparent text-white text-sm outline-none placeholder-white/40"
                    />
                  </div>

                  {/* Liquid Glass Suggestions Dropdown */}
                  {suggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-950/80 border border-white/15 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-2xl">
                      {suggestions.map((s) => (
                        <button
                          key={s.place_id}
                          onClick={() => handleSelectPlace(s)}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-0"
                        >
                          <div className="font-semibold text-white text-sm">
                            {s.structured_formatting.main_text}
                          </div>
                          <div className="text-blue-200/50 text-xs mt-0.5">
                            {s.structured_formatting.secondary_text}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setStep(1)}
                  disabled={!destination}
                  className="mt-6 w-full py-3 rounded-xl text-white text-sm font-semibold transition-all shadow-lg hover:brightness-110 active:scale-[0.99]"
                  style={{
                    backgroundColor: ACCENT,
                    opacity: destination ? 1 : 0.4,
                    cursor: destination ? "pointer" : "not-allowed",
                  }}
                >
                  Continue →
                </button>
              </div>
            )}

            {/* ── Step 1: Dates ── */}
            {step === 1 && (
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/15 p-8 rounded-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] max-w-md w-full">
                <button
                  onClick={() => setStep(0)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white/70 transition-colors mb-6 uppercase tracking-widest"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Step 1 of 2
                </button>

                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight drop-shadow">
                  When are you going?
                </h1>
                <p
                  className="text-sm font-medium mb-6"
                  style={{ color: destination ? ACCENT : "transparent" }}
                >
                  ✈️ {destination?.name}
                </p>

                <div
                  className="text-sm font-semibold mb-5 min-h-5"
                  style={{
                    color: range.from ? "#fff" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {!range.from
                    ? "Select a start date"
                    : !range.to
                      ? "Select an end date"
                      : `${formatDate(range.from)}  →  ${formatDate(range.to)}`}
                </div>

                {/* Inner glass wrapper specifically for the calendar base */}
                <div className="flex justify-center bg-black/20 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                  <DayPicker
                    mode="range"
                    selected={range}
                    onSelect={setRange}
                    disabled={{ before: today }}
                    showOutsideDays
                    style={{ color: "#fff" }}
                    modifiersStyles={{
                      selected: {
                        backgroundColor: ACCENT,
                        color: "#111",
                        fontWeight: 600,
                      },
                      range_middle: {
                        backgroundColor: ACCENT + "25",
                        color: "#fff",
                      },
                      today: { color: ACCENT, fontWeight: 700 },
                      outside: { color: "rgba(255,255,255,0.2)" },
                      disabled: { color: "rgba(255,255,255,0.1)" },
                    }}
                  />
                </div>

                <button
                  onClick={handleConfirm}
                  disabled={!datesReady}
                  className="mt-6 w-full py-3 rounded-xl text-white text-sm font-semibold transition-all shadow-lg hover:brightness-110 active:scale-[0.99]"
                  style={{
                    backgroundColor: ACCENT,
                    opacity: datesReady ? 1 : 0.35,
                    cursor: datesReady ? "pointer" : "not-allowed",
                  }}
                >
                  Let's Plan ✈️
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
