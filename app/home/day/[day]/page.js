"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import DayActivities from "@/components/DayActivities";
import { getDaysArray, formatDate } from "@/lib/utils";
import {
  getTrip,
  getDayActivities,
  saveDayActivities,
  getTripActivityProfile,
  saveTripActivityProfile,
} from "@/lib/storage";
import { getSuggestedActivities } from "@/lib/activitySuggestions";

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
  const [savedIds, setSavedIds] = useState([]);
  const [profile, setProfile] = useState(null);

  const dayNumber = Number(params.day);

  useEffect(() => {
    const t = getTrip();
    if (!t) {
      router.replace("/onboarding");
      return;
    }

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
    const stored = getDayActivities(t, dayKey(selected.date));
    setSavedIds(stored);
    setProfile(getTripActivityProfile(t));
  }, [dayNumber, router]);

  const selectedDay = useMemo(() => {
    if (!days.length || !Number.isInteger(dayNumber)) return null;
    return days[dayNumber - 1] ?? null;
  }, [days, dayNumber]);

  const suggestions = useMemo(() => {
    if (!trip) return [];
    return getSuggestedActivities(trip.destination);
  }, [trip]);

  const toggleSave = (activityId) => {
    if (!trip || !selectedDay) return;

    const next = savedIds.includes(activityId)
      ? savedIds.filter((id) => id !== activityId)
      : [...savedIds, activityId];

    setSavedIds(next);
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
              onClick={() => router.push(`/home/day/${dayNumber - 1}`)}
              disabled={dayNumber <= 1}
              className="px-3 py-2 rounded-lg border border-white/15 text-sm disabled:opacity-35"
            >
              Prev Day
            </button>
            <button
              onClick={() => router.push(`/home/day/${dayNumber + 1}`)}
              disabled={dayNumber >= days.length}
              className="px-3 py-2 rounded-lg border border-white/15 text-sm disabled:opacity-35"
            >
              Next Day
            </button>
          </div>
        </div>

        <DayActivities
          suggestions={suggestions}
          savedIds={savedIds}
          onToggleSave={toggleSave}
          profile={profile}
          onSaveProfile={handleSaveProfile}
        />
      </main>
    </div>
  );
}
