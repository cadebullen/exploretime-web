// Rough schedule for a day's plan: when you'd arrive at and leave each stop,
// from a start time, each stop's visit length and the travel time between.

import { TIME_WINDOWS } from "@/lib/openingHours";

const DEFAULT_MINUTES = {
  Culture: 120,
  Outdoors: 90,
  Leisure: 120,
  Shopping: 60,
  Nightlife: 120,
};

// Estimated visit length in minutes (the user can change it per stop).
export function visitMinutes(place) {
  if (Number.isFinite(place.durationMin)) return place.durationMin;
  if (place.category === "Food") {
    return { Morning: 60, Afternoon: 75, Evening: 90 }[place.timeBlock] ?? 75;
  }
  return DEFAULT_MINUTES[place.category] ?? 90;
}

export const DURATION_OPTIONS = [30, 45, 60, 75, 90, 120, 150, 180, 240];

export function formatDuration(min) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

// ordered: places in plan order. travelSec(id): seconds of travel to reach
// that place from the previous stop (or from the start), or 0.
// dayStartMin: when the day starts, minutes after midnight.
// A stop in a later time of day never starts before that time of day does.
// Returns { [id]: { arrive, leave, overruns } } with times in minutes after
// midnight; overruns is true when the visit ends after its time of day.
export function buildTimeline(ordered, travelSec, dayStartMin) {
  const out = {};
  let clock = dayStartMin;
  for (const place of ordered) {
    const [blockStart, blockEnd] = TIME_WINDOWS[place.timeBlock] ?? [0, 26 * 60];
    const arrive = Math.max(clock + Math.round((travelSec(place.id) ?? 0) / 60), blockStart);
    const leave = arrive + visitMinutes(place);
    out[place.id] = { arrive, leave, overruns: leave > blockEnd };
    clock = leave;
  }
  return out;
}
