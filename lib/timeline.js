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
// opensAt(place, minute): optional; when the place opens if it's still closed
// at that minute (minutes after midnight), else null.
//
// - A stop in a later time of day never starts before that time of day.
// - A stop with a fixed time (place.fixedTime, minutes) starts then; if you
//   can't get there in time, `late` is how many minutes late you'd be.
// - Otherwise, if the place opens a little later in the same time of day,
//   you arrive when it opens (`waitedFor` minutes after you could).
//
// Returns { [id]: { arrive, leave, overruns, late, waitedFor } } with times in
// minutes after midnight; overruns: the visit ends after its time of day.
export function buildTimeline(ordered, travelSec, dayStartMin, opensAt = () => null) {
  const out = {};
  let clock = dayStartMin;
  for (const place of ordered) {
    const [blockStart, blockEnd] = TIME_WINDOWS[place.timeBlock] ?? [0, 26 * 60];
    const earliest = Math.max(
      clock + Math.round((travelSec(place.id) ?? 0) / 60),
      blockStart,
    );
    let arrive = earliest;
    let late = 0;
    let waitedFor = 0;
    if (Number.isFinite(place.fixedTime)) {
      arrive = place.fixedTime;
      late = Math.max(0, earliest - place.fixedTime);
      if (late) arrive = earliest;
    } else {
      const opens = opensAt(place, earliest);
      if (Number.isFinite(opens) && opens > earliest && opens < blockEnd) {
        waitedFor = opens - earliest;
        arrive = opens;
      }
    }
    const leave = arrive + visitMinutes(place);
    out[place.id] = { arrive, leave, overruns: leave > blockEnd, late, waitedFor };
    clock = leave;
  }
  return out;
}
