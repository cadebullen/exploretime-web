export function getTrip() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("currentTrip");
  return raw ? JSON.parse(raw) : null;
}

export function isLoggedIn() {
  if (typeof window === "undefined") return false;

  const done = localStorage.getItem("onboardingComplete") === "true";
  const trip = getTrip();

  return done && Boolean(trip);
}

export function LoggedIn() {
  return isLoggedIn();
}

export function saveTrip(trip) {
  localStorage.setItem("currentTrip", JSON.stringify(trip));
  localStorage.setItem("onboardingComplete", "true");
}

export function clearTrip() {
  localStorage.removeItem("currentTrip");
  localStorage.removeItem("onboardingComplete");
}

function getTripId(trip) {
  const seed = [
    trip?.placeId ?? trip?.destination ?? "trip",
    trip?.startDate ?? "",
    trip?.endDate ?? "",
  ].join("|");
  return seed.replace(/\s+/g, "_");
}

function getDayActivitiesKey(trip, dateKey) {
  return `dayActivities:${getTripId(trip)}:${dateKey}`;
}

function getTripActivityProfileKey(trip) {
  return `tripActivityProfile:${getTripId(trip)}`;
}

export function getDayActivities(trip, dateKey) {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(getDayActivitiesKey(trip, dateKey));
  return raw ? JSON.parse(raw) : [];
}

export function saveDayActivities(trip, dateKey, activities) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getDayActivitiesKey(trip, dateKey),
    JSON.stringify(activities),
  );
}

export function getTripActivityProfile(trip) {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(getTripActivityProfileKey(trip));
  return raw ? JSON.parse(raw) : null;
}

export function saveTripActivityProfile(trip, profile) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    getTripActivityProfileKey(trip),
    JSON.stringify(profile),
  );
}
