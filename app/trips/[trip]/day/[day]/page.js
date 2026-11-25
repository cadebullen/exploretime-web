"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import DayActivities from "@/components/DayActivities";
import { getDaysArray } from "@/lib/utils";
import {
  findTripBySlug,
  setActiveTrip,
  dayPath,
  getDayActivities,
  saveDayActivities,
  getTripActivityProfile,
  saveTripActivityProfile,
  getDayStart,
  saveDayStart,
  getDayMeta,
  saveDayMeta,
} from "@/lib/storage";

function dayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DayDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [trip, setTrip] = useState(null);
  const [days, setDays] = useState([]);
  const [saved, setSaved] = useState([]); // places added to this day
  const [start, setStart] = useState(null); // starting point for this day
  const [dayStartMin, setDayStartMin] = useState(9 * 60);
  const [plannedCounts, setPlannedCounts] = useState({}); // day number -> stops
  const [dayWeather, setDayWeather] = useState(undefined); // undefined = loading, null = no forecast
  const [plannedElsewhere, setPlannedElsewhere] = useState({}); // place id -> [day numbers]
  const [profile, setProfile] = useState(null);
  const [places, setPlaces] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(null);

  const dayNumber = Number(params.day);
  const slug = params.trip;

  useEffect(() => {
    const t = findTripBySlug(slug);
    if (!t) {
      router.replace("/home");
      return;
    }
    setActiveTrip(t.id);

    const allDays = getDaysArray(t.startDate, t.endDate);
    if (
      !Number.isInteger(dayNumber) ||
      dayNumber < 1 ||
      dayNumber > allDays.length
    ) {
      router.replace("/home");
      return;
    }

    setTrip(t);
    setDays(allDays);

    const selected = allDays[dayNumber - 1];
    // Older versions saved ids of generic suggestions; keep only real places.
    const stored = getDayActivities(t, dayKey(selected.date));
    setSaved(stored.filter((item) => item && typeof item === "object"));
    setStart(getDayStart(t, dayKey(selected.date)));
    setDayStartMin(getDayMeta(t, dayKey(selected.date)).startTime ?? 9 * 60);

    // Which places are already planned on the trip's other days.
    const elsewhere = {};
    allDays.forEach((d, i) => {
      if (i === dayNumber - 1) return;
      getDayActivities(t, dayKey(d.date)).forEach((item) => {
        if (!item || typeof item !== "object") return;
        (elsewhere[item.id] ??= []).push(i + 1);
      });
    });
    setPlannedElsewhere(elsewhere);

    // How many stops each day has, for the day tabs.
    const counts = {};
    allDays.forEach((d, i) => {
      counts[i + 1] = getDayActivities(t, dayKey(d.date)).filter(
        (item) => item && typeof item === "object",
      ).length;
    });
    setPlannedCounts(counts);
    setProfile(getTripActivityProfile(t));
  }, [dayNumber, slug, router]);

  const selectedDay = useMemo(() => {
    if (!days.length || !Number.isInteger(dayNumber)) return null;
    return days[dayNumber - 1] ?? null;
  }, [days, dayNumber]);

  // Keep this day's count in the tabs up to date.
  useEffect(() => {
    if (Number.isInteger(dayNumber)) {
      setPlannedCounts((c) => ({ ...c, [dayNumber]: saved.length }));
    }
  }, [saved.length, dayNumber]);

  // Forecast for this day's date, when it's close enough to have one.
  useEffect(() => {
    if (!trip || !selectedDay) return;
    let cancelled = false;
    setDayWeather(undefined);
    const params = new URLSearchParams({
      city: trip.destination.split(",")[0],
      forecast: "true",
      days: "10",
    });
    if (trip.placeId) params.set("placeId", trip.placeId);
    fetch(`/api/weather?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const key = dayKey(selectedDay.date);
        setDayWeather(d.forecast?.find((f) => f.date === key) ?? null);
      })
      .catch(() => !cancelled && setDayWeather(null));
    return () => {
      cancelled = true;
    };
  }, [trip, selectedDay]);

  // Real places for the trip's destination, based on the chosen interests.
  const interestsKey = (profile?.interests ?? []).join(",");
  useEffect(() => {
    if (!trip || !profile) return;
    let cancelled = false;
    const params = new URLSearchParams({
      city: trip.destination,
      interests: interestsKey,
    });
    if (trip.placeId) params.set("placeId", trip.placeId);

    setPlacesLoading(true);
    setPlacesError(null);
    fetch(`/api/recommendations?${params}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) {
          setPlaces([]);
          setPlacesError(d.error);
        } else {
          setPlaces(d.places ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) setPlacesError("Couldn't reach the server.");
      })
      .finally(() => {
        if (!cancelled) setPlacesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [trip, profile, interestsKey]);

  const toggleSave = (place) => {
    if (!trip || !selectedDay) return;

    const next = saved.some((p) => p.id === place.id)
      ? saved.filter((p) => p.id !== place.id)
      : [
          ...saved,
          {
            id: place.id,
            name: place.name,
            address: place.address,
            category: place.category,
            timeBlock: place.timeBlock,
            rating: place.rating,
            priceLevel: place.priceLevel,
            photoName: place.photoName ?? null,
            photoRef: place.photoRef ?? null,
            hours: place.hours ?? null,
            location: place.location ?? null,
            website: place.website ?? null,
            phone: place.phone ?? null,
            phoneIntl: place.phoneIntl ?? null,
            mapsUrl: place.mapsUrl,
          },
        ];

    setSaved(next);
    saveDayActivities(trip, dayKey(selectedDay.date), next);
  };

  // Places saved before places carried coordinates: look them up once and
  // store them, so they can appear on the map.
  const missingKey = saved
    .filter((p) => !p.location)
    .map((p) => p.id)
    .join(",");
  useEffect(() => {
    if (!missingKey || !trip || !selectedDay) return;
    let cancelled = false;
    fetch(`/api/place-locations?ids=${encodeURIComponent(missingKey)}`)
      .then((r) => r.json())
      .then(({ locations = {} }) => {
        if (cancelled || Object.keys(locations).length === 0) return;
        setSaved((current) => {
          const next = current.map((p) =>
            p.location || !locations[p.id] ? p : { ...p, location: locations[p.id] },
          );
          saveDayActivities(trip, dayKey(selectedDay.date), next);
          return next;
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [missingKey, trip, selectedDay]);

  // Sets (or removes) this day's starting point. With applyToOtherDays, days
  // of the trip that have no starting point get the same one.
  const changeStart = (next, applyToOtherDays) => {
    if (!trip || !selectedDay) return;
    setStart(next);
    saveDayStart(trip, dayKey(selectedDay.date), next);
    if (next && applyToOtherDays) {
      days.forEach((d) => {
        const key = dayKey(d.date);
        if (!getDayStart(trip, key)) saveDayStart(trip, key, next);
      });
    }
  };

  // Food stops: look up booking info (reservations, website, phone) once.
  const needsDetailsKey = saved
    .filter((p) => p.category === "Food" && !p.detailsFetched)
    .map((p) => p.id)
    .join(",");
  useEffect(() => {
    if (!needsDetailsKey || !trip || !selectedDay) return;
    let cancelled = false;
    Promise.all(
      needsDetailsKey.split(",").map((id) =>
        fetch(`/api/place-details?id=${encodeURIComponent(id)}`)
          .then((r) => r.json())
          .then((d) => [id, d.place ?? null])
          .catch(() => [id, null]),
      ),
    ).then((pairs) => {
      if (cancelled) return;
      const found = Object.fromEntries(pairs.filter(([, place]) => place));
      if (Object.keys(found).length === 0) return;
      setSaved((current) => {
        const next = current.map((p) => {
          const d = found[p.id];
          if (!d) return p;
          return {
            ...p,
            website: p.website ?? d.website,
            phone: p.phone ?? d.phone,
            phoneIntl: p.phoneIntl ?? d.phoneIntl,
            reservable: d.reservable,
            hours: p.hours ?? d.hours,
            location: p.location ?? d.location,
            detailsFetched: true,
          };
        });
        saveDayActivities(trip, dayKey(selectedDay.date), next);
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [needsDetailsKey, trip, selectedDay]);

  const changeDayStart = (min) => {
    if (!trip || !selectedDay) return;
    setDayStartMin(min);
    const key = dayKey(selectedDay.date);
    saveDayMeta(trip, key, { ...getDayMeta(trip, key), startTime: min });
  };

  const reorderPlan = (next) => {
    if (!trip || !selectedDay) return;
    setSaved(next);
    saveDayActivities(trip, dayKey(selectedDay.date), next);
  };

  const handleSaveProfile = (nextProfile) => {
    if (!trip) return;
    setProfile(nextProfile);
    saveTripActivityProfile(trip, nextProfile);
  };

  if (!trip || !selectedDay) return null;

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <main className="max-w-[1600px] mx-auto px-6 lg:px-10 2xl:px-16 py-10 space-y-8">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-white/50">{trip.destination}</p>
              <h1 className="text-3xl font-bold mt-1">
                {selectedDay.label}
                <span className="ml-3 text-xl font-semibold text-white/60">
                  {selectedDay.date.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </h1>
              <p className="text-sm text-white/55 mt-2 min-h-5">
                {dayWeather === undefined ? null : dayWeather ? (
                  <>
                    <span className="mr-1.5">{dayWeather.icon}</span>
                    {dayWeather.condition} · {dayWeather.maxTemp}° /{" "}
                    {dayWeather.minTemp}°C · {dayWeather.rain}% chance of rain
                  </>
                ) : (
                  <span className="text-white/35">
                    The forecast for this day appears closer to the date.
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={() => router.push("/home")}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Back to itinerary
            </button>
          </div>

          {/* Day tabs */}
          <nav aria-label="Days of this trip" className="flex gap-2 overflow-x-auto pb-1">
            {days.map((d, i) => {
              const n = i + 1;
              const active = n === dayNumber;
              const count = plannedCounts[n] ?? 0;
              return (
                <Link
                  key={n}
                  href={dayPath(trip, n)}
                  aria-current={active ? "page" : undefined}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-colors ${
                    active
                      ? "border-[#FF9F43] bg-[#FF9F43]/15"
                      : "border-white/10 hover:border-white/30 hover:bg-white/5"
                  }`}
                >
                  <span className="block text-xs text-white/50">
                    {d.date.toLocaleDateString("en-US", { weekday: "short" })}{" "}
                    {d.date.getDate()}
                  </span>
                  <span className="block text-sm font-semibold text-white">
                    Day {n}
                  </span>
                  <span className="block text-[11px] text-white/40">
                    {count ? `${count} stop${count === 1 ? "" : "s"}` : "Nothing yet"}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <DayActivities
          places={places}
          placesLoading={placesLoading}
          placesError={placesError}
          city={trip.destination.split(",")[0]}
          dayIndex={dayNumber - 1}
          date={selectedDay.date}
          saved={saved}
          plannedElsewhere={plannedElsewhere}
          onToggleSave={toggleSave}
          onReorder={reorderPlan}
          start={start}
          onStartChange={changeStart}
          tripPlaceId={trip.placeId ?? null}
          dayStartMin={dayStartMin}
          onDayStartChange={changeDayStart}
          profile={profile}
          onSaveProfile={handleSaveProfile}
        />
      </main>
    </div>
  );
}
