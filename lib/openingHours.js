// Works out when a place is open from Google's weekly opening hours.
//
// `periods` is Places API (New) regularOpeningHours.periods:
//   [{ open: { day, hour, minute }, close?: { day, hour, minute } }]
// day is 0 (Sunday) … 6 (Saturday). A single period with no close means the
// place is open 24 hours.

const DAY = 24 * 60;
const WEEK = 7 * DAY;

// Time-of-day windows in minutes after midnight. Evening runs past midnight
// so late-night places (bars, clubs) count as evening.
export const TIME_WINDOWS = {
  Morning: [5 * 60, 12 * 60],
  Afternoon: [12 * 60, 17 * 60],
  Evening: [17 * 60, 26 * 60],
};

// The windows above as shown to the user.
export const TIME_RANGE_LABELS = {
  Morning: "5 AM – 12 PM",
  Afternoon: "12 – 5 PM",
  Evening: "5 PM – 2 AM",
};

// A place counts as open for a time of day when it is open for at least this
// many minutes of that window.
const MIN_OVERLAP = 90;

const toWeekMinutes = ({ day, hour = 0, minute = 0 }) =>
  day * DAY + hour * 60 + minute;

// Open intervals as [start, end) in minutes of the week, unwrapped so that
// end > start (an interval crossing Saturday→Sunday gets end > WEEK).
function intervals(periods) {
  if (!Array.isArray(periods) || periods.length === 0) return null;
  if (periods.length === 1 && !periods[0].close) return [[0, WEEK]]; // 24/7
  return periods
    .filter((p) => p.open && p.close)
    .map((p) => {
      const start = toWeekMinutes(p.open);
      let end = toWeekMinutes(p.close);
      if (end <= start) end += WEEK;
      return [start, end];
    });
}

function overlap(a, b) {
  return Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0]));
}

// Minutes the place is open during [start, end) of the given weekday.
function minutesOpen(open, weekday, [startMin, endMin]) {
  const window = [weekday * DAY + startMin, weekday * DAY + endMin];
  let total = 0;
  for (const iv of open) {
    // Compare against the interval shifted by a week either way, so periods
    // and windows that wrap around the week line up.
    for (const shift of [-WEEK, 0, WEEK]) {
      total += overlap([iv[0] + shift, iv[1] + shift], window);
    }
  }
  return total;
}

// Times of day the place is open on the given date. null when Google has no
// opening hours for the place.
export function openTimesOfDay(periods, date) {
  const open = intervals(periods);
  if (!open) return null;
  const weekday = date.getDay();
  return Object.entries(TIME_WINDOWS)
    .filter(([, win]) => minutesOpen(open, weekday, win) >= MIN_OVERLAP)
    .map(([block]) => block);
}

function formatTime({ hour = 0, minute = 0 }) {
  const h = hour % 24;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return minute ? `${h12}:${String(minute).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

// Short label of the hours on the given date, e.g. "Open 9 AM – 5 PM",
// "Open 24 hours" or "Closed". null when hours are unknown.
export function hoursLabel(periods, date) {
  if (!Array.isArray(periods) || periods.length === 0) return null;
  if (periods.length === 1 && !periods[0].close) return "Open 24 hours";
  const weekday = date.getDay();
  const today = periods.filter((p) => p.open?.day === weekday && p.close);
  if (today.length === 0) return "Closed";
  const spans = today
    .sort((a, b) => toWeekMinutes(a.open) - toWeekMinutes(b.open))
    .map((p) => `${formatTime(p.open)} – ${formatTime(p.close)}`);
  return `Open ${spans.join(", ")}`;
}
