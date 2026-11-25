// Trips are stored in localStorage as a list, with one "active" trip that the
// home and day pages show.
//
//   trips         -> JSON array of trip objects ({ id, destination, placeId, startDate, endDate })
//   activeTripId  -> id of the trip currently being viewed
//
// Older versions stored a single trip under "currentTrip"; it is migrated into
// the list the first time trips are read.

const TRIPS_KEY = "trips";
const ACTIVE_KEY = "activeTripId";
const LEGACY_TRIP_KEY = "currentTrip";
const ONBOARDING_KEY = "onboardingComplete";

const isBrowser = () => typeof window !== "undefined";

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// Id used by trips saved before trips had their own id. Activities saved for
// those trips are keyed by it, so migrated trips keep it as their id.
function legacyTripId(trip) {
  const seed = [
    trip?.placeId ?? trip?.destination ?? "trip",
    trip?.startDate ?? "",
    trip?.endDate ?? "",
  ].join("|");
  return seed.replace(/\s+/g, "_");
}

function newTripId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `trip_${crypto.randomUUID()}`;
  }
  return `trip_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getTripId(trip) {
  return trip?.id ?? legacyTripId(trip);
}

function writeTrips(trips) {
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips));
  if (trips.length) {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } else {
    localStorage.removeItem(ONBOARDING_KEY);
  }
}

function migrateLegacyTrip() {
  const legacy = readJSON(LEGACY_TRIP_KEY, null);
  if (!legacy) return null;
  const trip = { ...legacy, id: legacy.id ?? legacyTripId(legacy) };
  writeTrips([trip]);
  localStorage.setItem(ACTIVE_KEY, trip.id);
  localStorage.removeItem(LEGACY_TRIP_KEY);
  return [trip];
}

// ── Trips ────────────────────────────────────────────────────────────────

export function getTrips() {
  if (!isBrowser()) return [];
  const trips = readJSON(TRIPS_KEY, null);
  if (Array.isArray(trips)) return trips;
  return migrateLegacyTrip() ?? [];
}

export function getActiveTrip() {
  const trips = getTrips();
  if (!trips.length) return null;
  const activeId = localStorage.getItem(ACTIVE_KEY);
  return trips.find((t) => t.id === activeId) ?? trips[0];
}

// Kept for existing callers: the trip currently being viewed.
export function getTrip() {
  return getActiveTrip();
}

export function setActiveTrip(id) {
  if (!isBrowser()) return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function addTrip(fields) {
  const trip = { ...fields, id: newTripId() };
  writeTrips([...getTrips(), trip]);
  setActiveTrip(trip.id);
  return trip;
}

export function updateTrip(id, fields) {
  let updated = null;
  const trips = getTrips().map((t) => {
    if (t.id !== id) return t;
    updated = { ...t, ...fields, id };
    return updated;
  });
  writeTrips(trips);
  return updated;
}

export function deleteTrip(id) {
  if (!isBrowser()) return;
  const trips = getTrips();
  const trip = trips.find((t) => t.id === id);
  if (!trip) return;

  const remaining = trips.filter((t) => t.id !== id);
  writeTrips(remaining);

  // Remove the activities and preferences saved for this trip.
  const tripId = getTripId(trip);
  const prefixes = [
    `dayActivities:${tripId}:`,
    `tripActivityProfile:${tripId}`,
    `dayStart:${tripId}:`,
  ];
  Object.keys(localStorage)
    .filter((key) => prefixes.some((p) => key.startsWith(p)))
    .forEach((key) => localStorage.removeItem(key));

  if (localStorage.getItem(ACTIVE_KEY) === id) {
    if (remaining.length) setActiveTrip(remaining[0].id);
    else localStorage.removeItem(ACTIVE_KEY);
  }
}

// Saves changes to the active trip, or creates a trip if there is none.
export function saveTrip(fields) {
  const active = getActiveTrip();
  return active ? updateTrip(active.id, fields) : addTrip(fields);
}

// Removes every trip (used on logout).
export function clearTrips() {
  if (!isBrowser()) return;
  getTrips().forEach((t) => deleteTrip(t.id));
  localStorage.removeItem(TRIPS_KEY);
  localStorage.removeItem(ACTIVE_KEY);
  localStorage.removeItem(LEGACY_TRIP_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
}

export function clearTrip() {
  clearTrips();
}

export function isLoggedIn() {
  if (!isBrowser()) return false;
  const done = localStorage.getItem(ONBOARDING_KEY) === "true";
  return done && getTrips().length > 0;
}

export function LoggedIn() {
  return isLoggedIn();
}

// ── Trip URLs ────────────────────────────────────────────────────────────
// Trips appear in URLs by city, e.g. /trips/tokyo/day/1. When two trips go to
// the same city, the start date is added: tokyo-2027-01-12.

function slugify(text) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function citySlug(trip) {
  return slugify(String(trip?.destination ?? "").split(",")[0]) || "trip";
}

function isoDay(iso) {
  const d = new Date(iso);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

export function tripSlug(trip, trips = getTrips()) {
  const base = citySlug(trip);
  const sameCity = trips.filter((t) => citySlug(t) === base);
  return sameCity.length > 1 ? `${base}-${isoDay(trip.startDate)}` : base;
}

export function findTripBySlug(slug) {
  const trips = getTrips();
  return trips.find((t) => tripSlug(t, trips) === slug) ?? null;
}

export function dayPath(trip, dayNumber) {
  return `/trips/${tripSlug(trip)}/day/${dayNumber}`;
}

// ── Per-trip activities ──────────────────────────────────────────────────

function getDayActivitiesKey(trip, dateKey) {
  return `dayActivities:${getTripId(trip)}:${dateKey}`;
}

function getTripActivityProfileKey(trip) {
  return `tripActivityProfile:${getTripId(trip)}`;
}

export function getDayActivities(trip, dateKey) {
  if (!isBrowser()) return [];
  return readJSON(getDayActivitiesKey(trip, dateKey), []);
}

export function saveDayActivities(trip, dateKey, activities) {
  if (!isBrowser()) return;
  localStorage.setItem(
    getDayActivitiesKey(trip, dateKey),
    JSON.stringify(activities),
  );
}

export function getTripActivityProfile(trip) {
  if (!isBrowser()) return null;
  return readJSON(getTripActivityProfileKey(trip), null);
}

export function saveTripActivityProfile(trip, profile) {
  if (!isBrowser()) return;
  localStorage.setItem(
    getTripActivityProfileKey(trip),
    JSON.stringify(profile),
  );
}

// ── Starting point for a day (e.g. the hotel) ────────────────────────────
// { id, name, address, location: { lat, lng } } or null.

function getDayStartKey(trip, dateKey) {
  return `dayStart:${getTripId(trip)}:${dateKey}`;
}

export function getDayStart(trip, dateKey) {
  if (!isBrowser()) return null;
  return readJSON(getDayStartKey(trip, dateKey), null);
}

export function saveDayStart(trip, dateKey, start) {
  if (!isBrowser()) return;
  const key = getDayStartKey(trip, dateKey);
  if (start) localStorage.setItem(key, JSON.stringify(start));
  else localStorage.removeItem(key);
}
