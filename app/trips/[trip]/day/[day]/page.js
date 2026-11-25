"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DayActivities from "@/components/DayActivities";
import { getDaysArray, formatDate } from "@/lib/utils";
import {
  findTripBySlug,
  setActiveTrip,
  dayPath,
  getDayActivities,
  saveDayActivities,
  getTripActivityProfile,
  saveTripActivityProfile,
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
    setProfile(getTripActivityProfile(t));
  }, [dayNumber, slug, router]);

  const selectedDay = useMemo(() => {
    if (!days.length || !Number.isInteger(dayNumber)) return null;
    return days[dayNumber - 1] ?? null;
  }, [days, dayNumber]);

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
            mapsUrl: place.mapsUrl,
          },
        ];

    setSaved(next);
    saveDayActivities(trip, dayKey(selectedDay.date), next);
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

      <main className="max-w-5xl mx-auto px-8 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-white/40 font-semibold">
              {trip.destination}
            </p>
            <h1 className="text-3xl font-bold mt-1">{selectedDay.label}</h1>
            <p className="text-white/60 mt-1">
              {formatDate(selectedDay.date.toISOString())}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/home")}
              className="px-4 py-2 rounded-lg border border-white/20 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              Back to itinerary
            </button>
            <button
              onClick={() => router.push(dayPath(trip, dayNumber - 1))}
              disabled={dayNumber <= 1}
              className="px-3 py-2 rounded-lg border border-white/15 text-sm disabled:opacity-35"
            >
              Prev Day
            </button>
            <button
              onClick={() => router.push(dayPath(trip, dayNumber + 1))}
              disabled={dayNumber >= days.length}
              className="px-3 py-2 rounded-lg border border-white/15 text-sm disabled:opacity-35"
            >
              Next Day
            </button>
          </div>
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
          profile={profile}
          onSaveProfile={handleSaveProfile}
        />
      </main>
    </div>
  );
}
